import { HrzApi } from "@siradel-oss/horizon-api";
import { HrzCoreBackend, type HrzCoreRuntimeFile } from "@siradel-oss/horizon-core";
import { HrzProtocol } from "@siradel-oss/horizon-protocol";

import { PHONE } from "../device";
import { COLORS, hexToRgba, NO_DATA, NO_DATA_THRESHOLD, SCENARIOS, STOPS, type Scenario } from "../palette";

/** Absolute URL of a file under public/data (works whatever the deployment base path is). */
const dataUrl = (path: string) => new URL("./", document.baseURI).href + "data/" + path;

const ROADS_DATA_ID = 1;
const RAIL_DATA_ID = 2;

/**
 * `groundLden`: value of the ground noise raster under the click (1.5 m Lden). `undefined` when the raster wasn't
 * picked (layer hidden), `null` for no data (e.g. inside a building footprint, or not loaded yet).
 */
export type PickInfo =
    | { kind: "building"; lden: number | null; height?: number; nature?: string; usage?: string }
    | { kind: "road" | "railway"; attributes: Record<string, string | number>; groundLden?: number | null }
    | { kind: "ground"; groundLden: number | null };

interface PickHandles {
    buildings: HrzProtocol.LayerHandle.$Properties;
    roads: HrzProtocol.LayerHandle.$Properties;
    railways: HrzProtocol.LayerHandle.$Properties;
    ground: HrzProtocol.LayerHandle.$Properties;
}

export type LayerKind = "roads" | "railways" | "basemap" | "ground";

/** Orbit camera: target, bearing and tilt in radians, distance in metres. */
export interface Camera {
    target: { latitude: number; longitude: number };
    bearing: number;
    tilt: number;
    distance: number;
}

/** What a figure of the report shows: where the camera looks, which scenario, which layers. */
export interface SceneView {
    camera: Camera;
    scenario: Scenario;
    layers: Record<LayerKind, boolean>;
}

export interface Viewer {
    /** Moves to a figure's view: flies the camera (or jumps when `animate` is false), sets scenario and layers. */
    show(view: SceneView, animate: boolean): Promise<void>;
    setScenario(scenario: Scenario): Promise<void>;
}

// --- Palette ---------------------------------------------------------------

/** Continuous noise palette: one stop per 5 dB, interpolated in OkLab, clamped outside 35–75 dB. */
function noisePalette(): HrzProtocol.NumericPalette.$Properties {
    return {
        interpolationMode: HrzProtocol.ColorInterpolationMode.OKLAB,
        colorStops: [
            // WORKAROUND (NaN in data-texture palettes): no-data texels are stored as NO_DATA_SENTINEL;
            // everything below this stop is no data, everything above starts with the first colour.
            { value: NO_DATA_THRESHOLD, firstColor: hexToRgba(NO_DATA), secondColor: hexToRgba(COLORS[0]) },
            // Same colour on both sides of each stop: values below 35 / above 75 dB take the end colours.
            ...STOPS.map((value, i) => ({
                value,
                firstColor: hexToRgba(COLORS[i]),
                secondColor: hexToRgba(COLORS[i]),
            })),
        ],
        nanColor: hexToRgba(NO_DATA), // no data (outside the computed area): opaque white
    };
}

// --- Scene model helper -------------------------------------------------------

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Uint8Array);

/** Deep-merges `patch` into `target` (plain objects merged, arrays and scalars replaced). */
function deepMerge(target: Plain, patch: Plain): Plain {
    for (const [key, value] of Object.entries(patch)) {
        const current = target[key];
        target[key] = isPlain(value) && isPlain(current) ? deepMerge(current, value) : value;
    }
    return target;
}

/**
 * A full `set()` resets every field left out to 0 / null / empty, losing the engine defaults.
 * So for initial setups: get the current model, merge the changes into it, set it back.
 */
async function configure<T>(
    api: HrzApi.AsyncApi,
    path: { get(api: HrzApi.AsyncApi): Promise<T>; set(api: HrzApi.AsyncApi, value: T): Promise<unknown> },
    patch: Plain,
) {
    const model = (await path.get(api)) as unknown as Plain;
    await path.set(api, deepMerge(model ?? {}, patch) as unknown as T);
}

// --- Layers ----------------------------------------------------------------

