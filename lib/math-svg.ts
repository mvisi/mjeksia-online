/**
 * Formulas are stored without their glyph outlines (shared in the `glyphs`
 * table). This puts them back as a `<defs>` block the `<use>` tags point at.
 */
export function assembleSvg(body: string, glyphPaths: string[]): string {
  const defs = `<defs>${glyphPaths.join("")}</defs>`;
  const openTagEnd = body.indexOf(">") + 1;
  return body.slice(0, openTagEnd) + defs + body.slice(openTagEnd);
}

export function glyphPath(id: string, path: string): string {
  return `<path id="${id}" d="${path}"/>`;
}
