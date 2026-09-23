/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge CSV Ingestion Engine
 * Parses CSV files using PapaParse with deterministic header sanitation,
 * type profiling, and robust error recovery.
 */

import Papa from 'papaparse';
import { SheetDataset } from '../types';
import { profileDataset, sanitizeHeaders } from '../profiler/schemaProfiler';

export async function parseCsvFile(file: File, fileId: string): Promise<SheetDataset> {
  // Check for empty file
  if (file.size === 0) {
    throw new Error(`The file '${file.name}' is empty (0 bytes).`);
  }

  const text = await file.text();
  if (!text || text.trim() === '') {
    throw new Error(`The file '${file.name}' is empty (0 bytes).`);
  }

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(text, {
      skipEmptyLines: 'greedy',
      dynamicTyping: false, // Keep raw strings initially so profiler can evaluate deterministically
      complete: (results) => {
        try {
          const rawData = results.data;

          if (!rawData || rawData.length === 0) {
            return reject(new Error(`No readable data found in '${file.name}'.`));
          }

          // First row is headers
          const rawHeaderRow = rawData[0];
          if (!rawHeaderRow || rawHeaderRow.length === 0) {
            return reject(new Error(`No header row could be identified in '${file.name}'.`));
          }

          const { headers, warnings } = sanitizeHeaders(rawHeaderRow);

          // Convert subsequent rows into structured objects
          const rows: Record<string, unknown>[] = [];
          for (let i = 1; i < rawData.length; i++) {
            const rowValues = rawData[i];
            const rowObj: Record<string, unknown> = {};

            // Map by sanitized header
            headers.forEach((header, colIndex) => {
              const val = rowValues[colIndex];
              rowObj[header] = val !== undefined && val !== null ? val : null;
            });

            rows.push(rowObj);
          }

          const datasetId = `${fileId}:default`;
          const dataset = profileDataset({
            id: datasetId,
            fileId,
            fileName: file.name,
            fileType: 'csv',
            sheetName: 'CSV Table',
            headers,
            rows,
            headerWarnings: warnings,
          });

          resolve(dataset);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown CSV parsing error';
          reject(new Error(`Failed to parse CSV '${file.name}': ${message}`));
        }
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error in '${file.name}': ${error.message}`));
      },
    });
  });
}
