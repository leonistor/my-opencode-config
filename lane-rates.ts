#!/usr/bin/env bun
/**
 * lane-rates.ts — what each lane actually paid, against what the catalogue says.
 *
 * The declared cost tables (models.dev, and the hand declarations kept for
 * `:floor` lanes) are not what OpenRouter bills: the router picks an endpoint
 * per request, so the rate that lands on the invoice is a property of the
 * traffic, not of the catalogue entry. The DB records that bill per message
 * (verified: the 11-22 plain lane solves to Wafer's vector to four decimals),
 * so the honest measurement is per message:
 *
 *     ratio = billed / (in·cat.in + (out+reasoning)·cat.out + cache·cat.cache)
 *
 * and the lane's cost posture is the **median** and **p90** of that ratio, not
 * a fitted rate. A three-term least squares was tried first and is wrong here:
 * cache read is ~88% of the tokens and moves with input, so the fit is
 * ill-conditioned and returns impossible coefficients (the floor week fitted
 * output at -0.142 $/M while every honest lane warned).
 *
 * Catalogue vectors come from `~/.cache/opencode/models-dev.json`, the copy the
 * host itself resolves against; a `:floor` key falls back to its plain model.
 *
 * Usage:
 *   bun lane-rates.ts                  # last 7 days, all lanes
 *   bun lane-rates.ts --days 1         # after a routing change
 *   bun lane-rates.ts --since 2026-11-22
 *   bun lane-rates.ts --lane oracle    # substring filter on agent or model
 *   bun lane-rates.ts --json           # machine-readable
 *
 * Reading it: a lane near 1.00 is on the catalogue vector; a cheap order pin
 * sits under 1.0; >1.5 means the router moved it to a pricier endpoint. The
 * pin on 2026-11-25 sampled 1.09; Wafer weeks sampled 2.5–2.9.
 *
 * Exit code: 0 always (a warning is printed, not encoded — this runs beside
 * `model-table.ts` in a morning check, where a non-zero exit means nothing).
 */

import { Database } from "bun:sqlite";

const DB = `${process.env.HOME}/.local/share/opencode/opencode.db`;
const CATALOGUE = `${process.env.HOME}/.cache/opencode/models-dev.json`;
const WARN_RATIO_MEDIAN = 1.5; // the lane is routed above its catalogue
const WARN_RATIO_P90 = 3; // one turn in ten lands on a much pricier host
const WARN_MESSAGE_P90 = 0.008; // $/message p90 — a long turn on a pricier host

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

type Rate = { input: number; output: number; cache: number };
type Msg = { i: number; o: number; c: number; cost: number; ratio: number };
type Lane = { agent: string; model: string; variant: string; msgs: Msg[] };

async function catalogue(): Promise<Map<string, Rate>> {
  const text = await Bun.file(CATALOGUE).text().catch(() => null);
  if (!text) {
    console.error(
      `no catalogue at ${CATALOGUE} — open OpenCode once so the host refreshes it`,
    );
    process.exit(2);
  }
  const models = JSON.parse(text)?.openrouter?.models as Record<
    string,
    { cost?: { input?: number; output?: number; cache_read?: number } }
  >;
  const out = new Map<string, Rate>();
  for (const [id, m] of Object.entries(models ?? {})) {
    const c = m.cost;
    if (!c || c.input == null || c.output == null) continue;
    out.set(id, {
      input: c.input,
      output: c.output,
      cache: c.cache_read ?? 0,
    });
  }
  return out;
}

