import { For, type JSX } from "solid-js";

import { ClassChart, Exhibit } from "../components/Charts";
import SiradelLogo from "../components/SiradelLogo";
import { Figure3D } from "../components/Stage";
import { num, t, type Text } from "../i18n";
import { LINKS } from "../links";
import { SCENARIOS } from "../palette";
import { B, bestCalm, bestLimit, DEMO_NOTE, GAINS_TITLE, GainsChart, INDICATORS, keyFigures, Kpi, label, mainLength, mainShare, S, SOURCE_SIM } from "./facts";
import { db, pct, STATS } from "./stats";

/**
 * The report in document form: cover, summary, five chapters and appendices. Every figure quoted in the text is
 * read from STATS (src/report/stats.json) or derived in facts.tsx, so the text follows the data.
 */

const pts = (a: number, b: number) => num(Math.abs(a - b) * 100, { maximumFractionDigits: 1 });

export const SECTIONS: { id: string; n: string; title: Text }[] = [
    { id: "summary", n: "", title: { en: "Executive summary", fr: "Synthèse" } },
    { id: "context", n: "1", title: { en: "Context and objectives", fr: "Contexte et objectifs" } },
    { id: "method", n: "2", title: { en: "Data and method", fr: "Données et méthode" } },
    { id: "baseline", n: "3", title: { en: "Current situation", fr: "Situation actuelle" } },
    { id: "scenarios", n: "4", title: { en: "Traffic scenarios", fr: "Scénarios de circulation" } },
    { id: "conclusions", n: "5", title: { en: "Conclusions", fr: "Conclusions" } },
    { id: "appendix", n: "A", title: { en: "Appendices", fr: "Annexes" } },
];

const RUNNING: Text = { en: "Traffic noise in central Rennes · Demonstration report", fr: "Bruit du trafic, centre de Rennes · Rapport de démonstration" };

/** One "page" of the report: running header, content, folio. */
function Sheet(props: { id?: string; folio: number; children: JSX.Element }) {
    const section = SECTIONS.find((s) => s.id === props.id);
    return (
        <section id={props.id} class="mb-8 bg-[var(--paper)] px-14 pt-8 pb-6 shadow-[0_1px_3px_rgb(5_0_56/0.08)] max-md:px-6 max-sm:mb-4 max-sm:px-4">
            <div class="mb-10 flex justify-between gap-4 border-b border-[var(--rule)] pb-2 text-[10.5px] tracking-wide text-[var(--muted)] uppercase max-sm:mb-6">
                <span>{t(RUNNING)}</span>
                <span class="text-right max-sm:hidden">{section ? `${section.n ? section.n + ". " : ""}${t(section.title)}` : ""}</span>
            </div>
            <div class="prose-report">
                {section && (
                    <h2>
                        {section.n && <span class="mr-3 text-[var(--teal)]">{section.n}</span>}
                        {t(section.title)}
                    </h2>
                )}
                {props.children}
            </div>
            <div class="mt-12 flex items-center justify-between border-t border-[var(--rule)] pt-2 text-[10.5px] text-[var(--muted)]">
                <span>{t(DEMO_NOTE)}</span>
                <span class="tabular-nums">{props.folio}</span>
            </div>
        </section>
    );
}

/** Highlighted box: the demonstration warning, key figures, definitions. */
function Box(props: { tone?: "warn" | "info"; title: Text; children: JSX.Element }) {
    return (
        <aside
            class="my-6 border-l-4 px-5 py-4 font-sans text-[13.5px] leading-relaxed"
            classList={{
                "border-[var(--warn-rule)] bg-[var(--warn-bg)]": props.tone === "warn",
                "border-[var(--teal)] bg-[var(--paper-2)]": props.tone !== "warn",
            }}
        >
            <div class="mb-1.5 text-[11px] font-semibold tracking-wider text-[var(--navy)] uppercase">{t(props.title)}</div>
            {props.children}
        </aside>
    );
}

