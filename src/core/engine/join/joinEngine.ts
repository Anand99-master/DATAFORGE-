/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Hash-Join Engine
 * High-performance O(N + M) relational join implementation supporting
 * INNER, LEFT, RIGHT, and FULL OUTER joins with zero data mutation.
 */

import { SheetDataset } from '../../types';
import { JoinConfig, JoinExecutionResult, JoinColumnSelection, JoinStatistics } from './joinTypes';
import { normalizeKey } from './joinValidator';

/**
 * Builds unique output column names ensuring that conflicting names
 * across primary and secondary datasets never overwrite one another.
 */
export function disambiguateOutputColumns(
  selectedColumns: JoinColumnSelection[],
  primaryDataset: SheetDataset,
  secondaryDataset: SheetDataset
): {
  finalColumns: string[];
  columnOrigins: { name: string; origin: 'primary' | 'secondary'; sourceDatasetName: string }[];
  mapping: JoinColumnSelection[];
} {
  const seenNames = new Map<string, number>();
  const finalColumns: string[] = [];
  const columnOrigins: { name: string; origin: 'primary' | 'secondary'; sourceDatasetName: string }[] = [];
  const mapping: JoinColumnSelection[] = [];

  for (const col of selectedColumns) {
    let name = col.outputName ? col.outputName.trim() : col.column;
    const sourceName = col.origin === 'primary' ? primaryDataset.fileName : secondaryDataset.fileName;

    // Check if name already used
    if (seenNames.has(name)) {
      const count = seenNames.get(name)! + 1;
      seenNames.set(name, count);
      // Disambiguate with dataset origin prefix
      const prefix = col.origin === 'primary' ? 'Pri_' : 'Sec_';
      name = `${prefix}${col.column}_${count}`;
    } else {
      seenNames.set(name, 1);
    }

    finalColumns.push(name);
    columnOrigins.push({
      name,
      origin: col.origin,
      sourceDatasetName: sourceName,
    });
    mapping.push({
      ...col,
      outputName: name,
    });
  }

  return { finalColumns, columnOrigins, mapping };
}

/**
 * Executes a deterministic Hash-Join between primary and secondary datasets.
 */
