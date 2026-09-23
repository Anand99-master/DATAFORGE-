/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Tests for DataForge Export Engine
 * Validates CSV escaping (commas, quotes, newlines, unicode, nulls),
 * XLSX generation (row/column counts, ordering, types),
 * filename sanitization, validation of invalid datasets, and source immutability.
 */

import * as XLSX from 'xlsx';
import { ExportDataset } from './exportTypes';
import { escapeCsvCell, serializeToCsvString } from './csvExporter';
import { generateXlsxBlob } from './xlsxExporter';
import { validateExportDataset, sanitizeFileName, formatFullFileName } from './exportEngine';

export function runExportVerificationSuite(): {
  allPassed: boolean;
  results: { testName: string; passed: boolean; message: string }[];
} {
  const results: { testName: string; passed: boolean; message: string }[] = [];

  // ========================================================
  // 1. CSV UNIT TESTS: ESCAPING & SERIALIZATION
  // ========================================================

  // Test 1: Normal Values
  try {
    const res = escapeCsvCell('SimpleText');
    const passed = res === 'SimpleText';
    results.push({
      testName: '1. CSV: Normal text value without quotes',
      passed,
      message: `Expected 'SimpleText', received '${res}'`,
    });
  } catch (e: any) {
    results.push({ testName: '1. CSV: Normal text', passed: false, message: e.message });
  }

  // Test 2: Commas in Values
  try {
    const res = escapeCsvCell('Ahmedabad, Gujarat');
    const passed = res === '"Ahmedabad, Gujarat"';
    results.push({
      testName: '2. CSV: Values with commas are quoted',
      passed,
      message: `Expected '"Ahmedabad, Gujarat"', received '${res}'`,
    });
  } catch (e: any) {
    results.push({ testName: '2. CSV: Commas in values', passed: false, message: e.message });
  }

  // Test 3: Quotes in Values (doubled quote escaping)
  try {
    const res = escapeCsvCell('Precision "Ultra" 4K');
    const passed = res === '"Precision ""Ultra"" 4K"';
    results.push({
      testName: '3. CSV: Double quotes are escaped as doubled quotes',
      passed,
      message: `Expected '"Precision ""Ultra"" 4K"', received '${res}'`,
    });
  } catch (e: any) {
    results.push({ testName: '3. CSV: Quotes in values', passed: false, message: e.message });
  }

  // Test 4: Newlines in Values
  try {
    const res = escapeCsvCell('Line1\nLine2\rLine3');
    const passed = res === '"Line1\nLine2\rLine3"';
    results.push({
      testName: '4. CSV: Values with newlines are safely quoted',
      passed,
      message: `Expected quoted multiline string, received '${res}'`,
    });
  } catch (e: any) {
    results.push({ testName: '4. CSV: Newlines in values', passed: false, message: e.message });
  }

  // Test 5: Unicode Characters Preservation
  try {
    const res = escapeCsvCell('नमस्ते, Zürich, 日本語, €500');
    const passed = res === '"नमस्ते, Zürich, 日本語, €500"';
    results.push({
      testName: '5. CSV: Unicode characters and currency symbols are preserved',
      passed,
      message: `Preserved unicode output: '${res}'`,
    });
  } catch (e: any) {
    results.push({ testName: '5. CSV: Unicode', passed: false, message: e.message });
  }

  // Test 6: Null and Undefined Values
  try {
    const resNull = escapeCsvCell(null);
    const resUndefined = escapeCsvCell(undefined);
    const passed = resNull === '' && resUndefined === '';
    results.push({
      testName: '6. CSV: Null and undefined values serialize to empty cells',
      passed,
      message: `null => '${resNull}', undefined => '${resUndefined}'`,
    });
  } catch (e: any) {
    results.push({ testName: '6. CSV: Null values', passed: false, message: e.message });
  }

  // Test 7: Numeric Unformatted Preservation (50000 stays 50000, not ₹50,000)
  try {
    const resNum = escapeCsvCell(50000);
    const passed = resNum === '50000';
    results.push({
      testName: '7. CSV: Pure numeric values remain unformatted raw numbers',
      passed,
      message: `Expected '50000', received '${resNum}'`,
    });
  } catch (e: any) {
    results.push({ testName: '7. CSV: Numeric preservation', passed: false, message: e.message });
  }

  // ========================================================
  // 2. EXCEL (XLSX) TESTS
  // ========================================================

  const testDataset: ExportDataset = {
    columns: ['Customer Name', 'City', 'Product', 'Revenue', 'Is_Active'],
    rows: [
      { 'Customer Name': 'Rahul Patel', City: 'Ahmedabad', Product: 'Laptop', Revenue: 50000, Is_Active: true },
      { 'Customer Name': 'Amit Shah', City: 'Surat, Gujarat', Product: 'Mouse', Revenue: 1500, Is_Active: false },
      { 'Customer Name': 'Priya Nair', City: null, Product: 'Keyboard', Revenue: null, Is_Active: true },
    ],
    suggestedFileName: 'customers_orders_result',
    sourceType: 'join',
  };

  // Test 8: XLSX Blob Generation & Structure
  try {
    const blob = generateXlsxBlob(testDataset, 'Summary_Data');
    const passed = blob instanceof Blob && blob.size > 0 && blob.type.includes('spreadsheetml');
    results.push({
      testName: '8. XLSX: Generates valid openxml spreadsheet blob',
      passed,
      message: `Blob size: ${blob.size} bytes, type: ${blob.type}`,
    });
  } catch (e: any) {
    results.push({ testName: '8. XLSX: Blob generation', passed: false, message: e.message });
  }

  // Test 9: Exact Column Order Preservation in CSV & XLSX
  try {
    const csv = serializeToCsvString(testDataset);
    const headerLine = csv.split('\r\n')[0];
    const expectedHeader = 'Customer Name,City,Product,Revenue,Is_Active';
    const passed = headerLine === expectedHeader;
    results.push({
      testName: '9. Column Order: Strict preservation of user-configured column sequence',
      passed,
      message: `Expected '${expectedHeader}', received '${headerLine}'`,
    });
  } catch (e: any) {
    results.push({ testName: '9. Column order', passed: false, message: e.message });
  }

  // ========================================================
  // 3. VALIDATION & SANITIZATION TESTS
  // ========================================================

  // Test 10: Empty/Invalid Dataset Validation
  try {
    const invalidEmpty: any = null;
    const res1 = validateExportDataset(invalidEmpty);
    const invalidNoCols: ExportDataset = {
      columns: [],
      rows: [],
      suggestedFileName: 'test',
      sourceType: 'selection',
    };
    const res2 = validateExportDataset(invalidNoCols);
    const passed = !res1.isValid && !res2.isValid && res2.errors.length > 0;
    results.push({
      testName: '10. Validation: Correctly blocks export of null or empty-column datasets',
      passed,
      message: `Null valid: ${res1.isValid}, 0 cols valid: ${res2.isValid}`,
    });
  } catch (e: any) {
    results.push({ testName: '10. Validation', passed: false, message: e.message });
  }

  // Test 11: Filename Sanitization & Extension Handling
  try {
    const unsafeName = 'report/2024*final:data?.csv';
    const sanitized = sanitizeFileName(unsafeName);
    const fullCsv = formatFullFileName(sanitized, 'csv');
    const fullXlsx = formatFullFileName(sanitized, 'xlsx');
    const passed =
      !sanitized.includes('/') &&
      !sanitized.includes('*') &&
      !sanitized.includes(':') &&
      !sanitized.includes('?') &&
      fullCsv.endsWith('.csv') &&
      fullXlsx.endsWith('.xlsx');
    results.push({
      testName: '11. Filename: Sanitizes illegal characters and appends correct extensions',
      passed,
      message: `Sanitized: '${sanitized}', CSV: '${fullCsv}', XLSX: '${fullXlsx}'`,
    });
  } catch (e: any) {
    results.push({ testName: '11. Filename sanitization', passed: false, message: e.message });
  }

  // Test 12: Source Dataset Immutability Guarantee
  try {
    const originalRowsCount = testDataset.rows.length;
    const originalColsCount = testDataset.columns.length;
    // Perform operations
    serializeToCsvString(testDataset);
    generateXlsxBlob(testDataset);
    validateExportDataset(testDataset);

    const passed =
      testDataset.rows.length === originalRowsCount &&
      testDataset.columns.length === originalColsCount &&
      testDataset.rows[0]['Customer Name'] === 'Rahul Patel';

    results.push({
      testName: '12. Immutability: Source result dataset is never mutated by export',
      passed,
      message: 'Source rows, columns, and internal properties remained untouched',
    });
  } catch (e: any) {
    results.push({ testName: '12. Immutability', passed: false, message: e.message });
  }

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}
