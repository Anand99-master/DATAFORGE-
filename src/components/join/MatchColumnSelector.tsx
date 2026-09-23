/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MatchColumnSelector Component
 * Side-by-side matching column selector with visual relational connector.
 * Prohibits silent relationship deduction; requires explicit user selection.
 */

import React from 'react';
import { SheetDataset, SupportedDataType } from '../../core/types';
import { Link2, Hash, Type, Calendar, ToggleLeft, ArrowRightLeft } from 'lucide-react';

interface MatchColumnSelectorProps {
  primaryDataset: SheetDataset;
  secondaryDataset: SheetDataset;
  primaryKey: string;
  secondaryKey: string;
  onChangePrimaryKey: (colName: string) => void;
  onChangeSecondaryKey: (colName: string) => void;
}

export const MatchColumnSelector: React.FC<MatchColumnSelectorProps> = ({
  primaryDataset,
  secondaryDataset,
  primaryKey,
  secondaryKey,
  onChangePrimaryKey,
  onChangeSecondaryKey,
}) => {
  const getTypeIcon = (type: SupportedDataType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3 text-blue-400" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-amber-400" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-emerald-400" />;
      default:
        return <Type className="w-3 h-3 text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            2. Select Matching Columns (Join Key)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Click a column on each side to establish the explicit match condition
        </span>
      </div>

      {/* Visual Relationship Link Bar */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono shadow-inner">
        <div className="flex items-center space-x-2 text-cyan-300">
          <span className="text-slate-500">{primaryDataset.fileName}:</span>
          <span className="font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            {primaryKey || 'Select Primary Key'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-slate-500">
          <span className="hidden sm:inline">────────</span>
          <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="hidden sm:inline">────────</span>
        </div>

        <div className="flex items-center space-x-2 text-emerald-300">
          <span className="text-slate-500">{secondaryDataset.fileName}:</span>
          <span className="font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            {secondaryKey || 'Select Secondary Key'}
          </span>
        </div>
      </div>

      {/* Side-by-Side Column Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PRIMARY COLUMNS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-cyan-300">
              Primary: {primaryDataset.fileName}
            </span>
            <span className="font-mono text-[11px]">{primaryDataset.columns.length} columns</span>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-950/60 max-h-[280px] overflow-y-auto divide-y divide-slate-800/60">
            {primaryDataset.columns.map((col) => {
              const isSelected = col.name === primaryKey;
              return (
                <div
                  key={col.id}
                  onClick={() => onChangePrimaryKey(col.name)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 text-cyan-200 border-l-4 border-cyan-400'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="radio"
                      name="primaryJoinKey"
                      checked={isSelected}
                      onChange={() => onChangePrimaryKey(col.name)}
                      className="accent-cyan-500"
                    />
                    <span className="font-mono text-xs truncate font-medium">{col.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {getTypeIcon(col.inferredType)}
                      <span>{col.inferredType}</span>
                    </span>
                    {col.nullPercentage > 0 && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1 rounded">
                        {col.nullPercentage}% null
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECONDARY COLUMNS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-300">
              Secondary: {secondaryDataset.fileName}
            </span>
            <span className="font-mono text-[11px]">{secondaryDataset.columns.length} columns</span>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-950/60 max-h-[280px] overflow-y-auto divide-y divide-slate-800/60">
            {secondaryDataset.columns.map((col) => {
              const isSelected = col.name === secondaryKey;
              return (
                <div
                  key={col.id}
                  onClick={() => onChangeSecondaryKey(col.name)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/40 text-emerald-200 border-l-4 border-emerald-400'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="radio"
                      name="secondaryJoinKey"
                      checked={isSelected}
                      onChange={() => onChangeSecondaryKey(col.name)}
                      className="accent-emerald-500"
                    />
                    <span className="font-mono text-xs truncate font-medium">{col.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {getTypeIcon(col.inferredType)}
                      <span>{col.inferredType}</span>
                    </span>
                    {col.nullPercentage > 0 && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1 rounded">
                        {col.nullPercentage}% null
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
