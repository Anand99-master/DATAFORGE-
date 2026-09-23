/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SelectionWorkspace Component
 * Cohesive workspace bringing together Dataset Selection, Field Selection & Ordering,
 * Visual Filter Builder, and the Selection Summary with live matching estimates.
 */

import React from 'react';
import { SheetDataset, SourceFile, FilterGroup, SelectionConfig, ExecutionResult } from '../../core/types';
import { executeSelection } from '../../core/engine/selectionEngine';
import { DatasetSelector } from './DatasetSelector';
import { FieldSelector } from './FieldSelector';
import { FilterBuilder } from './FilterBuilder';
import { SelectionSummary } from './SelectionSummary';
import { Layers, Database } from 'lucide-react';

interface SelectionWorkspaceProps {
  files: SourceFile[];
  selectedDatasetId: string | null;
  onSelectDatasetId: (id: string) => void;
  selectedColumns: string[];
  onChangeSelectedColumns: (cols: string[]) => void;
  filterGroups: FilterGroup[];
  groupLogicalOperator: 'AND' | 'OR';
  onChangeFilterGroups: (groups: FilterGroup[]) => void;
  onChangeGroupLogicalOperator: (op: 'AND' | 'OR') => void;
  onExecutionComplete: (result: ExecutionResult) => void;
}

export const SelectionWorkspace: React.FC<SelectionWorkspaceProps> = ({
  files,
  selectedDatasetId,
  onSelectDatasetId,
  selectedColumns,
  onChangeSelectedColumns,
  filterGroups,
  groupLogicalOperator,
  onChangeFilterGroups,
  onChangeGroupLogicalOperator,
  onExecutionComplete,
}) => {
  // Find the selected dataset
  let activeDataset: SheetDataset | null = null;
  for (const file of files) {
    if (file.status === 'ready' && file.sheets) {
      const match = file.sheets.find((s) => s.id === selectedDatasetId);
      if (match) {
        activeDataset = match;
        break;
      }
    }
  }

  // If no dataset is explicitly selected but valid datasets exist, select the first one
  React.useEffect(() => {
    if (!selectedDatasetId && files.length > 0) {
      for (const file of files) {
        if (file.status === 'ready' && file.sheets && file.sheets.length > 0) {
          onSelectDatasetId(file.sheets[0].id);
          break;
        }
      }
    }
  }, [selectedDatasetId, files, onSelectDatasetId]);

  // When active dataset changes, initialize selected columns to all columns if currently empty
  React.useEffect(() => {
    if (activeDataset && selectedColumns.length === 0) {
      onChangeSelectedColumns(activeDataset.columns.map((c) => c.name));
    }
  }, [activeDataset?.id]);

  const handleGenerateResult = () => {
    if (!activeDataset) return;

    const config: SelectionConfig = {
      datasetId: activeDataset.id,
      selectedColumns: selectedColumns.length > 0
        ? selectedColumns
        : activeDataset.columns.map((c) => c.name),
      filterGroups,
      groupLogicalOperator,
    };

    const result = executeSelection(activeDataset, config);
    onExecutionComplete(result);
  };

  return (
    <div className="space-y-6">
      {/* 1. Dataset Selector */}
      <DatasetSelector
        files={files}
        activeDatasetId={selectedDatasetId}
        onSelectDataset={(newId) => {
          onSelectDatasetId(newId);
          // Find the new dataset to reset columns if switched
          for (const file of files) {
            const found = file.sheets?.find((s) => s.id === newId);
            if (found) {
              onChangeSelectedColumns(found.columns.map((c) => c.name));
              onChangeFilterGroups([]);
              break;
            }
          }
        }}
      />

      {activeDataset ? (
        <>
          {/* 2. Field Selector & Reordering */}
          <FieldSelector
            dataset={activeDataset}
            selectedColumns={selectedColumns}
            onChangeSelectedColumns={onChangeSelectedColumns}
          />

          {/* 3. Visual Filter Builder */}
          <FilterBuilder
            dataset={activeDataset}
            filterGroups={filterGroups}
            groupLogicalOperator={groupLogicalOperator}
            onChangeFilterGroups={onChangeFilterGroups}
            onChangeGroupLogicalOperator={onChangeGroupLogicalOperator}
          />

          {/* 4. Selection Summary with Live Estimation */}
          <SelectionSummary
            dataset={activeDataset}
            selectedColumns={selectedColumns}
            filterGroups={filterGroups}
            groupLogicalOperator={groupLogicalOperator}
            onGenerateResult={handleGenerateResult}
          />
        </>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
          <Database className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p>Please select a source dataset from above to configure fields and filters.</p>
        </div>
      )}
    </div>
  );
};
