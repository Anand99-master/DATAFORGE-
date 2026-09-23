/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Export Engine for DataForge
 * Coordinates dataset validation, deterministic file naming,
 * serialization dispatch (CSV / XLSX), and browser file download triggers.
 */

import { ExportDataset, ExportFormat, ExportValidation } from './exportTypes';
import { generateCsvBlob } from './csvExporter';
import { generateXlsxBlob } from './xlsxExporter';

/**
 * Validates whether an export dataset is structurally ready for export.
 */
export function validateExportDataset(dataset: ExportDataset | null | undefined): ExportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!dataset) {
    return {
      isValid: false,
      errors: ['No dataset provided for export.'],
      warnings: [],
    };
  }

  if (!Array.isArray(dataset.columns) || dataset.columns.length === 0) {
    errors.push('The dataset must contain at least one column to export.');
  }

  if (!Array.isArray(dataset.rows)) {
    errors.push('Invalid row records structure in dataset.');
  } else if (dataset.rows.length === 0) {
    warnings.push('The dataset contains 0 rows. An empty table with headers will be exported.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes a filename to ensure safe download across operating systems:
 * Removes illegal characters: / \ ? % * : | " < > and control codes.
 */
export function sanitizeFileName(name: string): string {
  let cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  // Strip path-traversal sequences like ../ or ..
  cleaned = cleaned.replace(/\.\.+/g, '_');
  // Remove any trailing periods or spaces (Windows restriction)
  cleaned = cleaned.replace(/[. ]+$/, '');
  return cleaned || 'dataforge_export';
}

/**
 * Generates the final filename with proper extension.
 */
export function formatFullFileName(baseName: string, format: ExportFormat): string {
  const sanitized = sanitizeFileName(baseName);
  const ext = format === 'csv' ? '.csv' : '.xlsx';
  if (sanitized.toLowerCase().endsWith(ext)) {
    return sanitized;
  }
  return `${sanitized}${ext}`;
}

/**
 * Triggers a browser download using a temporary Blob URL and anchor element.
 */
export function triggerBrowserDownload(blob: Blob, fullFileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fullFileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup after small delay
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Executes the complete export workflow deterministically:
 * 1. Validates dataset
 * 2. Formats filename
 * 3. Generates Blob (CSV or XLSX)
 * 4. Initiates browser download
 */
export function executeExport(
  dataset: ExportDataset,
  format: ExportFormat,
  customBaseName?: string
): { success: boolean; fileName: string; error?: string } {
  const validation = validateExportDataset(dataset);
  if (!validation.isValid) {
    return {
      success: false,
      fileName: '',
      error: validation.errors.join('; '),
    };
  }

  const baseName = customBaseName?.trim() || dataset.suggestedFileName || 'dataforge_export';
  const fullFileName = formatFullFileName(baseName, format);

  try {
    let blob: Blob;
    if (format === 'csv') {
      blob = generateCsvBlob(dataset);
    } else {
      blob = generateXlsxBlob(dataset, baseName);
    }

    triggerBrowserDownload(blob, fullFileName);

    return {
      success: true,
      fileName: fullFileName,
    };
  } catch (err: any) {
    return {
      success: false,
      fileName: fullFileName,
      error: err?.message || 'An unexpected error occurred during export serialization.',
    };
  }
}
