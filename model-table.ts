#!/usr/bin/env bun
/**
 * model-table — show the recommended model for each agent in an
 * oh-my-opencode-slim preset, with live pricing from models.dev.
 *
 * Usage:
 *   bun ~/.config/opencode/model-table.ts                  # active preset
 *   bun ~/.config/opencode/model-table.ts synthetic        # leading positional = preset
 *   bun ~/.config/opencode/model-table.ts --preset synthetic
 *   bun ~/.config/opencode/model-table.ts --all            # every preset
 *   bun ~/.config/opencode/model-table.ts --refresh        # bypass the cache
 *   bun ~/.config/opencode/model-table.ts --json           # machine output
 *   bun ~/.config/opencode/model-table.ts --validate       # + availability/single-provider check
 *   bun ~/.config/opencode/model-table.ts oracle fixer     # filter agents
 */

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HOME = homedir();
const CONFIG = join(HOME, ".config/opencode/oh-my-opencode-slim.json");
const OPENCODE_CONFIG = join(HOME, ".config/opencode/opencode.jsonc");
const CACHE = join(HOME, ".cache/opencode/models-dev.json");
const MODELS_DEV_URL = "https://models.dev/api.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));

const presetFlag = (() => {
  const i = argv.indexOf("--preset");
  return i === -1 ? undefined : argv[i + 1];
})();

const showAll = flags.has("--all");
const asJson = flags.has("--json");
const refresh = flags.has("--refresh");
const validate = flags.has("--validate");

// Positionals are either the preset (leading, when it names one) or agent filters.
const positionalAgents = positional.filter((a) => a !== presetFlag);

// ------------------------------------------------------------- config input

/** Tolerate JSONC (comments + trailing commas) so the script also reads .jsonc. */
function parseLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1")
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(stripped);
  }
}

type AgentConfig = { model?: string | Array<string | { id: string; variant?: string }>; variant?: string };
type PresetShape = { extends?: string; agents?: Record<string, AgentConfig> } & Record<string, unknown>;

/** A preset is either `{ extends, agents: {...} }` or flat `{ agent: {...} }`. */
function agentsOf(preset: PresetShape): Record<string, AgentConfig> {
  if (preset && typeof preset.agents === "object" && preset.agents !== null) {
    return preset.agents as Record<string, AgentConfig>;
  }
  const out: Record<string, AgentConfig> = {};
  for (const [key, value] of Object.entries(preset ?? {})) {
    if (key === "extends") continue;
    if (value && typeof value === "object") out[key] = value as AgentConfig;
  }
  return out;
}

/** Resolve a preset's `extends` chain into a single agent map. */
function resolvePreset(
  name: string,
  presets: Record<string, PresetShape>,
): { agents: Record<string, AgentConfig>; chain: string[] } {
  const chain: string[] = [];
  const seen = new Set<string>();
  let merged: Record<string, AgentConfig> = {};

  let current: string | undefined = name;
  while (current) {
    if (seen.has(current)) throw new Error(`preset cycle: ${[...chain, current].join(" -> ")}`);
    seen.add(current);
    const preset = presets[current];
    if (!preset) throw new Error(`preset not found: ${current}`);
    chain.push(current);
    // Walk outward from the named preset, so an already-collected entry is the
    // more derived one and must win: the plugin resolves `extends` the same way
    // (parent agents first, then the child's overrides — mergeAgentOverrides).
    merged = { ...agentsOf(preset), ...merged };
    current = typeof preset.extends === "string" ? preset.extends : undefined;
  }
  return { agents: merged, chain };
}

// ---------------------------------------------------------- models.dev feed

async function loadModelsDev(): Promise<Record<string, { models?: Record<string, ModelRecord> }>> {
  const fresh = (() => {
    try {
      const stat = Bun.file(CACHE);
      return stat.size > 0 && Date.now() - stat.lastModified < CACHE_TTL_MS;
    } catch {
      return false;
    }
  })();

  if (!refresh && fresh) {
    return (await Bun.file(CACHE).json()) as never;
  }

  pick("Fetching models.dev …");
  const data = (await (await fetch(MODELS_DEV_URL)).json()) as never;
  mkdirSync(dirname(CACHE), { recursive: true });
  await Bun.write(CACHE, JSON.stringify(data));
  return data;
}