function rateFor(id: string, rates: Map<string, Rate>): Rate | undefined {
  return rates.get(id) ?? rates.get(id.replace(/:floor$/, ""));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rates = await catalogue();
  const sinceMs =
    args.since ?? Date.now() - args.days * 24 * 60 * 60 * 1000;

  const db = new Database(DB, { readonly: true });
  const raw = db
    .query(
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
    )
    .all(sinceMs) as {
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
  let skipped = 0;
  for (const m of raw) {
    if (!m.agent || !m.model || m.cost == null || !Number.isFinite(m.cost)) {
      skipped++;
      continue;
    }
    const rate = rateFor(m.model, rates);
    if (!rate) {
      skipped++;
      continue;
    }
    const i = m.i ?? 0;
    const o = (m.o ?? 0) + (m.r ?? 0);
    const c = m.c ?? 0;
    const list = (i * rate.input + o * rate.output + c * rate.cache) / 1e6;
    if (list <= 0) {
      skipped++;
      continue;
    }
    const key = `${m.agent}|${m.model}|${m.variant ?? "default"}`;
    if (!lanes.has(key))
      lanes.set(key, {
        agent: m.agent,
        model: m.model,
        variant: m.variant ?? "default",
        msgs: [],
      });
    lanes.get(key)!.msgs.push({ i, o, c, cost: m.cost, ratio: m.cost / list });
  }

  const out: unknown[] = [];
  const warnings: string[] = [];
  for (const lane of lanes.values()) {
    const msgs = lane.msgs;
    const needle = args.lane;
    if (
      needle &&
      !lane.agent.includes(needle) &&
      !lane.model.includes(needle)
    )
      continue;
    const cash = msgs.reduce((s, m) => s + m.cost, 0);
    const ti = msgs.reduce((s, m) => s + m.i, 0);
    const to = msgs.reduce((s, m) => s + m.o, 0);
    const tc = msgs.reduce((s, m) => s + m.c, 0);
    const perMsg = msgs.map((m) => m.cost).sort((a, b) => a - b);
    const ratios = msgs.map((m) => m.ratio).sort((a, b) => a - b);
    const n = msgs.length;
    const median = quantile(ratios, 0.5);
    const p90 = quantile(ratios, 0.9);
    const perMsgP90 = quantile(perMsg, 0.9);
    const entry = {
      agent: lane.agent,
      model: lane.model,
      variant: lane.variant,
      messages: n,
      cash: +cash.toFixed(4),
      perMessage: +(cash / n).toFixed(5),
      perMessageP90: +perMsgP90.toFixed(5),
      ratioMedian: +median.toFixed(2),
      ratioP90: +p90.toFixed(2),
      inputM: +(ti / 1e6).toFixed(2),
      outputM: +(to / 1e6).toFixed(2),
      cacheReadM: +(tc / 1e6).toFixed(1),
      cacheShare: +((tc / Math.max(1, ti + to + tc)) * 100).toFixed(0),
    };
    out.push(entry);
    const label = `${lane.agent} (${lane.model} @${lane.variant})`;
    if (n >= 20 && median > WARN_RATIO_MEDIAN)
      warnings.push(
        `WARN ${label}: billed ${median.toFixed(2)}x catalogue at the median over ${n} messages — the router moved this lane off its cheap endpoints`,
      );
    if (n >= 10 && p90 > WARN_RATIO_P90)
      warnings.push(
        `WARN ${label}: p90 ${p90.toFixed(2)}x catalogue — one turn in ten is landing on a much pricier host`,
      );
    if (n >= 10 && perMsgP90 > WARN_MESSAGE_P90)
      warnings.push(
        `WARN ${label}: p90 $${perMsgP90.toFixed(5)}/message > $${WARN_MESSAGE_P90} — long turns are landing on a pricier host`,
      );
  }

  out.sort((x, y) => ((y as any).cash ?? 0) - ((x as any).cash ?? 0));

  if (args.json) {
    console.log(
      JSON.stringify({ sinceMs, skipped, lanes: out, warnings }, null, 2),
    );
  } else {
    const d = new Date(sinceMs).toISOString().slice(0, 10);
    console.log(
      `billed vs catalogue since ${d} (median > ${WARN_RATIO_MEDIAN}x warns, ${skipped} rows skipped)\n`,
    );
    console.log(
      "agent         model                                   variant   msgs    cash   $/msg   med  p90  cache%",
    );
    for (const e of out as any[]) {
      console.log(
        `${String(e.agent).padEnd(13)} ${String(e.model).padEnd(39)} ${String(e.variant).padEnd(8)} ${String(e.messages).padStart(5)} $${String(e.cash).padStart(7)} ${String(e.perMessage).padStart(7)} ${String(e.ratioMedian).padStart(5)} ${String(e.ratioP90).padStart(4)} ${String(e.cacheShare).padStart(5)}%`,
      );
    }
    console.log();
    if (warnings.length) for (const w of warnings) console.log(w);
    else console.log("no warnings: every lane bills near its catalogue vector.");
  }
}

main();
