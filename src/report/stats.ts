import { num } from "../i18n";
import type { Scenario } from "../palette";
import data from "./stats.json";

/**
 * Figures of the report, pre-computed from the files in public/data and shipped as stats.json: ground shares are
 * area-weighted over the 1.5 m rasters, envelope shares weighted by façade texture area. Shares are fractions (0-1),
 * levels in dB(A) Lden.
 */
export interface Summary {
    /** Hectares (ground) or texels (envelope). */
    total: number;
    /** Share per 5 dB class: < 45, 45-50, …, 70-75, ≥ 75. */
    classes: number[];
    overLimit: number;
    overWho: number;
    under50: number;
    median: number;
    energeticMean: number;
}

export interface Delta {
    mean: number;
    p10: number;
    under1: number;
    under3: number;
    worse: number;
}

export interface ScenarioStats {
    ground: Summary & { delta?: Delta };
    envelope: Summary;
    traffic: { vehKmPerDay: number; hgvKmPerDay: number; meanSpeed: number; closedKm: number };
}

export interface Stats {
    edges: number[];
    limitRoad: number;
    whoRoad: number;
    scenarios: Record<Scenario, ScenarioStats>;
    network: { byImportance: Record<string, { km: number; tmja: number; speed: number }>; totalKm: number };
    buildings: { count: number; byUsage: Record<string, number>; medianHeight: number };
}

export const STATS = data as Stats;

/** Class labels: "< 45", "45–50", …, "≥ 75". */
export const CLASS_LABELS = STATS.edges.map((e, i) => (i === 0 ? `< ${e}` : `${STATS.edges[i - 1]}–${e}`)).concat(`≥ ${STATS.edges.at(-1)}`);
/** A representative level per class, for its colour. */
export const CLASS_LEVELS = STATS.edges.map((e) => e - 2.5).concat(STATS.edges.at(-1)! + 2.5);

/** Share as a percentage in the current locale: 0.111 -> "11 %". */
export const pct = (share: number, digits = 0) =>
    num(share * 100, { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " %";
/** Level in dB with one decimal: "53,1". */
export const db = (value: number, signed = false) =>
    num(value, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: signed ? "exceptZero" : "auto" }).replace("-", "\u2212");
