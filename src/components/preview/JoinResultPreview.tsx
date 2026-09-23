/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinResultPreview Component
 * Displays the joined dataset preview with telemetry:
 * Primary rows, Secondary rows, Matching rows, Unmatched primary, Unmatched secondary,
 * and column origin badges with full pagination.
 */

import React, { useState, useMemo } from 'react';
import { JoinExecutionResult } from '../../core/engine/join/joinTypes';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Columns,
  Table,
  GitMerge,
  Split,
  Download,
  ArrowRight,
} from 'lucide-react';

interface JoinResultPreviewProps {
  result: JoinExecutionResult;
  primaryDatasetName: string;
  secondaryDatasetName: string;
  joinType: string;
  onBackToJoin: () => void;
  onProceedToExport?: () => void;
}

export const JoinResultPreview: React.FC<JoinResultPreviewProps> = ({
  result,
  primaryDatasetName,
  secondaryDatasetName,
  joinType,
  onBackToJoin,
  onProceedToExport,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalRows = result.rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return result.rows.slice(startIndex, startIndex + pageSize);
  }, [result.rows, currentPage, pageSize]);

  const startRowIndex = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRowIndex = Math.min(currentPage * pageSize, totalRows);

  const stats = result.stats;

  return (
    <div className="space-y-5">
      {/* Header & Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onBackToJoin}
              className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Join</span>
            </button>
            <h3 className="font-bold text-base text-slate-100">
              Join Preview: {primaryDatasetName} ⋈ {secondaryDatasetName}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-semibold">
              {joinType} JOIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic relational merge completed in {stats.executionTimeMs}ms.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center space-x-2 font-mono text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              <strong className="text-emerald-400 font-bold">{totalRows.toLocaleString()}</strong> result rows
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center space-x-1.5 font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{stats.executionTimeMs}ms</span>
          </div>

          {onProceedToExport && (
            <button
              type="button"
              onClick={onProceedToExport}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Result</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Join Telemetry Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Primary Rows</div>
          <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
            {stats.primaryRowCount.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Secondary Rows</div>
          <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
            {stats.secondaryRowCount.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Matching Matches</div>
          <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
            {stats.matchingRowCount.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Unmatched Primary</div>
          <div className="text-base font-bold font-mono text-slate-300 mt-0.5">
            {stats.unmatchedPrimaryCount.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Unmatched Secondary</div>
          <div className="text-base font-bold font-mono text-slate-300 mt-0.5">
            {stats.unmatchedSecondaryCount.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-cyan-800/80 rounded-xl text-center bg-cyan-950/20">
          <div className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">Total Output Rows</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
            {stats.totalOutputRows.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Table Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span className="flex items-center space-x-1 font-mono text-slate-300">
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>{result.columns.length} columns</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1 font-mono text-slate-300">
              <Table className="w-3.5 h-3.5 text-blue-400" />
              <span>{totalRows.toLocaleString()} total records</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800/80 bg-slate-950">
                  #
                </th>
                {result.columns.map((colName) => {
                  const originInfo = result.columnOrigins.find((o) => o.name === colName);
                  const isPri = originInfo?.origin === 'primary';
                  return (
                    <th
                      key={colName}
                      className="py-2 px-4 whitespace-nowrap min-w-[150px] text-slate-200"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold">{colName}</span>
                        {originInfo && (
                          <span
                            className={`text-[9px] font-mono mt-0.5 truncate max-w-[140px] ${
                              isPri ? 'text-cyan-400' : 'text-emerald-400'
                            }`}
                          >
                            [{originInfo.sourceDatasetName}]
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={result.columns.length + 1}
                    className="py-12 text-center text-slate-500"
                  >
                    No rows resulted from this join. Check match keys or join type.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => {
                  const globalIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                  return (
                    <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/60 bg-slate-950/40">
                        {globalIndex}
                      </td>
                      {result.columns.map((colName) => {
                        const val = row[colName];
                        const isNull = val === null || val === undefined || String(val).trim() === '';

                        return (
                          <td
                            key={colName}
                            className="py-2 px-4 whitespace-nowrap max-w-[280px] truncate"
                            title={!isNull ? String(val) : '<null>'}
                          >
                            {isNull ? (
                              <span className="text-slate-600 font-mono text-[11px] italic">
                                &lt;null&gt;
                              </span>
                            ) : typeof val === 'boolean' ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${
                                  val
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                }`}
                              >
                                {val ? 'true' : 'false'}
                              </span>
                            ) : typeof val === 'number' ? (
                              <span className="font-mono text-cyan-200">
                                {val.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-300">{String(val)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div>
            Showing records <span className="font-mono text-slate-200 font-medium">{startRowIndex}</span> to{' '}
            <span className="font-mono text-slate-200 font-medium">{endRowIndex}</span> of{' '}
            <span className="font-mono text-slate-200 font-medium">{totalRows.toLocaleString()}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
