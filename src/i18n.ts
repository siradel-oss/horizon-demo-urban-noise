import { createSignal } from "solid-js";

/**
 * Minimal runtime i18n (English / French).
 *
 * Translations live next to the code that displays them, as `Text` pairs (`{ en, fr }`), instead of a central
 * key catalogue: a component reads `t({ en: "Close", fr: "Fermer" })`. `t()` reads the `lang` signal, so the
 * UI re-renders when the language changes. The choice is kept in localStorage; `?lang=en|fr` forces it.
 */

export type Lang = "en" | "fr";
export type Text = Record<Lang, string>;

const LANG_KEY = "horizon-demo-urban-noise:lang";
const LOCALES: Record<Lang, string> = { en: "en-GB", fr: "fr-FR" };

function initialLang(): Lang {
    const param = new URLSearchParams(location.search).get("lang");
    if (param === "en" || param === "fr") return param;
    try {
        const stored = localStorage.getItem(LANG_KEY);
        if (stored === "en" || stored === "fr") return stored;
    } catch {
        // Storage unavailable (private mode…): fall back to the browser.
    }
    return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

const [lang, setLangSignal] = createSignal<Lang>(initialLang());
document.documentElement.lang = lang();

export { lang };

export function setLang(value: Lang) {
    setLangSignal(value);
    document.documentElement.lang = value;
    try {
        localStorage.setItem(LANG_KEY, value);
    } catch {
        // Not persisted: the choice still applies to this session.
    }
}

/** Resolves a `Text` in the current language (reactive). */
export const t = (text: Text) => text[lang()];

/** Formats a number in the current locale (reactive). */
export const num = (value: number, options?: Intl.NumberFormatOptions) => value.toLocaleString(LOCALES[lang()], options);