const A = (props: { href: string; children: JSX.Element }) => (
    <a href={props.href} target="_blank" rel="noopener">
        {props.children}
    </a>
);

function Cover() {
    const meta: [Text, Text][] = [
        [{ en: "Study area", fr: "Zone d'étude" }, { en: "Rennes city centre, 2 km × 2 km around Place de la République", fr: "Centre de Rennes, 2 km × 2 km autour de la place de la République" }],
        [{ en: "Indicator", fr: "Indicateur" }, { en: "Lden, road and rail noise, façades and 1.5 m above ground", fr: "Lden, bruit routier et ferroviaire, façades et 1,5 m du sol" }],
        [{ en: "Method", fr: "Méthode" }, { en: "NoiseModelling (CNOSSOS-EU), Siradel data converters", fr: "NoiseModelling (CNOSSOS-EU), convertisseurs de données Siradel" }],
        [{ en: "Scenarios", fr: "Scénarios" }, { en: "Current · Zone 30 · Light vehicles · Car-free streets", fr: "Actuel · Zone 30 · Véhicules légers · Rues sans voiture" }],
        [{ en: "Status", fr: "Statut" }, { en: "Demonstrator — synthetic traffic, not an official noise map", fr: "Démonstrateur — trafic synthétique, pas une carte de bruit officielle" }],
    ];
    return (
        <section class="relative mb-8 flex min-h-[calc(100svh-6rem)] flex-col overflow-hidden bg-[var(--paper)] px-14 py-12 shadow-[0_1px_3px_rgb(5_0_56/0.08)] max-md:px-6 max-sm:mb-4 max-sm:min-h-0 max-sm:px-4 max-sm:py-8">
            <div class="flex items-start justify-between gap-6 font-sans">
                <SiradelLogo class="h-5 text-[var(--navy)]" />
                <span class="border border-[var(--warn-rule)] bg-[var(--warn-bg)] px-2.5 py-1 text-[10.5px] font-semibold tracking-widest text-[var(--navy)] uppercase">
                    {t({ en: "Demonstration document", fr: "Document de démonstration" })}
                </span>
            </div>

            <div class="mt-auto pt-16 font-sans">
                <div class="mb-4 text-[12px] font-semibold tracking-[0.2em] text-[var(--teal)] uppercase">
                    {t({ en: "Acoustic study · Simulation report", fr: "Étude acoustique · Rapport de simulation" })}
                </div>
                <h1 class="max-w-[22ch] text-[44px] leading-[1.08] font-bold text-[var(--navy)] max-sm:text-[30px]">
                    {t({ en: "Road and rail noise in central Rennes", fr: "Bruit routier et ferroviaire dans le centre de Rennes" })}
                </h1>
                <p class="mt-5 max-w-[46ch] font-[family-name:var(--serif)] text-[19px] leading-snug text-[var(--ink)] max-sm:text-[17px]">
                    {t({
                        en: "Diagnosis of the current exposure and assessment of three traffic scenarios, with 3D results embedded in the document.",
                        fr: "Diagnostic de l'exposition actuelle et évaluation de trois scénarios de circulation, résultats 3D intégrés au document.",
                    })}
                </p>
            </div>

            <dl class="mt-14 grid grid-cols-[9rem_minmax(0,1fr)] gap-x-6 border-t border-[var(--navy)] pt-4 font-sans text-[12.5px] max-sm:grid-cols-1">
                <For each={meta}>
                    {([k, v]) => (
                        <>
                            <dt class="py-1 font-semibold text-[var(--navy)] max-sm:pb-0">{t(k)}</dt>
                            <dd class="m-0 border-b border-[var(--rule)] py-1 text-[var(--ink)] max-sm:border-0">{t(v)}</dd>
                        </>
                    )}
                </For>
            </dl>
            <div class="mt-6 flex flex-wrap justify-between gap-2 font-sans text-[11px] text-[var(--muted)]">
                <span>{t({ en: "Version 1.0 · November 2026", fr: "Version 1.0 · novembre 2026" })}</span>
                <span>
                    {t({ en: "3D results rendered live with ", fr: "Résultats 3D rendus en direct par " })}
                    <a class="text-[var(--navy)] underline decoration-[var(--teal)] underline-offset-2" href={LINKS.horizon} target="_blank" rel="noopener">
                        Horizon
                    </a>
                </span>
            </div>
        </section>
    );
}