async function addBasemap(api: HrzApi.AsyncApi, visible: boolean) {
    const handle = await api.LayerService.createLayer({ name: "Plan IGN v2", type: HrzProtocol.LayerType.IMAGERY_RASTER });
    await configure(api, HrzApi.ImageryRasterLayerPathBuilder.create(handle), {
        raster: {
            provider: {
                wmts: {
                    url: "https://data.geopf.fr/annexes/ressources/wmts/essentiels.xml",
                    attribution: "Institut national de l'information géographique et forestière",
                    layerIdentifier: "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
                    imageFormat: HrzProtocol.ImageFormat.SRGBA_8,
                    missingTilePolicy: HrzProtocol.MissingTilePolicy.USE_LOWER_RESOLUTION,
                },
            },
            sampling: {
                filtering: HrzProtocol.TextureFiltering.BILINEAR,
                alphaChannelUsage: HrzProtocol.AlphaChannelUsage.IGNORE_ALPHA_CHANNEL,
                nodataHandling: HrzProtocol.NodataHandling.IGNORE_NODATA,
            },
            blending: { opacity: 1 },
            displayBounds: { east: 180, north: 90, south: -90, west: -180 },
        },
        visible,
        sceneViews: { bits: 1 },
    });
    return handle;
}

/** Ground noise map: the scenario's 1.5 m Lden raster (float32 PMTiles, NaN = no data). */
const groundUrl = (scenario: Scenario) => dataUrl(`ground/${scenario}.pmtiles`);

async function addGroundNoise(api: HrzApi.AsyncApi, scenario: Scenario, visible: boolean) {
    const handle = await api.LayerService.createLayer({ name: "Ground noise (1.5 m)", type: HrzProtocol.LayerType.IMAGERY_RASTER });
    await configure(api, HrzApi.ImageryRasterLayerPathBuilder.create(handle), {
        raster: {
            provider: {
                // Float PMTiles (one float32 per pixel, R_F32) coloured with the same palette as the façades.
                palettized: {
                    provider: {
                        pmtiles: {
                            url: groundUrl(scenario),
                            attribution: "NoiseModelling",
                            imageFormat: HrzProtocol.ImageFormat.R_F32,
                            // No-data pixels are NaN: declared here and discarded below, before the palette.
                            nodata: { hasNodata: true, value: { floatNan: {} } },
                            missingTilePolicy: HrzProtocol.MissingTilePolicy.USE_LOWER_RESOLUTION,
                            // Raster tiles aren't cached by the engine by default (the browser cache is relied on),
                            // but picking reads raster values from that engine cache. The dataset is tiny (17 tiles
                            // per scenario, zooms 10-14), so keep all of them: picking then returns the ground Lden.
                            overrideTileCacheSize: true,
                            tileCacheSize: 64,
                        },
                    },
                    palette: noisePalette(),
                },
            },
            sampling: {
                filtering: HrzProtocol.TextureFiltering.BILINEAR,
                nodataHandling: HrzProtocol.NodataHandling.DISCARD_NODATA_PIXELS,
                // Use the alpha of the palettized colours, so no-data areas are transparent (not black).
                alphaChannelUsage: HrzProtocol.AlphaChannelUsage.USE_ALPHA_CHANNEL,
            },
            blending: { opacity: 1 },
        },
        // Above the basemap.
        group: HrzProtocol.RasterGroup.TOP_RASTER_GROUP,
        visible,
        sceneViews: { bits: 1 },
    });
    return handle;
}

const textureTemplate = (scenario: Scenario) => dataUrl(`textures/${scenario}/{tileId}.png`);
/** One building material per scenario: switching scenario only changes the active (base) material. */
const scenarioMaterial = (scenario: Scenario) => `noise_${scenario}`;

async function addBuildings(api: HrzApi.AsyncApi, scenario: Scenario) {
    const handle = await api.LayerService.createLayer({ name: "Buildings", type: HrzProtocol.LayerType.THREE_D_TILES });
    await configure(api, HrzApi.ThreeDTilesLayerPathBuilder.create(handle), {
        url: dataUrl("buildings/tileset.json"),
        // Lower than usual: the tileset has no content in its coarse levels,
        // so refine early to show buildings from further away.
        maxScreenSpaceError: 6,
        refinementHysteresis: 0.25,
        // The batch table holds the building id (key of buildings_attributes.json); needed for picking results.
        attributes: [{ name: "id", source: HrzProtocol.ThreeDTileAttributeSource.BATCH_TABLE_SOURCE, isFeatureId: true }],
        // Tiles declare a "data" material variant whose data texture is a templated image
        // (template "dataTemplate", parameter "tileId") -> point it at the façade textures, one material per
        // scenario. Switching scenario then only changes the base material: buildings only flicker while
        // a scenario's textures haven't been loaded yet, instead of reloading everything on each switch.
        materials: SCENARIOS.map((s) => ({
            name: scenarioMaterial(s.id),
            variantName: "data",
            urls: [{ name: "dataTemplate", url: textureTemplate(s.id) }],
            dataTexturePalette: noisePalette(),
        })),
        materialProperties: { baseMaterial: scenarioMaterial(scenario) },
        visible: true,
        sceneViews: { bits: 1 },
    });
    return handle;
}

