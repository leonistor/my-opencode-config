#!/usr/bin/env bun
/**
 * lane-rates.ts — fit what each lane actually paid per million tokens.
 *
 * The declared cost tables (models.dev, and the hand declarations kept for
 * `:floor` lanes) are not what OpenRouter bills: the router picks an endpoint
 * per request, so the rate that lands on the invoice is a property of the
 * traffic, not of the catalogue entry. This fits the truth out of the session
 * DB: per assistant message, cost ≈ a·input + b·(output+reasoning) + c·cacheRead
 * (least squares, $/M). The fitted c is the number to compare against the
 * endpoint notes in oh-my-opencode-slim-models.md — a cache-read-heavy lane
 * fitted at ≫ 0.005 $/M is being served by an expensive-cache host.
 *
 * Usage:
 *   bun lane-rates.ts                  # last 7 days, all lanes
 *   bun lane-rates.ts --days 2         # shorter window
 *   bun lane-rates.ts --since 2026-11-22
 *   bun lane-rates.ts --lane oracle    # substring filter on agent or model
 *   bun lane-rates.ts --json           # machine-readable
 *
 * Exit code: 0 always (a warning is printed, not encoded — this runs beside
 * `model-table.ts` in a morning check, where a non-zero exit means nothing).
 */

import { Database } from "bun:sqlite";

const DB = `${process.env.HOME}/.local/share/opencode/opencode.db`;
const WARN_CACHE_READ = 0.005; // $/M — Wafer-class drift sits at 0.014–0.018
const WARN_MESSAGE = 0.004; // $/message — measured floor-week band

type Args = { days: number; since?: number; lane?: string; json: boolean };

function parseArgs(argv: string[]): Args {
  const a: Args = { days: 7, json: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--days") a.days = Number(argv[++i]);
    else if (t === "--since") a.since = Date.parse(`${argv[++i]}T00:00:00Z`);
    else if (t === "--lane") a.lane = argv[++i];
    else if (t === "--json") a.json = true;
    else {
      console.error(`unknown flag ${t}`);
      process.exit(2);
    }
  }
  if (a.since !== undefined && Number.isNaN(a.since)) {
    console.error("--since wants YYYY-MM-DD");
    process.exit(2);
  }
  return a;
}

type Row = { i: number; o: number; c: number; cost: number };
type Lane = { agent: string; model: string; variant: string; rows: Row[] };

function solve3(
  m: number[][],
  b: number[],
): [number, number, number] | null {
  // Gaussian elimination on the 3x3 normal equations; singular -> null.
  const a = m.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++)
      if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    [a[col], a[piv]] = [a[piv], a[col]];
    if (Math.abs(a[col][col]) < 1e-18) return null;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k < 4; k++) a[r][k] -= f * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]] as [
    number,
    number,
    number,
  ];
}

