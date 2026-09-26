import type { AssistantView } from "../types.ts";

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, width: number): string[] {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return [""];
  const lines: string[] = [];
  let rest = text;
  while (rest.length > width) {
    lines.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  lines.push(rest);
  return lines;
}

function buildPdf(lines: string[]): Blob {
  const pageStreams: string[] = [];
  let commands: string[] = [];
  let y = 760;
  const flush = () => {
    pageStreams.push(commands.join("\n"));
    commands = [];
    y = 760;
  };

  for (const line of lines) {
    for (const chunk of wrap(line, 100)) {
      if (y < 48) flush();
      commands.push(`BT /F1 10 Tf 40 ${y} Td (${escapePdf(chunk)}) Tj ET`);
      y -= 14;
    }
  }
  if (commands.length > 0 || pageStreams.length === 0) flush();

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const pageIds = pageStreams.map((_, index) => 4 + index * 2);
  objects.push(`2 0 obj << /Type /Pages /Count ${pageStreams.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >> endobj`);
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  pageStreams.forEach((stream, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >> endobj`);
    objects.push(`${contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  });

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += `${object}\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

export function downloadPdf(view: AssistantView): void {
  const lines = [view.title, ""];
  for (const kpi of view.kpis) lines.push(`${kpi.label}: ${kpi.value}`);
  if (view.columns.length > 0) {
    lines.push("", view.columns.join(" | "));
    for (const row of view.rows.slice(0, 40)) lines.push(row.join(" | "));
    if (view.rows.length > 40) lines.push(`... and ${view.rows.length - 40} more rows in the chat table`);
  }
  const blob = buildPdf(lines);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${view.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "report"}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}
