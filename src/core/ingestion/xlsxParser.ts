/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Excel (.xlsx) Ingestion Engine
 * Reads multi-sheet Excel workbooks using SheetJS, extracts all worksheets,
 * sanitizes headers, and computes deterministic schema profiles.
 */

import * as XLSX from 'xlsx';
import { SheetDataset } from '../types';
import { profileDataset, sanitizeHeaders } from '../profiler/schemaProfiler';

export async function parseXlsxFile(file: File, fileId: string): Promise<SheetDataset[]> {
  if (file.size === 0) {
    throw new Error(`The file '${file.name}' is empty (0 bytes).`);
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not read file data';
    throw new Error(`Failed to read '${file.name}': ${msg}`);
  }

  // Validate ZIP signature (PK\x03\x04 or PK\x05\x06) for .xlsx files
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B;
    if (!isZip) {
      throw new Error(`The file '${file.name}' is not a valid Excel (.xlsx) OpenXML archive.`);
    }
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      dense: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid or corrupted file format';
    throw new Error(`Could not read Excel workbook '${file.name}': ${msg}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`Workbook '${file.name}' contains no readable worksheets.`);
  }

  const sheetDatasets: SheetDataset[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to 2D array representation
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
      raw: false, // Formats strings for dates and numbers cleanly
    });

    // Remove trailing completely empty rows
    const nonEmptyRows = rawData.filter((row) =>
      Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );

    if (nonEmptyRows.length === 0) {
      // Empty sheet
      const emptyDatasetId = `${fileId}:${sheetName}`;
      sheetDatasets.push({
        id: emptyDatasetId,
        fileId,
        fileName: file.name,
        fileType: 'xlsx',
        sheetName,
        rowCount: 0,
        columnCount: 0,
        duplicateRowCount: 0,
        columns: [],
        rows: [],
        warnings: [`Worksheet '${sheetName}' contains no data.`],
      });
      continue;
    }

    // First non-empty row is treated as headers
    const rawHeaders = nonEmptyRows[0].map((h) => (h !== null && h !== undefined ? String(h) : ''));
    const { headers, warnings } = sanitizeHeaders(rawHeaders);

    const rows: Record<string, unknown>[] = [];
    for (let r = 1; r < nonEmptyRows.length; r++) {
      const rowArr = nonEmptyRows[r];
      const rowObj: Record<string, unknown> = {};

      headers.forEach((header, colIdx) => {
        const val = rowArr[colIdx];
        rowObj[header] = val !== undefined && val !== null ? val : null;
      });

      rows.push(rowObj);
    }

    const datasetId = `${fileId}:${sheetName}`;
    const dataset = profileDataset({
      id: datasetId,
      fileId,
      fileName: file.name,
      fileType: 'xlsx',
      sheetName,
      headers,
      rows,
      headerWarnings: warnings,
    });

    sheetDatasets.push(dataset);
  }

  return sheetDatasets;
}
