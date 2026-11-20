import { BarChart } from "../components/Charts";
import { t, type Text } from "../i18n";
import { type Scenario, SCENARIOS } from "../palette";
import { db, pct, type ScenarioStats, STATS } from "./stats";

/**
 * What both the document and the slides say: findings derived from STATS, and the small blocks they share.
 * Comparisons ("the scenario that reduces exceedances the most") are computed, so they follow the data.
 */

export const S = STATS.scenarios;
export const B = S.baseline;
export const label = (id: Scenario) => t(SCENARIOS.find((s) => s.id === id)!.label);

/** The three scenarios compared with today. */
export const others: Scenario[] = ["zone30", "light", "car_free"];
const bestBy = (f: (s: Scenario) => number) => others.reduce((a, b) => (f(b) < f(a) ? b : a));
/** Scenario with the least open space above the limit value. */
export const bestLimit = bestBy((s) => S[s].ground.overLimit);
/** Scenario with the most quiet open space (below 50 dB). */
export const bestCalm = bestBy((s) => -S[s].ground.under50);

export const net = STATS.network.byImportance;
const vkm = (k: string) => (net[k]?.km ?? 0) * (net[k]?.tmja ?? 0);
/** Share of the daily vehicle-kilometres carried by the main roads (importance 3). */
export const mainShare = vkm("3") / Object.keys(net).reduce((sum, k) => sum + vkm(k), 0);
/** Share of the network length made of main roads. */
export const mainLength = (net["3"]?.km ?? 0) / STATS.network.totalKm;

export const SOURCE_SIM: Text = {
    en: "Source: NoiseModelling simulation (CNOSSOS-EU) on IGN BD TOPO® (October 2026 extract), synthetic traffic.",
    fr: "Source : simulation NoiseModelling (CNOSSOS-EU) sur BD TOPO® IGN (extraction d'octobre 2026), trafic synthétique.",
};

export const DEMO_NOTE: Text = { en: "Horizon demo — synthetic traffic, illustrative values", fr: "Démonstrateur Horizon — trafic synthétique, valeurs indicatives" };

/** A key figure: big value, what it measures, an optional note. */
export function Kpi(props: { value: string; label: Text; note?: Text; size?: "lg" }) {
    return (
        <div class="border-t-2 border-[var(--navy)] pt-2 font-sans">
            <div class="leading-tight font-semibold text-[var(--navy)] tabular-nums" classList={{ "text-[28px]": !props.size, "text-[44px]": props.size === "lg" }}>
                {props.value}
            </div>
            <div class="mt-1 leading-snug text-[var(--ink)]" classList={{ "text-[12.5px]": !props.size, "text-[16px]": props.size === "lg" }}>
                {t(props.label)}
            </div>
            {props.note && (
                <div class="mt-1 leading-snug text-[var(--muted)]" classList={{ "text-[11px]": !props.size, "text-[13px]": props.size === "lg" }}>
                    {t(props.note)}
                </div>
            )}
        </div>
    );
}

/** The three key figures of the summary and of the title slide (a function: formatting follows the language). */
export const keyFigures = (): { value: string; label: Text; note: Text }[] => [
    {
        value: pct(B.ground.overWho),
        label: { en: `of the open space above ${STATS.whoRoad} dB(A) Lden today`, fr: `de l'espace public au-delà de ${STATS.whoRoad} dB(A) Lden aujourd'hui` },
        note: { en: "WHO guideline for road traffic (2018)", fr: "Recommandation OMS pour le trafic routier (2018)" },
    },
    {
        value: pct(B.ground.overLimit),
        label: { en: `above the ${STATS.limitRoad} dB(A) road limit value`, fr: `au-delà de la valeur limite routière de ${STATS.limitRoad} dB(A)` },
        note: { en: "Concentrated along the main roads", fr: "Concentrés le long des axes structurants" },
    },
    {
        value: `${db(S.car_free.ground.delta!.mean, true)} dB`,
        label: { en: `average change at 1.5 m with “${label("car_free")}”`, fr: `d'écart moyen à 1,5 m avec «\u00a0${label("car_free")}\u00a0»` },
        note: { en: `${pct(S.car_free.ground.delta!.under3)} of the area gains 3 dB or more`, fr: `${pct(S.car_free.ground.delta!.under3)} de la surface gagne 3 dB ou plus` },
    },
];

/** Exposure indicators compared across scenarios (Table 3 of the document, the scenario slide). */
export const INDICATORS: { label: Text; value: (s: ScenarioStats) => string }[] = [
    { label: { en: `Open space > ${STATS.limitRoad} dB`, fr: `Espace public > ${STATS.limitRoad} dB` }, value: (s) => pct(s.ground.overLimit, 1) },
    { label: { en: "Quiet open space (< 50 dB)", fr: "Espace public calme (< 50 dB)" }, value: (s) => pct(s.ground.under50) },
    { label: { en: `Building envelope > ${STATS.limitRoad} dB`, fr: `Enveloppe bâtie > ${STATS.limitRoad} dB` }, value: (s) => pct(s.envelope.overLimit, 1) },
    { label: { en: "Mean change at 1.5 m", fr: "Écart moyen à 1,5 m" }, value: (s) => (s.ground.delta ? `${db(s.ground.delta.mean, true)} dB` : "—") },
];

export const GAINS_TITLE: Text = { en: "Share of the open space gaining at least 1 dB and 3 dB", fr: "Part de l'espace public gagnant au moins 1 dB et 3 dB" };

/** Gains of each scenario against today: share of the open space gaining ≥ 1 dB and ≥ 3 dB. */
export function GainsChart() {
    return (
        <BarChart
            max={1}
            rows={others.map((id) => ({ label: label(id), values: [S[id].ground.delta!.under1, S[id].ground.delta!.under3] }))}
            series={[
                { label: { en: "≥ 1 dB (noticeable)", fr: "≥ 1 dB (perceptible)" }, color: "var(--teal)" },
                { label: { en: "≥ 3 dB (half the energy)", fr: "≥ 3 dB (moitié de l'énergie)" }, color: "var(--navy)" },
            ]}
        />
    );
}
