/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Multi-File Match & Join Types
 * Structured internal representations for deterministic dataset relationships,
 * validation results, and execution statistics.
 */

import { JoinType, SupportedDataType } from '../../types';

export type RelationshipCardinality =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'
  | 'unknown';

export interface JoinColumnSelection {
  /** Source dataset ID */
  datasetId: string;
  /** Name of the column in the source dataset */
  column: string;
  /** Custom output header label or auto-disambiguated label */
  outputName: string;
  /** Origin flag */
  origin: 'primary' | 'secondary';
  /** Original inferred data type */
  inferredType: SupportedDataType;
}

export interface JoinConfig {
  primaryDatasetId: string;
  secondaryDatasetId: string;
  primaryKey: string;
  secondaryKey: string;
  joinType: JoinType;
  selectedColumns: JoinColumnSelection[];
}

export interface JoinValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  typeMismatch: boolean;
  primaryInferredType: SupportedDataType;
  secondaryInferredType: SupportedDataType;
  primaryNullCount: number;
  secondaryNullCount: number;
  primaryDuplicateCount: number;
  secondaryDuplicateCount: number;
  cardinality: RelationshipCardinality;
  estimatedMatchingKeys: number;
}

export interface JoinStatistics {
  primaryRowCount: number;
  secondaryRowCount: number;
  matchingRowCount: number;
  unmatchedPrimaryCount: number;
  unmatchedSecondaryCount: number;
  totalOutputRows: number;
  executionTimeMs: number;
}

export interface JoinExecutionResult {
  planId: string;
  columns: string[];
  rows: Record<string, unknown>[];
  stats: JoinStatistics;
  columnOrigins: { name: string; origin: 'primary' | 'secondary'; sourceDatasetName: string }[];
}
