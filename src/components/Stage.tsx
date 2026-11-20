import { type Accessor, createContext, createSignal, For, type JSX, onCleanup, onMount, type ParentProps, Show, useContext } from "solid-js";

import { createViewer, type PickInfo, type Viewer } from "../horizon/viewer";
import { t, type Text } from "../i18n";
import { type Scenario, SCENARIOS } from "../palette";
import { VIEWS, type ViewId } from "../report/views";
import InfoCard from "./InfoCard";
import Legend from "./Legend";

/**
 * The "stage": one Horizon viewer for the whole report. Each 3D figure is an empty slot in the text; the canvas is
 * laid over the slot that fills most of the screen and flies to that figure's view. (A viewer per figure would
 * multiply GPU memory, and tearing a viewer down doesn't free it.)
 *
 * The canvas only takes pointer and wheel events once the reader clicks it, so that scrolling the document over a
 * figure scrolls the document. Escape, a click outside or another figure taking over gives the page back.
 */
interface StageState {
    active: Accessor<ViewId | undefined>;
    interactive: Accessor<boolean>;
    setInteractive(value: boolean): void;
    scenarioOf(id: ViewId): Scenario;
    setScenario(id: ViewId, scenario: Scenario): void;
    recenter(id: ViewId): void;
    pick: Accessor<PickInfo | null>;
    setPick(info: PickInfo | null): void;
    ready: Accessor<boolean>;
    error: Accessor<string | undefined>;
    register(id: ViewId, slot: HTMLElement): void;
    /** Re-evaluates which slot is shown (call after showing or hiding slots without a scroll or resize). */
    refresh(): void;
}

const StageContext = createContext<StageState>();
export const useStage = () => useContext(StageContext)!;

