import type { SceneView } from "../horizon/viewer";

const ALL = { roads: true, railways: true, ground: true, basemap: false };

/**
 * The 3D views of the report, one per figure. A single Horizon viewer moves from figure to figure: when a figure
 * becomes the main one on screen, the viewer flies to its camera and applies its scenario and layers.
 */
export const VIEWS = {
    /** Figure 1: the study area (the computed ground map) on the Plan IGN basemap, seen from high up. */
    area: {
        camera: { target: { latitude: 48.1095, longitude: -1.6795 }, bearing: 0, tilt: 0.45, distance: 2900 },
        scenario: "baseline",
        layers: { roads: true, railways: true, ground: true, basemap: true },
    },
    /** Figure 2: today's noise over the city centre and the station, seen from the south. */
    baseline: {
        camera: { target: { latitude: 48.1075, longitude: -1.6805 }, bearing: 0.15, tilt: 0.55, distance: 1300 },
        scenario: "baseline",
        layers: ALL,
    },
    /** Figure 4: façades along Boulevard de la Tour d'Auvergne, close up. */
    facades: {
        camera: { target: { latitude: 48.1055, longitude: -1.6835 }, bearing: 0.7, tilt: 1.15, distance: 420 },
        scenario: "baseline",
        layers: { ...ALL, ground: false },
    },
    /** Figure 5: scenario comparison around Boulevard de la Liberté and the République quays. */
    compare: {
        camera: { target: { latitude: 48.108, longitude: -1.679 }, bearing: -0.35, tilt: 0.95, distance: 750 },
        scenario: "zone30",
        layers: ALL,
    },
} satisfies Record<string, SceneView>;

export type ViewId = keyof typeof VIEWS;