interface NetworkLayer {
    dataId: number;
    layerName: string;
    attributes: string[];
    /** Must set "fill_color", "casing_color", "fill_width" and "casing_width", then emit both lines. */
    script: (scenario: Scenario) => string;
    /** zIndex of the casing; the fill goes right above it. */
    zIndex: number;
}

// Each line is drawn twice: a wider, darker "casing" underneath and the "fill" on top (Horizon has no
// polyline outline). Widths are in metres. Colours follow Google Maps' conventions.
const DRAW_BOTH = `
    fork { emit "casing"; }
    emit "fill";
`;

const NETWORK: Record<"roads" | "railways", NetworkLayer> = {
    roads: {
        dataId: ROADS_DATA_ID,
        layerName: "roads",
        attributes: ["id", "name", "nature", "direction", "importance", "width", "nb_lanes", "tmja", "speed"],
        // Real carriageway width (BD TOPO largeur_de_chaussee, 6 m when unknown).
        script: (scenario) => `
            set "fill_width" = value_or(attr("width"), 6);
            set "casing_width" = add(prp("fill_width"), 3);
            // The study area has no importance 1-2 roads, so the classes are shifted to use the full
            // Google-like range: 3 = orange, 4 = yellow, 5 = white/grey, 6 = minor.
            // (Scripts can only set representation properties, hence no intermediate variable.)
            if (${scenario === "car_free" ? "true" : "false"} and attr("importance") >= 5) {
                set "fill_color" = #e6e1d8;     // pedestrians & bikes only (car-free scenario)
                set "casing_color" = #c9c1b3;
            } elif (attr("importance") <= 3) {
                set "fill_color" = #f7b955;     // motorway / main highway: orange
                set "casing_color" = #d48a2c;
            } elif (attr("importance") == 4) {
                set "fill_color" = #fde293;     // major road: yellow
                set "casing_color" = #e3b54f;
            } elif (attr("importance") == 5) {
                set "fill_color" = #ffffff;     // arterial: white, grey casing
                set "casing_color" = #b4b9bf;
            } else {
                set "fill_color" = #f8f9fa;     // minor street
                set "casing_color" = #d9dce0;
            }
            ${DRAW_BOTH}
        `,
        zIndex: 0,
    },
    railways: {
        dataId: RAIL_DATA_ID,
        layerName: "railways",
        attributes: ["id", "name", "nature", "ntrack", "trackspd"],
        // About 4.5 m of platform per track.
        script: () => `
            set "fill_width" = mul(value_or(attr("ntrack"), 2), 4.5);
            set "casing_width" = add(prp("fill_width"), 3);
            set "fill_color" = #aeb3b9;
            set "casing_color" = #6f757c;
            ${DRAW_BOTH}
        `,
        zIndex: 2,
    },
};

/** Opaque flat polyline whose colour and width are bound to script properties. */
function polyline(name: string, prefix: "fill" | "casing", zIndex: number) {
    return {
        id: prefix === "casing" ? 0 : 1,
        name,
        sceneViews: { bits: 1 },
        flatOverlayPolyline: {
            color: { name: `${prefix}_color`, defaultValue: { r: 1, g: 1, b: 1, a: 1 } },
            width: { name: `${prefix}_width`, defaultValue: 6 },
            widthUnit: HrzProtocol.InWorldSizeUnit.IN_WORLD_SIZE_IN_METERS,
            roundTips: true,
            zIndex,
        },
    };
}

