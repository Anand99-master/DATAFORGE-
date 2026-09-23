/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Schema Profiler
 * Analyzes tabular records to extract column types, statistics, null counts,
 * duplicate rows, and value distributions without AI heuristics.
 */

import { ColumnMetadata, SheetDataset, SupportedDataType } from '../types';

/**
 * Checks if a value is considered empty or null in tabular processing.
 */
export function isNullOrEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return (
      trimmed === '' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined' ||
      trimmed.toLowerCase() === 'n/a' ||
      trimmed.toLowerCase() === 'none' ||
      trimmed === '-'
    );
  }
  if (typeof value === 'number' && isNaN(value)) return true;
  return false;
}

/**
 * Deterministically tests if a non-empty value represents a boolean.
 */
function isBooleanValue(val: unknown): boolean {
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'false';
  }
  return false;
}

/**
 * Deterministically tests if a non-empty value represents a valid number.
 * Supports comma-separated thousands and currency/percentage decorations.
 */
function isNumericValue(val: unknown): boolean {
  if (typeof val === 'number') return !isNaN(val) && isFinite(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return false;
    // Strip common currency symbols, spaces, commas, and percentage signs
    const sanitized = trimmed.replace(/[$€£¥₹,%]/g, '').trim();
    if (sanitized === '' || sanitized === '-' || sanitized === '+') return false;
    const num = Number(sanitized);
    return !isNaN(num) && isFinite(num);
  }
  return false;
}

/**
 * Deterministically tests if a non-empty string or Date represents a calendar date.
 */
function isDateValue(val: unknown): boolean {
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val !== 'string') return false;
  const s = val.trim();
  // Don't classify pure small integers or short numbers as dates
  if (/^\d{1,4}$/.test(s)) return false;
  // Match standard ISO formats: YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, or ISO 8601 timestamps
  const isoPattern = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(T.*)?$/;
  const altPattern = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/;
  if (!isoPattern.test(s) && !altPattern.test(s)) return false;

  const parsed = Date.parse(s);
  if (isNaN(parsed)) return false;

  const d = new Date(parsed);
  const year = d.getFullYear();
  // Realistic calendar date guardrail (between 1900 and 2100)
  return year >= 1900 && year <= 2100;
}

/**
 * Deterministically infers the uniform column data type from an array of sampled values.
 */
export function inferColumnType(values: unknown[]): SupportedDataType {
  const nonNullValues = values.filter((v) => !isNullOrEmpty(v));
  if (nonNullValues.length === 0) return 'string';

  let boolCount = 0;
  let numCount = 0;
  let dateCount = 0;

  for (const v of nonNullValues) {
    if (isBooleanValue(v)) boolCount++;
    else if (isNumericValue(v)) numCount++;
    else if (isDateValue(v)) dateCount++;
  }

  const threshold = 0.85; // 85% homogenous type consensus
  const total = nonNullValues.length;

  if (boolCount / total >= threshold) return 'boolean';
  if (numCount / total >= threshold) return 'number';
  if (dateCount / total >= threshold) return 'date';

  return 'string';
}

/**
 * Disambiguates duplicate or empty column header names deterministically.
 */
export function sanitizeHeaders(rawHeaders: string[]): { headers: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const seenCount = new Map<string, number>();
  const sanitized: string[] = [];

  rawHeaders.forEach((header, index) => {
    let name = (header ?? '').toString().trim();
    if (!name) {
      name = `Column_${index + 1}`;
      warnings.push(`Column index ${index + 1} had no header name; assigned '${name}'.`);
    }

    if (seenCount.has(name)) {
      const count = seenCount.get(name)! + 1;
      seenCount.set(name, count);
      const uniqueName = `${name}_${count}`;
      warnings.push(`Duplicate column name '${name}' renamed to '${uniqueName}'.`);
      sanitized.push(uniqueName);
    } else {
      seenCount.set(name, 1);
      sanitized.push(name);
    }
  });

  return { headers: sanitized, warnings };
}

/**
 * Calculates deterministic duplicate row count by hashing row content.
 */
export function countDuplicateRows(rows: Record<string, unknown>[]): number {
  if (rows.length <= 1) return 0;
  const seenHashes = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    // Generate deterministic signature from keys sorted alphabetically
    const keys = Object.keys(row).sort();
    let hash = '';
    for (const k of keys) {
      hash += `${k}:${String(row[k])}|`;
    }
    if (seenHashes.has(hash)) {
      duplicates++;
    } else {
      seenHashes.add(hash);
    }
  }

  return duplicates;
}

/**
 * Profiles a raw row dataset into a structured SheetDataset with full ColumnMetadata.
 */
export function profileDataset(params: {
  id: string;
  fileId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  headerWarnings?: string[];
}): SheetDataset {
  const { id, fileId, fileName, fileType, sheetName, headers, rows, headerWarnings = [] } = params;
  const rowCount = rows.length;
  const columnCount = headers.length;
  const duplicateRowCount = countDuplicateRows(rows);

  const columns: ColumnMetadata[] = headers.map((colName, index) => {
    let nullCount = 0;
    let nonNullCount = 0;
    const uniqueValues = new Set<string>();
    const samples: (string | number | boolean | null)[] = [];
    const sampleValuesForTypeInference: unknown[] = [];

    // Analyze column across rows
    for (let i = 0; i < rowCount; i++) {
      const val = rows[i][colName];
      if (isNullOrEmpty(val)) {
        nullCount++;
      } else {
        nonNullCount++;
        const strVal = String(val);
        uniqueValues.add(strVal);

        if (samples.length < 5 && !samples.some((s) => String(s) === strVal)) {
          samples.push(val as string | number | boolean);
        }
      }

      // Sample first 500 rows for rapid deterministic type inference
      if (i < 500) {
        sampleValuesForTypeInference.push(val);
      }
    }

    const inferredType = inferColumnType(sampleValuesForTypeInference);
    const nullPercentage = rowCount > 0 ? Math.round((nullCount / rowCount) * 100) : 0;

    return {
      id: `${id}:col_${index}_${colName}`,
      name: colName,
      inferredType,
      nonNullCount,
      nullCount,
      nullPercentage,
      uniqueCount: uniqueValues.size,
      samples,
    };
  });

  return {
    id,
    fileId,
    fileName,
    fileType,
    sheetName,
    rowCount,
    columnCount,
    duplicateRowCount,
    columns,
    rows,
    warnings: headerWarnings.length > 0 ? headerWarnings : undefined,
  };
}
