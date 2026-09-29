import type { AssistantView, ChartSpec } from "../types.ts";

/*
 * Professional black & white booklet PDF (A4): cover page with summary and contents,
 * running header/footer with page numbers, numbered sections, grayscale charts and ruled tables.
 * Hand-written PDF (Helvetica, WinAnsi) so no library is needed.
 */

type FontId = "F1" | "F2";

const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556,
  556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556,
  611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

const WIN_ANSI: Record<string, [number, number]> = {
  "—": [0x97, 1000],
  "–": [0x96, 556],
  "…": [0x85, 1000],
  "·": [0xb7, 278],
  "•": [0x95, 350],
  "‘": [0x91, 222],
  "’": [0x92, 222],
  "“": [0x93, 333],
  "”": [0x94, 333],
  "×": [0xd7, 584],
  "é": [0xe9, 556],
};
const REPLACE: Record<string, string> = { "−": "-", "₹": "Rs ", "≥": ">=", "≤": "<=", "↑": "", "↓": "", "€": "EUR ", "\t": " " };

function normalize(text: string): string {
  return [...String(text ?? "")].map((char) => REPLACE[char] ?? char).join("");
}

function charWidth(char: string, font: FontId): number {
  const mapped = WIN_ANSI[char];
  if (mapped) return mapped[1];
  const code = char.charCodeAt(0);
  const table = font === "F2" ? HELVETICA_BOLD : HELVETICA;
  return code >= 32 && code <= 126 ? table[code - 32] : 556;
}

function textWidth(text: string, size: number, font: FontId = "F1"): number {
  let total = 0;
  for (const char of normalize(text)) total += charWidth(char, font);
  return (total * size) / 1000;
}

function pdfString(text: string): string {
  let out = "";
  for (const char of normalize(text)) {
    const mapped = WIN_ANSI[char];
    if (mapped) {
      out += `\\${mapped[0].toString(8)}`;
      continue;
    }
    const code = char.charCodeAt(0);
    if (char === "\\" || char === "(" || char === ")") out += `\\${char}`;
    else if (code >= 32 && code <= 126) out += char;
    else out += "?";
  }
  return out;
}

