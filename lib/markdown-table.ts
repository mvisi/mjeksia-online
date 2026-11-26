// Parser for the GitHub-style markdown tables stored in `table_content`.

export type Alignment = "left" | "center" | "right";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  alignments: Alignment[];
}

function parseCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSeparator(line: string): boolean {
  // Matches lines like |---|:---:|---:| with optional outer pipes
  return /^\|?(\s*:?-{1,}:?\s*\|)*\s*:?-{1,}:?\s*\|?$/.test(line.trim());
}

function getAlignment(cell: string): Alignment {
  const s = cell.replace(/\s/g, "");
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  if (s.endsWith(":")) return "right";
  return "left";
}

export function parseMarkdownTable(md: string): ParsedTable | null {
  const lines = md
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Need at least a header row + separator
  if (lines.length < 2) return null;

  // Locate the separator row (usually index 1, but tolerate index 2)
  let sepIdx = -1;
  for (let i = 1; i < Math.min(lines.length, 3); i++) {
    if (isSeparator(lines[i])) {
      sepIdx = i;
      break;
    }
  }
  if (sepIdx === -1) return null;

  const headers = parseCells(lines[0]);
  const cols = headers.length;
  if (cols === 0) return null;

  // Derive per-column alignment from the separator
  const sepCells = parseCells(lines[sepIdx]);
  const alignments: Alignment[] = Array.from({ length: cols }, (_, i) =>
    i < sepCells.length ? getAlignment(sepCells[i]) : "left",
  );

  // Collect data rows, normalising each to exactly `cols` cells
  const rows: string[][] = [];
  for (let i = sepIdx + 1; i < lines.length; i++) {
    if (isSeparator(lines[i])) continue; // skip stray separators
    const cells = parseCells(lines[i]);
    rows.push(Array.from({ length: cols }, (_, j) => (j < cells.length ? cells[j] : "")));
  }

  return { headers, rows, alignments };
}
