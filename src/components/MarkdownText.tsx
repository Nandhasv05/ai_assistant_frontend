import type { ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    return <span key={key}>{part}</span>;
  });
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

const SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;
const NUMERIC = /^[+-]?[\d,]+(\.\d+)?%?(\s[A-Z]{3})?$|^—$/;

/** Minimal markdown for assistant answers: pipe tables, `code`, **bold**, paragraphs and "Data notes". */
export function MarkdownText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(lines[index]);
        index += 1;
      }
      const body = rows.filter((row) => !SEPARATOR.test(row.trim()));
      const [head, ...rest] = body.map(cells);
      if (!head) continue;
      const numericColumns = head.map((_, column) => rest.length > 0 && rest.every((row) => NUMERIC.test(row[column] ?? "")));
      blocks.push(
        <div key={`t-${index}`} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {head.map((cell, column) => (
                  <th key={column} className={numericColumns[column] ? "is-num" : undefined}>
                    {inline(cell, `h-${index}-${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {head.map((_, column) => (
                    <td key={column} className={numericColumns[column] ? "is-num" : undefined}>
                      {inline(row[column] ?? "", `c-${index}-${rowIndex}-${column}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.trim()) {
      const note = /^data notes?:/i.test(line.trim());
      blocks.push(
        <p key={`p-${index}`} className={note ? "md-note" : undefined}>
          {inline(line, `p-${index}`)}
        </p>,
      );
    }
    index += 1;
  }

  return <div className="md-text">{blocks}</div>;
}