function fit(text: string, width: number, size: number, font: FontId = "F1"): string {
  const clean = normalize(text);
  if (textWidth(clean, size, font) <= width) return clean;
  let cut = clean;
  while (cut.length > 1 && textWidth(`${cut}…`, size, font) > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function wrapText(text: string, width: number, size: number, font: FontId = "F1"): string[] {
  const lines: string[] = [];
  for (const paragraph of normalize(text).split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, font) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const n2 = (value: number) => (Math.round(value * 100) / 100).toString();

// ---------------------------------------------------------------------------
// Document model

interface Page {
  width: number;
  height: number;
  ops: string[];
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 46;
const TOP = 70;
const BOTTOM = 58;

class Booklet {
  pages: Page[] = [];
  page!: Page;
  y = 0;

  /** Every page is A4 portrait so the booklet prints on A4 without rotation. */
  addPage(): Page {
    if (this.page && this.page.ops.length === 0 && this.pages.includes(this.page)) {
      this.y = TOP;
      return this.page;
    }
    const page: Page = { width: A4.width, height: A4.height, ops: [] };
    this.pages.push(page);
    this.page = page;
    this.y = TOP;
    return page;
  }

  get contentWidth(): number {
    return this.page.width - MARGIN * 2;
  }

  ensure(space: number): void {
    if (this.y + space > this.page.height - BOTTOM) this.addPage();
  }

  text(x: number, y: number, value: string, size: number, font: FontId = "F1", gray = 0, align: "left" | "right" | "center" = "left", page = this.page): void {
    const width = textWidth(value, size, font);
    const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    page.ops.push(`${n2(gray)} g BT /${font} ${n2(size)} Tf ${n2(left)} ${n2(page.height - y)} Td (${pdfString(value)}) Tj ET`);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5, gray = 0, page = this.page, dash?: string): void {
    page.ops.push(`${n2(gray)} G ${n2(width)} w ${dash ? `[${dash}] 0 d ` : ""}${n2(x1)} ${n2(page.height - y1)} m ${n2(x2)} ${n2(page.height - y2)} l S${dash ? " [] 0 d" : ""}`);
  }

  rect(x: number, y: number, width: number, height: number, fill?: number, stroke?: number, lineWidth = 0.5, page = this.page): void {
    const parts: string[] = [];
    if (fill !== undefined) parts.push(`${n2(fill)} g`);
    if (stroke !== undefined) parts.push(`${n2(stroke)} G ${n2(lineWidth)} w`);
    parts.push(`${n2(x)} ${n2(page.height - y - height)} ${n2(width)} ${n2(height)} re`);
    parts.push(fill !== undefined && stroke !== undefined ? "B" : fill !== undefined ? "f" : "S");
    page.ops.push(parts.join(" "));
  }

  polyline(points: Array<[number, number]>, width = 1.2, gray = 0): void {
    if (points.length < 2) return;
    const path = points.map(([x, y], index) => `${n2(x)} ${n2(this.page.height - y)} ${index === 0 ? "m" : "l"}`).join(" ");
    this.page.ops.push(`${n2(gray)} G ${n2(width)} w 1 j 1 J ${path} S`);
  }

  build(): Blob {
    const objects: string[] = [];
    objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
    const pageIds = this.pages.map((_, index) => 5 + index * 2);
    objects.push(`2 0 obj << /Type /Pages /Count ${this.pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >> endobj`);
    objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj");
    objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj");
    this.pages.forEach((page, index) => {
      const pageId = 5 + index * 2;
      const stream = page.ops.join("\n");
      objects.push(
        `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(page.width)} ${n2(page.height)}] /Contents ${pageId + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >> endobj`,
      );
      objects.push(`${pageId + 1} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
    });
    let body = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (const object of objects) {
      offsets.push(body.length);
      body += `${object}\n`;
    }
    const xref = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R /Info << /Producer (EVOLV Copilot) >> >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([body], { type: "application/pdf" });
  }
}

// ---------------------------------------------------------------------------
// Blocks

const MODE_TITLE: Record<AssistantView["mode"], string> = {
  count: "KPI Summary",
  report: "Detailed Report",
  details: "Document Report",
  table: "Data Table",
  pdf: "Detailed Report",
  dashboard: "Dashboard Report",
  comparison: "Comparison Report",
  chart: "Trend Report",
};

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const unit = value / pow;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return step * pow;
}

function sectionHeading(doc: Booklet, number: string, title: string, contents: Array<{ title: string; page: number }>, keep = 0): void {
  doc.ensure(44 + keep);
  if (doc.y > TOP) doc.y += 10;
  doc.text(MARGIN, doc.y + 12, number, 13, "F2", 0.55);
  doc.text(MARGIN + 26, doc.y + 12, title, 13, "F2");
  doc.line(MARGIN, doc.y + 20, MARGIN + doc.contentWidth, doc.y + 20, 1.2, 0);
  contents.push({ title: `${number}  ${title}`, page: doc.pages.length });
  doc.y += 34;
}

function kpiLinesOf(value: string): string[] {
  const parts = value.split(/,\s+(?=[A-Z]{3}\s)/);
  return parts.length ? parts : [value];
}

function drawKpis(doc: Booklet, kpis: AssistantView["kpis"]): void {
  const columns = 3;
  const gap = 10;
  const width = (doc.contentWidth - gap * (columns - 1)) / columns;
  for (let start = 0; start < kpis.length; start += columns) {
    const row = kpis.slice(start, start + columns);
    const lines = row.map((kpi) => kpiLinesOf(kpi.value).flatMap((line) => wrapText(line, width - 20, 11, "F2")));
    const height = 30 + Math.max(...lines.map((entry) => entry.length)) * 14;
    doc.ensure(height + gap);
    row.forEach((kpi, index) => {
      const x = MARGIN + index * (width + gap);
      doc.rect(x, doc.y, width, height, undefined, 0.55, 0.6);
      doc.rect(x, doc.y, 3, height, 0);
      doc.text(x + 12, doc.y + 15, fit(kpi.label.toUpperCase(), width - 20, 6.8, "F2"), 6.8, "F2", 0.4);
      lines[index].forEach((line, lineIndex) => doc.text(x + 12, doc.y + 32 + lineIndex * 14, line, 11, "F2"));
    });
    doc.y += height + gap;
  }
}

const SHADES = [0.15, 0.5, 0.75, 0.32, 0.62, 0.86];

function drawChart(doc: Booklet, chart: ChartSpec, x: number, y: number, width: number, height: number): void {
  doc.rect(x, y, width, height, undefined, 0.7, 0.5);
  doc.text(x + 10, y + 16, fit(chart.title, width - 20, 8.5, "F2"), 8.5, "F2");
  const plotX = x + 38;
  const plotY = y + 30;
  const plotW = width - 50;
  const plotH = height - 70;

  if (chart.kind === "donut") {
    const values = chart.series[0]?.values ?? [];
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    let cursor = x + 12;
    const barW = width - 24;
    values.forEach((value, index) => {
      const w = (Math.max(0, value) / total) * barW;
      doc.rect(cursor, plotY, w, 16, SHADES[index % SHADES.length], 1, 0.6);
      cursor += w;
    });
    doc.rect(x + 12, plotY, barW, 16, undefined, 0, 0.6);
    const rowH = 12;
    chart.labels.slice(0, Math.floor((height - 64) / rowH)).forEach((label, index) => {
      const ly = plotY + 30 + index * rowH;
      doc.rect(x + 12, ly - 7, 8, 8, SHADES[index % SHADES.length], 0, 0.4);
      doc.text(x + 26, ly, fit(label, width - 130, 7.2), 7.2);
      doc.text(x + width - 58, ly, compact(values[index] ?? 0), 7.2, "F1", 0, "right");
      doc.text(x + width - 14, ly, `${Math.round(((values[index] ?? 0) / total) * 100)}%`, 7.2, "F2", 0, "right");
    });
    return;
  }

  const all = chart.series.flatMap((series) => series.values);
  const max = niceMax(Math.max(1, ...all));
  for (let tick = 0; tick <= 4; tick += 1) {
    const ty = plotY + plotH - (plotH * tick) / 4;
    doc.line(plotX, ty, plotX + plotW, ty, 0.3, tick === 0 ? 0 : 0.85, doc.page, tick === 0 ? undefined : "2 2");
    doc.text(plotX - 4, ty + 2.5, compact((max * tick) / 4), 6.2, "F1", 0.35, "right");
  }
  const count = Math.max(chart.labels.length, 1);
  const slot = plotW / count;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / 34))));

  if (chart.kind === "line") {
    chart.series.forEach((series, sIndex) => {
      const points = series.values.map((value, index) => [plotX + slot * index + slot / 2, plotY + plotH - (plotH * value) / max] as [number, number]);
      doc.polyline(points, 1.3, SHADES[sIndex % SHADES.length] * 0.6);
      points.forEach(([px, py]) => doc.rect(px - 1.6, py - 1.6, 3.2, 3.2, 0));
    });
  } else {
    const seriesCount = chart.series.length;
    const barW = Math.min(28, (slot * 0.72) / seriesCount);
    chart.series.forEach((series, sIndex) => {
      series.values.forEach((value, index) => {
        const bh = (plotH * Math.max(0, value)) / max;
        const bx = plotX + slot * index + (slot - barW * seriesCount) / 2 + sIndex * barW;
        doc.rect(bx, plotY + plotH - bh, barW, bh, seriesCount === 1 ? 0.3 : SHADES[sIndex % SHADES.length], 0, 0.4);
        if (count <= 12) doc.text(bx + barW / 2, plotY + plotH - bh - 3, compact(value), 5.8, "F1", 0.2, "center");
      });
    });
  }
  chart.labels.forEach((label, index) => {
    if (index % labelEvery !== 0) return;
    doc.text(plotX + slot * index + slot / 2, plotY + plotH + 11, fit(label, slot * labelEvery - 2, 6.2), 6.2, "F1", 0.25, "center");
  });
  if (chart.series.length > 1) {
    let lx = plotX;
    chart.series.forEach((series, sIndex) => {
      doc.rect(lx, y + height - 19, 8, 8, SHADES[sIndex % SHADES.length], 0, 0.4);
      doc.text(lx + 12, y + height - 12, series.name, 7, "F2");
      lx += 22 + textWidth(series.name, 7, "F2");
    });
  }
}

function drawCharts(doc: Booklet, charts: ChartSpec[]): void {
  const gap = 12;
  const width = (doc.contentWidth - gap) / 2;
  for (let index = 0; index < charts.length; index += 2) {
    const pair = charts.slice(index, index + 2);
    const height = pair.every((chart) => chart.kind === "donut") ? Math.max(90, ...pair.map((chart) => 70 + chart.labels.length * 12)) : 196;
    doc.ensure(height + gap);
    drawChart(doc, charts[index], MARGIN, doc.y, charts[index + 1] ? width : doc.contentWidth, height);
    if (charts[index + 1]) drawChart(doc, charts[index + 1], MARGIN + width + gap, doc.y, width, height);
    doc.y += height + gap;
  }
}

function keepRows(count: number): number {
  return 40 + Math.min(count, count <= 20 ? count : 6) * 16;
}

const NUMERIC = /^[+\-−]?[\d,]+(\.\d+)?%?( [A-Z]{2,3})?$|^[—-]$|^n\/a$/;

const SPLIT_SIZE = 6.8;

/**
 * Column groups that each fit the A4 portrait width at a readable size. Leading key columns
 * (first column, plus "Item" when it follows) repeat in every group so rows can be matched.
 */
function columnGroups(columns: string[], rows: string[][], available: number): number[][] {
  const sample = rows.slice(0, 300);
  const widths = columns.map((column, index) => {
    const content = Math.max(0, ...sample.map((row) => textWidth(row[index] ?? "", SPLIT_SIZE)));
    const word = Math.max(...column.toUpperCase().split(/\s+/).map((part) => textWidth(part, SPLIT_SIZE - 0.8, "F2")));
    return Math.min(170, Math.max(content, Math.min(word, 46))) + 10;
  });
  const total = widths.reduce((sum, value) => sum + value, 0);
  if (total <= available || columns.length <= 2) return [columns.map((_, index) => index)];
  const keys = /^item$/i.test(columns[1] ?? "") ? [0, 1] : [0];
  const keyWidth = keys.reduce((sum, index) => sum + widths[index], 0);
  const groups: number[][] = [];
  let current: number[] = [];
  let width = keyWidth;
  columns.forEach((_, index) => {
    if (keys.includes(index)) return;
    if (current.length && width + widths[index] > available) {
      groups.push(current);
      current = [];
      width = keyWidth;
    }
    current.push(index);
    width += widths[index];
  });
  if (current.length) groups.push(current);
  return groups.map((group) => [...keys, ...group]);
}

function drawTable(doc: Booklet, columns: string[], rows: string[][], footer?: string[], caption?: string): void {
  const groups = columnGroups(columns, rows, doc.contentWidth);
  if (groups.length === 1) {
    drawTablePart(doc, columns, rows, footer, caption);
    return;
  }
  groups.forEach((group, index) => {
    const pick = (list: string[]) => group.map((column) => list[column] ?? "");
    const label = `Part ${index + 1} of ${groups.length}: ${group.map((column) => columns[column]).join(", ")}`;
    if (index > 0) doc.ensure(keepRows(rows.length));
    drawTablePart(doc, pick(columns), rows.map(pick), footer ? pick(footer) : undefined, caption ? `${caption} · ${label}` : label);
  });
}

function drawTablePart(doc: Booklet, columns: string[], rows: string[][], footer?: string[], caption?: string): void {
  doc.ensure(60);
  let size = columns.length > 9 ? 6.8 : 7.6;
  const pad = 5;
  const sample = rows.slice(0, 300);
  const numeric = columns.map((_, index) => sample.length > 0 && sample.every((row) => NUMERIC.test((row[index] ?? "").trim()) || !(row[index] ?? "").trim()));
  const available = doc.contentWidth;
  const sum = (list: number[]) => list.reduce((total, value) => total + value, 0);
  const measure = () => {
    const content = columns.map((_, index) => Math.max(0, ...sample.map((row) => textWidth(row[index] ?? "", size))) + pad * 2);
    const head = columns.map((column) => textWidth(column.toUpperCase(), size - 0.8, "F2") + pad * 2);
    const longestWord = columns.map((column) => Math.max(...column.toUpperCase().split(/\s+/).map((word) => textWidth(word, size - 0.8, "F2"))) + pad * 2);
    let result = content.map((value, index) => Math.min(170, Math.max(value, head[index])));
    if (sum(result) > available) result = content.map((value, index) => Math.min(170, Math.max(value, Math.min(longestWord[index], 46))));
    return result;
  };
  let widths = measure();
  if (sum(widths) > available && size > 6) {
    size = Math.max(5.8, size - 0.8);
    widths = measure();
  }
  if (sum(widths) > available) {
    // Cap only the widest columns so short codes and amounts stay readable.
    const sorted = [...widths].sort((a, b) => b - a);
    let cap = sorted[0];
    for (let index = 0; index < sorted.length; index += 1) {
      const rest = sum(sorted.slice(index + 1));
      const candidate = (available - rest) / (index + 1);
      if (candidate >= (sorted[index + 1] ?? 0)) {
        cap = candidate;
        break;
      }
    }
    widths = widths.map((value) => Math.min(value, cap));
  } else {
    const total = sum(widths);
    widths = widths.map((value) => value + ((available - total) * value) / total);
  }
  const headLines = columns.map((column, index) => {
    const lines = wrapText(column.toUpperCase(), widths[index] - pad * 2, size - 0.8, "F2");
    return lines.length > 2 ? [lines[0], lines.slice(1).join(" ")] : lines;
  });
  const rowH = size * 2.05;
  const headH = headLines.some((lines) => lines.length > 1) ? size * 3.8 : size * 2.6;

  const header = () => {
    doc.rect(MARGIN, doc.y, available, headH, 0.88);
    doc.line(MARGIN, doc.y, MARGIN + available, doc.y, 0.9, 0);
    doc.line(MARGIN, doc.y + headH, MARGIN + available, doc.y + headH, 0.6, 0);
    let x = MARGIN;
    const lineGap = size * 1.15;
    columns.forEach((_, index) => {
      const lines = headLines[index];
      const top = doc.y + headH / 2 + 2.4 - ((lines.length - 1) * lineGap) / 2;
      lines.forEach((line, lineIndex) => {
        const label = fit(line, widths[index] - pad * 2, size - 0.8, "F2");
        doc.text(numeric[index] ? x + widths[index] - pad : x + pad, top + lineIndex * lineGap, label, size - 0.8, "F2", 0, numeric[index] ? "right" : "left");
      });
      x += widths[index];
    });
    doc.y += headH;
  };

  if (caption) {
    doc.text(MARGIN, doc.y + 8, caption, 7.5, "F1", 0.35);
    doc.y += 14;
  }
  header();
  rows.forEach((row, rowIndex) => {
    if (doc.y + rowH > doc.page.height - BOTTOM) {
      doc.addPage();
      doc.text(MARGIN, doc.y + 6, "(continued)", 7, "F1", 0.45);
      doc.y += 12;
      header();
    }
    if (rowIndex % 2 === 1) doc.rect(MARGIN, doc.y, available, rowH, 0.955);
    let x = MARGIN;
    row.forEach((cell, index) => {
      if (index >= columns.length) return;
      const value = fit(cell ?? "", widths[index] - pad * 2, size);
      doc.text(numeric[index] ? x + widths[index] - pad : x + pad, doc.y + rowH / 2 + size * 0.35, value, size, "F1", 0, numeric[index] ? "right" : "left");
      x += widths[index];
    });
    doc.y += rowH;
  });
  doc.line(MARGIN, doc.y, MARGIN + available, doc.y, 0.6, 0);
  if (footer?.some(Boolean)) {
    if (doc.y + rowH > doc.page.height - BOTTOM) {
      doc.addPage();
      header();
    }
    let x = MARGIN;
    let labelWidth = widths[0];
    for (let index = 1; index < columns.length && !(footer[index] ?? "").trim(); index += 1) labelWidth += widths[index];
    footer.forEach((cell, index) => {
      if (index >= columns.length) return;
      if (index === 0) doc.text(x + pad, doc.y + rowH / 2 + size * 0.35, fit(cell ?? "", labelWidth - pad * 2, size, "F2"), size, "F2", 0, "left");
      else doc.text(x + widths[index] - pad, doc.y + rowH / 2 + size * 0.35, fit(cell ?? "", widths[index] - pad * 2, size, "F2"), size, "F2", 0, "right");
      x += widths[index];
    });
    doc.y += rowH;
    doc.line(MARGIN, doc.y, MARGIN + available, doc.y, 1.2, 0);
  }
  doc.y += 14;
}

function paragraph(doc: Booklet, text: string, size = 9, gray = 0.1): void {
  for (const line of wrapText(text, doc.contentWidth, size)) {
    doc.ensure(size * 1.6);
    doc.text(MARGIN, doc.y + size, line, size, "F1", gray);
    doc.y += size * 1.55;
  }
  doc.y += 6;
}

function stamp(): { date: string; time: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("day")}-${get("month")}-${get("year")}`, time: `${get("hour")}:${get("minute")}` };
}

function cleanSummary(text?: string): string {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("|"))
    .join(" ")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------

export function buildBooklet(view: AssistantView, summary?: string): Blob {
  const doc = new Booklet();
  const contents: Array<{ title: string; page: number }> = [];
  const { date, time } = stamp();
  const modeTitle = MODE_TITLE[view.mode] ?? "Report";

  // Content pages first (cover is prepended afterwards so contents can show page numbers).
  doc.addPage();
  let section = 0;
  const next = () => String(++section);

  if (view.kpis.length) {
    sectionHeading(doc, next(), "Key figures", contents);
    drawKpis(doc, view.kpis);
  }
  if (view.charts?.length) {
    sectionHeading(doc, next(), "Charts", contents);
    drawCharts(doc, view.charts);
  }
  if (view.columns.length && view.rows.length) {
    const number = next();
    sectionHeading(doc, number, view.mode === "comparison" ? "Comparison" : "Detailed data", contents, keepRows(view.rows.length));
    drawTable(doc, view.columns, view.rows, view.footer, `${view.rows.length.toLocaleString("en-US")} rows`);
  }
  for (const extra of view.sections ?? []) {
    if (!extra.rows.length) continue;
    const number = next();
    sectionHeading(doc, number, extra.title, contents, keepRows(extra.rows.length));
    drawTable(doc, extra.columns, extra.rows);
  }
  sectionHeading(doc, next(), "Notes", contents);
  const notes = [
    `Data source: ${view.source ?? "SAP S/4HANA"} (read-only extract).`,
    view.provenance?.period ? `Period / object: ${view.provenance.period}.` : "",
    `Generated on ${date} at ${time} IST by EVOLV Copilot.`,
    "Amounts are shown per currency and never added across currencies. TAG header rows are excluded from totals; FOC items are reported separately.",
  ].filter(Boolean);
  notes.forEach((line) => paragraph(doc, `•  ${line}`, 8.5, 0.2));

  // Cover page.
  const contentPages = doc.pages;
  doc.pages = [];
  const cover = doc.addPage();
  const width = cover.width - MARGIN * 2;
  doc.rect(MARGIN, 60, width, 6, 0);
  doc.text(MARGIN, 96, "EVOLV CLOTHING", 11, "F2", 0);
  doc.text(MARGIN + width, 96, "SAP SALES ASSISTANT", 8, "F2", 0.4, "right");
  doc.line(MARGIN, 108, MARGIN + width, 108, 0.5, 0.6);
  doc.text(MARGIN, 170, modeTitle.toUpperCase(), 10, "F2", 0.45);
  let y = 204;
  for (const line of wrapText(view.title, width, 24, "F2")) {
    doc.text(MARGIN, y, line, 24, "F2");
    y += 30;
  }
  y += 10;
  doc.line(MARGIN, y, MARGIN + 120, y, 2.4, 0);
  y += 28;
  const records = view.provenance?.recordCount ?? view.rows.length;
  const meta: Array<[string, string]> = [
    ["Generated", `${date}  ${time} IST`],
    ["Source", view.source ?? "SAP S/4HANA"],
    ...(records ? [["Records", records.toLocaleString("en-US")] as [string, string]] : []),
    ["Prepared by", "EVOLV Copilot (read-only)"],
  ];
  meta.forEach(([label, value]) => {
    doc.text(MARGIN, y, label.toUpperCase(), 7, "F2", 0.45);
    doc.text(MARGIN + 90, y, fit(value, width - 90, 9.5), 9.5, "F1", 0);
    y += 18;
  });
  const summaryText = cleanSummary(view.note) || cleanSummary(summary);
  if (summaryText) {
    y += 14;
    const lines = wrapText(summaryText, width - 32, 9.5);
    const boxH = 30 + lines.length * 14;
    doc.rect(MARGIN, y, width, boxH, 0.95, 0.6, 0.6);
    doc.text(MARGIN + 16, y + 18, "SUMMARY", 7, "F2", 0.4);
    lines.forEach((line, index) => doc.text(MARGIN + 16, y + 34 + index * 14, line, 9.5, "F1", 0.05));
    y += boxH + 24;
  }
  doc.text(MARGIN, y + 8, "CONTENTS", 7, "F2", 0.4);
  y += 22;
  contents.forEach((entry) => {
    const page = String(entry.page + 1);
    doc.text(MARGIN, y, entry.title, 10, "F1");
    const start = MARGIN + textWidth(entry.title, 10) + 6;
    const end = MARGIN + width - textWidth(page, 10, "F2") - 6;
    if (end > start) doc.line(start, y, end, y, 0.4, 0.6, cover, "1 2");
    doc.text(MARGIN + width, y, page, 10, "F2", 0, "right");
    y += 18;
  });
  doc.line(MARGIN, cover.height - 70, MARGIN + width, cover.height - 70, 0.5, 0.6);
  doc.text(MARGIN, cover.height - 54, "Internal use only · Confidential · Figures are read directly from SAP at the time of generation.", 7.5, "F1", 0.4);
  doc.pages = [cover, ...contentPages];

  // Running header and footer.
  const totalPages = doc.pages.length;
  doc.pages.forEach((page, index) => {
    if (index === 0) return;
    const right = page.width - MARGIN;
    doc.text(MARGIN, 36, "EVOLV CLOTHING", 7.5, "F2", 0, "left", page);
    doc.text(right, 36, fit(`${modeTitle} · ${view.title}`, page.width - MARGIN * 2 - 110, 7.5), 7.5, "F1", 0.35, "right", page);
    doc.line(MARGIN, 44, right, 44, 0.6, 0, page);
    doc.line(MARGIN, page.height - 40, right, page.height - 40, 0.4, 0.6, page);
    doc.text(MARGIN, page.height - 27, `Generated ${date} ${time} IST · SAP read-only extract`, 7, "F1", 0.4, "left", page);
    doc.text(right, page.height - 27, `Page ${index + 1} of ${totalPages}`, 7, "F2", 0, "right", page);
  });
  return doc.build();
}

export function downloadPdf(view: AssistantView, summary?: string): void {
  const blob = buildBooklet(view, summary);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${view.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}