async function addNetwork(api: HrzApi.AsyncApi, kind: "roads" | "railways", visible: boolean, scenario: Scenario) {
    const cfg = NETWORK[kind];
    const dataHandle = await api.LayerService.createLayer({ name: `${kind} data`, type: HrzProtocol.LayerType.VECTOR_DATA });
    await configure(api, HrzApi.VectorDataLayerPathBuilder.create(dataHandle), {
        id: cfg.dataId,
        sources: [
            {
                hasGeometry: true,
                pmtilesDataProvider: { url: dataUrl("network.pmtiles"), layerName: cfg.layerName, attribution: "IGN BD TOPO" },
                attributes: cfg.attributes.map((name, i) => ({ id: i + 1, sourceName: name, isFeatureId: name === "id" })),
            },
        ],
    });

    const tilesHandle = await api.LayerService.createLayer({ name: kind, type: HrzProtocol.LayerType.VECTOR_TILES });
    await configure(api, HrzApi.VectorTilesLayerPathBuilder.create(tilesHandle), {
        source: { vectorDataLayerId: cfg.dataId },
        style: {
            attributes: cfg.attributes.map((name, i) => ({ stylingName: name, vectorDataAttrId: i + 1 })),
            stylingScript: cfg.script(scenario),
            representations: [polyline("casing", "casing", cfg.zIndex), polyline("fill", "fill", cfg.zIndex + 1)],
        },
        staticTiles: true,
        visible,
        sceneViews: { bits: 1 },
    });
    return tilesHandle;
}

// --- Picking ---------------------------------------------------------------

type BuildingAttrs = Record<string, [number, string, string]>;

/** Value of an AttributeValue oneof (64-bit integers arrive as Long or string). */
function attributeValue(v: HrzProtocol.AttributeValue.$Properties): string | number | boolean | undefined {
    const raw = v.stringValue ?? v.numberValue ?? v.int64Value ?? v.uint64Value ?? v.booleanValue ?? undefined;
    return raw == null || typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw ?? undefined : Number(raw);
}

function toPickInfo(
    results: HrzProtocol.PickResults.$Properties | null | undefined,
    handles: PickHandles,
    buildingAttrs: BuildingAttrs | undefined,
): PickInfo | null {
    const sameHandle = (a?: HrzProtocol.LayerHandle.$Properties | null, b?: HrzProtocol.LayerHandle.$Properties) =>
        !!a && !!b && String(a.opaque) === String(b.opaque);

    // Rasters listed in the pick request's includedRasters are reported for the clicked position, whatever was
    // clicked on top of them. A palettized raster returns its original value (the Lden), not the colour.
    // (Horizon answers from its own tile cache, hence the tile cache override on the ground PMTiles provider.)
    let groundLden: number | null | undefined;
    for (const r of results?.results ?? []) {
        if (r.raster && sameHandle(r.layer?.handle, handles.ground)) {
            const v = r.raster.number;
            groundLden = !r.raster.nodata && v != null && Number.isFinite(v) ? v : null;
        }
    }

    for (const r of results?.results ?? []) {
        if (r.threeDTile && sameHandle(r.layer?.handle, handles.buildings)) {
            const t = r.threeDTile;
            const v = t.dataTextureValue;
            // NaN or the no-data sentinel (see NO_DATA_SENTINEL) -> no value.
            const lden = v != null && Number.isFinite(v) && v > NO_DATA_THRESHOLD ? v : null;
            const idIndex = (t.names ?? []).indexOf("id");
            const id = idIndex >= 0 && t.values?.[idIndex] ? attributeValue(t.values[idIndex]) : undefined;
            const attrs = id != null ? buildingAttrs?.[String(id)] : undefined;
            return { kind: "building", lden, height: attrs?.[0], nature: attrs?.[1], usage: attrs?.[2] };
        }
        for (const kind of ["roads", "railways"] as const) {
            if (r.vector && sameHandle(r.layer?.handle, handles[kind])) {
                const names = NETWORK[kind].attributes;
                const attributes: Record<string, string | number> = {};
                (r.vector.ids ?? []).forEach((attrId, i) => {
                    const name = names[Number(attrId) - 1];
                    const value = r.vector!.values?.[i];
                    if (name && value) attributes[name] = attributeValue(value) as string | number;
                });
                return { kind: kind === "roads" ? "road" : "railway", attributes, groundLden };
            }
        }
    }
    // Nothing else under the click: the ground itself.
    return groundLden !== undefined ? { kind: "ground", groundLden } : null;
}

// --- Camera ------------------------------------------------------------------

/**
 * The camera stays around the study area (2 km around Place de la République + about 250 m of margin) and below
 * 4 km of altitude. Leaving these limits isn't blocked: once the user stops interacting, a short correction
 * animation brings the camera back, which feels less rigid than a hard stop.
 */