export function executeJoin(
  primaryDataset: SheetDataset,
  secondaryDataset: SheetDataset,
  config: JoinConfig
): JoinExecutionResult {
  const startTime = performance.now();

  const { primaryKey, secondaryKey, joinType } = config;

  // If no columns are explicitly chosen, select all columns from both datasets
  let columnsToProject = config.selectedColumns;
  if (!columnsToProject || columnsToProject.length === 0) {
    columnsToProject = [
      ...primaryDataset.columns.map((c) => ({
        datasetId: primaryDataset.id,
        column: c.name,
        outputName: c.name,
        origin: 'primary' as const,
        inferredType: c.inferredType,
      })),
      ...secondaryDataset.columns.map((c) => ({
        datasetId: secondaryDataset.id,
        column: c.name,
        outputName: c.name,
        origin: 'secondary' as const,
        inferredType: c.inferredType,
      })),
    ];
  }

  // Disambiguate duplicate column names
  const { finalColumns, columnOrigins, mapping } = disambiguateOutputColumns(
    columnsToProject,
    primaryDataset,
    secondaryDataset
  );

  const primaryColumns = mapping.filter((m) => m.origin === 'primary');
  const secondaryColumns = mapping.filter((m) => m.origin === 'secondary');

  // STEP 1: Build Hash Index on Secondary Dataset
  // Map: normalizedKey -> array of secondary row indices
  const secondaryIndex = new Map<string, number[]>();
  const secondaryRows = secondaryDataset.rows;
  const secondaryCount = secondaryRows.length;

  for (let i = 0; i < secondaryCount; i++) {
    const rawKey = secondaryRows[i][secondaryKey];
    const key = normalizeKey(rawKey);
    if (key !== null) {
      const existing = secondaryIndex.get(key);
      if (existing) {
        existing.push(i);
      } else {
        secondaryIndex.set(key, [i]);
      }
    }
  }

  // STEP 2: Probe Primary Dataset & Match
  const resultRows: Record<string, unknown>[] = [];
  const matchedSecondaryIndices = new Set<number>();
  let matchingRowCount = 0;
  let unmatchedPrimaryCount = 0;
  let unmatchedSecondaryCount = 0;

  const primaryRows = primaryDataset.rows;
  const primaryCount = primaryRows.length;

  for (let pIdx = 0; pIdx < primaryCount; pIdx++) {
    const pRow = primaryRows[pIdx];
    const rawKey = pRow[primaryKey];
    const key = normalizeKey(rawKey);

    const matchingSecondaryIndices = key !== null ? secondaryIndex.get(key) : undefined;

    if (matchingSecondaryIndices && matchingSecondaryIndices.length > 0) {
      // Row matches! Emit combined row for each matching secondary row
      for (const sIdx of matchingSecondaryIndices) {
        matchedSecondaryIndices.add(sIdx);
        matchingRowCount++;

        if (joinType === 'inner' || joinType === 'left' || joinType === 'full') {
          const sRow = secondaryRows[sIdx];
          const combinedRow: Record<string, unknown> = {};

          // Populate primary fields
          for (const col of primaryColumns) {
            combinedRow[col.outputName] = pRow[col.column] !== undefined ? pRow[col.column] : null;
          }
          // Populate secondary fields
          for (const col of secondaryColumns) {
            combinedRow[col.outputName] = sRow[col.column] !== undefined ? sRow[col.column] : null;
          }

          resultRows.push(combinedRow);
        }
      }
    } else {
      // Primary row did not match any secondary row
      unmatchedPrimaryCount++;

      if (joinType === 'left' || joinType === 'full') {
        const combinedRow: Record<string, unknown> = {};

        for (const col of primaryColumns) {
          combinedRow[col.outputName] = pRow[col.column] !== undefined ? pRow[col.column] : null;
        }
        for (const col of secondaryColumns) {
          combinedRow[col.outputName] = null;
        }

        resultRows.push(combinedRow);
      }
    }
  }

  // STEP 3: Handle Unmatched Secondary Rows (RIGHT and FULL OUTER joins)
  if (joinType === 'right' || joinType === 'full') {
    for (let sIdx = 0; sIdx < secondaryCount; sIdx++) {
      if (!matchedSecondaryIndices.has(sIdx)) {
        unmatchedSecondaryCount++;
        const sRow = secondaryRows[sIdx];
        const combinedRow: Record<string, unknown> = {};

        for (const col of primaryColumns) {
          combinedRow[col.outputName] = null;
        }
        for (const col of secondaryColumns) {
          combinedRow[col.outputName] = sRow[col.column] !== undefined ? sRow[col.column] : null;
        }

        resultRows.push(combinedRow);
      }
    }
  } else {
    // Calculate unmatched secondary count for statistics even if not emitted
    unmatchedSecondaryCount = secondaryCount - matchedSecondaryIndices.size;
  }

  // If RIGHT join, also emit the matched secondary rows
  if (joinType === 'right') {
    // For RIGHT join, we want matched rows (which were already emitted if we also matched, but let's ensure order)
    // In our loop above: if joinType === 'right', we didn't emit during primary probe.
    // Let's emit matched rows for RIGHT join now:
    for (const sIdx of matchedSecondaryIndices) {
      const sRow = secondaryRows[sIdx];
      const rawKey = sRow[secondaryKey];
      const key = normalizeKey(rawKey);

      // Find corresponding primary rows
      for (let pIdx = 0; pIdx < primaryCount; pIdx++) {
        const pRow = primaryRows[pIdx];
        if (normalizeKey(pRow[primaryKey]) === key) {
          const combinedRow: Record<string, unknown> = {};
          for (const col of primaryColumns) {
            combinedRow[col.outputName] = pRow[col.column] !== undefined ? pRow[col.column] : null;
          }
          for (const col of secondaryColumns) {
            combinedRow[col.outputName] = sRow[col.column] !== undefined ? sRow[col.column] : null;
          }
          resultRows.push(combinedRow);
        }
      }
    }
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  const stats: JoinStatistics = {
    primaryRowCount: primaryCount,
    secondaryRowCount: secondaryCount,
    matchingRowCount,
    unmatchedPrimaryCount,
    unmatchedSecondaryCount,
    totalOutputRows: resultRows.length,
    executionTimeMs,
  };

  return {
    planId: `join_${Date.now()}`,
    columns: finalColumns,
    rows: resultRows,
    stats,
    columnOrigins,
  };
}