function Summary() {
    return (
        <Sheet id="summary" folio={2}>
            <Box tone="warn" title={{ en: "Read this first", fr: "À lire avant tout" }}>
                {t({
                    en: "A demonstrator of the Horizon 3D engine in the form of a study report. The traffic is synthetic, the ground is flat and nothing was measured: the values are illustrative only. The official noise maps of Rennes Métropole are ",
                    fr: "Un démonstrateur du moteur 3D Horizon sous la forme d'un rapport d'étude. Le trafic est synthétique, le sol plat et rien n'a été mesuré : les valeurs sont seulement indicatives. Les cartes de bruit officielles de Rennes Métropole sont ",
                })}
                <a class="text-[var(--navy)] underline" href={LINKS.officialMaps} target="_blank" rel="noopener">
                    {t({ en: "on data.gouv.fr", fr: "sur data.gouv.fr" })}
                </a>
                .
            </Box>

            <div class="my-8 grid grid-cols-3 gap-6 max-sm:grid-cols-1">
                <For each={keyFigures()}>{(k) => <Kpi value={k.value} label={k.label} note={k.note} />}</For>
            </div>

            <p>
                {t({
                    en: `Today, half of the open space is exposed above the WHO guideline. Exceedances of the limit value are confined to the main roads, which carry ${pct(mainShare)} of the traffic on ${pct(mainLength)} of the network.`,
                    fr: `Aujourd'hui, la moitié de l'espace public est exposée au-delà de la recommandation de l'OMS. Les dépassements de la valeur limite se cantonnent aux axes structurants, qui portent ${pct(mainShare)} du trafic sur ${pct(mainLength)} du réseau.`,
                })}
            </p>
            <p>
                {t({
                    en: `“${label(bestLimit)}” reduces the exceedances the most (${pct(B.ground.overLimit, 1)} → ${pct(S[bestLimit].ground.overLimit, 1)} of the area); “${label(bestCalm)}” creates the most quiet areas (${pct(B.ground.under50)} → ${pct(S[bestCalm].ground.under50)} below 50 dB) but leaves the main roads unchanged. The two measures are complementary.`,
                    fr: `«\u00a0${label(bestLimit)}\u00a0» réduit le plus les dépassements (${pct(B.ground.overLimit, 1)} → ${pct(S[bestLimit].ground.overLimit, 1)} de la surface) ; «\u00a0${label(bestCalm)}\u00a0» crée le plus de zones calmes (${pct(B.ground.under50)} → ${pct(S[bestCalm].ground.under50)} sous 50 dB) mais laisse les axes inchangés. Les deux leviers sont complémentaires.`,
                })}
            </p>
        </Sheet>
    );
}

