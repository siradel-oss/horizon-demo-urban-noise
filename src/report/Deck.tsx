import { createSignal, For, type JSX, onCleanup, onMount } from "solid-js";

import { ClassChart } from "../components/Charts";
import Legend from "../components/Legend";
import SiradelLogo from "../components/SiradelLogo";
import { ResetButton, ScenarioTabs, Slot3D, useStage } from "../components/Stage";
import { num, t, type Text } from "../i18n";
import { LINKS } from "../links";
import { SCENARIOS } from "../palette";
import { B, bestCalm, bestLimit, DEMO_NOTE, GAINS_TITLE, GainsChart, INDICATORS, keyFigures, Kpi, label, mainLength, mainShare, S, SOURCE_SIM } from "./facts";
import { db, pct, STATS } from "./stats";

/**
 * The report as a slide deck: the same findings, figures and 3D views as the document, one idea per slide.
 * Slides are laid out at 1280 × 720 and zoomed to fit the window; hidden slides stay mounted (display: none) so
 * their 3D slots stay registered with the stage, which follows whichever slot is visible.
 */

const W = 1280;
const H = 720;

function Slide(props: { kicker?: Text; title?: Text; children: JSX.Element }) {
    return (
        <div class="flex h-full flex-col px-14 pt-11 pb-12">
            {props.title && (
                <header class="mb-6">
                    {props.kicker && <div class="mb-1 text-[13px] font-semibold tracking-[0.18em] text-[var(--teal)] uppercase">{t(props.kicker)}</div>}
                    <h2 class="m-0 text-[34px] leading-tight font-bold text-[var(--navy)]">{t(props.title)}</h2>
                </header>
            )}
            <div class="min-h-0 flex-1">{props.children}</div>
        </div>
    );
}

/** Two columns: a 3D view (left) and its commentary (right). */
function Split(props: { view: JSX.Element; children: JSX.Element }) {
    return (
        <div class="grid h-full grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-8">
            <div class="flex min-h-0 flex-col gap-2">{props.view}</div>
            <div class="flex min-h-0 flex-col gap-5 text-[17px] leading-snug text-[var(--ink)]">{props.children}</div>
        </div>
    );
}

const Big = (props: { value: string; label: Text }) => (
    <div class="border-l-4 border-[var(--teal)] pl-4">
        <div class="text-[34px] leading-none font-semibold text-[var(--navy)] tabular-nums">{props.value}</div>
        <div class="mt-1 text-[14px] text-[var(--muted)]">{t(props.label)}</div>
    </div>
);

const Bullets = (props: { items: string[]; size?: string }) => (
    <ul class={`m-0 flex list-none flex-col gap-4 p-0 ${props.size ?? "text-[17px]"}`}>
        <For each={props.items}>
            {(item) => (
                <li class="flex gap-3">
                    <span class="mt-[0.45em] h-2 w-2 shrink-0 bg-[var(--teal)]" />
                    <span>{item}</span>
                </li>
            )}
        </For>
    </ul>
);

const Source = () => <p class="mt-auto mb-0 text-[11.5px] text-[var(--muted)]">{t(SOURCE_SIM)}</p>;

function ScenarioPanel() {
    const stage = useStage();
    const current = () => stage.scenarioOf("compare");
    return (
        <>
            <div class="flex items-start justify-between gap-3">
                <p class="m-0 text-[15px]">{t(SCENARIOS.find((s) => s.id === current())!.description)}</p>
                <ResetButton id="compare" />
            </div>
            <table class="table-report text-[14px]">
                <thead>
                    <tr>
                        <th />
                        <th class="num">{label("baseline")}</th>
                        <th class="num">{label(current())}</th>
                    </tr>
                </thead>
                <tbody>
                    <For each={INDICATORS}>
                        {(ind) => (
                            <tr>
                                <td>{t(ind.label)}</td>
                                <td class="num">{ind.value(B)}</td>
                                <td class="num font-semibold text-[var(--navy)]">{ind.value(S[current()])}</td>
                            </tr>
                        )}
                    </For>
                </tbody>
            </table>
            <Legend />
        </>
    );
}

