/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic XLSX Exporter
 * Generates an Excel workbook with a single worksheet using SheetJS.
 * Strictly preserves user-configured column order, raw numeric/boolean data types,
 * and handles nulls cleanly.
 */

import * as XLSX from 'xlsx';
import { ExportDataset } from './exportTypes';

/**
 * Sanitizes an Excel worksheet name according to Excel limits:
 * - Max 31 characters
 * - No characters: \ / ? * : [ ]
 * - Defaults to 'DataForge_Export' if blank
 */
export function sanitizeWorksheetName(name: string): string {
  const sanitized = name.replace(/[\\/?*:[\]]/g, '_').trim();
  if (!sanitized) return 'DataForge_Export';
  return sanitized.slice(0, 31);
}

/**
 * Generates an XLSX workbook Blob from the export dataset.
 */
export function generateXlsxBlob(dataset: ExportDataset, sheetName?: string): Blob {
  const { columns, rows } = dataset;

  // 1. Build Array of Arrays (AoA) to strictly guarantee exact column sequence
  // Row 0: Headers
  const aoaData: unknown[][] = [columns];

  // Data rows
  rows.forEach((row) => {
    const rowValues = columns.map((colName) => {
      const val = row[colName];
      if (val === undefined || val === null) {
        return null;
      }
      return val;
    });
    aoaData.push(rowValues);
  });

  // 2. Create worksheet from AoA
  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

  // Set default column widths for readability (optional auto-fit based on header length)
  const colWidths = columns.map((col) => ({
    wch: Math.max(col.length + 4, 12),
  }));
  worksheet['!cols'] = colWidths;

  // 3. Create workbook and attach sheet
  const workbook = XLSX.utils.book_new();
  const validSheetName = sanitizeWorksheetName(sheetName || dataset.suggestedFileName || 'Result');
  XLSX.utils.book_append_sheet(workbook, worksheet, validSheetName);

  // 4. Serialize to array buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
