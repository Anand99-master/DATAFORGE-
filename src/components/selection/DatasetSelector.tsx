/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DatasetSelector Component
 * Lists all successfully ingested datasets with file names, sheet names,
 * and row/col counts. Prevents selection of invalid/errored datasets.
 */

import React from 'react';
import { SheetDataset, SourceFile } from '../../core/types';
import { FileSpreadsheet, FileText, CheckCircle2, Database } from 'lucide-react';

interface DatasetSelectorProps {
  files: SourceFile[];
  activeDatasetId: string | null;
  onSelectDataset: (datasetId: string) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  files,
  activeDatasetId,
  onSelectDataset,
}) => {
  // Collect all valid datasets from successfully loaded files
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

  if (validDatasets.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-inner">
          <Database className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-base text-slate-200">No datasets available</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Import CSV or XLSX files in the Ingest tab to select fields and build filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            1. Select Source Dataset ({validDatasets.length} available)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Choose the dataset to extract fields and filter records from
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {validDatasets.map((ds) => {
          const isSelected = ds.id === activeDatasetId;
          const isXlsx = ds.fileType === 'xlsx';

          return (
            <div
              key={ds.id}
              onClick={() => onSelectDataset(ds.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-950 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-lg border shrink-0 ${
                      isXlsx
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                        : 'bg-cyan-950/40 border-cyan-800 text-cyan-400'
                    }`}
                  >
                    {isXlsx ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-200 truncate">
                      {ds.fileName}
                    </div>
                    {isXlsx && (
                      <div className="text-[11px] text-cyan-400 truncate">
                        Sheet: {ds.sheetName}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{ds.rowCount.toLocaleString()} rows</span>
                <span>{ds.columnCount} columns</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
