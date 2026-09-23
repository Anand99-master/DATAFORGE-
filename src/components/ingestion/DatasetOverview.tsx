/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DatasetOverview Component
 * Displays high-level metadata cards for the active dataset:
 * rows, columns, duplicate rows, missing counts, and ingestion warnings.
 */

import React from 'react';
import { SheetDataset } from '../../core/types';
import {
  FileSpreadsheet,
  FileText,
  Table,
  Columns,
  Copy,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface DatasetOverviewProps {
  dataset: SheetDataset | null;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({ dataset }) => {
  if (!dataset) return null;

  const totalCells = dataset.rowCount * dataset.columnCount;
  const totalNulls = dataset.columns.reduce((sum, col) => sum + col.nullCount, 0);
  const nullRate = totalCells > 0 ? Math.round((totalNulls / totalCells) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top Banner / Dataset Identity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400">
            {dataset.fileType === 'xlsx' ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-slate-100">{dataset.fileName}</h3>
              {dataset.fileType === 'xlsx' && (
                <span className="text-xs bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 font-medium">
                  Sheet: {dataset.sheetName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unique Dataset ID: <span className="font-mono text-slate-300">{dataset.id}</span>
            </p>
          </div>
        </div>

        {/* Header Warnings */}
        {dataset.warnings && dataset.warnings.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5 text-xs text-amber-300 flex items-start space-x-2 max-w-md">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Schema Warning: </span>
              {dataset.warnings.join(' ')}
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Records</span>
            <Table className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {dataset.rowCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Structured row entries</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Columns (Fields)</span>
            <Columns className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {dataset.columnCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Deterministically typed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Duplicate Rows</span>
            <Copy className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {dataset.duplicateRowCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {dataset.duplicateRowCount > 0 ? (
              <span className="text-amber-400 font-medium">Exact duplicate records</span>
            ) : (
              <span className="text-emerald-400 font-medium">No duplicate rows found</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Null / Empty Cells</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {totalNulls.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {nullRate}% overall missing rate
          </div>
        </div>
      </div>
    </div>
  );
};
