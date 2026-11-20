import { For, type JSX } from "solid-js";

import { t, type Text } from "../i18n";
import { colorAt } from "../palette";
import { CLASS_LABELS, CLASS_LEVELS, pct } from "../report/stats";

/** Dark or white text, whichever reads better on a class colour. */
function inkOn(lden: number) {
    const [r, g, b] = colorAt(lden).match(/\d+/g)!.map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? "var(--navy)" : "var(--on-dark)";
}

/** A numbered chart or table: title above, source and notes below. */
export function Exhibit(props: { kind: "figure" | "table"; number: number; title: Text; source?: JSX.Element; children: JSX.Element }) {
    return (
        <figure class="my-8 break-inside-avoid">
            <div class="mb-3 text-[13px] text-[var(--ink)]">
                <span class="font-semibold text-[var(--navy)]">
                    {props.kind === "figure" ? "Figure" : t({ en: "Table", fr: "Tableau" })} {props.number}
                </span>
                <span class="mx-1.5 text-[var(--muted)]">—</span>
                {t(props.title)}
            </div>
            {props.children}
            {props.source && <figcaption class="mt-2 text-[11.5px] text-[var(--muted)]">{props.source}</figcaption>}
        </figure>
    );
}

/** One stacked bar per row: the share of each 5 dB class, quietest on the left. */
export function ClassChart(props: { rows: { label: string; classes: number[] }[] }) {
    return (
        <div class="flex flex-col gap-2 text-[12px]">
            <For each={props.rows}>
                {(row) => (
                    <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 max-sm:grid-cols-1 max-sm:gap-1">
                        <div class="leading-tight text-[var(--ink)]">{row.label}</div>
                        <div class="flex h-6 overflow-hidden" role="img" aria-label={row.classes.map((c, i) => `${CLASS_LABELS[i]} dB: ${pct(c)}`).join(", ")}>
                            <For each={row.classes}>
                                {(share, i) => (
                                    <div
                                        class="flex items-center justify-center overflow-hidden text-[10.5px] tabular-nums"
                                        style={{ width: `${share * 100}%`, background: colorAt(CLASS_LEVELS[i()]), color: inkOn(CLASS_LEVELS[i()]) }}
                                        title={`${CLASS_LABELS[i()]} dB(A) : ${pct(share, 1)}`}
                                    >
                                        {share >= 0.06 ? pct(share) : ""}
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                )}
            </For>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)] sm:pl-[9.25rem]">
                <For each={CLASS_LABELS}>
                    {(label, i) => (
                        <span class="flex items-center gap-1 tabular-nums">
                            <span class="h-2.5 w-2.5" style={{ background: colorAt(CLASS_LEVELS[i()]) }} />
                            {label}
                        </span>
                    )}
                </For>
                <span>dB(A) Lden</span>
            </div>
        </div>
    );
}

/** Horizontal bars, one group per row; values are shares (0-1) drawn against `max`. */
export function BarChart(props: { rows: { label: string; values: number[] }[]; series: { label: Text; color: string }[]; max: number }) {
    return (
        <div class="flex flex-col gap-3 text-[12px]">
            <For each={props.rows}>
                {(row) => (
                    <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 max-sm:grid-cols-1 max-sm:gap-1">
                        <div class="leading-tight text-[var(--ink)]">{row.label}</div>
                        <div class="flex flex-col gap-1">
                            <For each={row.values}>
                                {(value, i) => (
                                    <div class="flex items-center gap-2">
                                        <div class="h-3.5" style={{ width: `${(value / props.max) * 85}%`, background: props.series[i()].color }} />
                                        <span class="tabular-nums text-[var(--ink)]">{pct(value)}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                )}
            </For>
            <div class="flex flex-wrap gap-x-4 text-[11px] text-[var(--muted)] sm:pl-[9.25rem]">
                <For each={props.series}>
                    {(s) => (
                        <span class="flex items-center gap-1.5">
                            <span class="h-2.5 w-2.5" style={{ background: s.color }} />
                            {t(s.label)}
                        </span>
                    )}
                </For>
            </div>
        </div>
    );
}