function orbit(camera: Camera, goToDuration: number): HrzProtocol.OrbitCameraTransition.$Properties {
    return {
        cameraIndex: HrzProtocol.CameraIndex.CAMERA_0,
        angularViewpoint: camera,
        limitBounds: { west: -1.7012, south: 48.096, east: -1.6578, north: 48.124 },
        maxAltitude: 4000,
        minTilt: 0,
        maxTilt: 1.45,
        altitudeMode: HrzProtocol.AltitudeMode.RELATIVE_TO_ELLIPSOID,
        goToAnimation: { duration: goToDuration, easingFunction: HrzProtocol.EasingFunctions.EASE_INOUT, easingExponent: 2 },
        isInterruptible: true,
        correctionAnimation: { duration: 0.6, easingFunction: HrzProtocol.EasingFunctions.EASE_OUT, easingExponent: 2 },
    };
}

// --- Init --------------------------------------------------------------------

function runtimeFile(file: HrzCoreRuntimeFile) {
    switch (file) {
        case "hrz_core.js":
            return new URL("@siradel-oss/horizon-core/dist/hrz_core.js", import.meta.url).href;
        case "hrz_core.wasm":
            return new URL("@siradel-oss/horizon-core/dist/hrz_core.wasm", import.meta.url).href;
    }
}

export function createViewer(
    canvas: HTMLCanvasElement,
    initial: SceneView,
    onPick: (info: PickInfo | null) => void,
): Promise<Viewer> {
    return new Promise((resolve, reject) => {
        const options = HrzProtocol.ViewerOptions.create({
            showLoadingScreen: true,
            // P toggles Horizon's dev UI. (Ctrl as modifier and R to reset north, as in the Horizon gallery,
            // in case custom bindings replace the default ones.)
            keyBindings: {
                bindings: [
                    { action: HrzProtocol.KeyAction.TOGGLE_DEV_UI, key: HrzProtocol.Key.K_P },
                    { action: HrzProtocol.KeyAction.MOD_KEY, key: HrzProtocol.Key.K_CTRL },
                    { action: HrzProtocol.KeyAction.RESET_NORTH, key: HrzProtocol.Key.K_R },
                ],
            },
            // Phones keep the engine defaults (lighter); desktops get atmosphere and shadows.
            graphicsSettingsOverrides: PHONE ? undefined : { atmosphereEnabled: true, shadowsEnabled: true },
        });
        HrzCoreBackend.init(canvas, runtimeFile, options, (backend, status) => {
            if (!backend || status !== HrzProtocol.ViewerInitStatus.INIT_SUCCESS) {
                reject(new Error(`Horizon init failed: ${HrzProtocol.ViewerInitStatus[status] ?? status}`));
                return;
            }
            const api = new HrzApi.AsyncApi(backend);
            start(api, canvas, initial, onPick).then(resolve, reject);
        });
    });
}