function Context() {
    return (
        <Sheet id="context" folio={3}>
            <p>
                {t({
                    en: "The European directive 2002/49/EC requires large urban areas to map road and rail noise with the Lden indicator and to act where limit values are exceeded. This report simulates that exercise on the centre of Rennes: where are façades and open space exposed today, and what would a zone 30, a ban on heavy vehicles or car-free minor streets change?",
                    fr: "La directive européenne 2002/49/CE impose aux grandes agglomérations de cartographier le bruit routier et ferroviaire avec l'indicateur Lden et d'agir là où les valeurs limites sont dépassées. Ce rapport simule cet exercice sur le centre de Rennes : où façades et espace public sont-ils exposés aujourd'hui, et que changeraient une zone 30, l'interdiction des poids lourds ou des petites rues sans voiture ?",
                })}
            </p>
            <p>
                {t({
                    en: "The 3D figures are not frozen images but the simulation itself: they can be turned, zoomed and queried, building by building.",
                    fr: "Les figures 3D ne sont pas des images figées mais la simulation elle-même : on peut les tourner, zoomer et interroger, bâtiment par bâtiment.",
                })}
            </p>
            <Figure3D
                id="area"
                number={1}
                title={{ en: "Study area", fr: "Périmètre d'étude" }}
                caption={t({
                    en: `2 km × 2 km around Place de la République: ${num(STATS.buildings.count)} buildings and ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km of roads modelled, plus the main railway lines towards the station. Basemap: Plan IGN.`,
                    fr: `2 km × 2 km autour de la place de la République : ${num(STATS.buildings.count)} bâtiments et ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km de voies modélisés, ainsi que les voies ferrées principales vers la gare. Fond : Plan IGN.`,
                })}
            />
        </Sheet>
    );
}

function Method() {
    const residential = STATS.buildings.byUsage["Résidentiel"] ?? 0;
    return (
        <Sheet id="method" folio={4}>
            <h3>{t({ en: "2.1 Input data", fr: "2.1 Données d'entrée" })}</h3>
            <p>
                {t({
                    en: `Buildings, roads and railways come from the IGN BD TOPO®: ${num(STATS.buildings.count)} buildings (${pct(residential / STATS.buildings.count)} residential) and ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km of roads. The BD TOPO has no traffic: a synthetic traffic is derived from the importance of each road.`,
                    fr: `Bâtiments, voies et voies ferrées proviennent de la BD TOPO® de l'IGN : ${num(STATS.buildings.count)} bâtiments (dont ${pct(residential / STATS.buildings.count)} résidentiels) et ${num(STATS.network.totalKm, { maximumFractionDigits: 0 })} km de voies. La BD TOPO ne contenant pas de trafic, un trafic synthétique est déduit de l'importance de chaque voie.`,
                })}
            </p>

            <h3>{t({ en: "2.2 Computation and data preparation", fr: "2.2 Calcul et préparation des données" })}</h3>
            <p>
                {t({
                    en: "Levels are computed with NoiseModelling (Université Gustave Eiffel), which implements the European CNOSSOS-EU method, at several heights, then carried onto every façade and onto the ground. 3D buildings, façade textures and tiles are produced by Siradel's proprietary data converters, which prepare the computed results for display in Horizon.",
                    fr: "Les niveaux sont calculés avec NoiseModelling (Université Gustave Eiffel), qui met en œuvre la méthode européenne CNOSSOS-EU, à plusieurs hauteurs, puis portés sur chaque façade et au sol. Bâtiments 3D, textures de façades et tuiles sont produits par les convertisseurs de données propriétaires de Siradel, qui préparent les résultats de calcul pour leur restitution dans Horizon.",
                })}
            </p>

            <Box title={{ en: "Indicators and thresholds", fr: "Indicateurs et seuils" }}>
                <ul class="m-0 list-none p-0 [&>li]:mb-1.5">
                    <li>
                        <strong class="text-[var(--navy)]">Lden</strong>
                        {t({
                            en: " — day-evening-night level over 24 h, in dB(A), with a 5 dB penalty in the evening and 10 dB at night.",
                            fr: " — niveau jour-soir-nuit sur 24 h, en dB(A), avec une pénalité de 5 dB le soir et de 10 dB la nuit.",
                        })}
                    </li>
                    <li>
                        <strong class="text-[var(--navy)]">{STATS.limitRoad} dB(A)</strong>
                        {t({ en: " — French limit value for road noise (decree of 4 April 2006).", fr: " — valeur limite française pour le bruit routier (arrêté du 4 avril 2006)." })}
                    </li>
                    <li>
                        <strong class="text-[var(--navy)]">{STATS.whoRoad} dB(A)</strong>
                        {t({ en: " — WHO guideline for road traffic noise (2018).", fr: " — recommandation de l'OMS pour le bruit routier (2018)." })}
                    </li>
                    <li>
                        <strong class="text-[var(--navy)]">−3 dB</strong>
                        {t({
                            en: " — half the sound energy; about 1 dB is the smallest change a listener notices.",
                            fr: " — moitié moins d'énergie sonore ; 1 dB environ est le plus petit écart perceptible.",
                        })}
                    </li>
                </ul>
            </Box>

            <h3>{t({ en: "2.3 Limits", fr: "2.3 Limites" })}</h3>
            <p>
                {t({
                    en: "No traffic count, flat ground, no screens. Envelope shares count façades and roofs together and carry no population.",
                    fr: "Aucun comptage, sol plat, aucun écran. Les parts d'enveloppe bâtie comptent façades et toitures ensemble et ne portent aucune population.",
                })}
            </p>
        </Sheet>
    );
}

