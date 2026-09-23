/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FieldSelector Component
 * Allows selecting and reordering specific fields from the active dataset.
 * Supports search, select all/clear all, live selection counter, and field reordering.
 */

import React, { useState } from 'react';
import { SheetDataset, SupportedDataType } from '../../core/types';
import {
  Search,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  X,
  ListOrdered,
} from 'lucide-react';

interface FieldSelectorProps {
  dataset: SheetDataset;
  selectedColumns: string[];
  onChangeSelectedColumns: (columns: string[]) => void;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  dataset,
  selectedColumns,
  onChangeSelectedColumns,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = dataset.columns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (colName: string) => selectedColumns.includes(colName);

  const toggleColumn = (colName: string) => {
    if (isSelected(colName)) {
      onChangeSelectedColumns(selectedColumns.filter((c) => c !== colName));
    } else {
      onChangeSelectedColumns([...selectedColumns, colName]);
    }
  };

  const handleSelectAll = () => {
    // Preserve existing order of already selected, then append unselected in dataset order
    const allColNames = dataset.columns.map((c) => c.name);
    onChangeSelectedColumns(allColNames);
  };

  const handleClearAll = () => {
    onChangeSelectedColumns([]);
  };

  // Reorder functions
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...selectedColumns];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeSelectedColumns(updated);
  };

  const moveDown = (index: number) => {
    if (index === selectedColumns.length - 1) return;
    const updated = [...selectedColumns];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeSelectedColumns(updated);
  };

  const removeColumn = (colName: string) => {
    onChangeSelectedColumns(selectedColumns.filter((c) => c !== colName));
  };

  const getTypeIcon = (type: SupportedDataType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-blue-400" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Type className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-sm text-slate-100">
              2. Select Fields / Columns
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
              {selectedColumns.length} of {dataset.columns.length} fields selected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pick the exact columns needed in the final extracted dataset.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700 font-medium"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs rounded-lg transition-colors border border-slate-700 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column Picker + Right Column Reorder List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Available Columns List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Available Columns ({dataset.columns.length})
            </span>

            {/* Search Filter */}
            <div className="relative w-48">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fields..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-[360px] overflow-y-auto divide-y divide-slate-800/60">
            {filteredColumns.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No columns match "{searchTerm}".
              </div>
            ) : (
              filteredColumns.map((col) => {
                const active = isSelected(col.name);
                const sampleVal = col.samples.length > 0 ? String(col.samples[0]) : '';

                return (
                  <div
                    key={col.id}
                    onClick={() => toggleColumn(col.name)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      active
                        ? 'bg-cyan-950/20 hover:bg-cyan-950/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-cyan-400 shrink-0">
                        {active ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono text-xs font-medium truncate ${
                              active ? 'text-cyan-200' : 'text-slate-300'
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>
                        {sampleVal && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            Sample: <span className="font-mono text-slate-400">{sampleVal}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 ml-3">
                      <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {getTypeIcon(col.inferredType)}
                        <span>{col.inferredType}</span>
                      </span>

                      {col.nullPercentage > 0 && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/60">
                          {col.nullPercentage}% null
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Column Order Manager */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
              <span>Output Field Order ({selectedColumns.length})</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Controls preview columns
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 min-h-[360px] max-h-[360px] overflow-y-auto space-y-1.5">
            {selectedColumns.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 space-y-2">
                <ListOrdered className="w-6 h-6 text-slate-700" />
                <p>No fields selected yet.</p>
                <p className="text-[11px] text-slate-600">
                  Select fields from the left to arrange their output order.
                </p>
              </div>
            ) : (
              selectedColumns.map((colName, index) => {
                const colMeta = dataset.columns.find((c) => c.name === colName);
                return (
                  <div
                    key={colName}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-5 text-center font-mono text-[11px] text-slate-500 font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-mono text-xs text-slate-200 truncate">
                        {colName}
                      </span>
                      {colMeta && (
                        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                          ({colMeta.inferredType})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition-colors rounded hover:bg-slate-800"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === selectedColumns.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-cyan-300 disabled:opacity-20 transition-colors rounded hover:bg-slate-800"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeColumn(colName)}
                        title="Deselect Field"
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-slate-800 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
