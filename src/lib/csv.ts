/**
 * Minimal CSV reader for spreadsheet exports (Excel, Google Sheets, Numbers):
 * commas, "quoted" cells with "" escapes and line breaks inside quotes,
 * LF or CRLF line ends. Returns each record with the line number it starts on.
 */
export function parseCsv(text: string): { line: number; cells: string[] }[] {
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // Excel's byte-order mark
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (ch === "\r") {
      // part of CRLF; the \n ends the record
    } else if (ch === "\n") {
      cells.push(cell);
      records.push({ line: recordLine, cells });
      cells = [];
      cell = "";
      line++;
      recordLine = line;
    } else cell += ch;
  }
  if (cell !== "" || cells.length > 0) {
    cells.push(cell);
    records.push({ line: recordLine, cells });
  }
  return records;
}

/** Quote a CSV cell, and defuse cells a spreadsheet would run as a formula (phone numbers like +1718... are kept). */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^\+\d+$/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