function fit(rows: Row[]): { rate: [number, number, number]; sse: number } | null {
  if (rows.length < 30) return null; // fewer than 30 messages can't separate 3 terms
  const m = Array.from({ length: 3 }, () => Array(3).fill(0));
  const b = Array(3).fill(0);
  for (const r of rows) {
    const x = [r.i / 1e6, r.o / 1e6, r.c / 1e6];
    for (let p = 0; p < 3; p++) {
      for (let q = 0; q < 3; q++) m[p][q] += x[p] * x[q];
      b[p] += x[p] * r.cost;
    }
  }
  const rate = solve3(m, b);
  if (!rate) return null;
  let sse = 0;
  for (const r of rows) {
    const pred =
      (r.i * rate[0] + r.o * rate[1] + r.c * rate[2]) / 1e6;
    sse += (pred - r.cost) ** 2;
  }
  return { rate, sse };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sinceMs =
    args.since ?? Date.now() - args.days * 24 * 60 * 60 * 1000;
  const db = new Database(DB, { readonly: true });
  const stmt = db.query(
    `select json_extract(data,'$.agent') agent,
            json_extract(data,'$.model.id') model,
            json_extract(data,'$.model.variant') variant,
            json_extract(data,'$.tokens.input') i,
            json_extract(data,'$.tokens.output') o,
            json_extract(data,'$.tokens.reasoning') r,
            json_extract(data,'$.tokens.cache.read') c,
            json_extract(data,'$.cost') cost
       from session_message
      where type='assistant' and time_created >= ?`,
  );
  const raw = stmt.all(sinceMs) as {
    agent: string | null;
    model: string | null;
    variant: string | null;
    i: number | null;
    o: number | null;
    r: number | null;
    c: number | null;
    cost: number | null;
  }[];

  const lanes = new Map<string, Lane>();
  for (const m of raw) {
    if (!m.agent || !m.model || m.cost == null) continue;
    const key = `${m.agent}|${m.model}|${m.variant ?? "default"}`;
    if (!lanes.has(key))
      lanes.set(key, {
        agent: m.agent,
        model: m.model,
        variant: m.variant ?? "default",
        rows: [],
      });
    lanes.get(key)!.rows.push({
      i: m.i ?? 0,
      o: (m.o ?? 0) + (m.r ?? 0),
      c: m.c ?? 0,
      cost: m.cost,
    });
  }

  const out: unknown[] = [];
  const warnings: string[] = [];
  for (const lane of lanes.values()) {
    const needle = args.lane;
    if (
      needle &&
      !lane.agent.includes(needle) &&
      !lane.model.includes(needle)
    )
      continue;
    const total = lane.rows.reduce((s, r) => s + r.cost, 0);
    const ti = lane.rows.reduce((s, r) => s + r.i, 0);
    const to = lane.rows.reduce((s, r) => s + r.o, 0);
    const tc = lane.rows.reduce((s, r) => s + r.c, 0);
    const perMsg = total / lane.rows.length;
    const f = fit(lane.rows);
    const entry = {
      agent: lane.agent,
      model: lane.model,
      variant: lane.variant,
      messages: lane.rows.length,
      cash: +total.toFixed(4),
      perMessage: +perMsg.toFixed(5),
      inputM: +(ti / 1e6).toFixed(2),
      outputM: +(to / 1e6).toFixed(2),
      cacheReadM: +(tc / 1e6).toFixed(1),
      fitted: f
        ? {
            input: +f.rate[0].toFixed(4),
            output: +f.rate[1].toFixed(4),
            cacheRead: +f.rate[2].toFixed(5),
          }
        : null,
      fitRms: f ? +Math.sqrt(f.sse / lane.rows.length).toFixed(6) : null,
    };
    out.push(entry);
    if (f && f.rate[2] > WARN_CACHE_READ)
      warnings.push(
        `WARN ${lane.agent} (${lane.model} @${lane.variant}): fitted cache read $${f.rate[2].toFixed(5)}/M > $${WARN_CACHE_READ} — an expensive-cache endpoint is serving this lane`,
      );
    if (perMsg > WARN_MESSAGE)
      warnings.push(
        `WARN ${lane.agent} (${lane.model} @${lane.variant}): $${perMsg.toFixed(5)}/message > $${WARN_MESSAGE} — the floor-week band`,
      );
  }

  out.sort((x, y) => ((y as any).cash ?? 0) - ((x as any).cash ?? 0));

  if (args.json) {
    console.log(JSON.stringify({ sinceMs, lanes: out, warnings }, null, 2));
  } else {
    const d = new Date(sinceMs).toISOString().slice(0, 10);
    console.log(`fitted lane rates since ${d} (thresholds: cache read $${WARN_CACHE_READ}/M, $${WARN_MESSAGE}/msg)\n`);
    console.log(
      "agent         model                                       variant   msgs    cash  $/msg   in/M    out/M   c/M    fit in  out   cR",
    );
    for (const e of out as any[]) {
      const f = e.fitted;
      console.log(
        `${String(e.agent).padEnd(13)} ${String(e.model).padEnd(42)} ${String(e.variant).padEnd(8)} ${String(e.messages).padStart(5)} $${String(e.cash).padStart(6)} ${e.perMessage.toFixed(5)} ${(e.inputM).toFixed(1).padStart(5)} ${(e.outputM).toFixed(1).padStart(7)} ${(e.cacheReadM).toFixed(0).padStart(6)}   ${f ? `${f.input.toFixed(3)} ${f.output.toFixed(3)} ${f.cacheRead.toFixed(4)}` : "n<30 — not fitted"}`,
      );
    }
    console.log();
    if (warnings.length) for (const w of warnings) console.log(w);
    else console.log("no warnings: every fitted lane sits under both thresholds.");
  }
}

main();
