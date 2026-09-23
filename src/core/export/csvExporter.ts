/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic CSV Exporter
 * Implements strict RFC 4180 CSV serialization with UTF-8 BOM encoding.
 * Correctly escapes commas, quotes, newlines, nulls, and unicode characters.
 */

import { ExportDataset } from './exportTypes';

/**
 * Escapes a single cell value according to RFC 4180 specifications.
 * - Null and undefined become empty string
 * - Numbers and booleans are serialized without formatting
 * - Strings containing commas, quotes, newlines, or leading/trailing whitespace
 *   are enclosed in quotes, with existing double quotes doubled (" -> "")
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return '';
    return String(val);
  }

  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  const str = String(val);

  // Check if string needs wrapping in quotes
  const needsQuotes =
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Serializes an entire dataset to a deterministic CSV string.
 * Preserves exact column sequence.
 */
export function serializeToCsvString(dataset: ExportDataset): string {
  const { columns, rows } = dataset;

  // 1. Header row
  const headerLine = columns.map(escapeCsvCell).join(',');

  // 2. Data rows
  const dataLines = rows.map((row) => {
    return columns.map((colName) => escapeCsvCell(row[colName])).join(',');
  });

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Generates a downloadable CSV Blob with UTF-8 Byte Order Mark (BOM).
 * The BOM ensures Microsoft Excel, Google Sheets, and other tools correctly render
 * special unicode characters without mojibake.
 */
export function generateCsvBlob(dataset: ExportDataset): Blob {
  const csvContent = serializeToCsvString(dataset);
  // Prepend UTF-8 BOM: \uFEFF
  const bom = '\uFEFF';
  return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
}