const SLIDES: (() => JSX.Element)[] = [
    // 1. Title
    () => (
        <div class="flex h-full flex-col px-16 py-12">
            <div class="flex items-start justify-between">
                <SiradelLogo class="h-6 text-[var(--navy)]" />
                <span class="border border-[var(--warn-rule)] bg-[var(--warn-bg)] px-3 py-1 text-[12px] font-semibold tracking-widest text-[var(--navy)] uppercase">
                    {t({ en: "Demonstration document", fr: "Document de démonstration" })}
                </span>
            </div>
            <div class="mt-auto">
                <div class="mb-4 text-[14px] font-semibold tracking-[0.2em] text-[var(--teal)] uppercase">
                    {t({ en: "Acoustic study · Simulation results", fr: "Étude acoustique · Résultats de simulation" })}
                </div>
                <h1 class="m-0 max-w-[20ch] text-[58px] leading-[1.05] font-bold text-[var(--navy)]">
                    {t({ en: "Road and rail noise in central Rennes", fr: "Bruit routier et ferroviaire dans le centre de Rennes" })}
                </h1>
                <p class="mt-6 max-w-[48ch] font-[family-name:var(--serif)] text-[22px] leading-snug text-[var(--ink)]">
                    {t({ en: "Current exposure and three traffic scenarios, with live 3D results.", fr: "Exposition actuelle et trois scénarios de circulation, résultats 3D en direct." })}
                </p>
            </div>
            <div class="mt-12 flex justify-between border-t border-[var(--navy)] pt-3 text-[13px] text-[var(--muted)]">
                <span>{t({ en: "NoiseModelling (CNOSSOS-EU) · IGN BD TOPO® · Siradel data converters", fr: "NoiseModelling (CNOSSOS-EU) · BD TOPO® IGN · convertisseurs de données Siradel" })}</span>
                <span>{t({ en: "Version 1.0 · November 2026", fr: "Version 1.0 · novembre 2026" })}</span>
            </div>
        </div>
    ),
    // 2. Key figures
    () => (
        <Slide kicker={{ en: "Summary", fr: "Synthèse" }} title={{ en: "What to remember", fr: "Ce qu'il faut retenir" }}>
            <div class="flex h-full flex-col">
                <div class="my-auto grid grid-cols-3 gap-10">
                    <For each={keyFigures()}>{(k) => <Kpi size="lg" value={k.value} label={k.label} note={k.note} />}</For>
                </div>
                <p class="mb-auto max-w-[60ch] font-[family-name:var(--serif)] text-[22px] leading-snug text-[var(--ink)]">
                    {t({
                        en: `Slowing down the main roads deals with the exceedances (“${label(bestLimit)}”); closing minor streets frees the heart of the blocks (“${label(bestCalm)}”).`,
                        fr: `Apaiser les axes traite les dépassements («\u00a0${label(bestLimit)}\u00a0») ; fermer les petites rues libère les cœurs d'îlots («\u00a0${label(bestCalm)}\u00a0»).`,
                    })}
                </p>
                <p class="mb-0 border-l-4 border-[var(--warn-rule)] bg-[var(--warn-bg)] px-4 py-2 text-[13px] text-[var(--navy)]">
                    {t({ en: "Synthetic traffic, flat ground, no measurement: illustrative values, not an official noise map.", fr: "Trafic synthétique, sol plat, aucune mesure : valeurs indicatives, pas une carte de bruit officielle." })}
                </p>
            </div>
        </Slide>
    ),
    // 3. Study area
    () => (
        <Slide kicker={{ en: "Context", fr: "Contexte" }} title={{ en: "Study area and method", fr: "Zone d'étude et méthode" }}>
            <Split view={<Slot3D id="area" class="h-full" />}>
                <Bullets
                    items={[
                        t({ en: "2 km × 2 km around Place de la République", fr: "2 km × 2 km autour de la place de la République" }),
                        t({ en: `${num(STATS.buildings.count)} buildings, ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km of roads, main railway lines`, fr: `${num(STATS.buildings.count)} bâtiments, ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km de voies, voies ferrées principales` }),
                        t({ en: "Lden computed with NoiseModelling (CNOSSOS-EU), on façades and on the ground", fr: "Lden calculé avec NoiseModelling (CNOSSOS-EU), en façade et au sol" }),
                        t({ en: "3D data produced with Siradel's proprietary converters", fr: "Données 3D produites avec les convertisseurs propriétaires de Siradel" }),
                        t({ en: "Synthetic traffic by road importance class", fr: "Trafic synthétique par classe d'importance des voies" }),
                    ]}
                />
                <ResetButton id="area" />
                <p class="mt-auto mb-0 text-[11.5px] text-[var(--muted)]">{t({ en: "Basemap: Plan IGN. Data: IGN BD TOPO® (October 2026 extract).", fr: "Fond : Plan IGN. Données : BD TOPO® IGN (extraction d'octobre 2026)." })}</p>
            </Split>
        </Slide>
    ),
    // 4. Current situation
    () => (
        <Slide kicker={{ en: "Current situation", fr: "Situation actuelle" }} title={{ en: "Noise follows the main roads", fr: "Le bruit suit les axes structurants" }}>
            <Split view={<Slot3D id="baseline" class="h-full" />}>
                <Big value={`${db(B.ground.median)} dB`} label={{ en: "median level of the open space (1.5 m)", fr: "niveau médian de l'espace public (1,5 m)" }} />
                <Big value={pct(B.ground.overLimit)} label={{ en: `of the open space above ${STATS.limitRoad} dB(A)`, fr: `de l'espace public au-delà de ${STATS.limitRoad} dB(A)` }} />
                <Big value={pct(mainShare)} label={{ en: `of the traffic on ${pct(mainLength)} of the network`, fr: `du trafic sur ${pct(mainLength)} du réseau` }} />
                <Legend />
                <Source />
            </Split>
        </Slide>
    ),
    // 5. Façades
    () => (
        <Slide kicker={{ en: "Current situation", fr: "Situation actuelle" }} title={{ en: "Façades are less exposed than the street", fr: "Les façades moins exposées que la rue" }}>
            <Split view={<Slot3D id="facades" class="h-full" />}>
                <p class="m-0">
                    {t({
                        en: `Buildings protect their back façades and courtyards: ${pct(B.envelope.overLimit, 1)} of the building envelope exceeds ${STATS.limitRoad} dB(A), against ${pct(B.ground.overLimit)} of the open space.`,
                        fr: `Le bâti protège ses façades arrière et ses cours : ${pct(B.envelope.overLimit, 1)} de l'enveloppe bâtie dépasse ${STATS.limitRoad} dB(A), contre ${pct(B.ground.overLimit)} de l'espace public.`,
                    })}
                </p>
                <ClassChart
                    rows={[
                        { label: t({ en: "Open space", fr: "Espace public" }), classes: B.ground.classes },
                        { label: t({ en: "Envelope", fr: "Enveloppe" }), classes: B.envelope.classes },
                    ]}
                />
                <ResetButton id="facades" />
                <Source />
            </Split>
        </Slide>
    ),
    // 6. Scenarios
    () => (
        <Slide kicker={{ en: "Scenarios", fr: "Scénarios" }} title={{ en: "Three ways to calm the traffic", fr: "Trois façons d'apaiser la circulation" }}>
            <Split
                view={
                    <>
                        <ScenarioTabs id="compare" />
                        <Slot3D id="compare" class="min-h-0 flex-1" />
                    </>
                }
            >
                <ScenarioPanel />
            </Split>
        </Slide>
    ),
    // 7. Gains
    () => (
        <Slide kicker={{ en: "Scenarios", fr: "Scénarios" }} title={{ en: "Who gains what", fr: "Qui gagne quoi" }}>
            <div class="grid h-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-12">
                <div class="flex flex-col">
                    <div class="mb-6 text-[15px] text-[var(--ink)]">{t(GAINS_TITLE)}</div>
                    <div class="[&_*]:text-[15px]">
                        <GainsChart />
                    </div>
                    <Source />
                </div>
                <Bullets
                    items={[
                        t({ en: `Zone 30: a small gain almost everywhere (${pct(S.zone30.ground.delta!.under1)} of the area ≥ 1 dB)`, fr: `Zone 30 : un petit gain presque partout (${pct(S.zone30.ground.delta!.under1)} de la surface ≥ 1 dB)` }),
                        t({ en: "No heavy vehicles: limited effect, their synthetic share is low", fr: "Sans poids lourds : effet limité, leur part synthétique est faible" }),
                        t({ en: `Car-free streets: strong gains (${pct(S.car_free.ground.delta!.under3)} ≥ 3 dB), only where streets close`, fr: `Rues sans voiture : gains forts (${pct(S.car_free.ground.delta!.under3)} ≥ 3 dB), seulement là où les rues ferment` }),
                    ]}
                />
            </div>
        </Slide>
    ),
    // 8. Conclusions
    () => (
        <Slide kicker={{ en: "Conclusions", fr: "Conclusions" }} title={{ en: "Two complementary levers", fr: "Deux leviers complémentaires" }}>
            <Bullets
                size="text-[22px]"
                items={[
                    t({ en: `Exposure is a matter of main roads: ${pct(mainShare)} of the traffic, nearly all exceedances.`, fr: `L'exposition est une affaire d'axes : ${pct(mainShare)} du trafic, la quasi-totalité des dépassements.` }),
                    t({ en: `Lower speeds act on the exceedances: ${pct(B.ground.overLimit, 1)} → ${pct(S[bestLimit].ground.overLimit, 1)} of the open space above ${STATS.limitRoad} dB.`, fr: `Baisser les vitesses agit sur les dépassements : ${pct(B.ground.overLimit, 1)} → ${pct(S[bestLimit].ground.overLimit, 1)} de l'espace public au-delà de ${STATS.limitRoad} dB.` }),
                    t({ en: `Closing minor streets creates quiet areas: ${pct(B.ground.under50)} → ${pct(S[bestCalm].ground.under50)} below 50 dB.`, fr: `Fermer les petites rues crée des zones calmes : ${pct(B.ground.under50)} → ${pct(S[bestCalm].ground.under50)} sous 50 dB.` }),
                    t({ en: "Next: a combined scenario, then a real study with traffic counts, terrain and population.", fr: "Ensuite : un scénario combiné, puis une étude réelle avec comptages, relief et population." }),
                ]}
            />
        </Slide>
    ),
    // 9. Sources
    () => (
        <Slide kicker={{ en: "About", fr: "À propos" }} title={{ en: "Sources and limits", fr: "Sources et limites" }}>
            <div class="grid h-full grid-cols-2 gap-12 text-[16px] leading-snug">
                <Bullets
                    size="text-[16px]"
                    items={[
                        t({ en: "IGN BD TOPO® (October 2026 extract) and Plan IGN v2 — Licence Ouverte 2.0", fr: "BD TOPO® IGN (extraction d'octobre 2026) et Plan IGN v2 — Licence Ouverte 2.0" }),
                        t({ en: "NoiseModelling (CNOSSOS-EU), Siradel proprietary data converters; levels neither published nor validated by IGN or Rennes Métropole", fr: "NoiseModelling (CNOSSOS-EU), convertisseurs de données propriétaires Siradel ; niveaux ni publiés ni validés par l'IGN ou Rennes Métropole" }),
                        t({ en: "Synthetic traffic, flat ground, no screens, no measurement", fr: "Trafic synthétique, sol plat, aucun écran, aucune mesure" }),
                        t({ en: "Not affiliated with Rennes Métropole, the City of Rennes or IGN", fr: "Sans lien avec Rennes Métropole, la Ville de Rennes ou l'IGN" }),
                    ]}
                />
                <div class="flex flex-col gap-4">
                    <p class="m-0">
                        {t({ en: "3D results rendered live by ", fr: "Résultats 3D rendus en direct par " })}
                        <a class="text-[var(--navy)] underline decoration-[var(--teal)] underline-offset-2" href={LINKS.horizon} target="_blank" rel="noopener">
                            Horizon
                        </a>
                        {t({ en: ", Siradel's open source 3D engine.", fr: ", le moteur 3D open source de Siradel." })}
                    </p>
                    <p class="m-0">
                        {t({ en: "Official noise maps of Rennes Métropole: ", fr: "Cartes de bruit officielles de Rennes Métropole : " })}
                        <a class="text-[var(--navy)] underline decoration-[var(--teal)] underline-offset-2" href={LINKS.officialMaps} target="_blank" rel="noopener">
                            data.gouv.fr
                        </a>
                    </p>
                    <SiradelLogo class="mt-auto h-6 text-[var(--navy)]" />
                </div>
            </div>
        </Slide>
    ),
];

