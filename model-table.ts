#!/usr/bin/env bun
/**
 * model-table — show the recommended model for each agent in an
 * oh-my-opencode-slim preset, with live pricing from models.dev.
 *
 * Usage:
 *   bun ~/.config/opencode/model-table.ts                  # active preset
 *   bun ~/.config/opencode/model-table.ts --preset synthetic
 *   bun ~/.config/opencode/model-table.ts --all            # every preset
 *   bun ~/.config/opencode/model-table.ts --refresh        # bypass the cache
 *   bun ~/.config/opencode/model-table.ts --json           # machine output
 *   bun ~/.config/opencode/model-table.ts oracle fixer     # filter agents
 */

import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HOME = homedir();
const CONFIG = join(HOME, ".config/opencode/oh-my-opencode-slim.json");
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

const agentFilter = positional.filter((a) => a !== presetFlag);
const filterSet = agentFilter.length ? new Set(agentFilter) : undefined;

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
    merged = { ...merged, ...agentsOf(preset) };
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

const presetNames = showAll
  ? Object.keys(presets)
  : [presetFlag ?? config.preset ?? Object.keys(presets)[0]].filter(Boolean);

if (!presetNames.length) {
  process.stderr.write("No presets found in " + CONFIG + "\n");
  process.exit(1);
}

const modelsDev = await loadModelsDev();

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

    rows.push({
      preset: presetName,
      agent,
      model: id,
      name: record?.name ?? "",
      variant: variant ?? "—",
      context: context(record?.limit?.context),
      input: money(record?.cost?.input),
      output: money(record?.cost?.output),
      cacheRead: money(record?.cost?.cache_read),
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
  console.log(`\n${presetName}${presetFlag || showAll || presetNames.length > 1 ? "" : " (active)"}`);
  console.log(line(columns.map((c) => c.header)));
  console.log(columns.map((c) => "─".repeat(widths[c.key])).join("  "));
  for (const row of rows.filter((r) => r.preset === presetName)) {
    console.log(line([row.agent, row.model, row.variant, row.context, row.input, row.output, row.cacheRead]));
  }
}
console.log();
