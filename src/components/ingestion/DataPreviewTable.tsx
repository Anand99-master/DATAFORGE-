/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataPreviewTable Component
 * Displays records of the active dataset with horizontal scrolling,
 * deterministic pagination, row indexing, and clean null handling.
 */

import React, { useState, useMemo } from 'react';
import { SheetDataset } from '../../core/types';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
} from 'lucide-react';

interface DataPreviewTableProps {
  dataset: SheetDataset | null;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({ dataset }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 whenever the dataset changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dataset?.id]);

  if (!dataset) return null;

  const totalRows = dataset.rowCount;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Safe pagination slice
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataset.rows.slice(startIndex, startIndex + pageSize);
  }, [dataset.rows, currentPage, pageSize]);

  const startRowIndex = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRowIndex = Math.min(currentPage * pageSize, totalRows);

  const getColIcon = (colName: string) => {
    const col = dataset.columns.find((c) => c.name === colName);
    switch (col?.inferredType) {
      case 'number':
        return <Hash className="w-3 h-3 text-blue-400 shrink-0" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-amber-400 shrink-0" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-emerald-400 shrink-0" />;
      default:
        return <Type className="w-3 h-3 text-purple-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            Raw Data Preview ({dataset.rowCount.toLocaleString()} rows × {dataset.columnCount} columns)
          </h3>
        </div>

        {/* Page size selector */}
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

      {/* Table Container with horizontal scrolling */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm shadow-sm">
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800/80 bg-slate-950">
                #
              </th>
              {dataset.columns.map((col) => (
                <th
                  key={col.name}
                  className="py-2.5 px-4 font-semibold whitespace-nowrap min-w-[140px] text-slate-200"
                >
                  <div className="flex items-center space-x-1.5">
                    {getColIcon(col.name)}
                    <span className="font-mono">{col.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={dataset.columns.length + 1}
                  className="py-12 text-center text-slate-500"
                >
                  This worksheet contains no records.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalRowNumber = (currentPage - 1) * pageSize + rowIdx + 1;
                return (
                  <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/60 bg-slate-950/40">
                      {globalRowNumber}
                    </td>
                    {dataset.columns.map((col) => {
                      const val = row[col.name];
                      const isNull = val === null || val === undefined || String(val).trim() === '';

                      return (
                        <td
                          key={col.name}
                          className="py-2 px-4 whitespace-nowrap max-w-[250px] truncate"
                          title={!isNull ? String(val) : '<empty>'}
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
                          ) : col.inferredType === 'number' ? (
                            <span className="font-mono text-cyan-200">
                              {String(val)}
                            </span>
                          ) : (
                            <span className="text-slate-300">
                              {String(val)}
                            </span>
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
  );
};
