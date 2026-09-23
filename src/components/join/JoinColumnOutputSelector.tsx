/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinColumnOutputSelector Component
 * Allows user to pick, reorder, and search projected columns from
 * both Primary and Secondary datasets with provenance badges.
 */

import React, { useState, useMemo } from 'react';
import { SheetDataset } from '../../core/types';
import { JoinColumnSelection } from '../../core/engine/join/joinTypes';
import {
  Columns,
  Search,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
} from 'lucide-react';

interface JoinColumnOutputSelectorProps {
  primaryDataset: SheetDataset;
  secondaryDataset: SheetDataset;
  selectedColumns: JoinColumnSelection[];
  onChangeSelectedColumns: (cols: JoinColumnSelection[]) => void;
}

export const JoinColumnOutputSelector: React.FC<JoinColumnOutputSelectorProps> = ({
  primaryDataset,
  secondaryDataset,
  selectedColumns,
  onChangeSelectedColumns,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'secondary'>('all');

  // All candidate columns available from both datasets
  const allCandidateColumns: JoinColumnSelection[] = useMemo(() => {
    const list: JoinColumnSelection[] = [];

    primaryDataset.columns.forEach((c) => {
      list.push({
        datasetId: primaryDataset.id,
        column: c.name,
        outputName: c.name,
        origin: 'primary',
        inferredType: c.inferredType,
      });
    });

    secondaryDataset.columns.forEach((c) => {
      list.push({
        datasetId: secondaryDataset.id,
        column: c.name,
        outputName: c.name,
        origin: 'secondary',
        inferredType: c.inferredType,
      });
    });

    return list;
  }, [primaryDataset, secondaryDataset]);

  // Check if candidate is currently selected
  const isCandidateSelected = (cand: JoinColumnSelection) => {
    return selectedColumns.some(
      (s) => s.datasetId === cand.datasetId && s.column === cand.column
    );
  };

  // Toggle single candidate
  const toggleCandidate = (cand: JoinColumnSelection) => {
    const exists = isCandidateSelected(cand);
    if (exists) {
      onChangeSelectedColumns(
        selectedColumns.filter(
          (s) => !(s.datasetId === cand.datasetId && s.column === cand.column)
        )
      );
    } else {
      onChangeSelectedColumns([...selectedColumns, cand]);
    }
  };

  // Select all visible candidates
  const handleSelectAll = () => {
    onChangeSelectedColumns([...allCandidateColumns]);
  };

  // Clear all
  const handleClearAll = () => {
    onChangeSelectedColumns([]);
  };

  // Move column up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...selectedColumns];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeSelectedColumns(updated);
  };

  // Move column down
  const handleMoveDown = (index: number) => {
    if (index >= selectedColumns.length - 1) return;
    const updated = [...selectedColumns];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeSelectedColumns(updated);
  };

  // Filter candidates
  const filteredCandidates = allCandidateColumns.filter((cand) => {
    const matchesSearch =
      cand.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.origin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'primary'
        ? cand.origin === 'primary'
        : cand.origin === 'secondary';
    return matchesSearch && matchesTab;
  });

  // Detect duplicate column names across selected
  const nameCounts = new Map<string, number>();
  selectedColumns.forEach((c) => {
    nameCounts.set(c.column, (nameCounts.get(c.column) ?? 0) + 1);
  });
  const hasDuplicateNames = Array.from(nameCounts.values()).some((v) => v > 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Columns className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            5. Select Output Columns & Ordering
          </h3>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
            {selectedColumns.length} of {allCandidateColumns.length} selected
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {hasDuplicateNames && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center space-x-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Identical column names detected across datasets. DataForge will automatically disambiguate them (e.g. <code>Pri_City</code> and <code>Sec_City</code>) to prevent silent data loss.
          </span>
        </div>
      )}

      {/* Two-panel Grid: Available Candidate Columns on Left, Selected Order on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: CANDIDATE COLUMNS CHECKLIST */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded ${
                  activeTab === 'all' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('primary')}
                className={`px-2 py-0.5 rounded ${
                  activeTab === 'primary' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Primary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('secondary')}
                className={`px-2 py-0.5 rounded ${
                  activeTab === 'secondary' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Secondary
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-[200px]">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-950/60 max-h-[300px] overflow-y-auto divide-y divide-slate-800/60">
            {filteredCandidates.map((cand) => {
              const checked = isCandidateSelected(cand);
              const isPri = cand.origin === 'primary';
              return (
                <div
                  key={`${cand.datasetId}_${cand.column}`}
                  onClick={() => toggleCandidate(cand)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    checked
                      ? isPri
                        ? 'bg-cyan-950/30 text-cyan-200'
                        : 'bg-emerald-950/30 text-emerald-200'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCandidate(cand)}
                      className={`accent-cyan-500`}
                    />
                    <span className="font-mono text-xs truncate">{cand.column}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isPri
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {isPri ? primaryDataset.fileName : secondaryDataset.fileName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                      {cand.inferredType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: OUTPUT ORDER MANAGER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">
              Output Sequence ({selectedColumns.length} fields)
            </span>
            <span className="text-[11px] font-mono">Use arrows to rearrange</span>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-950/60 max-h-[300px] overflow-y-auto divide-y divide-slate-800/60">
            {selectedColumns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                No columns selected. Please check at least one column on the left.
              </div>
            ) : (
              selectedColumns.map((col, idx) => {
                const isPri = col.origin === 'primary';
                return (
                  <div
                    key={`${col.datasetId}_${col.column}_${idx}`}
                    className="p-2 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-5 text-center font-mono text-[11px] text-slate-500">
                        {idx + 1}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPri ? 'bg-cyan-400' : 'bg-emerald-400'
                        }`}
                      />
                      <span className="font-mono text-xs text-slate-200 truncate font-medium">
                        {col.column}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({isPri ? 'Primary' : 'Secondary'})
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedColumns.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
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
