import { For, Show } from "solid-js";

import { t } from "../i18n";
import { cssGradient, NO_DATA, STOPS } from "../palette";

/** Horizontal colour ramp of the 3D figures, a tick every 10 dB. */
export default function Legend() {
    const last = STOPS.length - 1;
    return (
        <div class="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            <div class="flex justify-between">
                <span>Lden, dB(A)</span>
                <span class="flex items-center gap-1">
                    <span class="h-2.5 w-3 border border-[var(--rule)]" style={{ background: NO_DATA }} />
                    {t({ en: "no data", fr: "pas de donnée" })}
                </span>
            </div>
            <div class="h-2.5" style={{ background: cssGradient() }} />
            <div class="relative h-3 tabular-nums">
                <For each={STOPS}>
                    {(value, i) => (
                        <Show when={i() % 2 === 0}>
                            <span
                                class="absolute leading-none"
                                classList={{ "-translate-x-1/2": i() > 0 && i() < last, "-translate-x-full": i() === last }}
                                style={{ left: `${(i() / last) * 100}%` }}
                            >
                                {value}
                            </span>
                        </Show>
                    )}
                </For>
            </div>
        </div>
    );
}
