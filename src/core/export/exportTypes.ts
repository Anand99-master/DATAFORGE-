/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Export Types and Contracts for DataForge
 * Defines the immutable schema, options, and status for deterministic
 * CSV and XLSX generation.
 */

export interface ExportDataset {
  /** Column names in the exact configured sequence */
  columns: string[];
  /** Underlying record rows */
  rows: Record<string, unknown>[];
  /** Suggested default base filename (without extension) */
  suggestedFileName: string;
  /** Origin module identifier */
  sourceType: 'selection' | 'join';
  /** Optional human-readable description of the origin */
  sourceDescription?: string;
}

export type ExportFormat = 'csv' | 'xlsx';

export type ExportStatus = 'idle' | 'preparing' | 'ready' | 'downloading' | 'completed' | 'error';

export interface ExportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExportSummary {
  rowCount: number;
  columnCount: number;
  columns: string[];
  format: ExportFormat;
  fileName: string;
  estimatedSizeBytes?: number;
}
