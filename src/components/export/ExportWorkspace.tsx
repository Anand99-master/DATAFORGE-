/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ExportWorkspace Component
 * Deterministic export center for DataForge.
 * Displays Export Summary (rows, columns, exact sequence, format),
 * provides one-click downloads for CSV and Excel (XLSX),
 * displays live export status badges, and provides seamless navigation back to preview/modify.
 */

import React, { useState } from 'react';
import { ExportDataset, ExportFormat, ExportStatus } from '../../core/export/exportTypes';
import {
  validateExportDataset,
  executeExport,
  formatFullFileName,
  sanitizeFileName,
} from '../../core/export/exportEngine';
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Columns,
  Table,
  Layers,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';

interface ExportWorkspaceProps {
  dataset: ExportDataset | null;
  onBackToPreview: () => void;
  onBackToModify: () => void;
}

export const ExportWorkspace: React.FC<ExportWorkspaceProps> = ({
  dataset,
  onBackToPreview,
  onBackToModify,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [customBaseName, setCustomBaseName] = useState<string>(
    dataset?.suggestedFileName || 'dataforge_export'
  );
  const [exportStatus, setExportStatus] = useState<ExportStatus>('ready');
  const [statusMessage, setStatusMessage] = useState<string>('Export ready. Select a format and download.');
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(null);

  // Validate the dataset
  const validation = validateExportDataset(dataset);

  if (!dataset || !validation.isValid) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <div>
          <h4 className="font-bold text-base text-slate-100">No Valid Result Dataset to Export</h4>
          <p className="text-slate-400 mt-1 max-w-md mx-auto">
            {validation.errors.length > 0
              ? validation.errors.join(' ')
              : 'Please execute a field selection, filter, or multi-file join first to generate a final result.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToModify}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Selection / Join Module</span>
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = (format: ExportFormat) => {
    setSelectedFormat(format);
    setExportStatus('preparing');
    setStatusMessage(`Preparing ${format.toUpperCase()} export...`);

    // Give browser a tick to render preparing state without blocking UI
    setTimeout(() => {
      try {
        setExportStatus('downloading');
        setStatusMessage(`Download started for ${formatFullFileName(customBaseName, format)}`);

        const result = executeExport(dataset, format, customBaseName);

        if (result.success) {
          setExportStatus('completed');
          setLastDownloadedFile(result.fileName);
          setStatusMessage(`Successfully exported ${result.fileName}`);
        } else {
          setExportStatus('error');
          setStatusMessage(result.error || 'Export failed.');
        }
      } catch (err: any) {
        setExportStatus('error');
        setStatusMessage(err?.message || 'Export failed unexpectedly.');
      }
    }, 120);
  };

  const previewFileName = formatFullFileName(customBaseName, selectedFormat);

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onBackToPreview}
              className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Preview</span>
            </button>
            <h3 className="font-bold text-base text-slate-100">
              Export Center
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-semibold">
              {dataset.sourceType === 'join' ? 'Joined Result' : 'Filtered Selection'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Export the final generated dataset deterministically without internal metadata or source mutation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBackToModify}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700 transition-colors font-medium"
          >
            <span>Back to Modify</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Summary & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: EXPORT SUMMARY */}
        <div className="lg:col-span-2 space-y-5">
          {/* EXPORT SUMMARY PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wide font-mono">
                  EXPORT SUMMARY
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {dataset.rows.length.toLocaleString()} rows • {dataset.columns.length} columns
              </span>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Total Rows</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {dataset.rows.length.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Total Columns</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                  {dataset.columns.length}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Active Target</div>
                <div className="text-lg font-bold font-mono text-slate-100 uppercase mt-0.5">
                  {selectedFormat}
                </div>
              </div>
            </div>

            {/* Exact Column Sequence List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Exported Columns (Preserves Exact Sequence):
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  No alphabetical reordering
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[160px] overflow-y-auto divide-y divide-slate-800/60">
                {dataset.columns.map((col, idx) => (
                  <div
                    key={col}
                    className="py-1.5 px-2 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 w-4">{idx + 1}.</span>
                      <span className="text-slate-200 font-medium">{col}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">raw value preserved</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings if any */}
            {validation.warnings.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg space-y-1">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-center space-x-2 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick First 5 Rows Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Table className="w-3.5 h-3.5 text-cyan-400" />
                <span>Payload Sample (First {Math.min(5, dataset.rows.length)} Records)</span>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Showing exactly what will be written to disk
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 sticky top-0">
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2 px-3 w-10 text-center border-r border-slate-800">#</th>
                    {dataset.columns.map((c) => (
                      <th key={c} className="py-2 px-3 whitespace-nowrap text-slate-200">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {dataset.rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30">
                      <td className="py-1.5 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/60 bg-slate-950/40">
                        {rIdx + 1}
                      </td>
                      {dataset.columns.map((c) => {
                        const val = row[c];
                        const isNull = val === null || val === undefined || String(val).trim() === '';
                        return (
                          <td key={c} className="py-1.5 px-3 whitespace-nowrap truncate max-w-[200px]">
                            {isNull ? (
                              <span className="text-slate-600 font-mono italic text-[11px]">&lt;null&gt;</span>
                            ) : typeof val === 'number' ? (
                              <span className="font-mono text-cyan-200">{val}</span>
                            ) : typeof val === 'boolean' ? (
                              <span className="font-mono text-emerald-300">{val ? 'true' : 'false'}</span>
                            ) : (
                              <span className="text-slate-300">{String(val)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: DOWNLOAD ACTIONS & CONTROLS */}
        <div className="space-y-5">
          {/* File Name Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider font-mono">
              Export File Naming
            </h4>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Base Filename:</label>
              <input
                type="text"
                value={customBaseName}
                onChange={(e) => setCustomBaseName(e.target.value)}
                placeholder="dataforge_export"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Illegal filesystem characters are stripped automatically.
              </p>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
              <span className="text-slate-500 text-[10px] block uppercase">Resulting Filename:</span>
              <span className="text-cyan-400 font-medium truncate block mt-0.5">
                {previewFileName}
              </span>
            </div>
          </div>

          {/* Download Action Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider font-mono">
              Download Actions
            </h4>

            {/* Option 1: Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => handleDownload('xlsx')}
              disabled={exportStatus === 'preparing' || exportStatus === 'downloading'}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-emerald-800/80 hover:border-emerald-600 transition-all text-left group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-100 font-mono">
                    Download Excel (.xlsx)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Single workbook with formatted columns & raw numeric values
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-400 shrink-0 ml-2 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Option 2: CSV (.csv) */}
            <button
              type="button"
              onClick={() => handleDownload('csv')}
              disabled={exportStatus === 'preparing' || exportStatus === 'downloading'}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-cyan-800/80 hover:border-cyan-600 transition-all text-left group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-100 font-mono">
                    Download CSV (.csv)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    RFC 4180 compliant with UTF-8 BOM encoding
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-cyan-400 shrink-0 ml-2 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Live Status Indicator */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-2 text-xs">
                {exportStatus === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : exportStatus === 'preparing' || exportStatus === 'downloading' ? (
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />
                ) : exportStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span
                  className={`text-[11px] font-mono leading-tight ${
                    exportStatus === 'completed'
                      ? 'text-emerald-300 font-medium'
                      : exportStatus === 'error'
                      ? 'text-rose-300'
                      : exportStatus === 'preparing' || exportStatus === 'downloading'
                      ? 'text-cyan-300'
                      : 'text-slate-400'
                  }`}
                >
                  {statusMessage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
