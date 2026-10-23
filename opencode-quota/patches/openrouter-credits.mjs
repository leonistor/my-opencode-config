#!/usr/bin/env node
/**
 * Patch @slkiser/opencode-quota 5.x so the built-in OpenRouter row reports the
 * account's REMAINING CREDIT instead of the key's all-time spend.
 *
 * Why: the plugin only calls GET https://openrouter.ai/api/v1/key. When that key
 * has no `limit`, `parseOpenRouterKeyV1` falls back to the key's lifetime `usage`
 * (e.g. "$65.43"), which is not a quota left. The account's real remaining credit
 * lives on GET https://openrouter.ai/api/v1/credits (`total_credits - total_usage`).
 *
 * The plugin lives inside the npm cache and is replaced on every plugin update, so
 * this edit is not permanent. Re-run this script after `opencode plugin update`.
 *
 * The result is one OpenRouter row with the credit left and no bar, e.g.:
 *   [OpenRouter] $13.96
 * In the grouped surfaces (/quota Limits table) it carries the label "Credits left:".
 * A percentage bar is deliberately not emitted: the plugin's single-window projection
 * keeps one row per provider, and $80 of total credit is not interesting.
 *
 * Usage:
 *   node openrouter-credits.mjs            # apply (idempotent)
 *   node openrouter-credits.mjs --dry-run  # show the diff, change nothing
 *   node openrouter-credits.mjs --revert   # restore openrouter.js.orig
 *
 * It aborts instead of guessing when the upstream file does not look like the
 * version this patch was written for.
 */

import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";

const PACKAGE_SCOPE = "@slkiser/opencode-quota";
const CACHE_ROOT = join(homedir(), ".cache", "opencode", "npm", `${PACKAGE_SCOPE}@5`);
const STATE_DIR = join(homedir(), ".cache", "opencode", "quota-provider-state");
const MARKER = "OPENROUTER_CREDITS_SOURCE";

const KEY_ANCHOR = `    format: "openrouter-key-v1",\n};\n`;
const QUERY_ANCHOR = `    const result = await fetchRemoteQuotaProvider(OPENROUTER_KEY_SOURCE, options.resolved.key, options.requestTimeoutMs);
    if (!result.success)
        return result;
    return {
        ...result,
        entries: result.entries.map((entry) => ({
            ...entry,
            accounting: {
                ...entry.accounting,
                ownership: "maintained",
            },
        })),
    };
`;
const QUERY_REPLACEMENT = `    const result = await fetchRemoteQuotaProvider(OPENROUTER_KEY_SOURCE, options.resolved.key, options.requestTimeoutMs);
    if (!result.success)
        return result;
    let entries = result.entries;
    // When the key has its own limit the plugin already reports a correct budget
    // percent, so leave it alone. Otherwise replace the all-time spend row with
    // the account's remaining credit.
    const keyHasLimit = entries.some((entry) => entry.kind !== "value");
    if (!keyHasLimit) {
        const credits = await fetchRemoteQuotaProvider(OPENROUTER_CREDITS_SOURCE, options.resolved.key, options.requestTimeoutMs);
        if (credits.success && credits.entries.length > 0) {
            entries = credits.entries.flatMap(openRouterCreditEntries);
        }
    }
    return {
        ...result,
        entries: entries.map((entry) => ({
            ...entry,
            accounting: {
                ...entry.accounting,
                ownership: "maintained",
            },
        })),
    };
`;

