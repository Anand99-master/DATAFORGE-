/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DatasetPairSelector Component
 * Allows user to designate the Primary and Secondary datasets
 * for relational matching and join operations.
 */

import React from 'react';
import { SheetDataset, SourceFile } from '../../core/types';
import {
  FileSpreadsheet,
  FileText,
  ArrowRightLeft,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface DatasetPairSelectorProps {
  files: SourceFile[];
  primaryDatasetId: string | null;
  secondaryDatasetId: string | null;
  onSelectPrimary: (id: string) => void;
  onSelectSecondary: (id: string) => void;
  onSwapDatasets: () => void;
}

export const DatasetPairSelector: React.FC<DatasetPairSelectorProps> = ({
  files,
  primaryDatasetId,
  secondaryDatasetId,
  onSelectPrimary,
  onSelectSecondary,
  onSwapDatasets,
}) => {
  // Collect all valid datasets
  const validDatasets: SheetDataset[] = [];
  files.forEach((file) => {
    if (file.status === 'ready' && file.sheets) {
      file.sheets.forEach((sheet) => {
        if (sheet.rowCount > 0 || sheet.columnCount > 0) {
          validDatasets.push(sheet);
        }
      });
    }
  });

  if (validDatasets.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 space-y-2">
        <Database className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="font-semibold text-sm text-slate-200">
          At least 2 datasets required for Relational Join
        </h4>
        <p>
          You currently have {validDatasets.length} dataset loaded. Please import another CSV or multi-sheet Excel file in the Ingestion tab, or click "Load Sample" to test with Customers.xlsx and Orders.csv.
        </p>
      </div>
    );
  }

  const primaryDataset = validDatasets.find((d) => d.id === primaryDatasetId) ?? null;
  const secondaryDataset = validDatasets.find((d) => d.id === secondaryDatasetId) ?? null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            1. Select Dataset Pair to Join
          </h3>
        </div>
        <button
          type="button"
          onClick={onSwapDatasets}
          className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded border border-slate-700 transition-colors font-medium"
          title="Swap Primary and Secondary roles"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Swap Roles</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PRIMARY DATASET PICKER */}
        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              PRIMARY (LEFT) DATASET
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Driving Table</span>
          </div>

          <select
            value={primaryDatasetId ?? ''}
            onChange={(e) => onSelectPrimary(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
          >
            {validDatasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.fileName} {ds.fileType === 'xlsx' ? `(${ds.sheetName})` : ''} — {ds.rowCount.toLocaleString()} rows, {ds.columnCount} cols
              </option>
            ))}
          </select>

          {primaryDataset && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="flex items-center space-x-1 text-cyan-300 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{primaryDataset.rowCount.toLocaleString()} rows</span>
              </span>
              <span className="font-mono text-slate-400">
                {primaryDataset.columnCount} columns available
              </span>
            </div>
          )}
        </div>

        {/* SECONDARY DATASET PICKER */}
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/60 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              SECONDARY (RIGHT) DATASET
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Matching Table</span>
          </div>

          <select
            value={secondaryDatasetId ?? ''}
            onChange={(e) => onSelectSecondary(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
          >
            {validDatasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.fileName} {ds.fileType === 'xlsx' ? `(${ds.sheetName})` : ''} — {ds.rowCount.toLocaleString()} rows, {ds.columnCount} cols
              </option>
            ))}
          </select>

          {secondaryDataset && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="flex items-center space-x-1 text-emerald-300 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{secondaryDataset.rowCount.toLocaleString()} rows</span>
              </span>
              <span className="font-mono text-slate-400">
                {secondaryDataset.columnCount} columns available
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