/** Wraps the document; renders the canvas once, positioned over the active figure. */
export function Stage(props: ParentProps) {
    let host!: HTMLDivElement;
    let canvas!: HTMLCanvasElement;
    let frame!: HTMLDivElement;
    const slots = new Map<ViewId, HTMLElement>();
    const [active, setActive] = createSignal<ViewId>();
    const [interactive, setInteractive] = createSignal(false);
    const [pick, setPick] = createSignal<PickInfo | null>(null);
    const [scenarios, setScenarios] = createSignal(
        Object.fromEntries(Object.entries(VIEWS).map(([id, v]) => [id, v.scenario])) as Record<ViewId, Scenario>,
    );
    const [viewer, setViewer] = createSignal<Viewer>();
    const [error, setError] = createSignal<string>();

    const viewOf = (id: ViewId) => ({ ...VIEWS[id], scenario: scenarios()[id] });

    /** Picks the slot showing the most of itself, lays the canvas over it. Runs on scroll, resize and layout changes. */
    let scheduled = false;
    const update = () => {
        scheduled = false;
        const viewport = window.innerHeight;
        let best: ViewId | undefined;
        let bestShare = 0.35; // below that, the current figure keeps the viewer
        for (const [id, slot] of slots) {
            const r = slot.getBoundingClientRect();
            const share = (Math.min(r.bottom, viewport) - Math.max(r.top, 0)) / Math.min(r.height, viewport);
            if (share > bestShare) [best, bestShare] = [id, share];
        }
        const current = active();
        const next = best ?? (current && slots.has(current) ? current : slots.keys().next().value);
        if (next && next !== current) {
            setActive(next);
            setInteractive(false);
            setPick(null);
            void viewer()?.show(viewOf(next), current !== undefined);
        }
        const slot = next && slots.get(next);
        if (slot) {
            const s = slot.getBoundingClientRect();
            const h = host.getBoundingClientRect();
            // A hidden slot (another slide): hide the canvas but keep its size, rather than resizing the engine to 0.
            frame.style.visibility = s.width ? "" : "hidden";
            if (s.width) Object.assign(frame.style, {
                top: `${s.top - h.top}px`,
                left: `${s.left - h.left}px`,
                width: `${s.width}px`,
                height: `${s.height}px`,
            });
        }
    };
    const schedule = () => {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(update);
        }
    };

    onMount(() => {
        // Figures register in their own onMount, which runs after this one: start on the first registered figure
        // and catch up with the active one once the engine is ready.
        update();
        const first = active() ?? (Object.keys(VIEWS)[0] as ViewId);
        createViewer(canvas, viewOf(first), setPick)
            .then((v) => {
                setViewer(v);
                const current = active();
                if (current && current !== first) void v.show(viewOf(current), false);
            })
            .catch((e: Error) => setError(e.message));

        const resize = new ResizeObserver(schedule);
        resize.observe(host);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setInteractive(false);
        const onDown = (e: PointerEvent) => {
            const slot = active() && slots.get(active()!);
            if (interactive() && slot && !slot.contains(e.target as Node) && !frame.contains(e.target as Node)) setInteractive(false);
        };
        addEventListener("scroll", schedule, { passive: true });
        addEventListener("resize", schedule);
        addEventListener("keydown", onKey);
        addEventListener("pointerdown", onDown);
        onCleanup(() => {
            resize.disconnect();
            removeEventListener("scroll", schedule);
            removeEventListener("resize", schedule);
            removeEventListener("keydown", onKey);
            removeEventListener("pointerdown", onDown);
        });
    });

    const state: StageState = {
        active,
        interactive,
        setInteractive,
        scenarioOf: (id) => scenarios()[id],
        setScenario(id, scenario) {
            setScenarios({ ...scenarios(), [id]: scenario });
            setPick(null);
            if (active() === id) void viewer()?.setScenario(scenario);
        },
        recenter: (id) => void viewer()?.show(viewOf(id), true),
        pick,
        setPick,
        ready: () => !!viewer(),
        error,
        register(id, slot) {
            slots.set(id, slot);
            schedule();
            // Only if still ours: when switching mode, the other mode's slot may already have taken the id.
            onCleanup(() => slots.get(id) === slot && slots.delete(id));
        },
        refresh: schedule,
    };

    return (
        <StageContext.Provider value={state}>
            <div ref={host} class="relative">
                {props.children}
                <div ref={frame} class="absolute z-10" classList={{ "pointer-events-none": !interactive() }}>
                    <canvas ref={canvas} class="block h-full w-full" classList={{ "touch-none": interactive() }} />
                </div>
            </div>
        </StageContext.Provider>
    );
}

const button =
    "inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded border border-[var(--rule)] bg-white px-2 py-1 text-[12px] text-[var(--ink)] transition-colors hover:border-[var(--navy)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-40";

/** Flies the figure's view back to its initial camera. */
export function ResetButton(props: { id: ViewId }) {
    const stage = useStage();
    return (
        <button class={button} disabled={!stage.ready() || stage.active() !== props.id} onClick={() => stage.recenter(props.id)}>
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
            </svg>
            {t({ en: "Reset view", fr: "Vue d'origine" })}
        </button>
    );
}

/** Scenario switch of a figure (A–D). */
export function ScenarioTabs(props: { id: ViewId; class?: string }) {
    const stage = useStage();
    const scenario = () => stage.scenarioOf(props.id);
    return (
        <div role="tablist" aria-label={t({ en: "Scenario", fr: "Scénario" })} class={`grid grid-cols-2 gap-px overflow-hidden rounded border border-[var(--rule)] bg-[var(--rule)] font-sans text-[12px] sm:grid-cols-4 ${props.class ?? ""}`}>
            <For each={SCENARIOS}>
                {(s, i) => (
                    <button
                        role="tab"
                        aria-selected={scenario() === s.id}
                        class="px-2 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]"
                        classList={{
                            "bg-[var(--navy)] text-white": scenario() === s.id,
                            "bg-white text-[var(--ink)] hover:bg-[var(--paper-2)]": scenario() !== s.id,
                        }}
                        onClick={() => stage.setScenario(props.id, s.id)}
                    >
                        <span class="mr-1 tabular-nums opacity-60">{String.fromCharCode(65 + i())}</span>
                        {t(s.label)}
                    </button>
                )}
            </For>
        </div>
    );
}

