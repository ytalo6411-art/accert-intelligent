/** Escapes a CSV cell and neutralizes spreadsheet formula prefixes from untrusted source data. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\u0000-\u0020]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toSemicolonCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(';')).join('\n');
}
