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
import { GitMerge, Database, AlertCircle } from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 space-y-3">
        <GitMerge className="w-10 h-10 text-cyan-500 mx-auto" />
        <h4 className="font-bold text-base text-slate-100">
          Multi-File Relational Matching & Join
        </h4>
        <p className="max-w-md mx-auto text-slate-400">
          To combine related records, you need at least two imported datasets (e.g. <code>Customers.xlsx</code> and <code>Orders.csv</code>).
        </p>
        <p className="text-slate-500">
          Go back to the Ingest tab to import an additional file or click "Load Sample" to use the pre-built multi-dataset package.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
