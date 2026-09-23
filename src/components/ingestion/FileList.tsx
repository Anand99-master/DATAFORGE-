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

                    {/* Status and dimension metadata */}
                    {!isError ? (
                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-400 flex-wrap gap-y-1">
                        <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Ready</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">
                          {file.sheets.reduce((acc, s) => acc + s.rowCount, 0).toLocaleString()} rows
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">
                          {file.sheets[0]?.columnCount ?? 0} columns
                        </span>
                        {isXlsx && file.sheetNames.length > 1 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {file.sheetNames.length} sheets
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/60 text-xs text-rose-300 space-y-2">
                        <div className="flex items-start space-x-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-semibold text-rose-200">
                              Ingestion Failed: Unable to parse file
                            </div>
                            <p className="text-slate-300 text-[11px] mt-0.5">
                              {file.errorMessage}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rose-900/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <div>
                            <span className="text-slate-500">Affected File: </span>
                            <span className="font-mono text-slate-300">{file.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Suggested Action: </span>
                            <span className="text-slate-300">
                              {file.fileType === 'csv'
                                ? 'Verify file is valid UTF-8 text with standard comma/tab delimiters.'
                                : 'Ensure file is a valid, uncorrupted Excel workbook (.xlsx).'}
                            </span>
                          </div>
                        </div>

                        <details className="text-[10px] text-slate-500 pt-1">
                          <summary className="cursor-pointer hover:text-slate-400 font-mono">
                            Technical diagnostics
                          </summary>
                          <pre className="mt-1 p-2 rounded bg-slate-950 text-rose-400 font-mono overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(
                              {
                                fileId: file.id,
                                fileName: file.name,
                                type: file.fileType,
                                sizeBytes: file.sizeBytes,
                                error: file.errorMessage,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </details>
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
