/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ColumnInspector Component
 * Deterministic schema & column inspector. Shows column names,
 * inferred data types, non-null & null counts, null percentages,
 * unique cardinality, and concrete sample values.
 */

import React, { useState } from 'react';
import { ColumnMetadata, SupportedDataType } from '../../core/types';
import {
  Search,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface ColumnInspectorProps {
  columns: ColumnMetadata[];
  rowCount: number;
}

export const ColumnInspector: React.FC<ColumnInspectorProps> = ({ columns, rowCount }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: SupportedDataType) => {
    switch (type) {
      case 'number':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800">
            <Hash className="w-3 h-3 text-blue-400" />
            <span>number</span>
          </span>
        );
      case 'date':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>date</span>
          </span>
        );
      case 'boolean':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">
            <ToggleLeft className="w-3 h-3 text-emerald-400" />
            <span>boolean</span>
          </span>
        );
      case 'string':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-800">
            <Type className="w-3 h-3 text-purple-400" />
            <span>string</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-sm text-slate-100">
              Deterministic Column Schema ({columns.length} columns)
            </h3>
            <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/80">
              <ShieldCheck className="w-3 h-3" />
              <span>Deterministic Profiling</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data types inferred using strict type-coercion algorithms. Zero AI heuristics.
          </p>
        </div>

        {/* Column search filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search column names..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Columns Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono">
              <th className="py-2.5 px-3 font-medium w-12 text-center">#</th>
              <th className="py-2.5 px-4 font-medium min-w-[160px]">Column Name</th>
              <th className="py-2.5 px-4 font-medium min-w-[110px]">Inferred Type</th>
              <th className="py-2.5 px-4 font-medium min-w-[100px] text-right">Non-Null</th>
              <th className="py-2.5 px-4 font-medium min-w-[130px]">Null Count & %</th>
              <th className="py-2.5 px-4 font-medium min-w-[90px] text-right">Unique</th>
              <th className="py-2.5 px-4 font-medium min-w-[280px]">Sample Values</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredColumns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No columns match your search "{searchTerm}".
                </td>
              </tr>
            ) : (
              filteredColumns.map((col, idx) => (
                <tr key={col.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-200">
                    <span className="font-mono">{col.name}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    {getTypeBadge(col.inferredType)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                    {col.nonNullCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-slate-400 text-[11px] w-12 text-right">
                        {col.nullCount.toLocaleString()} ({col.nullPercentage}%)
                      </span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            col.nullPercentage > 50
                              ? 'bg-rose-500'
                              : col.nullPercentage > 10
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${col.nullPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                    {col.uniqueCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {col.samples.length > 0 ? (
                        col.samples.map((sample, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-block px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 text-[10px] font-mono border border-slate-800 truncate max-w-[140px]"
                            title={String(sample)}
                          >
                            {String(sample)}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600 italic text-[11px]">No sample data</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