type ModelRecord = { name?: string; limit?: { context?: number }; cost?: { input?: number; output?: number; cache_read?: number } };

/**
 * Prices for models OpenCode knows only because they are hand-declared in
 * `opencode.jsonc` (e.g. OpenRouter `:floor` variants, absent from models.dev).
 * Keyed by `provider/modelID`.
 */
type DeclaredModel = { name?: string; limit?: { context?: number }; cost?: { input?: number; output?: number; cache?: { read?: number } } };

async function loadDeclaredModels(): Promise<Record<string, DeclaredModel>> {
  const out: Record<string, DeclaredModel> = {};
  try {
    const config = parseLoose(await Bun.file(OPENCODE_CONFIG).text()) as {
      providers?: Record<string, { models?: Record<string, DeclaredModel & { modelID?: string }> }>;
    };
    for (const [providerId, provider] of Object.entries(config.providers ?? {})) {
      for (const [key, model] of Object.entries(provider?.models ?? {})) {
        const alias = model.modelID ?? key;
        out[`${providerId}/${alias}`] = model;
        out[`${providerId}/${key}`] = model;
      }
    }
  } catch {
    // Missing or unparseable opencode config just means no declared fallback.
  }
  return out;
}

// ------------------------------------------------------------------ helpers

function pick(text: string) {
  if (!asJson) process.stderr.write(`${text}\n`);
}

function money(value: number | undefined): string {
  if (typeof value !== "number") return "n/a";
  const fixed = value >= 1 ? value.toFixed(2) : value.toFixed(3);
  return `$${fixed.replace(/0+$/, "").replace(/\.$/, "")}`;
}

function context(value: number | undefined): string {
  if (typeof value !== "number") return "n/a";
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - text.length));
}

/** First model id + variant from a preset entry (handles string or array forms). */
function modelOf(agent: AgentConfig): { id: string; variant?: string } {
  const raw = agent.model;
  if (typeof raw === "string") return { id: raw, variant: agent.variant };
  if (Array.isArray(raw) && raw.length) {
    const first = raw[0];
    return typeof first === "string"
      ? { id: first, variant: agent.variant }
      : { id: first.id, variant: first.variant ?? agent.variant };
  }
  return { id: "(unset)", variant: agent.variant };
}

type Row = {
  preset: string;
  agent: string;
  model: string;
  name: string;
  variant: string;
  context: string;
  input: string;
  output: string;
  cacheRead: string;
};

// --------------------------------------------------------------------- main

const rawConfig = await Bun.file(CONFIG).text();
const config = parseLoose(rawConfig) as { preset?: string; presets?: Record<string, PresetShape> };
const presets = config.presets ?? {};

// `--preset X` wins; otherwise a leading positional that names a preset is the
// preset (so `/suggest-models synthetic` works); else the active preset.
const positionalPreset =
  !presetFlag && !showAll && positionalAgents[0] && presets[positionalAgents[0]]
    ? positionalAgents[0]
    : undefined;

const agentFilter = positionalAgents.filter((a) => a !== positionalPreset);
const filterSet = agentFilter.length ? new Set(agentFilter) : undefined;

const presetNames = showAll
  ? Object.keys(presets)
  : [presetFlag ?? positionalPreset ?? config.preset ?? Object.keys(presets)[0]].filter(Boolean);

if (!presetNames.length) {
  process.stderr.write("No presets found in " + CONFIG + "\n");
  process.exit(1);
}

const modelsDev = await loadModelsDev();
const declared = await loadDeclaredModels();

