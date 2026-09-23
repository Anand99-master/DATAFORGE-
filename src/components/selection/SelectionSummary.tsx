/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SelectionSummary Component
 * Summary panel displaying dataset source, selected fields, active filter criteria,
 * live reactive matching row count, and the "Generate Result" action trigger.
 */

import React, { useMemo } from 'react';
import { SheetDataset, FilterGroup } from '../../core/types';
import { countMatchingRows } from '../../core/engine/selectionEngine';
import {
  FileSpreadsheet,
  CheckCircle2,
  Table,
  Columns,
  Play,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SelectionSummaryProps {
  dataset: SheetDataset;
  selectedColumns: string[];
  filterGroups: FilterGroup[];
  groupLogicalOperator: 'AND' | 'OR';
  onGenerateResult: () => void;
  onModifySelection?: () => void;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  dataset,
  selectedColumns,
  filterGroups,
  groupLogicalOperator,
  onGenerateResult,
  onModifySelection,
}) => {
  // Live deterministic computation of matching rows
  const matchingRowCount = useMemo(() => {
    return countMatchingRows(dataset, filterGroups, groupLogicalOperator);
  }, [dataset, filterGroups, groupLogicalOperator]);

  const activeColumnsCount =
    selectedColumns.length > 0 ? selectedColumns.length : dataset.columns.length;

  const totalSourceRows = dataset.rowCount;
  const matchPercentage =
    totalSourceRows > 0 ? Math.round((matchingRowCount / totalSourceRows) * 100) : 0;

  // Format filter expressions for clean human-readable summary
  const formattedFilterStrings = useMemo(() => {
    const list: string[] = [];

    const activeGroups = filterGroups.filter((g) => g.conditions.length > 0);
    activeGroups.forEach((group, gIdx) => {
      const conditionStrings = group.conditions.map((c) => {
        let opText = c.operator.replace(/_/g, ' ');
        let valText = '';
        if (c.operator === 'between') {
          valText = `${c.value ?? ''} and ${c.value2 ?? ''}`;
        } else if (c.operator === 'is_true') {
          valText = 'true';
        } else if (c.operator === 'is_false') {
          valText = 'false';
        } else if (c.operator === 'is_empty' || c.operator === 'is_not_empty') {
          valText = '';
        } else {
          valText = `"${c.value ?? ''}"`;
        }
        return `${c.columnName} ${opText} ${valText}`.trim();
      });

      const joinedConds = conditionStrings.join(` ${group.logicalOperator} `);
      if (activeGroups.length > 1) {
        list.push(`(${joinedConds})`);
      } else {
        list.push(joinedConds);
      }
    });

    return list;
  }, [filterGroups]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-slate-100">
            Selection & Extraction Summary
          </h3>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800 flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Deterministic Plan Ready</span>
        </span>
      </div>

      {/* 4 Summary Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Block 1: Source Dataset */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            DATASET SOURCE
          </div>
          <div className="mt-2 min-w-0">
            <div className="font-bold text-sm text-slate-100 truncate">
              {dataset.fileName}
            </div>
            {dataset.fileType === 'xlsx' && (
              <div className="text-xs text-cyan-400 font-medium truncate mt-0.5">
                Sheet: {dataset.sheetName}
              </div>
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            {dataset.rowCount.toLocaleString()} source records
          </div>
        </div>

        {/* Block 2: Fields Selected */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            FIELDS PROJECTED
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-slate-100">
              {activeColumnsCount}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              of {dataset.columnCount} total columns
            </div>
          </div>
          <div className="mt-3 text-[11px] text-cyan-300 font-mono truncate">
            {selectedColumns.length > 0
              ? selectedColumns.slice(0, 3).join(', ') +
                (selectedColumns.length > 3 ? ` +${selectedColumns.length - 3} more` : '')
              : 'All columns projected'}
          </div>
        </div>

        {/* Block 3: Active Filters */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            ACTIVE FILTERS
          </div>
          <div className="mt-2 min-w-0">
            {formattedFilterStrings.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No filters applied (all rows)</div>
            ) : (
              <div className="font-mono text-xs text-amber-300 line-clamp-2 leading-relaxed">
                {formattedFilterStrings.join(` ${groupLogicalOperator} `)}
              </div>
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            {filterGroups.reduce((s, g) => s + g.conditions.length, 0)} conditions in{' '}
            {filterGroups.length} group(s)
          </div>
        </div>

        {/* Block 4: Live Result Estimation */}
        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/60 shadow-lg shadow-cyan-950/30 flex flex-col justify-between ring-1 ring-cyan-500/30">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
            <span>PROMINENT STATISTIC</span>
            <span className="text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-300 border border-cyan-800">
              Live
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xs text-slate-400 font-medium">Matching Rows:</div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums tracking-tight">
              {matchingRowCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              of {totalSourceRows.toLocaleString()} source records ({matchPercentage}%)
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-mono">
            Filtered out {(totalSourceRows - matchingRowCount).toLocaleString()} rows
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          Ready to execute deterministic query plan. Generates in-memory result instantly.
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {onModifySelection && (
            <button
              type="button"
              onClick={onModifySelection}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
            >
              Modify Selection
            </button>
          )}

          <button
            type="button"
            onClick={onGenerateResult}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-950/40 transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Generate Result & View Preview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
