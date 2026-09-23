/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Join Compatibility Validator
 * Audits matching keys for type parity, null frequency, duplicate cardinality,
 * and key overlap before execution.
 */

import { SheetDataset, SupportedDataType } from '../../types';
import { isNullOrEmpty } from '../../profiler/schemaProfiler';
import { JoinValidationResult, RelationshipCardinality } from './joinTypes';

/**
 * Normalizes a key cell value for robust deterministic comparison.
 */
export function normalizeKey(val: unknown): string | null {
  if (isNullOrEmpty(val)) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : String(val);
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  const s = String(val).trim();
  // Strip trailing decimals if pure integer representation (.0)
  return s === '' ? null : s;
}

export function validateJoinConfiguration(
  primaryDataset: SheetDataset | null,
  secondaryDataset: SheetDataset | null,
  primaryKey: string,
  secondaryKey: string
): JoinValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!primaryDataset || !secondaryDataset) {
    return {
      isValid: false,
      errors: ['Both Primary and Secondary datasets must be selected.'],
      warnings: [],
      typeMismatch: false,
      primaryInferredType: 'unknown',
      secondaryInferredType: 'unknown',
      primaryNullCount: 0,
      secondaryNullCount: 0,
      primaryDuplicateCount: 0,
      secondaryDuplicateCount: 0,
      cardinality: 'unknown',
      estimatedMatchingKeys: 0,
    };
  }

  if (primaryDataset.id === secondaryDataset.id) {
    warnings.push('Joining a dataset to itself. Ensure self-referential keys are configured correctly.');
  }

  const primaryCol = primaryDataset.columns.find((c) => c.name === primaryKey);
  const secondaryCol = secondaryDataset.columns.find((c) => c.name === secondaryKey);

  if (!primaryCol) {
    errors.push(`Primary matching column '${primaryKey}' does not exist in ${primaryDataset.fileName}.`);
  }
  if (!secondaryCol) {
    errors.push(`Secondary matching column '${secondaryKey}' does not exist in ${secondaryDataset.fileName}.`);
  }

  if (errors.length > 0 || !primaryCol || !secondaryCol) {
    return {
      isValid: false,
      errors,
      warnings,
      typeMismatch: false,
      primaryInferredType: primaryCol?.inferredType ?? 'unknown',
      secondaryInferredType: secondaryCol?.inferredType ?? 'unknown',
      primaryNullCount: 0,
      secondaryNullCount: 0,
      primaryDuplicateCount: 0,
      secondaryDuplicateCount: 0,
      cardinality: 'unknown',
      estimatedMatchingKeys: 0,
    };
  }

  // Type comparison
  const typeMismatch = primaryCol.inferredType !== secondaryCol.inferredType;
  if (typeMismatch) {
    warnings.push(
      `Matching columns have different inferred types: '${primaryCol.inferredType}' in Primary vs '${secondaryCol.inferredType}' in Secondary. Normalized string comparison will be applied.`
    );
  }

  // Inspect primary keys
  let primaryNullCount = 0;
  const primaryKeyCounts = new Map<string, number>();
  for (const row of primaryDataset.rows) {
    const rawVal = row[primaryKey];
    const key = normalizeKey(rawVal);
    if (key === null) {
      primaryNullCount++;
    } else {
      primaryKeyCounts.set(key, (primaryKeyCounts.get(key) ?? 0) + 1);
    }
  }

  let primaryDuplicateCount = 0;
  for (const count of primaryKeyCounts.values()) {
    if (count > 1) {
      primaryDuplicateCount += count - 1;
    }
  }

  if (primaryNullCount > 0) {
    warnings.push(
      `Primary key column '${primaryKey}' contains ${primaryNullCount.toLocaleString()} null or empty values. These will never match secondary rows.`
    );
  }

  // Inspect secondary keys
  let secondaryNullCount = 0;
  const secondaryKeyCounts = new Map<string, number>();
  for (const row of secondaryDataset.rows) {
    const rawVal = row[secondaryKey];
    const key = normalizeKey(rawVal);
    if (key === null) {
      secondaryNullCount++;
    } else {
      secondaryKeyCounts.set(key, (secondaryKeyCounts.get(key) ?? 0) + 1);
    }
  }

  let secondaryDuplicateCount = 0;
  for (const count of secondaryKeyCounts.values()) {
    if (count > 1) {
      secondaryDuplicateCount += count - 1;
    }
  }

  if (secondaryNullCount > 0) {
    warnings.push(
      `Secondary key column '${secondaryKey}' contains ${secondaryNullCount.toLocaleString()} null or empty values. These will not participate in inner joins.`
    );
  }

  // Determine Cardinality
  const primaryHasDupes = primaryDuplicateCount > 0;
  const secondaryHasDupes = secondaryDuplicateCount > 0;

  let cardinality: RelationshipCardinality = 'one-to-one';
  if (primaryHasDupes && secondaryHasDupes) {
    cardinality = 'many-to-many';
    warnings.push(
      'Many-to-many relationship detected. Matching duplicate keys will produce multiplicative combination rows.'
    );
  } else if (primaryHasDupes && !secondaryHasDupes) {
    cardinality = 'many-to-one';
  } else if (!primaryHasDupes && secondaryHasDupes) {
    cardinality = 'one-to-many';
  } else {
    cardinality = 'one-to-one';
  }

  // Calculate estimated matching keys count
  let estimatedMatchingKeys = 0;
  for (const key of primaryKeyCounts.keys()) {
    if (secondaryKeyCounts.has(key)) {
      estimatedMatchingKeys++;
    }
  }

  if (estimatedMatchingKeys === 0 && primaryDataset.rowCount > 0 && secondaryDataset.rowCount > 0) {
    warnings.push(
      `Zero matching key values found between '${primaryKey}' and '${secondaryKey}'. An INNER JOIN will return 0 rows.`
    );
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    typeMismatch,
    primaryInferredType: primaryCol.inferredType,
    secondaryInferredType: secondaryCol.inferredType,
    primaryNullCount,
    secondaryNullCount,
    primaryDuplicateCount,
    secondaryDuplicateCount,
    cardinality,
    estimatedMatchingKeys,
  };
}
