import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

// Horizon needs SharedArrayBuffer -> cross-origin isolation (COOP/COEP). The static server used in
// production must send the same headers (and application/wasm for .wasm, plus HTTP range support).
// GitHub Pages can't: public/coi-serviceworker.min.js adds them client-side there.
const crossOriginIsolation = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
};

/**
 * The Horizon WebAssembly core bundles third-party code (MIT, BSD, MPL-2.0, Boost…): ship its notices with the
 * build, from the installed package so they always match the version served.
 */
function thirdPartyLicenses(): Plugin {
    return {
        name: "third-party-licenses",
        apply: "build",
        generateBundle() {
            const file = createRequire(import.meta.url).resolve("@siradel-oss/horizon-core/LICENSE-THIRD-PARTY.txt");
            this.emitFile({ type: "asset", fileName: "third-party-licenses.txt", source: readFileSync(file) });
        },
    };
}

export default defineConfig({
    // Relative URLs: the build works under any subpath.
    base: "./",
    plugins: [solid(), tailwindcss(), thirdPartyLicenses()],
    server: { headers: crossOriginIsolation },
    preview: { headers: crossOriginIsolation },
    build: { target: "es2022" },
});