const rows: Row[] = [];
for (const presetName of presetNames) {
  let resolved: { agents: Record<string, AgentConfig>; chain: string[] };
  try {
    resolved = resolvePreset(presetName, presets);
  } catch (error) {
    process.stderr.write(`Skipping ${presetName}: ${(error as Error).message}\n`);
    continue;
  }

  for (const [agent, entry] of Object.entries(resolved.agents)) {
    if (filterSet && !filterSet.has(agent)) continue;
    const { id, variant } = modelOf(entry);
    const slash = id.indexOf("/");
    const provider = slash === -1 ? "" : id.slice(0, slash);
    const remainder = slash === -1 ? id : id.slice(slash + 1);
    const record = provider ? modelsDev[provider]?.models?.[remainder] : undefined;
    const fallback = declared[id];

    rows.push({
      preset: presetName,
      agent,
      model: id,
      name: record?.name ?? fallback?.name ?? "",
      variant: variant ?? "—",
      context: context(record?.limit?.context ?? fallback?.limit?.context),
      input: money(record?.cost?.input ?? fallback?.cost?.input),
      output: money(record?.cost?.output ?? fallback?.cost?.output),
      cacheRead: money(record?.cost?.cache_read ?? fallback?.cost?.cache?.read),
    });
  }
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

if (!rows.length) {
  process.stderr.write("No matching agents.\n");
  process.exit(1);
}

const columns = [
  { key: "agent", header: "Agent" },
  { key: "model", header: "Recommended model" },
  { key: "variant", header: "Variant" },
  { key: "context", header: "Context" },
  { key: "input", header: "Input/M" },
  { key: "output", header: "Output/M" },
  { key: "cacheRead", header: "Cache read/M" },
] as const;

const width = (key: string, header: string) =>
  Math.max(header.length, ...rows.map((row) => String(row[key as keyof Row]).length));

const widths = Object.fromEntries(columns.map(({ key, header }) => [key, width(key, header)]));

const line = (cells: string[]) => cells.map((cell, i) => pad(cell, widths[columns[i].key])).join("  ");

for (const presetName of [...new Set(rows.map((r) => r.preset))]) {
  console.log(`\n${presetName}${presetFlag || positionalPreset || showAll || presetNames.length > 1 ? "" : " (active)"}`);
  console.log(line(columns.map((c) => c.header)));
  console.log(columns.map((c) => "─".repeat(widths[c.key])).join("  "));
  for (const row of rows.filter((r) => r.preset === presetName)) {
    console.log(line([row.agent, row.model, row.variant, row.context, row.input, row.output, row.cacheRead]));
  }
}

const shownPresets = [...new Set(rows.map((r) => r.preset))];

// `--validate` is the advisory half of /suggest-models: it checks that every
// recommended model is actually offered by the host, and that a preset does not
// mix providers (all agents in a session should bill one provider's quota).
if (validate) {
  const warnings: string[] = [];

  let available: Set<string> | undefined;
  try {
    const proc = Bun.spawnSync(["opencode", "models"], { stdout: "pipe", stderr: "ignore" });
    const list = new TextDecoder().decode(proc.stdout);
    available = new Set(list.split("\n").map((l) => l.trim()).filter(Boolean));
  } catch {
    available = undefined;
  }

  const providersByPreset = new Map<string, Set<string>>();
  for (const row of rows) {
    const provider = row.model.includes("/") ? row.model.slice(0, row.model.indexOf("/")) : "(none)";
    if (!providersByPreset.has(row.preset)) providersByPreset.set(row.preset, new Set());
    providersByPreset.get(row.preset)!.add(provider);
  }

  for (const presetName of shownPresets) {
    const providers = [...(providersByPreset.get(presetName) ?? [])];
    if (providers.length > 1) {
      warnings.push(`${presetName}: mixes providers (${providers.join(", ")}) — keep a session on one provider`);
    }
  }

  if (!available) {
    warnings.push("could not read `opencode models` — availability check skipped");
  } else {
    for (const row of rows) {
      if (!available.has(row.model)) {
        warnings.push(`${row.preset}/${row.agent}: ${row.model} not offered by \`opencode models\` (unavailable or not authenticated)`);
      }
    }
  }

  console.log();
  if (warnings.length) {
    console.log("Warnings:");
    for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  } else {
    console.log("OK: every model is available and each preset stays on one provider.");
  }
}

if (!showAll && shownPresets.length === 1) {
  console.log(`\nApply: /preset ${shownPresets[0]}  — switches all agents in this session to the preset`);
}

console.log();
