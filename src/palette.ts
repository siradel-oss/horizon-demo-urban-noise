import type { Text } from "./i18n";

// Colour stops (dB(A)), one every 5 dB; colours are interpolated in between.
export const STOPS = [35, 40, 45, 50, 55, 60, 65, 70, 75];
/** Façades without a value (outside the computed area): opaque white. */
export const NO_DATA = "#ffffff";
/**
 * WORKAROUND (NaN handling in Horizon data-texture palettes): the façade textures in public/data store
 * no-data texels as this value instead of NaN. Anything below NO_DATA_THRESHOLD is shown as no data.
 */
export const NO_DATA_SENTINEL = -1000;
export const NO_DATA_THRESHOLD = -500;

/** Noise colours, one per stop, quietest first (in the spirit of DIN 18005 / strategic noise maps). */
export const COLORS = ["#b8dc9c", "#4fa64a", "#e8e14f", "#f2a93b", "#e3622b", "#c8223c", "#8f1a52", "#55288a", "#1f3c8f"];

export type Scenario = "baseline" | "zone30" | "light" | "car_free";

export const SCENARIOS: { id: Scenario; label: Text; description: Text }[] = [
    {
        id: "baseline",
        label: { en: "Current", fr: "Actuel" },
        description: {
            en: "Today's speed limits (50 km/h on main roads, 30 elsewhere).",
            fr: "Vitesses actuelles (50 km/h sur les axes, 30 ailleurs).",
        },
    },
    {
        id: "zone30",
        label: { en: "Zone 30", fr: "Zone 30" },
        description: {
            en: "30 km/h everywhere, 20 km/h on minor streets.",
            fr: "30 km/h partout, 20 km/h dans les petites rues.",
        },
    },
    {
        id: "light",
        label: { en: "Light vehicles", fr: "Véhicules légers" },
        description: {
            en: "Heavy vehicles banned (their trips disappear), today's speeds.",
            fr: "Poids lourds interdits (leurs trajets disparaissent), vitesses actuelles.",
        },
    },
    {
        id: "car_free",
        label: { en: "Car-free streets", fr: "Rues sans voiture" },
        description: {
            en: "Heavy vehicles banned, and minor streets for pedestrians and bikes only.",
            fr: "Poids lourds interdits, et petites rues réservées aux piétons et aux vélos.",
        },
    },
];

/** Synthetic heavy-vehicle share per BD TOPO importance (the same values as in the noise computation). */
const HGV_SHARE: Record<number, number> = { 1: 0.08, 2: 0.08, 3: 0.05, 4: 0.02 };

export interface RoadTraffic {
    closed: boolean; // pedestrians and bikes only
    tmja: number; // vehicles per day
    hgvShare: number;
    speed: number; // km/h
}

/** Road traffic under a scenario, from its baseline attributes; the same rules as in the noise computation. */
export function scenarioTraffic(scenario: Scenario, importance: number, tmja: number, speed: number): RoadTraffic {
    const hgvShare = HGV_SHARE[importance] ?? 0;
    switch (scenario) {
        case "baseline":
            return { closed: false, tmja, hgvShare, speed };
        case "zone30":
            return { closed: false, tmja, hgvShare, speed: Math.min(speed, importance >= 5 ? 20 : 30) };
        case "light":
        case "car_free":
            if (scenario === "car_free" && importance >= 5) return { closed: true, tmja: 0, hgvShare: 0, speed: 0 };
            return { closed: false, tmja: Math.round(tmja * (1 - hgvShare)), hgvShare: 0, speed };
    }
}

export function hexToRgba(hex: string, a = 1) {
    const n = parseInt(hex.slice(1), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a };
}

/** CSS colour of a value (linear interpolation between stops, close enough to the engine's OkLab one;
 * clamped to the end colours outside the stops). */
export function colorAt(lden: number) {
    const last = STOPS.length - 1;
    const t = Math.min(Math.max((lden - STOPS[0]) / (STOPS[last] - STOPS[0]), 0), 1) * last;
    const i = Math.min(Math.floor(t), last - 1);
    const [a, b] = [hexToRgba(COLORS[i]), hexToRgba(COLORS[i + 1])];
    const mix = (x: number, y: number) => Math.round((x + (y - x) * (t - i)) * 255);
    return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

/** CSS gradient of the palette, quietest first. */
export function cssGradient(direction = "to right") {
    const last = STOPS.length - 1;
    return `linear-gradient(${direction}, ${COLORS.map((c, i) => `${c} ${(i / last) * 100}%`).join(", ")})`;
}