function Baseline() {
    return (
        <Sheet id="baseline" folio={5}>
            <p>
                {t({
                    en: `At 1.5 m above the ground, the median level of the open space is ${db(B.ground.median)} dB(A). The loudest areas follow the main roads and the railway: ${pct(B.ground.overLimit)} of the open space exceeds ${STATS.limitRoad} dB(A). As soon as one turns into the minor streets, the buildings screen the traffic and levels drop below 50 dB(A) on ${pct(B.ground.under50)} of the area.`,
                    fr: `À 1,5 m du sol, le niveau médian de l'espace public est de ${db(B.ground.median)} dB(A). Les secteurs les plus bruyants suivent les axes structurants et la voie ferrée : ${pct(B.ground.overLimit)} de l'espace public dépasse ${STATS.limitRoad} dB(A). Dès qu'on entre dans les petites rues, le bâti fait écran et les niveaux passent sous 50 dB(A) sur ${pct(B.ground.under50)} de la surface.`,
                })}
            </p>
            <Figure3D
                id="baseline"
                number={2}
                title={{ en: "Lden on façades and at 1.5 m — current situation", fr: "Lden en façade et à 1,5 m — situation actuelle" }}
                caption={
                    <>
                        {t({
                            en: "City centre and station seen from the south. The ground map shows the level at 1.5 m; each façade carries the level computed at its height. Click a building or a street to read its value.",
                            fr: "Centre-ville et gare vus du sud. La carte au sol donne le niveau à 1,5 m ; chaque façade porte le niveau calculé à sa hauteur. Cliquer sur un bâtiment ou une rue pour lire sa valeur.",
                        })}{" "}
                        {t(SOURCE_SIM)}
                    </>
                }
            />
            <p>
                {t({
                    en: `Façades are less exposed than the street: buildings protect their back façades and courtyards. ${pct(B.envelope.overWho)} of the building envelope is above ${STATS.whoRoad} dB(A) and ${pct(B.envelope.overLimit, 1)} above ${STATS.limitRoad} dB(A) (Figure 3). These exposed façades line the main roads, from the ground floor up to the top floors (Figure 4).`,
                    fr: `Les façades sont moins exposées que la rue : le bâti protège ses façades arrière et ses cours. ${pct(B.envelope.overWho)} de l'enveloppe bâtie dépasse ${STATS.whoRoad} dB(A) et ${pct(B.envelope.overLimit, 1)} dépasse ${STATS.limitRoad} dB(A) (figure 3). Ces façades exposées bordent les axes structurants, du rez-de-chaussée jusqu'aux derniers étages (figure 4).`,
                })}
            </p>
            <Exhibit kind="figure" number={3} title={{ en: "Distribution by noise class — current situation", fr: "Répartition par classe de bruit — situation actuelle" }} source={t(SOURCE_SIM)}>
                <ClassChart
                    rows={[
                        { label: t({ en: "Open space (1.5 m)", fr: "Espace public (1,5 m)" }), classes: B.ground.classes },
                        { label: t({ en: "Building envelope", fr: "Enveloppe bâtie" }), classes: B.envelope.classes },
                    ]}
                />
            </Exhibit>
            <Figure3D
                id="facades"
                number={4}
                title={{ en: "Façades along Boulevard de la Tour d'Auvergne", fr: "Façades du boulevard de la Tour d'Auvergne" }}
                caption={
                    <>
                        {t({
                            en: "Close-up without the ground map: the level decreases with height and on the façades turned away from the road.",
                            fr: "Vue rapprochée, sans la carte au sol : le niveau baisse avec la hauteur et sur les façades qui tournent le dos à la voie.",
                        })}{" "}
                        {t(SOURCE_SIM)}
                    </>
                }
            />
        </Sheet>
    );
}

