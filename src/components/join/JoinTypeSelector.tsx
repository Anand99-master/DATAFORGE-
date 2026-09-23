/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinTypeSelector Component
 * Visual interactive selector for INNER, LEFT, RIGHT, and FULL OUTER joins
 * with clear Venn-diagram illustrations and behavioral descriptions.
 */

import React from 'react';
import { JoinType } from '../../core/types';
import { GitMerge } from 'lucide-react';

interface JoinTypeSelectorProps {
  selectedType: JoinType;
  onChangeJoinType: (type: JoinType) => void;
  primaryName: string;
  secondaryName: string;
}

export const JoinTypeSelector: React.FC<JoinTypeSelectorProps> = ({
  selectedType,
  onChangeJoinType,
  primaryName,
  secondaryName,
}) => {
  const joinOptions: {
    type: JoinType;
    title: string;
    description: string;
    diagram: React.ReactNode;
  }[] = [
    {
      type: 'inner',
      title: 'INNER JOIN',
      description: 'Only records with matching keys in BOTH datasets.',
      diagram: (
        <svg className="w-12 h-7" viewBox="0 0 60 36">
          <circle cx="20" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="2" />
          <circle cx="40" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="2" />
          {/* Intersection fill */}
          <path
            d="M 30,7.5 A 14,14 0 0,0 20,18 A 14,14 0 0,0 30,28.5 A 14,14 0 0,0 40,18 A 14,14 0 0,0 30,7.5"
            fill="#22d3ee"
            opacity="0.9"
          />
        </svg>
      ),
    },
    {
      type: 'left',
      title: 'LEFT JOIN',
      description: `All records from ${primaryName}, plus matches from ${secondaryName}.`,
      diagram: (
        <svg className="w-12 h-7" viewBox="0 0 60 36">
          <circle cx="20" cy="18" r="14" fill="#22d3ee" opacity="0.8" stroke="#22d3ee" strokeWidth="2" />
          <circle cx="40" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="2" />
        </svg>
      ),
    },
    {
      type: 'right',
      title: 'RIGHT JOIN',
      description: `All records from ${secondaryName}, plus matches from ${primaryName}.`,
      diagram: (
        <svg className="w-12 h-7" viewBox="0 0 60 36">
          <circle cx="20" cy="18" r="14" fill="none" stroke="#64748b" strokeWidth="2" />
          <circle cx="40" cy="18" r="14" fill="#10b981" opacity="0.8" stroke="#10b981" strokeWidth="2" />
        </svg>
      ),
    },
    {
      type: 'full',
      title: 'FULL OUTER JOIN',
      description: 'All records from both datasets, filling unmatched sides with null.',
      diagram: (
        <svg className="w-12 h-7" viewBox="0 0 60 36">
          <circle cx="20" cy="18" r="14" fill="#22d3ee" opacity="0.6" stroke="#22d3ee" strokeWidth="2" />
          <circle cx="40" cy="18" r="14" fill="#10b981" opacity="0.6" stroke="#10b981" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitMerge className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            3. Choose Join Type
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono uppercase">
          Current: {selectedType.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {joinOptions.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <div
              key={opt.type}
              onClick={() => onChangeJoinType(opt.type)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-950 border-cyan-400 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs text-slate-100 font-mono">
                    {opt.title}
                  </div>
                  <div className="shrink-0">{opt.diagram}</div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {isSelected ? 'Active Selection' : 'Click to select'}
                </span>
                <input
                  type="radio"
                  name="joinTypeOption"
                  checked={isSelected}
                  onChange={() => onChangeJoinType(opt.type)}
                  className="accent-cyan-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