const navButton =
    "rounded border border-white/30 px-3 py-1 text-[13px] text-white transition-colors hover:bg-white/10 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]";

export default function Deck() {
    const stage = useStage();
    const [index, setIndex] = createSignal(0);
    const [scale, setScale] = createSignal(1);
    const go = (i: number) => {
        const next = Math.max(0, Math.min(SLIDES.length - 1, i));
        if (next === index()) return;
        setIndex(next);
        stage.setInteractive(false);
        stage.refresh();
    };

    onMount(() => {
        // Fit 1280 × 720 in the window, below the top bar (44 px) and above the controls (52 px).
        const fit = () => setScale(Math.min((innerWidth - 32) / W, (innerHeight - 44 - 52 - 24) / H));
        const onKey = (e: KeyboardEvent) => {
            // While a 3D view is being explored, keys belong to it.
            if (stage.interactive() || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            if (["ArrowRight", "PageDown", " "].includes(e.key)) go(index() + 1);
            else if (["ArrowLeft", "PageUp"].includes(e.key)) go(index() - 1);
            else if (e.key === "Home") go(0);
            else if (e.key === "End") go(SLIDES.length - 1);
            else return;
            e.preventDefault();
        };
        fit();
        addEventListener("resize", fit);
        addEventListener("keydown", onKey);
        onCleanup(() => {
            removeEventListener("resize", fit);
            removeEventListener("keydown", onKey);
        });
    });

    const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);

    return (
        <div class="flex min-h-[calc(100dvh-44px)] flex-col items-center justify-center gap-3 bg-[var(--navy)] py-3">
            <div class="overflow-hidden bg-[var(--paper)] font-sans shadow-2xl" style={{ width: `${W}px`, height: `${H}px`, zoom: scale() }} aria-roledescription={t({ en: "slide", fr: "diapositive" })}>
                <For each={SLIDES}>
                    {(slide, i) => (
                        <section class="relative h-full" classList={{ hidden: i() !== index() }} aria-hidden={i() !== index()}>
                            {slide()}
                            <footer class="absolute inset-x-14 bottom-3 flex justify-between text-[11px] text-[var(--muted)]">
                                <span>{i() > 0 ? t(DEMO_NOTE) : ""}</span>
                                <span class="tabular-nums">{i() > 0 ? `${i() + 1} / ${SLIDES.length}` : ""}</span>
                            </footer>
                        </section>
                    )}
                </For>
            </div>
            <nav class="flex items-center gap-3" aria-label={t({ en: "Slides", fr: "Diapositives" })}>
                <button class={navButton} disabled={index() === 0} onClick={() => go(index() - 1)} aria-label={t({ en: "Previous slide", fr: "Diapositive précédente" })}>
                    ←
                </button>
                <span class="min-w-14 text-center text-[13px] text-white/80 tabular-nums">
                    {index() + 1} / {SLIDES.length}
                </span>
                <button class={navButton} disabled={index() === SLIDES.length - 1} onClick={() => go(index() + 1)} aria-label={t({ en: "Next slide", fr: "Diapositive suivante" })}>
                    →
                </button>
                <button class={navButton} onClick={fullscreen}>
                    {t({ en: "Full screen", fr: "Plein écran" })}
                </button>
            </nav>
        </div>
    );
}
