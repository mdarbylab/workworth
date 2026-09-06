// RFC 4180 CSV that opens cleanly in Excel: UTF-8 BOM, CRLF line endings,
// every field quoted, and formula-leading characters neutralised.

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let s = typeof value === "number" ? String(value) : value;
  // Prevent CSV injection: Excel treats leading = + - @ as formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
