/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FileList Component
 * Displays imported files, handles worksheet selection for XLSX,
 * provides file removal, and renders individual file error alerts.
 */

import React from 'react';
import { SourceFile } from '../../core/types';
import {
  FileSpreadsheet,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface FileListProps {
  files: SourceFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onSelectSheet: (fileId: string, sheetName: string) => void;
  onRemoveFile: (fileId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onSelectSheet,
  onRemoveFile,
}) => {
  if (files.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            Imported Datasets ({files.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Click file or sheet tab to inspect schema & data
        </span>
      </div>

      <div className="space-y-3">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const isError = file.status === 'error';
          const isXlsx = file.fileType === 'xlsx';

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`rounded-xl border transition-all cursor-pointer p-4 ${
                isActive
                  ? 'bg-slate-950 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-lg border mt-0.5 shrink-0 ${
                      isError
                        ? 'bg-rose-950/40 border-rose-800 text-rose-400'
                        : isXlsx
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                        : 'bg-cyan-950/40 border-cyan-800 text-cyan-400'
                    }`}
                  >
                    {isError ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : isXlsx ? (
                      <FileSpreadsheet className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-200 truncate max-w-xs md:max-w-md">
                        {file.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {file.fileType}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </div>

                    {/* Status info */}
                    {!isError ? (
                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                        {isXlsx && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            {file.sheetNames.length} sheet{file.sheetNames.length > 1 ? 's' : ''} detected
                          </span>
                        )}
                        <span>
                          {file.sheets.reduce((acc, s) => acc + s.rowCount, 0)} total rows
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 rounded bg-rose-950/30 border border-rose-900/60 text-xs text-rose-300 flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Ingestion Error: </strong>
                          {file.errorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  title="Remove File"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* XLSX Worksheet Selector Pills */}
              {!isError && isXlsx && file.sheetNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
                    <span className="font-medium text-slate-300">Select Worksheet:</span>
                    <span className="text-[11px]">Active sheet supplies columns & rows</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.sheetNames.map((sheetName) => {
                      const isSheetActive = file.activeSheetName === sheetName;
                      const sheetDataset = file.sheets.find((s) => s.sheetName === sheetName);
                      return (
                        <button
                          key={sheetName}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFile(file.id);
                            onSelectSheet(file.id, sheetName);
                          }}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSheetActive
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span>{sheetName}</span>
                          {sheetDataset && (
                            <span className="font-mono text-[10px] opacity-75 bg-slate-800/80 px-1 rounded">
                              {sheetDataset.rowCount} rows
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
