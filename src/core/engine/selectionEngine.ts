/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Selection Engine
 * Executes field projection and multi-group filter evaluation
 * without duplicating memory or generating external queries.
 */

import { SheetDataset, SelectionConfig, ExecutionResult, SupportedDataType } from '../types';
import { evaluateAllFilterGroups } from './filterEvaluator';

/**
 * Builds a lookup map of columnName -> inferredType from dataset columns.
 */
export function buildColumnTypeMap(dataset: SheetDataset): Map<string, SupportedDataType> {
  const map = new Map<string, SupportedDataType>();
  for (const col of dataset.columns) {
    map.set(col.name, col.inferredType);
  }
  return map;
}

/**
 * Computes the exact matching row count for a given filter configuration.
 * Fast, lightweight pass over the rows without copying or creating projected objects.
 */
export function countMatchingRows(
  dataset: SheetDataset,
  filterGroups: SelectionConfig['filterGroups'],
  groupLogicalOperator: 'AND' | 'OR'
): number {
  const columnTypes = buildColumnTypeMap(dataset);
  let count = 0;

  for (let i = 0; i < dataset.rows.length; i++) {
    if (evaluateAllFilterGroups(filterGroups, groupLogicalOperator, dataset.rows[i], columnTypes)) {
      count++;
    }
  }

  return count;
}

/**
 * Executes field projection and deterministic filtering according to SelectionConfig.
 * Preserves the exact user-specified column order.
 */
export function executeSelection(
  dataset: SheetDataset,
  config: SelectionConfig
): ExecutionResult {
  const startTime = performance.now();
  const columnTypes = buildColumnTypeMap(dataset);

  // If no columns were explicitly chosen, default to all columns
  const finalColumns = config.selectedColumns.length > 0
    ? config.selectedColumns
    : dataset.columns.map((c) => c.name);

  const matchedRows: Record<string, unknown>[] = [];

  for (let i = 0; i < dataset.rows.length; i++) {
    const rawRow = dataset.rows[i];

    if (evaluateAllFilterGroups(config.filterGroups, config.groupLogicalOperator, rawRow, columnTypes)) {
      // Project fields in configured order
      const projectedRow: Record<string, unknown> = {};
      for (const colName of finalColumns) {
        projectedRow[colName] = rawRow[colName] !== undefined ? rawRow[colName] : null;
      }
      matchedRows.push(projectedRow);
    }
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    planId: `selection_${Date.now()}`,
    datasetId: dataset.id,
    datasetName: dataset.fileName,
    sheetName: dataset.sheetName,
    columns: finalColumns,
    rows: matchedRows,
    stats: {
      totalInputRows: dataset.rowCount,
      joinedRows: 0,
      filteredRows: dataset.rowCount - matchedRows.length,
      finalOutputRows: matchedRows.length,
      executionTimeMs,
    },
  };
}
