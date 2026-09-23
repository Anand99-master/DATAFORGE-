/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Deterministic Filter Evaluator
 * Evaluates filter conditions and boolean expression trees against raw records
 * with strict type-coercion, robust null handling, and zero external dependencies.
 */

import { FilterCondition, FilterGroup, SupportedDataType } from '../types';
import { isNullOrEmpty } from '../profiler/schemaProfiler';

/**
 * Extracts a numeric value from arbitrary row cell content.
 */
function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).replace(/[$€£¥₹,%]/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/**
 * Parses calendar date timestamp (at 00:00:00 UTC for day matching) from row cell.
 */
function parseDateDayTimestamp(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
  }
  const s = String(val).trim();
  if (s === '') return null;
  const t = Date.parse(s);
  if (isNaN(t)) return null;
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Parses boolean representation from cell value.
 */
function parseBoolean(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1') return true;
  if (s === 'false' || s === 'no' || s === '0') return false;
  return null;
}

/**
 * Deterministically evaluates a single filter condition on a row.
 */
export function evaluateCondition(
  condition: FilterCondition,
  row: Record<string, unknown>,
  inferredType: SupportedDataType = 'string'
): boolean {
  const rawValue = row[condition.columnName];
  const isCellEmpty = isNullOrEmpty(rawValue);

  // Universal Empty / Not Empty checks
  if (condition.operator === 'is_empty' || condition.operator === 'is_null') {
    return isCellEmpty;
  }
  if (condition.operator === 'is_not_empty' || condition.operator === 'is_not_null') {
    return !isCellEmpty;
  }

  // If cell is empty and we are doing value comparisons, it does not match
  if (isCellEmpty) {
    return false;
  }

  // Type-specific evaluations
  switch (inferredType) {
    case 'number': {
      const cellNum = parseNumeric(rawValue);
      if (cellNum === null) return false;

      const targetNum = parseNumeric(condition.value);
      if (targetNum === null && condition.operator !== 'between') return false;

      switch (condition.operator) {
        case 'equals':
          return cellNum === targetNum;
        case 'not_equals':
          return cellNum !== targetNum;
        case 'greater_than':
          return targetNum !== null && cellNum > targetNum;
        case 'greater_than_or_equal':
          return targetNum !== null && cellNum >= targetNum;
        case 'less_than':
          return targetNum !== null && cellNum < targetNum;
        case 'less_than_or_equal':
          return targetNum !== null && cellNum <= targetNum;
        case 'between': {
          const min = parseNumeric(condition.value);
          const max = parseNumeric(condition.value2);
          if (min === null || max === null) return true;
          return cellNum >= Math.min(min, max) && cellNum <= Math.max(min, max);
        }
        default:
          return true;
      }
    }

    case 'date': {
      const cellDate = parseDateDayTimestamp(rawValue);
      if (cellDate === null) return false;

      const targetDate = parseDateDayTimestamp(condition.value);
      if (targetDate === null && condition.operator !== 'between') return false;

      switch (condition.operator) {
        case 'equals':
          return cellDate === targetDate;
        case 'not_equals':
          return cellDate !== targetDate;
        case 'before':
          return targetDate !== null && cellDate < targetDate;
        case 'after':
          return targetDate !== null && cellDate > targetDate;
        case 'between': {
          const startDate = parseDateDayTimestamp(condition.value);
          const endDate = parseDateDayTimestamp(condition.value2);
          if (startDate === null || endDate === null) return true;
          return cellDate >= Math.min(startDate, endDate) && cellDate <= Math.max(startDate, endDate);
        }
        default:
          return true;
      }
    }

    case 'boolean': {
      const cellBool = parseBoolean(rawValue);
      if (cellBool === null) return false;

      if (condition.operator === 'is_true') return cellBool === true;
      if (condition.operator === 'is_false') return cellBool === false;
      if (condition.operator === 'equals') {
        const targetBool = parseBoolean(condition.value);
        return cellBool === targetBool;
      }
      return true;
    }

    case 'string':
    default: {
      const cellStr = String(rawValue).trim();
      const targetStr = (condition.value !== null && condition.value !== undefined ? String(condition.value) : '').trim();

      const a = condition.caseSensitive ? cellStr : cellStr.toLowerCase();
      const b = condition.caseSensitive ? targetStr : targetStr.toLowerCase();

      switch (condition.operator) {
        case 'equals':
          return a === b;
        case 'not_equals':
          return a !== b;
        case 'contains':
          return b === '' || a.includes(b);
        case 'not_contains':
          return b !== '' && !a.includes(b);
        case 'starts_with':
          return a.startsWith(b);
        case 'ends_with':
          return a.endsWith(b);
        default:
          return true;
      }
    }
  }
}

/**
 * Evaluates a single filter group (multiple conditions combined with AND or OR).
 */
export function evaluateFilterGroup(
  group: FilterGroup,
  row: Record<string, unknown>,
  columnTypes: Map<string, SupportedDataType>
): boolean {
  if (!group.conditions || group.conditions.length === 0) {
    return true;
  }

  if (group.logicalOperator === 'AND') {
    // Every condition must be satisfied
    for (const condition of group.conditions) {
      const colType = columnTypes.get(condition.columnName) ?? 'string';
      if (!evaluateCondition(condition, row, colType)) {
        return false;
      }
    }
    return true;
  } else {
    // 'OR': at least one condition must be satisfied
    for (const condition of group.conditions) {
      const colType = columnTypes.get(condition.columnName) ?? 'string';
      if (evaluateCondition(condition, row, colType)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Evaluates multiple filter groups combined with top-level logical operator.
 */
export function evaluateAllFilterGroups(
  filterGroups: FilterGroup[],
  groupLogicalOperator: 'AND' | 'OR',
  row: Record<string, unknown>,
  columnTypes: Map<string, SupportedDataType>
): boolean {
  const activeGroups = filterGroups.filter((g) => g.conditions.length > 0);
  if (activeGroups.length === 0) {
    return true;
  }

  if (groupLogicalOperator === 'AND') {
    for (const group of activeGroups) {
      if (!evaluateFilterGroup(group, row, columnTypes)) {
        return false;
      }
    }
    return true;
  } else {
    for (const group of activeGroups) {
      if (evaluateFilterGroup(group, row, columnTypes)) {
        return true;
      }
    }
    return false;
  }
}
