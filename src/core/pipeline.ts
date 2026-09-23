/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Pipeline Architecture Blueprint
 * Implements plan validation and defines stage hooks.
 */

import { ExtractionPlan, SheetDataset, ExecutionResult } from './types';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Deterministically validates an ExtractionPlan against the loaded dataset schemas.
 * Guarantees that all referenced datasets, fields, and join columns actually exist.
 */
export function validateExtractionPlan(
  plan: ExtractionPlan,
  datasets: Map<string, SheetDataset>
): PlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify primary dataset exists
  if (!plan.primaryDatasetId || !datasets.has(plan.primaryDatasetId)) {
    errors.push(`Primary dataset '${plan.primaryDatasetId}' is not found in loaded datasets.`);
    return { isValid: false, errors, warnings };
  }

  // 2. Verify selected fields
  if (!plan.selectedFields || plan.selectedFields.length === 0) {
    errors.push('Extraction plan must select at least one output field.');
  } else {
    for (const field of plan.selectedFields) {
      const ds = datasets.get(field.datasetId);
      if (!ds) {
        errors.push(`Selected field references non-existent dataset '${field.datasetId}'.`);
      } else {
        const colExists = ds.columns.some((c) => c.name === field.columnName);
        if (!colExists) {
          errors.push(`Column '${field.columnName}' not found in dataset '${ds.fileName}'.`);
        }
      }
    }
  }

  // 3. Verify joins
  for (const join of plan.joins) {
    const leftDs = datasets.get(join.leftDatasetId);
    const rightDs = datasets.get(join.rightDatasetId);

    if (!leftDs) {
      errors.push(`Join left dataset '${join.leftDatasetId}' does not exist.`);
    } else if (!leftDs.columns.some((c) => c.name === join.leftColumn)) {
      errors.push(`Join left column '${join.leftColumn}' does not exist in '${leftDs.fileName}'.`);
    }

    if (!rightDs) {
      errors.push(`Join right dataset '${join.rightDatasetId}' does not exist.`);
    } else if (!rightDs.columns.some((c) => c.name === join.rightColumn)) {
      errors.push(`Join right column '${join.rightColumn}' does not exist in '${rightDs.fileName}'.`);
    }
  }

  // 4. Verify filters
  for (const group of plan.filterGroups) {
    for (const condition of group.conditions) {
      if (condition.datasetId) {
        const ds = datasets.get(condition.datasetId);
        if (!ds) {
          errors.push(`Filter condition references non-existent dataset '${condition.datasetId}'.`);
        } else {
          const colExists = ds.columns.some((c) => c.name === condition.columnName);
          if (!colExists) {
            errors.push(`Filter references non-existent column '${condition.columnName}' in '${ds.fileName}'.`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Pipeline stage definitions representing each step of execution.
 */
export const PIPELINE_STAGES = [
  {
    id: 'ingestion',
    name: '1. Ingestion & File Parsing',
    description: 'Streamed / chunked reading of raw CSV & Excel workbooks into structured tables.',
    deterministic: true,
  },
  {
    id: 'profiling',
    name: '2. Schema Discovery & Profiling',
    description: 'Infer types (number, string, date, boolean), non-null cardinality, and sample previews.',
    deterministic: true,
  },
  {
    id: 'join_resolution',
    name: '3. Relational Join Execution',
    description: 'Perform deterministic hash-joins across primary and related datasets on matching keys.',
    deterministic: true,
  },
  {
    id: 'filter_evaluation',
    name: '4. Filter & Expression Evaluation',
    description: 'Evaluate composite AND/OR predicate trees with strict type-coercion semantics.',
    deterministic: true,
  },
  {
    id: 'projection',
    name: '5. Field Projection & Ordering',
    description: 'Pick selected columns, apply aliases, and order output columns according to plan.',
    deterministic: true,
  },
  {
    id: 'export',
    name: '6. Output Serialization & Download',
    description: 'Render fast live preview or generate client-side CSV / XLSX binary downloads.',
    deterministic: true,
  },
] as const;
