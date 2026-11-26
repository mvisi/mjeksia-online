// Renders TeX to standalone SVG strings (MathJax 3, same setup the app expects).
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const doc = mathjax.document("", {
  InputJax: new TeX({
    packages: AllPackages.filter((p) => p !== "bussproofs"),
    formatError: (_jax, err) => {
      throw err;
    },
  }),
  OutputJax: new SVG({ fontCache: "local" }),
});

/**
 * Renders TeX and splits the glyph outlines out of the SVG so they can be
 * stored once and shared by every formula (cuts the DB size by ~80%).
 *
 * @param {string} tex
 * @returns {{ body: string, glyphs: Map<string, string>, width: number, height: number, verticalAlign: number }}
 */
export function renderTexShared(tex) {
  const { xml, ...size } = renderTex(tex);
  const glyphs = new Map();
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(xml)?.[1] ?? "";
  for (const [, id, d] of defs.matchAll(
    /<path id="MJX-\d+-(TEX-[^"]+)" d="([^"]*)"\s*\/?>(?:<\/path>)?/g,
  )) {
    glyphs.set(id, d);
  }
  const body = xml
    .replace(/<defs>[\s\S]*?<\/defs>/, "")
    .replace(/MJX-\d+-TEX-/g, "TEX-")
    // Semantic annotations are not needed to draw the formula.
    .replace(/\s(?:data-[\w-]+|class)="[^"]*"/g, "");
  return { body, glyphs, ...size };
}

/**
 * @param {string} tex
 * @returns {{ xml: string, width: number, height: number, verticalAlign: number }}
 */
export function renderTex(tex) {
  const node = doc.convert(tex, { display: false });
  const svg = adaptor.firstChild(node);
  const width = parseFloat(adaptor.getAttribute(svg, "width"));
  const height = parseFloat(adaptor.getAttribute(svg, "height"));
  const style = adaptor.getAttribute(svg, "style") ?? "";
  const verticalAlign = parseFloat(/vertical-align:\s*(-?[\d.]+)ex/.exec(style)?.[1] ?? "0");
  // The app sizes the SVG itself, so drop the intrinsic size/style attributes.
  for (const attr of ["width", "height", "style", "role", "focusable"]) {
    adaptor.removeAttribute(svg, attr);
  }
  return { xml: adaptor.serializeXML(svg), width, height, verticalAlign };
}