function Scenarios() {
    return (
        <Sheet id="scenarios" folio={6}>
            <p>
                {t({
                    en: "Three traffic scenarios are compared with the current situation. Rail traffic is the same in all of them. Removed heavy-vehicle trips are not turned into car trips.",
                    fr: "Trois scénarios de circulation sont comparés à la situation actuelle. Le trafic ferroviaire est identique dans tous. Les trajets de poids lourds supprimés ne sont pas reportés sur des voitures.",
                })}
            </p>
            <Exhibit kind="table" number={1} title={{ en: "Scenarios studied", fr: "Scénarios étudiés" }} source={t({ en: "Vehicle-kilometres over the modelled network.", fr: "Véhicules-kilomètres sur le réseau modélisé." })}>
                <div class="overflow-x-auto">
                    <table class="table-report">
                        <thead>
                            <tr>
                                <th>{t({ en: "Scenario", fr: "Scénario" })}</th>
                                <th>{t({ en: "Measures", fr: "Mesures" })}</th>
                                <th class="num">{t({ en: "veh·km/day", fr: "véh.km/j" })}</th>
                                <th class="num">{t({ en: "Mean speed", fr: "Vitesse moy." })}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={SCENARIOS}>
                                {(s, i) => (
                                    <tr>
                                        <td class="font-semibold whitespace-nowrap text-[var(--navy)]">
                                            {String.fromCharCode(65 + i())}. {t(s.label)}
                                        </td>
                                        <td>{t(s.description)}</td>
                                        <td class="num">{num(S[s.id].traffic.vehKmPerDay)}</td>
                                        <td class="num">{num(S[s.id].traffic.meanSpeed, { maximumFractionDigits: 0 })} km/h</td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Exhibit>

            <Figure3D
                id="compare"
                number={5}
                tabs
                title={{ en: "Scenario comparison, Boulevard de la Liberté and the République quays", fr: "Comparaison des scénarios, boulevard de la Liberté et quais de la République" }}
                caption={
                    <>
                        {t({
                            en: "Switch scenarios above the view: façades and ground follow, and so do the street details. In “Car-free streets”, closed streets are drawn in beige.",
                            fr: "Changer de scénario au-dessus de la vue : façades, sol et détail des rues suivent. Dans « Rues sans voiture », les rues fermées sont dessinées en beige.",
                        })}{" "}
                        {t(SOURCE_SIM)}
                    </>
                }
            />

            <Exhibit kind="table" number={2} title={{ en: "Exposure indicators by scenario", fr: "Indicateurs d'exposition par scénario" }} source={t(SOURCE_SIM)}>
                <div class="overflow-x-auto">
                    <table class="table-report">
                        <thead>
                            <tr>
                                <th />
                                <For each={SCENARIOS}>{(sc) => <th class="num">{t(sc.label)}</th>}</For>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={INDICATORS}>
                                {(ind) => (
                                    <tr>
                                        <td>{t(ind.label)}</td>
                                        <For each={SCENARIOS}>{(sc) => <td class="num">{ind.value(S[sc.id])}</td>}</For>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Exhibit>

            <p>
                {t({
                    en: `The zone 30 lowers the level a little almost everywhere (${pct(S.zone30.ground.delta!.under1)} of the open space gains at least 1 dB). Banning heavy vehicles has a smaller effect, their synthetic share being low. Car-free streets give the largest gains — ${pct(S.car_free.ground.delta!.under3)} of the area gains 3 dB or more — but only in the closed streets.`,
                    fr: `La zone 30 abaisse un peu le niveau presque partout (${pct(S.zone30.ground.delta!.under1)} de l'espace public gagne au moins 1 dB). L'interdiction des poids lourds a un effet plus faible, leur part synthétique étant faible. Les rues sans voiture donnent les plus forts gains — ${pct(S.car_free.ground.delta!.under3)} de la surface gagne 3 dB ou plus — mais seulement dans les rues fermées.`,
                })}
            </p>
            <Exhibit kind="figure" number={6} title={GAINS_TITLE} source={t(SOURCE_SIM)}>
                <GainsChart />
            </Exhibit>
        </Sheet>
    );
}

function Conclusions() {
    return (
        <Sheet id="conclusions" folio={7}>
            <ul>
                <li>
                    {t({
                        en: `Exposure is a matter of main roads: they carry ${pct(mainShare)} of the traffic and nearly all the exceedances of ${STATS.limitRoad} dB(A).`,
                        fr: `L'exposition est une affaire d'axes : ils portent ${pct(mainShare)} du trafic et la quasi-totalité des dépassements de ${STATS.limitRoad} dB(A).`,
                    })}
                </li>
                <li>
                    {t({
                        en: `Lower speeds act where the problem is: “${label(bestLimit)}” cuts the open space above the limit value by ${pts(B.ground.overLimit, S[bestLimit].ground.overLimit)} points.`,
                        fr: `Baisser les vitesses agit là où est le problème : «\u00a0${label(bestLimit)}\u00a0» réduit de ${pts(B.ground.overLimit, S[bestLimit].ground.overLimit)} points l'espace public au-delà de la valeur limite.`,
                    })}
                </li>
                <li>
                    {t({
                        en: `Closing minor streets creates quiet areas: ${pct(S[bestCalm].ground.under50)} of the open space below 50 dB(A).`,
                        fr: `Fermer les petites rues crée des zones calmes : ${pct(S[bestCalm].ground.under50)} de l'espace public sous 50 dB(A).`,
                    })}
                </li>
            </ul>
            <p>
                {t({
                    en: "Next steps: a combined scenario (main roads at 30 km/h, car-free minor streets), then a real study with traffic counts, terrain, measurements and the population per building.",
                    fr: "Suites : un scénario combiné (axes à 30 km/h, petites rues sans voiture), puis une étude réelle avec comptages, relief, mesures et population par bâtiment.",
                })}
            </p>
        </Sheet>
    );
}

function Appendix() {
    return (
        <Sheet id="appendix" folio={8}>
            <h3>{t({ en: "A.1 Sources and licences", fr: "A.1 Sources et licences" })}</h3>
            <ul>
                <li>
                    <A href={LINKS.bdTopo}>IGN BD TOPO®</A>
                    {t({ en: " (October 2026 extract) — buildings, roads, railways; ", fr: " (extraction d'octobre 2026) — bâtiments, voies, voies ferrées ; " })}
                    <A href={LINKS.licenceOuverte}>Licence Ouverte 2.0</A>.
                </li>
                <li>{t({ en: "Plan IGN v2 — basemap of Figure 1, streamed from the IGN Géoplateforme; Licence Ouverte 2.0.", fr: "Plan IGN v2 — fond de la figure 1, diffusé par la Géoplateforme de l'IGN ; Licence Ouverte 2.0." })}</li>
                <li>
                    <A href={LINKS.noiseModelling}>NoiseModelling</A>
                    {t({
                        en: " (CNOSSOS-EU) — noise computation; data prepared with Siradel's proprietary converters. Derived information, neither published nor validated by IGN or Rennes Métropole.",
                        fr: " (CNOSSOS-EU) — calcul acoustique ; données préparées avec les convertisseurs propriétaires de Siradel. Information dérivée, ni publiée ni validée par l'IGN ou Rennes Métropole.",
                    })}
                </li>
                <li>
                    {t({ en: "Software: the Horizon engine and the libraries of this page are under permissive licences (MIT, BSD, Apache 2.0); see the ", fr: "Logiciels : le moteur Horizon et les bibliothèques de cette page sont sous licences permissives (MIT, BSD, Apache 2.0) ; voir les " })}
                    <A href="third-party-licenses.txt">{t({ en: "third-party notices", fr: "mentions des tiers" })}</A>.
                </li>
            </ul>
            <p class="text-[14px] text-[var(--muted)]">
                {t({
                    en: "This document is not affiliated with Rennes Métropole, the City of Rennes or IGN.",
                    fr: "Ce document n'est affilié ni à Rennes Métropole, ni à la Ville de Rennes, ni à l'IGN.",
                })}
            </p>

            <h3>{t({ en: "A.2 How this document is made", fr: "A.2 Comment ce document est construit" })}</h3>
            <p>
                {t({
                    en: "The page is a static web application. The five 3D figures share a single ",
                    fr: "La page est une application web statique. Les cinq figures 3D partagent une seule instance du moteur ",
                })}
                <A href={LINKS.horizon}>Horizon</A>
                {t({
                    en: " viewer, Siradel's open source 3D engine: it moves to the figure being read and flies to its view. Buildings are 3D Tiles coloured by data textures (one material per scenario), the ground map is a float raster coloured on the fly, the streets are PMTiles vector tiles; everything can be picked.",
                    fr: ", le moteur 3D open source de Siradel : elle se place sur la figure en cours de lecture et rejoint son point de vue. Les bâtiments sont des 3D Tiles colorés par textures de données (un matériau par scénario), la carte au sol est un raster flottant coloré à la volée, les rues sont des tuiles vectorielles PMTiles ; tout est interrogeable.",
                })}
            </p>
            <p>
                {t({
                    en: "Charts, tables and the figures quoted in the text were pre-computed from the same files as the 3D views; the text reads them, nothing is typed by hand. The ",
                    fr: "Graphiques, tableaux et chiffres cités dans le texte ont été pré-calculés à partir des mêmes fichiers que les vues 3D ; le texte les lit, rien n'est saisi à la main. Le ",
                })}
                <A href={LINKS.repo}>{t({ en: "source code", fr: "code source" })}</A>
                {t({ en: " of the page is open.", fr: " de la page est ouvert." })}
            </p>

            <div class="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--navy)] pt-4 font-sans text-[12px] max-sm:grid-cols-1">
                <For
                    each={[
                        [{ en: "Horizon 3D engine", fr: "Moteur 3D Horizon" }, "horizon.oss.siradel.com", LINKS.horizon],
                        [{ en: "SCE ecosystem", fr: "Écosystème SCE" }, "sce.oss.siradel.com", LINKS.sce],
                        [{ en: "Source code", fr: "Code source" }, "github.com/siradel-oss/horizon-demo-urban-noise", LINKS.repo],
                        [{ en: "Contact", fr: "Contact" }, LINKS.contactEmail, `mailto:${LINKS.contactEmail}`],
                    ] as [Text, string, string][]}
                >
                    {([name, text, href]) => (
                        <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener" class="group flex flex-col text-[var(--ink)] no-underline">
                            <span class="font-semibold text-[var(--navy)]">{t(name)}</span>
                            <span class="group-hover:underline">{text}</span>
                        </a>
                    )}
                </For>
            </div>
        </Sheet>
    );
}

export default function Report() {
    return (
        <>
            <Cover />
            <Summary />
            <Context />
            <Method />
            <Baseline />
            <Scenarios />
            <Conclusions />
            <Appendix />
        </>
    );
}