async function start(
    api: HrzApi.AsyncApi,
    canvas: HTMLCanvasElement,
    initial: SceneView,
    onPick: (info: PickInfo | null) => void,
): Promise<Viewer> {
    let pendingPick: string | null = null;
    let handles: PickHandles | null = null;
    let groundVisible = initial.layers.ground;
    const buildingAttrs = fetch(dataUrl("buildings_attributes.json"))
        .then((r) => r.json() as Promise<BuildingAttrs>)
        .catch(() => undefined);
    let attrs: BuildingAttrs | undefined;
    buildingAttrs.then((a) => (attrs = a));

    // Dev-only handle for debugging from the browser console.
    if (import.meta.env.DEV) Object.assign(window, { __hrz: { api, HrzApi, HrzProtocol } });

    // Message pump: must run for the whole lifetime of the viewer.
    await new Promise<void>((ready) => {
        setInterval(async () => {
            try {
                const { messages } = await api.MessageQueueService.dequeueMessages({ maxMessageCount: 100 });
                for (const msg of messages ?? []) {
                    if (msg.viewerReady != null) ready();
                    if (msg.pick && pendingPick && String(msg.pick.ticket?.opaque) === pendingPick) {
                        pendingPick = null;
                        onPick(handles ? toPickInfo(msg.pick.results, handles, attrs) : null);
                    }
                }
            } catch (e) {
                console.error("Horizon message pump:", e);
            }
        }, 50);
    });

    // Click or tap (not drag, not pinch) -> pick. Pointer events, so touch works too.
    let down: { id: number; x: number; y: number } | null = null;
    let pointers = 0;
    canvas.addEventListener("pointerdown", (e) => {
        pointers++;
        down = e.isPrimary && pointers === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
    });
    canvas.addEventListener("pointercancel", () => {
        pointers = Math.max(0, pointers - 1);
        down = null;
    });
    canvas.addEventListener("pointerup", async (e) => {
        pointers = Math.max(0, pointers - 1);
        const start = down;
        down = null;
        if (!start || start.id !== e.pointerId || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
        const rect = canvas.getBoundingClientRect();
        const res = await api.ViewerService.pickScreen({
            // Logical (CSS) pixels, as the API expects.
            coords: { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) },
            // Rasters are only picked when listed: add the ground noise map when it's shown.
            includedRasters: handles && groundVisible ? [handles.ground] : [],
        });
        pendingPick = res.hasATicket ? String(res.ticket?.opaque) : null;
        if (!pendingPick) onPick(null);
    });

    // Opaque, flat ground: the basemap is draped on it. (Terrain opacity defaults to 0 = invisible;
    // elevation is off since the buildings were extruded from 0 m and there is no DTM.)
    const settings = HrzApi.SceneViewSettingsPathBuilder.create(HrzProtocol.SceneViewIndex.SCENE_VIEW_0);
    const settingsToMerge: HrzProtocol.SceneViewSettings.$Properties = {
        terrain: {
            terrainColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
        },
        ambient: {
            sky: {
                mode: HrzProtocol.SkyMode.SKY_STATIC,
            },
            ambientLighting: {
                mode: HrzProtocol.AmbientLightingMode.AMBIENT_LIGHTING_STATIC,
                staticColor: { r: 1, g: 1, b: 1, a: 1 },
            },
            sun: {
                mode: HrzProtocol.SunLightingMode.SUN_LIGHTING_STATIC,
                staticColor: { r: 1, g: 1, b: 1, a: 1 },
            },
            lightingStrength: 0.6,
            sunAmbientBalance: 0.3,
        }
    }
    await configure(api, settings, settingsToMerge as Plain);

    const basemap = await addBasemap(api, initial.layers.basemap);
    const ground = await addGroundNoise(api, initial.scenario, initial.layers.ground);
    const buildings = await addBuildings(api, initial.scenario);
    const roads = await addNetwork(api, "roads", initial.layers.roads, initial.scenario);
    const railways = await addNetwork(api, "railways", initial.layers.railways, initial.scenario);
    handles = { buildings, roads, railways, ground };

    void api.CameraService.setOrbit(orbit(initial.camera, 0));

    const buildingsPath = HrzApi.ThreeDTilesLayerPathBuilder.create(buildings);
    const groundPalettized = HrzApi.ImageryRasterLayerPathBuilder.create(ground).raster().provider().palettized();
    const layerVisible: Record<LayerKind, (visible: boolean) => Promise<unknown>> = {
        basemap: (v) => HrzApi.ImageryRasterLayerPathBuilder.create(basemap).visible().set(api, v),
        ground: (v) => HrzApi.ImageryRasterLayerPathBuilder.create(ground).visible().set(api, v),
        roads: (v) => HrzApi.VectorTilesLayerPathBuilder.create(roads).visible().set(api, v),
        railways: (v) => HrzApi.VectorTilesLayerPathBuilder.create(railways).visible().set(api, v),
    };
    // Current state, so that showing a figure only sends what changes.
    let scenario = initial.scenario;
    const layers = { ...initial.layers };

    const setScenario = async (next: Scenario) => {
        if (next === scenario) return;
        scenario = next;
        await buildingsPath.materialProperties().baseMaterial().set(api, scenarioMaterial(next));
        await HrzApi.VectorTilesLayerPathBuilder.create(roads).style().stylingScript().set(api, NETWORK.roads.script(next));
        await groundPalettized.provider().pmtiles().url().set(api, groundUrl(next));
    };

    return {
        setScenario,
        async show(view, animate) {
            void api.CameraService.setOrbit(orbit(view.camera, animate ? 1.6 : 0));
            for (const kind of Object.keys(layerVisible) as LayerKind[]) {
                if (layers[kind] === view.layers[kind]) continue;
                layers[kind] = view.layers[kind];
                if (kind === "ground") groundVisible = view.layers.ground;
                await layerVisible[kind](view.layers[kind]);
            }
            await setScenario(view.scenario);
        },
    };
}