/**
 * The place where the viewer shows a figure's view: a poster while the viewer is elsewhere, "click to explore",
 * the info card of a pick. Size it from the parent (`class`).
 */
export function Slot3D(props: { id: ViewId; class: string }) {
    const stage = useStage();
    let slot!: HTMLDivElement;
    onMount(() => stage.register(props.id, slot));
    const isActive = () => stage.active() === props.id;

    return (
        <div ref={slot} class={`relative overflow-hidden border border-[var(--rule)] bg-[var(--paper-2)] font-sans ${props.class}`}>
            <Show when={!isActive() || !stage.ready()}>
                <div class="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,transparent_0_10px,var(--hatch)_10px_11px)] text-[12px] text-[var(--muted)]">
                    {stage.error() && isActive()
                        ? stage.error()
                        : isActive()
                          ? t({ en: "Loading the 3D view…", fr: "Chargement de la vue 3D…" })
                          : t({ en: "Interactive 3D view — scroll to bring it in", fr: "Vue 3D interactive — faites défiler jusqu'ici" })}
                </div>
            </Show>

            <Show when={isActive() && stage.ready()}>
                <Show
                    when={stage.interactive()}
                    fallback={
                        <button
                            class="group absolute inset-0 z-20 flex cursor-pointer items-end justify-center pb-3 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--focus)]"
                            aria-label={t({ en: "Explore the 3D view", fr: "Explorer la vue 3D" })}
                            onClick={() => stage.setInteractive(true)}
                        >
                            <span class="rounded-full bg-[var(--navy)]/85 px-3 py-1 text-[11px] text-white opacity-80 shadow transition-opacity group-hover:opacity-100">
                                {t({ en: "Click to explore in 3D", fr: "Cliquer pour explorer en 3D" })}
                            </span>
                        </button>
                    }
                >
                    <span class="pointer-events-none absolute bottom-3 left-1/2 z-20 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl bg-white/90 px-3 py-1 text-center text-[11px] text-[var(--ink)] shadow max-md:hidden">
                        {t({
                            en: "Drag to move, scroll to zoom, Ctrl + drag to turn and tilt the camera",
                            fr: "Glisser pour se déplacer, molette pour zoomer, Ctrl + glisser pour tourner et incliner la caméra",
                        })}
                        <br />
                        {t({
                            en: "Click a building or a street · Esc to leave",
                            fr: "Clic sur un bâtiment ou une rue · Échap pour sortir",
                        })}
                    </span>
                    <Show when={stage.pick()}>
                        {(info) => (
                            <div class="absolute top-2 right-2 z-20 max-sm:inset-x-2">
                                <InfoCard info={info()} scenario={stage.scenarioOf(props.id)} onClose={() => stage.setPick(null)} />
                            </div>
                        )}
                    </Show>
                </Show>
            </Show>
        </div>
    );
}

/** A 3D figure of the document: numbered title, the slot, a caption and the legend. `tabs` adds the scenario switch. */
export function Figure3D(props: { id: ViewId; number: number; title: Text; caption: JSX.Element; tabs?: boolean }) {
    return (
        <figure class="my-10 break-inside-avoid">
            <div class="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div class="text-[13px] text-[var(--ink)]">
                    <span class="font-semibold text-[var(--navy)]">Figure {props.number}</span>
                    <span class="mx-1.5 text-[var(--muted)]">—</span>
                    {t(props.title)}
                </div>
                <ResetButton id={props.id} />
            </div>
            <Show when={props.tabs}>
                <ScenarioTabs id={props.id} class="mb-2" />
            </Show>
            <Slot3D id={props.id} class="aspect-[16/10] max-sm:aspect-[4/3]" />
            <figcaption class="mt-3 grid gap-x-6 gap-y-2 text-[12.5px] leading-relaxed text-[var(--muted)] sm:grid-cols-[minmax(0,1fr)_220px]">
                <div>{props.caption}</div>
                <Legend />
            </figcaption>
        </figure>
    );
}
