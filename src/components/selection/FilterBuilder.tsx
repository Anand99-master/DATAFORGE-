/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FilterBuilder Component
 * Visual deterministic filter builder supporting typed operators,
 * nested boolean groups (AND/OR), range criteria, and null checks.
 */

import React from 'react';
import {
  SheetDataset,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  SupportedDataType,
} from '../../core/types';
import {
  Filter,
  Plus,
  Trash2,
  Layers,
  Split,
  HelpCircle,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
} from 'lucide-react';

interface FilterBuilderProps {
  dataset: SheetDataset;
  filterGroups: FilterGroup[];
  groupLogicalOperator: 'AND' | 'OR';
  onChangeFilterGroups: (groups: FilterGroup[]) => void;
  onChangeGroupLogicalOperator: (op: 'AND' | 'OR') => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  dataset,
  filterGroups,
  groupLogicalOperator,
  onChangeFilterGroups,
  onChangeGroupLogicalOperator,
}) => {
  // Get data type for a given column name
  const getColumnType = (colName: string): SupportedDataType => {
    const col = dataset.columns.find((c) => c.name === colName);
    return col ? col.inferredType : 'string';
  };

  // Operators available per data type
  const getOperatorsForType = (type: SupportedDataType): { value: FilterOperator; label: string }[] => {
    switch (type) {
      case 'number':
        return [
          { value: 'equals', label: 'equals (=)' },
          { value: 'not_equals', label: 'not equals (≠)' },
          { value: 'greater_than', label: 'greater than (>)' },
          { value: 'greater_than_or_equal', label: 'greater than or equal (≥)' },
          { value: 'less_than', label: 'less than (<)' },
          { value: 'less_than_or_equal', label: 'less than or equal (≤)' },
          { value: 'between', label: 'between' },
          { value: 'is_empty', label: 'is empty (null)' },
          { value: 'is_not_empty', label: 'is not empty' },
        ];
      case 'date':
        return [
          { value: 'equals', label: 'equals (=)' },
          { value: 'before', label: 'before (<)' },
          { value: 'after', label: 'after (>)' },
          { value: 'between', label: 'between' },
          { value: 'is_empty', label: 'is empty (null)' },
          { value: 'is_not_empty', label: 'is not empty' },
        ];
      case 'boolean':
        return [
          { value: 'is_true', label: 'equals true' },
          { value: 'is_false', label: 'equals false' },
          { value: 'is_empty', label: 'is empty (null)' },
          { value: 'is_not_empty', label: 'is not empty' },
        ];
      case 'string':
      default:
        return [
          { value: 'equals', label: 'equals' },
          { value: 'not_equals', label: 'not equals' },
          { value: 'contains', label: 'contains' },
          { value: 'not_contains', label: 'does not contain' },
          { value: 'starts_with', label: 'starts with' },
          { value: 'ends_with', label: 'ends with' },
          { value: 'is_empty', label: 'is empty (null)' },
          { value: 'is_not_empty', label: 'is not empty' },
        ];
    }
  };

  // Add new filter group
  const addGroup = () => {
    const firstCol = dataset.columns[0]?.name ?? '';
    const firstType = getColumnType(firstCol);
    const defaultOp = getOperatorsForType(firstType)[0].value;

    const newGroup: FilterGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      logicalOperator: 'AND',
      conditions: [
        {
          id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          datasetId: dataset.id,
          columnName: firstCol,
          operator: defaultOp,
          value: '',
        },
      ],
    };

    onChangeFilterGroups([...filterGroups, newGroup]);
  };

  // Remove a filter group
  const removeGroup = (groupId: string) => {
    onChangeFilterGroups(filterGroups.filter((g) => g.id !== groupId));
  };

  // Toggle group logical operator (AND vs OR)
  const toggleGroupOperator = (groupId: string, op: 'AND' | 'OR') => {
    onChangeFilterGroups(
      filterGroups.map((g) => (g.id === groupId ? { ...g, logicalOperator: op } : g))
    );
  };

  // Add condition to a group
  const addCondition = (groupId: string) => {
    const firstCol = dataset.columns[0]?.name ?? '';
    const firstType = getColumnType(firstCol);
    const defaultOp = getOperatorsForType(firstType)[0].value;

    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: [
              ...g.conditions,
              {
                id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                datasetId: dataset.id,
                columnName: firstCol,
                operator: defaultOp,
                value: '',
              },
            ],
          };
        }
        return g;
      })
    );
  };

  // Remove condition from a group
  const removeCondition = (groupId: string, condId: string) => {
    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: g.conditions.filter((c) => c.id !== condId),
          };
        }
        return g;
      })
    );
  };

  // Update condition column
  const handleColumnChange = (groupId: string, condId: string, colName: string) => {
    const colType = getColumnType(colName);
    const validOps = getOperatorsForType(colType);

    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: g.conditions.map((c) => {
              if (c.id === condId) {
                // If existing operator is not valid for new type, switch to default
                const isOpStillValid = validOps.some((op) => op.value === c.operator);
                return {
                  ...c,
                  columnName: colName,
                  operator: isOpStillValid ? c.operator : validOps[0].value,
                  value: '',
                  value2: undefined,
                };
              }
              return c;
            }),
          };
        }
        return g;
      })
    );
  };

  // Update condition operator
  const handleOperatorChange = (
    groupId: string,
    condId: string,
    operator: FilterOperator
  ) => {
    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: g.conditions.map((c) => {
              if (c.id === condId) {
                return {
                  ...c,
                  operator,
                };
              }
              return c;
            }),
          };
        }
        return g;
      })
    );
  };

  // Update condition value
  const handleValueChange = (
    groupId: string,
    condId: string,
    value: string | number | boolean | null
  ) => {
    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: g.conditions.map((c) => {
              if (c.id === condId) {
                return { ...c, value };
              }
              return c;
            }),
          };
        }
        return g;
      })
    );
  };

  // Update second value for 'between'
  const handleValue2Change = (
    groupId: string,
    condId: string,
    value2: string | number | null
  ) => {
    onChangeFilterGroups(
      filterGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            conditions: g.conditions.map((c) => {
              if (c.id === condId) {
                return { ...c, value2 };
              }
              return c;
            }),
          };
        }
        return g;
      })
    );
  };

  const getTypeIcon = (type: SupportedDataType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3 text-blue-400" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-amber-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-emerald-400" />;
      default:
        return <Type className="w-3 h-3 text-purple-400" />;
    }
  };

  const activeConditionsCount = filterGroups.reduce(
    (sum, g) => sum + g.conditions.length,
    0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              3. Configure Filter Conditions
            </h3>
            {activeConditionsCount > 0 && (
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                {activeConditionsCount} active condition{activeConditionsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Filter rows deterministically using type-aware operators and grouped logic.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {filterGroups.length > 1 && (
            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Combine Groups with:</span>
              <button
                type="button"
                onClick={() => onChangeGroupLogicalOperator('AND')}
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition-colors ${
                  groupLogicalOperator === 'AND'
                    ? 'bg-cyan-600 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => onChangeGroupLogicalOperator('OR')}
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition-colors ${
                  groupLogicalOperator === 'OR'
                    ? 'bg-cyan-600 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                OR
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={addGroup}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Filter Group</span>
          </button>
        </div>
      </div>

      {/* Filter Groups List */}
      {filterGroups.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
          <Filter className="w-6 h-6 text-slate-700 mx-auto" />
          <p>No filter conditions applied. All rows from the dataset will be included.</p>
          <button
            type="button"
            onClick={addGroup}
            className="text-cyan-400 hover:text-cyan-300 font-medium underline inline-block"
          >
            + Add your first filter condition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filterGroups.map((group, groupIdx) => (
            <div
              key={group.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 relative shadow-inner"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                    Group {groupIdx + 1}
                  </span>

                  {/* Group Operator Toggle (AND / OR) */}
                  <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => toggleGroupOperator(group.id, 'AND')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        group.logicalOperator === 'AND'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      AND (All Match)
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroupOperator(group.id, 'OR')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        group.logicalOperator === 'OR'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      OR (Any Match)
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => addCondition(group.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Condition</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    title="Remove Group"
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-2.5">
                {group.conditions.map((cond, condIdx) => {
                  const colType = getColumnType(cond.columnName);
                  const availableOperators = getOperatorsForType(colType);
                  const isBetween = cond.operator === 'between';
                  const isNullCheck =
                    cond.operator === 'is_empty' ||
                    cond.operator === 'is_not_empty' ||
                    cond.operator === 'is_null' ||
                    cond.operator === 'is_not_null';
                  const isBooleanToggle =
                    cond.operator === 'is_true' || cond.operator === 'is_false';

                  return (
                    <div
                      key={cond.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800/80"
                    >
                      {/* Logical link label */}
                      <span className="text-[11px] font-mono text-slate-500 w-8 text-center shrink-0">
                        {condIdx === 0 ? 'WHERE' : group.logicalOperator}
                      </span>

                      {/* Column Picker */}
                      <div className="min-w-[170px] sm:w-1/4">
                        <select
                          value={cond.columnName}
                          onChange={(e) =>
                            handleColumnChange(group.id, cond.id, e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          {dataset.columns.map((col) => (
                            <option key={col.name} value={col.name}>
                              {col.name} ({col.inferredType})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator Picker */}
                      <div className="min-w-[150px] sm:w-1/4">
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            handleOperatorChange(
                              group.id,
                              cond.id,
                              e.target.value as FilterOperator
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        >
                          {availableOperators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Value Input (Adapts to operator & data type) */}
                      <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                        {isNullCheck || isBooleanToggle ? (
                          <div className="text-xs text-slate-500 italic px-2 py-1 font-mono">
                            No value required ({cond.operator.replace('_', ' ')})
                          </div>
                        ) : isBetween ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type={colType === 'number' ? 'number' : colType === 'date' ? 'date' : 'text'}
                              value={cond.value !== null && cond.value !== undefined ? String(cond.value) : ''}
                              onChange={(e) =>
                                handleValueChange(group.id, cond.id, e.target.value)
                              }
                              placeholder="Min value..."
                              className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <span className="text-[11px] text-slate-400 font-mono">and</span>
                            <input
                              type={colType === 'number' ? 'number' : colType === 'date' ? 'date' : 'text'}
                              value={cond.value2 !== null && cond.value2 !== undefined ? String(cond.value2) : ''}
                              onChange={(e) =>
                                handleValue2Change(group.id, cond.id, e.target.value)
                              }
                              placeholder="Max value..."
                              className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        ) : colType === 'date' ? (
                          <input
                            type="date"
                            value={cond.value !== null && cond.value !== undefined ? String(cond.value) : ''}
                            onChange={(e) =>
                              handleValueChange(group.id, cond.id, e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        ) : colType === 'number' ? (
                          <input
                            type="number"
                            value={cond.value !== null && cond.value !== undefined ? String(cond.value) : ''}
                            onChange={(e) =>
                              handleValueChange(group.id, cond.id, e.target.value)
                            }
                            placeholder="Enter number (e.g. 10000)..."
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        ) : (
                          <input
                            type="text"
                            value={cond.value !== null && cond.value !== undefined ? String(cond.value) : ''}
                            onChange={(e) =>
                              handleValueChange(group.id, cond.id, e.target.value)
                            }
                            placeholder="Filter value (e.g. Ahmedabad)..."
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>

                      {/* Remove Condition Button */}
                      <button
                        type="button"
                        onClick={() => removeCondition(group.id, cond.id)}
                        disabled={group.conditions.length === 1 && filterGroups.length === 1}
                        title="Remove Condition"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-950 rounded transition-colors self-center disabled:opacity-20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
