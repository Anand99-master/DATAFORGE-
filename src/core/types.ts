/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Core Domain Model & Pipeline Contracts
 * Defines the deterministic data structures, query AST, and module boundaries.
 */

// ==========================================
// 1. DATA TYPES & SCHEMA METADATA
// ==========================================

export type SupportedDataType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

export interface ColumnMetadata {
  /** Unique identifier for the column within the dataset */
  id: string;
  /** Name of the column as extracted from the header */
  name: string;
  /** Inferred data type */
  inferredType: SupportedDataType;
  /** Total count of non-null, non-empty records */
  nonNullCount: number;
  /** Total count of null or empty values */
  nullCount: number;
  /** Percentage of missing/null values (0 - 100) */
  nullPercentage: number;
  /** Number of unique distinct values detected */
  uniqueCount: number;
  /** Sample values for preview in the UI */
  samples: (string | number | boolean | null)[];
}

export interface SheetDataset {
  /** Unique ID of the dataset (e.g. fileId:sheetName) */
  id: string;
  /** Source file ID */
  fileId: string;
  /** File name (e.g., "Customers.xlsx") */
  fileName: string;
  /** File format */
  fileType: 'csv' | 'xlsx';
  /** Sheet name (for Excel) or table name (for CSV) */
  sheetName: string;
  /** Total number of rows */
  rowCount: number;
  /** Total number of columns */
  columnCount: number;
  /** Detected duplicate row count */
  duplicateRowCount: number;
  /** Columns metadata */
  columns: ColumnMetadata[];
  /** In-memory row records (array of key-value objects) */
  rows: Record<string, unknown>[];
  /** Header warnings if any (e.g. duplicate headers renamed) */
  warnings?: string[];
}

export interface SourceFile {
  id: string;
  name: string;
  sizeBytes: number;
  fileType: 'csv' | 'xlsx';
  lastModified: number;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
  sheetNames: string[];
  activeSheetName: string;
  sheets: SheetDataset[];
}

// ==========================================
// 2. QUERY PLAN & FILTER AST
// ==========================================

export type FilterOperator =
  // Universal
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_null'
  | 'is_not_null'
  // Numeric & Date
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'between'
  // Date-specific
  | 'before'
  | 'after'
  // String-specific
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  // Boolean-specific
  | 'is_true'
  | 'is_false';

export interface FilterCondition {
  id: string;
  datasetId?: string;
  columnName: string;
  operator: FilterOperator;
  /** The value to compare against */
  value?: string | number | boolean | [number, number] | [string, string] | null;
  /** Second value for 'between' operator */
  value2?: string | number | null;
  /** Case sensitivity toggle for text comparison */
  caseSensitive?: boolean;
}

export interface FilterGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface SelectionConfig {
  datasetId: string;
  selectedColumns: string[];
  filterGroups: FilterGroup[];
  groupLogicalOperator: 'AND' | 'OR';
}

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface JoinDefinition {
  id: string;
  leftDatasetId: string;
  leftColumn: string;
  rightDatasetId: string;
  rightColumn: string;
  joinType: JoinType;
}

export interface SelectedField {
  /** Unique identifier for the projected field */
  id: string;
  datasetId: string;
  columnName: string;
  /** Optional custom output header label */
  alias?: string;
  /** Output position index */
  order: number;
}

export interface SortInstruction {
  datasetId: string;
  columnName: string;
  direction: 'asc' | 'desc';
}

/**
 * Immutable AST defining the exact deterministic extraction query.
 */
export interface ExtractionPlan {
  id: string;
  version: number;
  createdAt: number;
  /** The primary base dataset */
  primaryDatasetId: string;
  /** Any joins required across additional datasets */
  joins: JoinDefinition[];
  /** Columns selected for the final output */
  selectedFields: SelectedField[];
  /** Filter groups combined with top-level AND logic */
  filterGroups: FilterGroup[];
  /** Sorting rules */
  sort?: SortInstruction[];
  /** Optional row limit (useful for previewing) */
  limit?: number;
}

// ==========================================
// 3. EXECUTION TELEMETRY & RESULTS
// ==========================================

export interface ExecutionStats {
  totalInputRows: number;
  joinedRows: number;
  filteredRows: number;
  finalOutputRows: number;
  executionTimeMs: number;
}

export interface ExecutionResult {
  planId: string;
  datasetId?: string;
  datasetName?: string;
  sheetName?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  stats: ExecutionStats;
}

// ==========================================
// 4. PIPELINE MODULE CONTRACTS
// ==========================================

export interface IngestionService {
  parseCsv(file: File): Promise<SheetDataset>;
  parseXlsx(file: File): Promise<SheetDataset[]>;
}

export interface ProfilerService {
  profileDataset(rawRows: Record<string, unknown>[], fileName: string, sheetName: string): SheetDataset;
  inferType(values: unknown[]): SupportedDataType;
}

export interface ExecutionService {
  executePlan(plan: ExtractionPlan, datasets: Map<string, SheetDataset>): Promise<ExecutionResult>;
}

export interface ExportService {
  exportToCsv(result: ExecutionResult, fileName?: string): Blob;
  exportToXlsx(result: ExecutionResult, fileName?: string): Blob;
}

// ==========================================
// 5. FUTURE EXTENSION: OLLAMA LOCAL AI CONTRACT
// ==========================================

/**
 * STRICT ISOLATION PRINCIPLE:
 * Ollama receives ONLY column metadata (names + types), NEVER raw table data.
 * Ollama emits ONLY a structured ExtractionPlan AST, which is then validated
 * deterministically by the query planner.
 */
export interface OllamaSchemaContext {
  datasets: {
    id: string;
    name: string;
    columns: { name: string; type: SupportedDataType }[];
  }[];
}

export interface OllamaTranslationRequest {
  naturalLanguagePrompt: string;
  schemaContext: OllamaSchemaContext;
}

export interface OllamaTranslationResponse {
  success: boolean;
  generatedPlan?: ExtractionPlan;
  explanation?: string;
  validationErrors?: string[];
}
