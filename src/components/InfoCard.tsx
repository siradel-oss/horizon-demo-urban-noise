import { For, Match, Show, Switch } from "solid-js";

import { num, t, type Text } from "../i18n";
import type { PickInfo } from "../horizon/viewer";
import { colorAt, type Scenario, scenarioTraffic } from "../palette";

// BD TOPO values (type, direction, use…) stay in French, as published by IGN.
const ROAD_FIELDS: [string, Text, (v: string | number) => string][] = [
    ["nature", { en: "Type", fr: "Type" }, String],
    ["direction", { en: "Direction", fr: "Sens" }, String],
    ["importance", { en: "Importance", fr: "Importance" }, String],
    ["width", { en: "Width", fr: "Largeur" }, (v) => `${v} m`],
    ["nb_lanes", { en: "Lanes", fr: "Voies" }, String],
];
const RAIL_FIELDS: [string, Text, (v: string | number) => string][] = [
    ["nature", { en: "Type", fr: "Type" }, String],
    ["ntrack", { en: "Tracks", fr: "Voies" }, String],
    ["trackspd", { en: "Speed", fr: "Vitesse" }, (v) => `${v} km/h`],
];
const NO_VALUE: Text = { en: "No noise value here (outside the computed area).", fr: "Pas de valeur de bruit ici (hors de la zone calculée)." };

function Row(props: { label: string; value: string }) {
    return (
        <div class="flex justify-between gap-4 text-xs">
            <span class="text-[var(--muted)]">{props.label}</span>
            <span class="text-right text-[var(--ink)]">{props.value}</span>
        </div>
    );
}

/** Big Lden value with its palette colour. */
function Lden(props: { value: number; label: string }) {
    return (
        <div class="mb-1 flex items-center gap-2">
            <span class="h-4 w-4 rounded-sm" style={{ background: colorAt(props.value) }} />
            <span class="text-lg font-semibold tabular-nums text-[var(--navy)]">{num(props.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <span class="text-xs text-[var(--muted)]">{props.label}</span>
        </div>
    );
}

type NetworkPick = Extract<PickInfo, { attributes: unknown }>;
type GroundPick = Extract<PickInfo, { kind: "ground" }>;

export default function InfoCard(props: { info: PickInfo; scenario: Scenario; onClose: () => void }) {
    return (
        <div class="max-h-[60%] w-64 overflow-y-auto border border-[var(--rule)] bg-white/95 p-3 shadow-lg max-sm:w-full">
            <div class="mb-2 flex items-start justify-between">
                <Switch>
                    <Match when={props.info.kind === "building"}>
                        <h2 class="text-sm font-semibold text-[var(--navy)]">{t({ en: "Building", fr: "Bâtiment" })}</h2>
                    </Match>
                    <Match when={props.info.kind === "ground"}>
                        <h2 class="text-sm font-semibold text-[var(--navy)]">{t({ en: "Ground", fr: "Sol" })}</h2>
                    </Match>
                    <Match when={(props.info.kind === "road" || props.info.kind === "railway") && props.info}>
                        {(info) => {
                            // Read through the accessor inside the JSX: this function runs only once while the
                            // Match stays true, so a local copy would keep the first clicked road's name.
                            const name = () => (info() as NetworkPick).attributes.name;
                            return (
                                <h2 class="text-sm font-semibold text-[var(--navy)]">
                                    {name()
                                        ? String(name())
                                        : info().kind === "road"
                                          ? t({ en: "Unnamed road", fr: "Voie sans nom" })
                                          : t({ en: "Railway", fr: "Voie ferrée" })}
                                </h2>
                            );
                        }}
                    </Match>
                </Switch>
                <button class="-mt-1 text-[var(--muted)] hover:text-[var(--navy)]" onClick={props.onClose} aria-label={t({ en: "Close", fr: "Fermer" })}>
                    ✕
                </button>
            </div>

            <Switch>
                <Match when={props.info.kind === "building" && (props.info as Extract<PickInfo, { kind: "building" }>)}>
                    {(b) => (
                        <div class="flex flex-col gap-1">
                            <Show
                                when={b().lden != null}
                                fallback={<div class="text-xs text-[var(--muted)]">{t(NO_VALUE)}</div>}
                            >
                                <Lden value={b().lden!} label={t({ en: "dB(A) Lden on this façade", fr: "dB(A) Lden sur cette façade" })} />
                            </Show>
                            <Show when={b().height != null}>
                                <Row label={t({ en: "Height", fr: "Hauteur" })} value={`${num(b().height!)} m`} />
                            </Show>
                            <Show when={b().usage}>
                                <Row label={t({ en: "Use", fr: "Usage" })} value={b().usage!} />
                            </Show>
                            <Show when={b().nature}>
                                <Row label="Type" value={b().nature!} />
                            </Show>
                        </div>
                    )}
                </Match>
                <Match when={props.info.kind === "ground" && (props.info as GroundPick)}>
                    {(g) => (
                        <Show
                            when={g().groundLden != null}
                            fallback={<div class="text-xs text-[var(--muted)]">{t(NO_VALUE)}</div>}
                        >
                            <Lden value={g().groundLden!} label={t({ en: "dB(A) Lden at 1.5 m", fr: "dB(A) Lden à 1,5 m" })} />
                        </Show>
                    )}
                </Match>
                <Match when={(props.info.kind === "road" || props.info.kind === "railway") && (props.info as NetworkPick)}>
                    {(n) => (
                        <div class="flex flex-col gap-1">
                            <Show when={n().groundLden != null}>
                                <Lden value={n().groundLden!} label={t({ en: "dB(A) Lden at 1.5 m here", fr: "dB(A) Lden à 1,5 m ici" })} />
                            </Show>
                            <For each={n().kind === "road" ? ROAD_FIELDS : RAIL_FIELDS}>
                                {([key, label, fmt]) => (
                                    <Show when={n().attributes[key] != null && n().attributes[key] !== ""}>
                                        <Row label={t(label)} value={fmt(n().attributes[key])} />
                                    </Show>
                                )}
                            </For>
                            <Show when={n().kind === "road" && n().attributes}>
                                {(a) => {
                                    // Traffic depends on the selected scenario (the attributes hold the baseline).
                                    const traffic = () =>
                                        scenarioTraffic(props.scenario, Number(a().importance), Number(a().tmja), Number(a().speed));
                                    return (
                                        <Show when={!traffic().closed} fallback={<Row label={t({ en: "Traffic", fr: "Trafic" })} value={t({ en: "Pedestrians & bikes only", fr: "Piétons et vélos seulement" })} />}>
                                            <Row label={t({ en: "Traffic", fr: "Trafic" })} value={`${num(traffic().tmja)} ${t({ en: "veh/day", fr: "véh./jour" })}`} />
                                            <Row
                                                label={t({ en: "Heavy vehicles", fr: "Poids lourds" })}
                                                value={traffic().hgvShare ? `${Math.round(traffic().hgvShare * 100)} %` : t({ en: "none", fr: "aucun" })}
                                            />
                                            <Row label={t({ en: "Speed", fr: "Vitesse" })} value={`${traffic().speed} km/h`} />
                                        </Show>
                                    );
                                }}
                            </Show>
                            <div class="mt-1 text-[10px] text-[var(--muted)]">{t({ en: "Traffic and speeds are synthetic (demo).", fr: "Trafic et vitesses synthétiques (démo)." })}</div>
                        </div>
                    )}
                </Match>
            </Switch>
        </div>
    );
}
