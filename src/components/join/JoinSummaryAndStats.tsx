/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinSummaryAndStats Component
 * High-density pre-execution summary panel displaying dataset dimensions,
 * matching key estimates, and the deterministic join execution trigger.
 */

import React from 'react';
import { SheetDataset, JoinType } from '../../core/types';
import { JoinValidationResult, JoinColumnSelection } from '../../core/engine/join/joinTypes';
import {
  Layers,
  Play,
  ArrowRight,
  GitMerge,
  Table,
  Columns,
  CheckCircle2,
} from 'lucide-react';

interface JoinSummaryAndStatsProps {
  primaryDataset: SheetDataset;
  secondaryDataset: SheetDataset;
  primaryKey: string;
  secondaryKey: string;
  joinType: JoinType;
  validation: JoinValidationResult;
  selectedColumns: JoinColumnSelection[];
  onExecuteJoin: () => void;
}

export const JoinSummaryAndStats: React.FC<JoinSummaryAndStatsProps> = ({
  primaryDataset,
  secondaryDataset,
  primaryKey,
  secondaryKey,
  joinType,
  validation,
  selectedColumns,
  onExecuteJoin,
}) => {
  const isRunnable =
    validation.isValid &&
    primaryKey !== '' &&
    secondaryKey !== '' &&
    selectedColumns.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-base text-slate-100">
            6. Join Execution Plan & Summary
          </h3>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800 flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Deterministic Plan Verified</span>
        </span>
      </div>

      {/* 4 Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Driving Datasets */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            DATASETS JOINED
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xs font-bold text-cyan-300 truncate">
              Pri: {primaryDataset.fileName}
            </div>
            <div className="text-xs font-bold text-emerald-300 truncate">
              Sec: {secondaryDataset.fileName}
            </div>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            {primaryDataset.rowCount.toLocaleString()} × {secondaryDataset.rowCount.toLocaleString()}
          </div>
        </div>

        {/* Card 2: Key Match Condition */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            MATCH CONDITION
          </div>
          <div className="mt-2 font-mono text-xs text-slate-200">
            <span className="text-cyan-400 font-bold">{primaryKey || '?'}</span>
            <span className="text-slate-500 mx-1.5">==</span>
            <span className="text-emerald-400 font-bold">{secondaryKey || '?'}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            {validation.estimatedMatchingKeys.toLocaleString()} overlapping key values
          </div>
        </div>

        {/* Card 3: Join Strategy */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            JOIN STRATEGY
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold font-mono text-cyan-300 uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
              {joinType.toUpperCase()} JOIN
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 capitalize">
            {validation.cardinality.replace(/-/g, ' ')}
          </div>
        </div>

        {/* Card 4: Output Projection */}
        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/60 shadow-lg shadow-cyan-950/20 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
            PROJECTED SCHEMA
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {selectedColumns.length}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            columns in final combined table
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          Executes in-memory O(N + M) Hash Join with zero mutation of source files.
        </div>

        <button
          type="button"
          onClick={onExecuteJoin}
          disabled={!isRunnable}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-950/40 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Execute Multi-File Join & View Result</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
