import type { ChartTableData } from "./chart-kit";

export interface CsvSection {
  title: string;
  table: ChartTableData;
}

const cell = (value: string | number): string => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const line = (values: (string | number)[]) => values.map(cell).join(",");

/**
 * One CSV with a titled block per chart, preceded by a short header saying what the file holds.
 * Values are written unformatted so a spreadsheet reads them as numbers.
 */
export function toCsv(
  meta: [string, string][],
  sections: CsvSection[],
): string {
  const blocks = sections.map((section) =>
    [
      line([section.title]),
      line(section.table.columns.map((c) => c.label)),
      ...section.table.rows.map(line),
    ].join("\r\n"),
  );
  return [meta.map(line).join("\r\n"), ...blocks].join("\r\n\r\n");
}

/** Client-side download. The byte-order mark keeps dashes and Indic text intact in spreadsheet apps. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