const CREDITS_SOURCE = `
// --- openrouter-credits.mjs patch: account remaining credit ---
const OPENROUTER_CREDITS_SOURCE = {
    id: "openrouter",
    providerId: "openrouter",
    label: "OpenRouter",
    mode: "remote-api",
    url: "https://openrouter.ai/api/v1/credits",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "json-v1",
    adapter: {
        mappings: [
            {
                resultType: "budget",
                name: "Credits",
                label: "Credits:",
                unit: "$",
                unitPosition: "prefix",
                metric: {
                    type: "spend-budget",
                    spend: { path: ["data", "total_usage"] },
                    budget: { path: ["data", "total_credits"] },
                },
            },
        ],
    },
};
// json-v1 cannot subtract two paths, so do the arithmetic here and emit a plain
// value row. The single-window projection keeps one row per provider, and a
// percent row would add a bar we do not want, so this is a value entry.
const openRouterUsd = (value) => "$" + value.toFixed(2);
function openRouterCreditEntries(entry) {
    const [rawSpend, rawBudget] = String(entry.right ?? "").split("/");
    const spend = Number(String(rawSpend ?? "").replace(/[^0-9.-]/g, ""));
    const budget = Number(String(rawBudget ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(spend) || !Number.isFinite(budget) || budget <= 0)
        return [entry];
    const remaining = budget - spend;
    const { percentRemaining, right, ...base } = entry;
    return [
        {
            ...base,
            kind: "value",
            label: "Credits left:",
            value: openRouterUsd(remaining),
            accounting: { ...entry.accounting, resultType: "balance" },
        },
    ];
}
// --- end openrouter-credits.mjs patch ---
`;

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return { dryRun: flags.has("--dry-run"), revert: flags.has("--revert") };
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function versionOf(packageDir) {
  try {
    const parsed = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

/** Every cached install of <scope>@5 that ships dist/lib/openrouter.js, newest first. */
async function findInstalls() {
  if (!(await exists(CACHE_ROOT))) return [];
  const entries = await readdir(CACHE_ROOT);
  const found = [];
  for (const entry of entries) {
    const packageDir = join(CACHE_ROOT, entry, "node_modules", PACKAGE_SCOPE);
    const file = join(packageDir, "dist", "lib", "openrouter.js");
    if (!(await exists(file))) continue;
    const version = await versionOf(packageDir);
    if (!version || !version.startsWith("5.")) continue;
    found.push({ dirName: entry, file, version });
  }
  // Install dirs are millisecond timestamps; the highest name is the active one.
  found.sort((a, b) => Number(b.dirName) - Number(a.dirName));
  return found;
}

/** Real unified diff via `diff -u`, so the .patch artifact stays honest. */
function runDiff(aPath, bPath, label, stripPrefix = false) {
  const args = stripPrefix
    ? ["-u", "--label", "a/dist/lib/openrouter.js", "--label", "b/dist/lib/openrouter.js", aPath, bPath]
    : ["-u", aPath, bPath];
  const result = spawnSync("diff", args, { encoding: "utf8" });
  if (result.status === 0) return `(no differences for ${label})`;
  if (result.status === 1) return result.stdout;
  throw new Error(`diff failed for ${label}: ${result.stderr || result.status}`);
}

async function diffString(before, after, label) {
  const scratch = join(tmpdir(), `openrouter-credits-${process.pid}.mjs`);
  await writeFile(scratch, after, "utf8");
  try {
    const beforeFile = join(tmpdir(), `openrouter-credits-${process.pid}.before.mjs`);
    await writeFile(beforeFile, before, "utf8");
    try {
      return runDiff(beforeFile, scratch, label, true);
    } finally {
      await unlink(beforeFile).catch(() => undefined);
    }
  } finally {
    await unlink(scratch).catch(() => undefined);
  }
}

function applyPatch(source) {
  const keyCount = source.split(KEY_ANCHOR).length - 1;
  const queryCount = source.split(QUERY_ANCHOR).length - 1;
  if (keyCount !== 1 || queryCount !== 1) {
    throw new Error(
      `unexpected upstream layout (key anchor x${keyCount}, query anchor x${queryCount}); refusing to patch`,
    );
  }
  const required = ["OPENROUTER_KEY_SOURCE", "https://openrouter.ai/api/v1/key", 'format: "openrouter-key-v1"'];
  for (const marker of required) {
    if (!source.includes(marker)) throw new Error(`missing expected marker: ${marker}; refusing to patch`);
  }
  return source
    .replace(KEY_ANCHOR, `${KEY_ANCHOR}${CREDITS_SOURCE}`)
    .replace(QUERY_ANCHOR, QUERY_REPLACEMENT);
}

async function clearCachedRows() {
  if (!(await exists(STATE_DIR))) return 0;
  const entries = await readdir(STATE_DIR);
  let removed = 0;
  for (const entry of entries) {
    if (!entry.startsWith("openrouter-") || !entry.endsWith(".json")) continue;
    await rm(join(STATE_DIR, entry), { force: true });
    removed += 1;
  }
  return removed;
}

async function revert({ file, dirName }) {
  const backup = `${file}.orig`;
  if (!(await exists(backup))) {
    console.error(`No backup at ${backup}; nothing to revert.`);
    return false;
  }
  await copyFile(backup, file);
  console.log(`Reverted ${dirName}: restored dist/lib/openrouter.js from openrouter.js.orig`);
  const removed = await clearCachedRows();
  if (removed > 0) console.log(`Cleared ${removed} cached OpenRouter row(s).`);
  return true;
}

async function main() {
  const { dryRun, revert: doRevert } = parseArgs(process.argv);
  const installs = await findInstalls();
  if (installs.length === 0) {
    console.error(`No ${PACKAGE_SCOPE}@5 install found under ${CACHE_ROOT}`);
    process.exit(1);
  }
  const [target, ...others] = installs;
  if (others.length > 0) {
    console.log(
      `Note: ${others.length} older install(s) also present (${others.map((i) => i.version).join(", ")}); patching the newest (${target.version}).`,
    );
  }

  if (doRevert) {
    process.exit((await revert(target)) ? 0 : 1);
  }

  const original = await readFile(target.file, "utf8");
  if (original.includes(MARKER)) {
    console.log(`Already patched (${target.version}, install ${target.dirName}); nothing to do.`);
    process.exit(0);
  }

  let patched;
  try {
    patched = applyPatch(original);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    console.error(`Target: ${target.file}`);
    process.exit(2);
  }

  if (dryRun) {
    console.log(await diffString(original, patched, `${target.version} dist/lib/openrouter.js`));
    console.log("\n--dry-run: no files were written.");
    process.exit(0);
  }

  const backup = `${target.file}.orig`;
  if (!(await exists(backup))) {
    await mkdir(dirname(target.file), { recursive: true });
    await copyFile(target.file, backup);
    console.log(`Backup written: ${backup}`);
  }
  await writeFile(target.file, patched, "utf8");

  const check = spawnSync(process.execPath, ["--check", target.file], { encoding: "utf8" });
  if (check.status !== 0) {
    await copyFile(backup, target.file);
    console.error(`Syntax check failed, restored the backup:\n${check.stderr || check.stdout}`);
    process.exit(3);
  }

  await writeFile(
    join(new URL(".", import.meta.url).pathname, "openrouter-credits.patch"),
    runDiff(backup, target.file, `${target.version} dist/lib/openrouter.js`, true),
    "utf8",
  );
  console.log(`Patched ${target.version} (install ${target.dirName}): ${target.file}`);

  const removed = await clearCachedRows();
  if (removed > 0) console.log(`Cleared ${removed} cached OpenRouter row(s).`);
  console.log("\nRestart OpenCode to load the patch: `opencode service restart`, then reopen the TUI(s).");
}

await main();
