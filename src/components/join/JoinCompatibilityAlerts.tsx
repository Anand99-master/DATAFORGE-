/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinCompatibilityAlerts Component
 * Displays real-time deterministic audits of join keys:
 * type compatibility, null frequencies, duplicate keys, and relationship cardinality.
 */

import React from 'react';
import { JoinValidationResult } from '../../core/engine/join/joinTypes';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
  Split,
  KeyRound,
} from 'lucide-react';

interface JoinCompatibilityAlertsProps {
  validation: JoinValidationResult;
  primaryKeyName: string;
  secondaryKeyName: string;
}

export const JoinCompatibilityAlerts: React.FC<JoinCompatibilityAlertsProps> = ({
  validation,
  primaryKeyName,
  secondaryKeyName,
}) => {
  const getCardinalityBadge = (card: string) => {
    switch (card) {
      case 'one-to-one':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            1 : 1 (One-to-One)
          </span>
        );
      case 'one-to-many':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800">
            1 : N (One-to-Many)
          </span>
        );
      case 'many-to-one':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-950 text-blue-300 border border-blue-800">
            N : 1 (Many-to-One)
          </span>
        );
      case 'many-to-many':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            M : N (Many-to-Many)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            Undetermined
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            4. Deterministic Compatibility Audit
          </h3>
        </div>
        <div>{getCardinalityBadge(validation.cardinality)}</div>
      </div>

      {/* 4 Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Type Compatibility */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Type Parity</div>
          <div className="mt-1 flex items-center space-x-1.5 font-medium">
            {validation.typeMismatch ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300 text-[11px] truncate">
                  {validation.primaryInferredType} ↔ {validation.secondaryInferredType}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-mono text-[11px]">
                  {validation.primaryInferredType || 'Exact Match'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metric 2: Primary Nulls */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Primary Null Keys</div>
          <div className="mt-1 font-mono text-[11px]">
            {validation.primaryNullCount > 0 ? (
              <span className="text-amber-400 font-semibold">
                {validation.primaryNullCount.toLocaleString()} nulls
              </span>
            ) : (
              <span className="text-emerald-400">0 nulls</span>
            )}
          </div>
        </div>

        {/* Metric 3: Secondary Nulls */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Secondary Null Keys</div>
          <div className="mt-1 font-mono text-[11px]">
            {validation.secondaryNullCount > 0 ? (
              <span className="text-amber-400 font-semibold">
                {validation.secondaryNullCount.toLocaleString()} nulls
              </span>
            ) : (
              <span className="text-emerald-400">0 nulls</span>
            )}
          </div>
        </div>

        {/* Metric 4: Estimated Overlapping Keys */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Matching Key Values</div>
          <div className="mt-1 font-mono text-[11px]">
            <span className="text-cyan-400 font-bold">
              {validation.estimatedMatchingKeys.toLocaleString()} keys
            </span>
          </div>
        </div>
      </div>

      {/* Errors (Block Execution) */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg space-y-1">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings (Informational, do not block) */}
      {validation.warnings.length > 0 && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg space-y-1.5">
          {validation.warnings.map((warn, i) => (
            <div key={i} className="flex items-start space-x-2 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
