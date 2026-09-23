/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JoinWorkspace Component
 * Cohesive multi-file match & join orchestrator bringing together
 * dataset pair selection, column matching, type audits, output projections,
 * and deterministic execution.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SheetDataset, SourceFile, JoinType } from '../../core/types';
import {
  JoinConfig,
  JoinColumnSelection,
  JoinExecutionResult,
} from '../../core/engine/join/joinTypes';
import { validateJoinConfiguration } from '../../core/engine/join/joinValidator';
import { executeJoin } from '../../core/engine/join/joinEngine';
import { DatasetPairSelector } from './DatasetPairSelector';
import { MatchColumnSelector } from './MatchColumnSelector';
import { JoinTypeSelector } from './JoinTypeSelector';
import { JoinCompatibilityAlerts } from './JoinCompatibilityAlerts';
import { JoinColumnOutputSelector } from './JoinColumnOutputSelector';
import { JoinSummaryAndStats } from './JoinSummaryAndStats';
import { GitMerge, Database, AlertCircle, ArrowDown } from 'lucide-react';

interface JoinWorkspaceProps {
  files: SourceFile[];
  onJoinComplete: (result: JoinExecutionResult, primaryName: string, secondaryName: string, joinType: JoinType) => void;
}

export const JoinWorkspace: React.FC<JoinWorkspaceProps> = ({
  files,
  onJoinComplete,
}) => {
  // Collect all valid datasets
  const allDatasets = useMemo(() => {
    const list: SheetDataset[] = [];
    files.forEach((file) => {
      if (file.status === 'ready' && file.sheets) {
        file.sheets.forEach((sheet) => {
          list.push(sheet);
        });
      }
    });
    return list;
  }, [files]);

  // Selected dataset IDs
  const [primaryDatasetId, setPrimaryDatasetId] = useState<string | null>(null);
  const [secondaryDatasetId, setSecondaryDatasetId] = useState<string | null>(null);

  // Matching keys
  const [primaryKey, setPrimaryKey] = useState<string>('');
  const [secondaryKey, setSecondaryKey] = useState<string>('');

  // Join Type
  const [joinType, setJoinType] = useState<JoinType>('inner');

  // Selected output columns
  const [selectedColumns, setSelectedColumns] = useState<JoinColumnSelection[]>([]);

  // Default selection if datasets exist
  useEffect(() => {
    if (allDatasets.length >= 2) {
      if (!primaryDatasetId) setPrimaryDatasetId(allDatasets[0].id);
      if (!secondaryDatasetId) setSecondaryDatasetId(allDatasets[1].id);
    } else if (allDatasets.length === 1 && !primaryDatasetId) {
      setPrimaryDatasetId(allDatasets[0].id);
    }
  }, [allDatasets, primaryDatasetId, secondaryDatasetId]);

  const primaryDataset = allDatasets.find((d) => d.id === primaryDatasetId) ?? null;
  const secondaryDataset = allDatasets.find((d) => d.id === secondaryDatasetId) ?? null;

  // Auto-initialize matching keys and output columns when datasets are selected
  useEffect(() => {
    if (primaryDataset && secondaryDataset) {
      // If primaryKey not set or invalid, pick first column
      if (!primaryKey || !primaryDataset.columns.some((c) => c.name === primaryKey)) {
        // Try to find a column with matching name or ID in secondary
        const commonCol = primaryDataset.columns.find((pc) =>
          secondaryDataset.columns.some((sc) => sc.name.toLowerCase() === pc.name.toLowerCase())
        );
        if (commonCol) {
          setPrimaryKey(commonCol.name);
          const matchSec = secondaryDataset.columns.find(
            (sc) => sc.name.toLowerCase() === commonCol.name.toLowerCase()
          );
          setSecondaryKey(matchSec ? matchSec.name : secondaryDataset.columns[0]?.name ?? '');
        } else {
          setPrimaryKey(primaryDataset.columns[0]?.name ?? '');
          setSecondaryKey(secondaryDataset.columns[0]?.name ?? '');
        }
      }

      // Initialize default output columns (all columns from both datasets)
      if (selectedColumns.length === 0) {
        const defaultOutputs: JoinColumnSelection[] = [
          ...primaryDataset.columns.map((c) => ({
            datasetId: primaryDataset.id,
            column: c.name,
            outputName: c.name,
            origin: 'primary' as const,
            inferredType: c.inferredType,
          })),
          ...secondaryDataset.columns.map((c) => ({
            datasetId: secondaryDataset.id,
            column: c.name,
            outputName: c.name,
            origin: 'secondary' as const,
            inferredType: c.inferredType,
          })),
        ];
        setSelectedColumns(defaultOutputs);
      }
    }
  }, [primaryDataset?.id, secondaryDataset?.id]);

  // Swap datasets
  const handleSwapDatasets = () => {
    const tempId = primaryDatasetId;
    setPrimaryDatasetId(secondaryDatasetId);
    setSecondaryDatasetId(tempId);

    const tempKey = primaryKey;
    setPrimaryKey(secondaryKey);
    setSecondaryKey(tempKey);

    setSelectedColumns([]);
  };

  // Run compatibility validation
  const validation = useMemo(() => {
    return validateJoinConfiguration(
      primaryDataset,
      secondaryDataset,
      primaryKey,
      secondaryKey
    );
  }, [primaryDataset, secondaryDataset, primaryKey, secondaryKey]);

  // Execute Join
  const handleExecuteJoin = () => {
    if (!primaryDataset || !secondaryDataset) return;

    const config: JoinConfig = {
      primaryDatasetId: primaryDataset.id,
      secondaryDatasetId: secondaryDataset.id,
      primaryKey,
      secondaryKey,
      joinType,
      selectedColumns,
    };

    const result = executeJoin(primaryDataset, secondaryDataset, config);
    onJoinComplete(result, primaryDataset.fileName, secondaryDataset.fileName, joinType);
  };

  if (allDatasets.length < 2) {
    return (
      <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
          <GitMerge className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-lg text-slate-100 tracking-tight">
            At least two datasets required
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Relational matching joins records across two separate files. Currently {allDatasets.length} dataset is available.
          </p>
        </div>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-w-md mx-auto text-xs text-slate-300 font-mono">
          Example: <span className="text-cyan-400">Customers.xlsx</span> ⋈ <span className="text-amber-400">Orders.csv</span> on <span className="text-emerald-400">Customer_ID</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Import a second CSV/XLSX file in the Ingest tab or load the sample dataset to perform relational joins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Relational Join Flow Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitMerge className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">RELATIONAL JOIN PIPELINE</span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans">
            Deterministic In-Memory Hash Join
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-2 text-center text-xs">
          {/* PRIMARY DATASET */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col justify-center min-h-[72px]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
              PRIMARY DATASET
            </div>
            <div className="font-semibold text-slate-100 truncate mt-1 text-xs">
              {primaryDataset?.fileName || 'Select Primary'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {primaryDataset ? `${primaryDataset.rowCount} rows` : '—'}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-cyan-400 py-1 md:py-0">
            <ArrowDown className="w-4 h-4 md:-rotate-90 text-cyan-400" />
          </div>

          {/* MATCH COLUMN */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col justify-center min-h-[72px]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
              MATCH COLUMN
            </div>
            <div className="font-mono text-cyan-300 font-bold truncate mt-1 text-xs">
              {primaryKey || 'Key'} = {secondaryKey || 'Key'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Relational Equi-Join
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-cyan-400 py-1 md:py-0">
            <ArrowDown className="w-4 h-4 md:-rotate-90 text-cyan-400" />
          </div>

          {/* JOIN TYPE */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col justify-center min-h-[72px]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
              JOIN TYPE
            </div>
            <div className="font-bold text-emerald-400 uppercase mt-1 text-xs">
              {joinType} Join
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Deterministic Merge
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-cyan-400 py-1 md:py-0">
            <ArrowDown className="w-4 h-4 md:-rotate-90 text-cyan-400" />
          </div>

          {/* SECONDARY DATASET */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-col justify-center min-h-[72px]">
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
              SECONDARY DATASET
            </div>
            <div className="font-semibold text-slate-100 truncate mt-1 text-xs">
              {secondaryDataset?.fileName || 'Select Secondary'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {secondaryDataset ? `${secondaryDataset.rowCount} rows` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Dataset Pair Selector */}
      <DatasetPairSelector
        files={files}
        primaryDatasetId={primaryDatasetId}
        secondaryDatasetId={secondaryDatasetId}
        onSelectPrimary={(id) => {
          setPrimaryDatasetId(id);
          setSelectedColumns([]);
          setPrimaryKey('');
        }}
        onSelectSecondary={(id) => {
          setSecondaryDatasetId(id);
          setSelectedColumns([]);
          setSecondaryKey('');
        }}
        onSwapDatasets={handleSwapDatasets}
      />

      {primaryDataset && secondaryDataset && (
        <>
          {/* 2. Match Column Selector */}
          <MatchColumnSelector
            primaryDataset={primaryDataset}
            secondaryDataset={secondaryDataset}
            primaryKey={primaryKey}
            secondaryKey={secondaryKey}
            onChangePrimaryKey={setPrimaryKey}
            onChangeSecondaryKey={setSecondaryKey}
          />

          {/* 3. Join Type Selector */}
          <JoinTypeSelector
            selectedType={joinType}
            onChangeJoinType={setJoinType}
            primaryName={primaryDataset.fileName}
            secondaryName={secondaryDataset.fileName}
          />

          {/* 4. Compatibility Alerts & Telemetry */}
          <JoinCompatibilityAlerts
            validation={validation}
            primaryKeyName={primaryKey}
            secondaryKeyName={secondaryKey}
          />

          {/* 5. Output Column Picker & Reordering */}
          <JoinColumnOutputSelector
            primaryDataset={primaryDataset}
            secondaryDataset={secondaryDataset}
            selectedColumns={selectedColumns}
            onChangeSelectedColumns={setSelectedColumns}
          />

          {/* 6. Execution Summary & Trigger */}
          <JoinSummaryAndStats
            primaryDataset={primaryDataset}
            secondaryDataset={secondaryDataset}
            primaryKey={primaryKey}
            secondaryKey={secondaryKey}
            joinType={joinType}
            validation={validation}
            selectedColumns={selectedColumns}
            onExecuteJoin={handleExecuteJoin}
          />
        </>
      )}
    </div>
  );
};
