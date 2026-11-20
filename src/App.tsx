import { createSignal, For, Show } from "solid-js";

import { Stage } from "./components/Stage";
import { lang, setLang, t, type Text } from "./i18n";
import Deck from "./report/Deck";
import Report, { SECTIONS } from "./report/Report";

type Mode = "doc" | "slides";

/** `?mode=slides` opens the deck directly. */
function initialMode(): Mode {
    return new URLSearchParams(location.search).get("mode") === "slides" ? "slides" : "doc";
}

const MODES: { id: Mode; label: Text }[] = [
    { id: "doc", label: { en: "Document", fr: "Document" } },
    { id: "slides", label: { en: "Slides", fr: "Présentation" } },
];

/**
 * App shell: a thin top bar (mode, language) above either the document (table of contents + pages) or the deck.
 * Both live inside the same Stage, so the Horizon viewer survives the switch.
 */
export default function App() {
    const [mode, setModeSignal] = createSignal<Mode>(initialMode());
    const setMode = (next: Mode) => {
        setModeSignal(next);
        const url = new URL(location.href);
        if (next === "slides") url.searchParams.set("mode", "slides");
        else url.searchParams.delete("mode");
        url.hash = "";
        history.replaceState(null, "", url);
        scrollTo({ top: 0, behavior: "instant" });
    };

    return (
        <div class="min-h-dvh">
            <header class="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur">
                <div class="mx-auto flex h-11 max-w-[1180px] items-center gap-3 px-4 text-[12px]">
                    <span class="font-semibold text-[var(--navy)]">Urban Noise Explorer</span>
                    <span class="truncate text-[var(--muted)] max-md:hidden">
                        {t({ en: "Simulation report — Horizon demonstrator", fr: "Rapport de simulation — démonstrateur Horizon" })}
                    </span>
                    <div role="group" aria-label={t({ en: "View as", fr: "Afficher en" })} class="ml-auto flex overflow-hidden rounded border border-[var(--rule)] max-sm:hidden">
                        <For each={MODES}>
                            {(m) => (
                                <button
                                    aria-pressed={mode() === m.id}
                                    class="px-2.5 py-0.5 transition-colors"
                                    classList={{ "bg-[var(--navy)] text-white": mode() === m.id, "text-[var(--navy)] hover:bg-[var(--paper-2)]": mode() !== m.id }}
                                    onClick={() => setMode(m.id)}
                                >
                                    {t(m.label)}
                                </button>
                            )}
                        </For>
                    </div>
                    <button
                        class="rounded border border-[var(--rule)] px-2 py-0.5 font-semibold text-[var(--navy)] hover:border-[var(--navy)] max-sm:ml-auto"
                        title={t({ en: "Passer en français", fr: "Switch to English" })}
                        onClick={() => setLang(lang() === "en" ? "fr" : "en")}
                    >
                        {lang() === "en" ? "FR" : "EN"}
                    </button>
                </div>
            </header>

            <Stage>
                <Show when={mode() === "doc"} fallback={<Deck />}>
                    <div class="mx-auto grid max-w-[1180px] gap-8 px-4 py-8 lg:grid-cols-[200px_minmax(0,860px)] max-sm:px-0 max-sm:py-4">
                        <nav class="sticky top-20 self-start font-sans text-[12.5px] max-lg:hidden" aria-label={t({ en: "Contents", fr: "Sommaire" })}>
                            <div class="mb-3 text-[10.5px] font-semibold tracking-widest text-[var(--muted)] uppercase">{t({ en: "Contents", fr: "Sommaire" })}</div>
                            <ol class="m-0 flex list-none flex-col gap-2 p-0">
                                <For each={SECTIONS}>
                                    {(s) => (
                                        <li>
                                            <a href={`#${s.id}`} class="flex gap-2 text-[var(--ink)] no-underline hover:text-[var(--navy)]">
                                                <span class="w-3 text-[var(--teal)] tabular-nums">{s.n}</span>
                                                {t(s.title)}
                                            </a>
                                        </li>
                                    )}
                                </For>
                            </ol>
                        </nav>
                        <main>
                            <Report />
                        </main>
                    </div>
                </Show>
            </Stage>
        </div>
    );
}
