/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge - Deterministic Data Processing Engine
 * Ingestion Module & Architecture Console
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Boxes,
  Workflow,
  ShieldCheck,
  Cpu,
  FolderTree,
  ListOrdered,
  Lock,
  Compass,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  Activity,
  HardDriveDownload,
} from 'lucide-react';
import { PIPELINE_STAGES } from './core/pipeline';
import { SourceFile, SheetDataset, FilterGroup, ExecutionResult } from './core/types';
import { ingestMultipleFiles, generateDemoDatasets } from './core/ingestion';
import { FileDropzone } from './components/ingestion/FileDropzone';
import { FileList } from './components/ingestion/FileList';
import { DatasetOverview } from './components/ingestion/DatasetOverview';
import { ColumnInspector } from './components/ingestion/ColumnInspector';
import { DataPreviewTable } from './components/ingestion/DataPreviewTable';
import { SelectionWorkspace } from './components/selection/SelectionWorkspace';
import { SelectionResultPreview } from './components/preview/SelectionResultPreview';
import { JoinWorkspace } from './components/join/JoinWorkspace';
import { JoinResultPreview } from './components/preview/JoinResultPreview';
import { JoinExecutionResult } from './core/engine/join/joinTypes';
import { ExportWorkspace } from './components/export/ExportWorkspace';
import { ExportDataset } from './core/export/exportTypes';
import { ArrowRight, CheckSquare, Eye, GitMerge, Download } from 'lucide-react';

type MainView = 'ingestion' | 'selection' | 'join' | 'preview' | 'export' | 'architecture';

type ArchTab =
  | 'architecture'
  | 'pipeline'
  | 'modules'
  | 'workflow'
  | 'techstack'
  | 'folderstructure'
  | 'mvp'
  | 'ai_airgap';

export default function App() {
  const [mainView, setMainView] = useState<MainView>('ingestion');
  const [archTab, setArchTab] = useState<ArchTab>('architecture');
  const [selectedStage, setSelectedStage] = useState<number>(0);

  // Ingestion State
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ingestionNotification, setIngestionNotification] = useState<string | null>(null);

  // Selection State
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [groupLogicalOperator, setGroupLogicalOperator] = useState<'AND' | 'OR'>('AND');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Join State
  const [joinResult, setJoinResult] = useState<{
    result: JoinExecutionResult;
    primaryName: string;
    secondaryName: string;
    joinType: string;
  } | null>(null);

  // Preview Mode Toggle: either showing selection preview or join preview
  const [previewTab, setPreviewTab] = useState<'selection' | 'join'>('selection');

  // Derived active file and active sheet dataset
  const activeFile = files.find((f) => f.id === activeFileId) ?? null;
  const activeDataset: SheetDataset | null = activeFile
    ? activeFile.sheets.find((s) => s.sheetName === activeFile.activeSheetName) ??
      activeFile.sheets[0] ??
      null
    : null;

  // Active dataset configured for deterministic export
  const currentExportDataset: ExportDataset | null = useMemo(() => {
    if (previewTab === 'join' && joinResult) {
      return {
        columns: joinResult.result.columns,
        rows: joinResult.result.rows,
        suggestedFileName: `${joinResult.primaryName}_${joinResult.secondaryName}_${joinResult.joinType}_result`
          .toLowerCase()
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[^a-z0-9_]/gi, '_'),
        sourceType: 'join',
        sourceDescription: `${joinResult.primaryName} ⋈ ${joinResult.secondaryName} (${joinResult.joinType.toUpperCase()} JOIN)`,
      };
    }
    if (previewTab === 'selection' && executionResult) {
      const sheet = files.flatMap((f) => f.sheets).find((s) => s.id === executionResult.datasetId || s.id === selectedDatasetId);
      const base = sheet
        ? `${sheet.fileName}_${sheet.sheetName || 'filtered'}`
        : `${executionResult.datasetName || 'dataset'}_${executionResult.sheetName || 'filtered'}`;
      return {
        columns: executionResult.columns,
        rows: executionResult.rows,
        suggestedFileName: base.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_]/gi, '_'),
        sourceType: 'selection',
        sourceDescription: sheet
          ? `${sheet.fileName} (${sheet.sheetName})`
          : `${executionResult.datasetName || 'Dataset'} (${executionResult.sheetName || 'Selection'})`,
      };
    }
    if (joinResult) {
      return {
        columns: joinResult.result.columns,
        rows: joinResult.result.rows,
        suggestedFileName: `${joinResult.primaryName}_${joinResult.secondaryName}_${joinResult.joinType}_result`
          .toLowerCase()
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[^a-z0-9_]/gi, '_'),
        sourceType: 'join',
        sourceDescription: `${joinResult.primaryName} ⋈ ${joinResult.secondaryName} (${joinResult.joinType.toUpperCase()} JOIN)`,
      };
    }
    if (executionResult) {
      const sheet = files.flatMap((f) => f.sheets).find((s) => s.id === executionResult.datasetId || s.id === selectedDatasetId);
      const base = sheet
        ? `${sheet.fileName}_${sheet.sheetName || 'filtered'}`
        : `${executionResult.datasetName || 'dataset'}_${executionResult.sheetName || 'filtered'}`;
      return {
        columns: executionResult.columns,
        rows: executionResult.rows,
        suggestedFileName: base.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_]/gi, '_'),
        sourceType: 'selection',
        sourceDescription: sheet
          ? `${sheet.fileName} (${sheet.sheetName})`
          : `${executionResult.datasetName || 'Dataset'} (${executionResult.sheetName || 'Selection'})`,
      };
    }
    return null;
  }, [previewTab, joinResult, executionResult, files, selectedDatasetId]);

  // Handle files selected via file input or drag-and-drop
  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setIsLoading(true);
    setIngestionNotification(null);

    try {
      const ingested = await ingestMultipleFiles(newFiles);
      setFiles((prev) => {
        const updated = [...prev, ...ingested];
        // If no file was active, set active to the first valid one
        if (!activeFileId && updated.length > 0) {
          const firstReady = updated.find((f) => f.status === 'ready') ?? updated[0];
          setActiveFileId(firstReady.id);
        }
        return updated;
      });

      const readyCount = ingested.filter((f) => f.status === 'ready').length;
      const errorCount = ingested.filter((f) => f.status === 'error').length;

      if (errorCount > 0) {
        setIngestionNotification(
          `Processed ${ingested.length} files: ${readyCount} loaded successfully, ${errorCount} had issues.`
        );
      } else {
        setIngestionNotification(`Successfully loaded and profiled ${readyCount} file(s).`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to ingest files';
      setIngestionNotification(`Ingestion failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 1-click Demo Data loading
  const handleLoadDemoData = async () => {
    setIsLoading(true);
    setIngestionNotification(null);
    try {
      const demoFiles = await generateDemoDatasets();
      setFiles(demoFiles);
      if (demoFiles.length > 0) {
        setActiveFileId(demoFiles[0].id);
        const firstSheet = demoFiles[0].sheets[0];
        if (firstSheet) {
          setSelectedDatasetId(firstSheet.id);
          setSelectedColumns(firstSheet.columns.map((c) => c.name));
          setFilterGroups([]);
        }
      }
      setExecutionResult(null);
      setJoinResult(null);
      setIngestionNotification(
        "Loaded demo datasets: 'Customers.xlsx' (2 sheets) & 'Orders.csv' (14 rows)."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load demo data';
      setIngestionNotification(`Error loading demo files: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch active worksheet for an Excel file
  const handleSelectSheet = (fileId: string, sheetName: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          return { ...f, activeSheetName: sheetName };
        }
        return f;
      })
    );
  };

  // Remove a file
  const handleRemoveFile = (fileId: string) => {
    const fileToRemove = files.find((f) => f.id === fileId);
    const removedSheetIds = new Set(fileToRemove?.sheets.map((s) => s.id) ?? []);

    setFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    // Invalidate selection state if it belonged to the removed file
    if (selectedDatasetId && removedSheetIds.has(selectedDatasetId)) {
      setSelectedDatasetId(null);
      setSelectedColumns([]);
      setFilterGroups([]);
      setExecutionResult(null);
    }

    // Invalidate join state if it involved the removed file
    if (joinResult && fileToRemove) {
      if (
        joinResult.primaryName === fileToRemove.name ||
        joinResult.secondaryName === fileToRemove.name
      ) {
        setJoinResult(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Banner / System Status */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  DataForge
                </span>
                <span className="px-2 py-0.5 text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                  v0.2 Ingestion Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Deterministic Multi-File Data Processing Engine</p>
            </div>
          </div>

          {/* Mode Switcher: Ingestion -> Selection -> Preview -> Architecture */}
          <div className="flex items-center space-x-3">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setMainView('ingestion')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'ingestion'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>1. Ingest</span>
                {files.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-cyan-300 font-mono">
                    {files.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView('selection')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'selection'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>2. Select & Filter</span>
                {selectedColumns.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-cyan-300 font-mono">
                    {selectedColumns.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView('join')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'join'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>3. Match & Join</span>
                {files.length >= 2 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-emerald-300 font-mono">
                    Ready
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView('preview')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'preview'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>4. Preview</span>
                {(executionResult || joinResult) && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    {previewTab === 'join' && joinResult
                      ? joinResult.result.rows.length
                      : executionResult?.rows.length ?? 0}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView('export')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'export'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>5. Export</span>
                {currentExportDataset && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-emerald-300 font-mono">
                    Ready
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainView('architecture')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  mainView === 'architecture'
                    ? 'bg-cyan-600 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Architecture</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deterministic Core</span>
            </div>
          </div>
        </div>

        {/* Sub-nav for Architecture Blueprint when active */}
        {mainView === 'architecture' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto no-scrollbar border-t border-slate-800/60">
            {[
              { id: 'architecture', label: '1. Architecture', icon: Layers },
              { id: 'modules', label: '2. Modules & Roles', icon: Boxes },
              { id: 'pipeline', label: '3. Data Pipeline', icon: Workflow },
              { id: 'workflow', label: '4. User Workflow', icon: ListOrdered },
              { id: 'techstack', label: '5. Tech Stack', icon: Cpu },
              { id: 'folderstructure', label: '6. Folder Structure', icon: FolderTree },
              { id: 'mvp', label: '7. MVP Scope', icon: Compass },
              { id: 'ai_airgap', label: '8. Local AI Isolation', icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = archTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setArchTab(tab.id as ArchTab)}
                  className={`flex items-center space-x-2 px-3.5 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* ========================================================================= */}
        {/* INGESTION MODULE WORKSPACE */}
        {/* ========================================================================= */}
        {mainView === 'ingestion' && (
          <div className="space-y-6">
            {/* Notification Banner */}
            {ingestionNotification && (
              <div className="bg-slate-900 border border-cyan-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-cyan-300 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{ingestionNotification}</span>
                </div>
                <button
                  onClick={() => setIngestionNotification(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. Multi-file Dropzone */}
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              onLoadDemoData={handleLoadDemoData}
              isLoading={isLoading}
            />

            {/* 2. File List (Active & Imported Files) */}
            <FileList
              files={files}
              activeFileId={activeFileId}
              onSelectFile={(id) => setActiveFileId(id)}
              onSelectSheet={handleSelectSheet}
              onRemoveFile={handleRemoveFile}
            />

            {/* 3. Selected Dataset Schema Inspector & Preview */}
            {activeDataset ? (
              <div className="space-y-6 pt-2">
                {/* Dataset Overview Cards */}
                <DatasetOverview dataset={activeDataset} />

                {/* Column Inspector */}
                <ColumnInspector
                  columns={activeDataset.columns}
                  rowCount={activeDataset.rowCount}
                />

                {/* Data Preview Table */}
                <DataPreviewTable dataset={activeDataset} />

                {/* Action buttons to proceed to next stages */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-200">
                      Dataset Ready: {activeDataset.fileName}
                      {activeDataset.fileType === 'xlsx' && (
                        <span className="text-cyan-400 font-normal"> ({activeDataset.sheetName})</span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose to select & filter this single dataset, or combine related records with another dataset.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDatasetId(activeDataset.id);
                        setMainView('selection');
                      }}
                      className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select & Filter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMainView('join')}
                      className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/30"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Match & Join Multiple Files</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : files.length > 0 && activeFile?.status === 'error' ? (
              <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-8 text-center text-xs text-rose-300">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <h4 className="font-semibold text-sm text-slate-200">
                  Cannot display schema for '{activeFile.name}'
                </h4>
                <p className="text-slate-400 mt-1 max-w-md mx-auto">{activeFile.errorMessage}</p>
              </div>
            ) : (
              files.length === 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center text-xs text-slate-500">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No files imported yet. Drag & drop CSV or XLSX files above, or click "Load Sample" to begin.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DATA SELECTION MODULE WORKSPACE */}
        {/* ========================================================================= */}
        {mainView === 'selection' && (
          <SelectionWorkspace
            files={files}
            selectedDatasetId={selectedDatasetId}
            onSelectDatasetId={(newId) => {
              if (newId !== selectedDatasetId) {
                setSelectedDatasetId(newId);
                setExecutionResult(null);
              }
            }}
            selectedColumns={selectedColumns}
            onChangeSelectedColumns={setSelectedColumns}
            filterGroups={filterGroups}
            groupLogicalOperator={groupLogicalOperator}
            onChangeFilterGroups={setFilterGroups}
            onChangeGroupLogicalOperator={setGroupLogicalOperator}
            onExecutionComplete={(result) => {
              setExecutionResult(result);
              setPreviewTab('selection');
              setMainView('preview');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* MULTI-FILE MATCH & JOIN WORKSPACE */}
        {/* ========================================================================= */}
        {mainView === 'join' && (
          <JoinWorkspace
            files={files}
            onJoinComplete={(result, primaryName, secondaryName, joinType) => {
              setJoinResult({
                result,
                primaryName,
                secondaryName,
                joinType,
              });
              setPreviewTab('join');
              setMainView('preview');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* EXTRACTED RESULT PREVIEW */}
        {/* ========================================================================= */}
        {mainView === 'preview' && (
          <div className="space-y-4">
            {/* If both single selection and join result exist, allow switching between them */}
            {executionResult && joinResult && (
              <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setPreviewTab('selection')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    previewTab === 'selection'
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Single Dataset Selection ({executionResult.rows.length} rows)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('join')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    previewTab === 'join'
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Multi-File Join ({joinResult.result.rows.length} rows)</span>
                </button>
              </div>
            )}

            {previewTab === 'join' && joinResult ? (
              <JoinResultPreview
                result={joinResult.result}
                primaryDatasetName={joinResult.primaryName}
                secondaryDatasetName={joinResult.secondaryName}
                joinType={joinResult.joinType}
                onBackToJoin={() => setMainView('join')}
                onProceedToExport={() => setMainView('export')}
              />
            ) : previewTab === 'selection' && executionResult ? (
              <SelectionResultPreview
                result={executionResult}
                datasetName={
                  files
                    .flatMap((f) => f.sheets)
                    .find((s) => s.id === selectedDatasetId)?.fileName ?? 'Extracted Dataset'
                }
                sheetName={
                  files
                    .flatMap((f) => f.sheets)
                    .find((s) => s.id === selectedDatasetId)?.sheetName
                }
                onBackToSelection={() => setMainView('selection')}
                onProceedToExport={() => setMainView('export')}
              />
            ) : joinResult ? (
              <JoinResultPreview
                result={joinResult.result}
                primaryDatasetName={joinResult.primaryName}
                secondaryDatasetName={joinResult.secondaryName}
                joinType={joinResult.joinType}
                onBackToJoin={() => setMainView('join')}
                onProceedToExport={() => setMainView('export')}
              />
            ) : executionResult ? (
              <SelectionResultPreview
                result={executionResult}
                datasetName={
                  files
                    .flatMap((f) => f.sheets)
                    .find((s) => s.id === selectedDatasetId)?.fileName ?? 'Extracted Dataset'
                }
                sheetName={
                  files
                    .flatMap((f) => f.sheets)
                    .find((s) => s.id === selectedDatasetId)?.sheetName
                }
                onBackToSelection={() => setMainView('selection')}
                onProceedToExport={() => setMainView('export')}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 space-y-4">
                <Eye className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <h4 className="font-semibold text-sm text-slate-200">No Query Executed Yet</h4>
                  <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                    You haven't executed a data extraction or join yet. Choose an operation to begin:
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMainView('selection')}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Select & Filter Single Dataset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainView('join')}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Match & Join Multiple Datasets</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPORT MODULE WORKSPACE */}
        {/* ========================================================================= */}
        {mainView === 'export' && (
          <ExportWorkspace
            dataset={currentExportDataset}
            onBackToPreview={() => setMainView('preview')}
            onBackToModify={() =>
              setMainView(currentExportDataset?.sourceType === 'join' ? 'join' : 'selection')
            }
          />
        )}

        {/* ========================================================================= */}
        {/* ARCHITECTURE BLUEPRINT (Retained from Foundation) */}
        {/* ========================================================================= */}
        {mainView === 'architecture' && (
          <div className="space-y-8">
            {/* TAB 1: ARCHITECTURE OVERVIEW */}
            {archTab === 'architecture' && (
              <div className="space-y-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="max-w-3xl">
                    <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-semibold">
                      Core Architectural Principle
                    </span>
                    <h1 className="text-2xl font-bold mt-1 text-slate-100">
                      Deterministic Decoupled Pipeline Architecture
                    </h1>
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                      DataForge executes all transformations, joins, and filters via pure, predictable algorithms.
                      The application is divided into three distinct decoupled layers:
                      <strong> Presentation</strong>, <strong>Extraction Plan AST</strong>, and the 
                      <strong> Deterministic Execution Engine</strong>.
                    </p>
                  </div>

                  {/* Architecture Blueprint Visualization */}
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span className="font-mono text-cyan-400">LAYER 1</span>
                          <span className="bg-cyan-950/50 px-2 py-0.5 rounded text-cyan-300 border border-cyan-900">User Interface</span>
                        </div>
                        <h3 className="font-semibold text-slate-200 text-sm">Interactive Intent Capture</h3>
                        <ul className="mt-3 space-y-2 text-xs text-slate-400">
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>Multi-file Drag & Drop (CSV, XLSX)</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>Interactive Schema & Column Inspector</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>Visual Filter & Join Condition Builder</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>Real-time Paginated Preview Table</span>
                          </li>
                        </ul>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                        Output: User configuration state
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-cyan-800/40 rounded-lg p-5 flex flex-col justify-between relative shadow-lg shadow-cyan-950/20">
                      <div className="absolute -top-3 left-4 bg-cyan-900/80 border border-cyan-600 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded uppercase">
                        Decoupling Boundary
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span className="font-mono text-cyan-400">LAYER 2</span>
                          <span className="bg-cyan-950/50 px-2 py-0.5 rounded text-cyan-300 border border-cyan-900">Query AST</span>
                        </div>
                        <h3 className="font-semibold text-slate-200 text-sm">ExtractionPlan (AST)</h3>
                        <p className="text-xs text-slate-400 mt-2">
                          An immutable, serializable JSON query plan validated against column types before any execution starts:
                        </p>
                        <div className="mt-3 bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                          <div>• Primary Dataset ID</div>
                          <div>• Projected Fields: <span className="text-cyan-400">[Name, City, Rev]</span></div>
                          <div>• Relational Joins: <span className="text-amber-400">Cust.id = Orders.c_id</span></div>
                          <div>• Filter Groups: <span className="text-emerald-400">(City='Ahmedabad' & Rev&gt;10k)</span></div>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-cyan-300/80 font-mono">
                        Enforces strict validation & replayability
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span className="font-mono text-cyan-400">LAYER 3</span>
                          <span className="bg-cyan-950/50 px-2 py-0.5 rounded text-cyan-300 border border-cyan-900">Engine</span>
                        </div>
                        <h3 className="font-semibold text-slate-200 text-sm">Deterministic Engine</h3>
                        <ul className="mt-3 space-y-2 text-xs text-slate-400">
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Linear in-memory Hash-Join matching</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Type-safe Boolean & Expression Evaluation</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Field Projection & Column Re-aliasing</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>Streaming binary export (.xlsx, .csv)</span>
                          </li>
                        </ul>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-emerald-400">
                        Result: Zero hallucinations, exact match records
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MAIN MODULES */}
            {archTab === 'modules' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Main Modules & Responsibilities</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Each module has a strict single responsibility with explicit input/output contracts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    {
                      name: '1. Ingestion Engine (Implemented)',
                      path: 'src/core/ingestion/',
                      icon: FileSpreadsheet,
                      role: 'Parses binary/text inputs into uniform tabular formats without schema loss.',
                      inputs: 'Raw File objects (.csv, .xlsx)',
                      outputs: 'Normalized SheetDataset[] with raw rows and sheet identifiers',
                      behavior: 'Detects CSV delimiter automatically, unpacks multiple worksheets from Excel, handles UTF-8 / ASCII encoding safely.',
                    },
                    {
                      name: '2. Schema Profiler (Implemented)',
                      path: 'src/core/profiler/',
                      icon: Boxes,
                      role: 'Scans tabular data to deduce metadata, types, cardinality, and quality indicators.',
                      inputs: 'Raw rows & column arrays',
                      outputs: 'ColumnMetadata[] with inferred types (number, string, date, boolean)',
                      behavior: 'Computes null counts, unique values, primary key candidates, and value samples for UI inspection.',
                    },
                    {
                      name: '3. Query Planner',
                      path: 'src/core/planner/',
                      icon: Layers,
                      role: 'Builds, validates, and serializes extraction queries into an immutable AST.',
                      inputs: 'User selection state (columns, conditions, joins)',
                      outputs: 'Validated ExtractionPlan AST object',
                      behavior: 'Validates that every selected field, join key, and filter target exists in the loaded datasets before execution.',
                    },
                    {
                      name: '4. Relational & Filter Engine',
                      path: 'src/core/engine/',
                      icon: Workflow,
                      role: 'Executes the ExtractionPlan deterministically across datasets.',
                      inputs: 'ExtractionPlan AST + Map<string, SheetDataset>',
                      outputs: 'ExecutionResult (filtered, joined, and projected rows + telemetry)',
                      behavior: 'Implements in-memory hash joins on matched keys, evaluates typed filter condition trees (AND/OR), handles null values safely.',
                    },
                    {
                      name: '5. Export Engine',
                      path: 'src/core/export/',
                      icon: HardDriveDownload,
                      role: 'Converts processed results into industry-standard downloadable formats.',
                      inputs: 'ExecutionResult (columns + rows)',
                      outputs: 'Binary Blobs (.xlsx workbook, .csv text file)',
                      behavior: 'Applies correct MIME types, generates downloadable object URLs, ensures proper string escaping and header mapping.',
                    },
                    {
                      name: '6. Ollama Translator Bridge (Future)',
                      path: 'src/core/ai/',
                      icon: Sparkles,
                      role: 'Optional local AI layer to translate user prompts into structured ExtractionPlans.',
                      inputs: 'User natural text + Schema metadata (NO raw row data)',
                      outputs: 'Draft ExtractionPlan JSON AST',
                      behavior: 'Calls local Ollama endpoint (e.g. localhost:11434). Zero cloud calls. Output is strictly validated by Module 3 before execution.',
                    },
                  ].map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <div key={mod.name} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-cyan-400">
                              <Icon className="w-5 h-5" />
                              <h3 className="font-semibold text-sm text-slate-100">{mod.name}</h3>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {mod.path}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2.5">{mod.role}</p>

                          <div className="mt-4 space-y-2 text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-slate-400 font-mono text-[11px] w-14 shrink-0">Input:</span>
                              <span className="text-slate-300 font-medium">{mod.inputs}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <span className="text-slate-400 font-mono text-[11px] w-14 shrink-0">Output:</span>
                              <span className="text-cyan-300 font-medium">{mod.outputs}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span className="text-slate-300 font-medium">Core Logic: </span>
                          {mod.behavior}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: DATA PROCESSING PIPELINE */}
            {archTab === 'pipeline' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Deterministic Processing Pipeline</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Data moves through discrete, inspectable stages with well-defined state invariants.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isSelected = selectedStage === idx;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStage(idx)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-cyan-400 mb-1">STAGE {idx + 1}</div>
                        <div className="text-xs font-semibold truncate text-slate-200">{stage.name.split('. ')[1]}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                        Pipeline Stage {selectedStage + 1} of 6
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">
                        {PIPELINE_STAGES[selectedStage].name}
                      </h3>
                    </div>
                    <div className="px-3 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs rounded-full flex items-center space-x-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Deterministic Invariant</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mt-3">
                    {PIPELINE_STAGES[selectedStage].description}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: USER WORKFLOW */}
            {archTab === 'workflow' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">12-Step End-to-End User Workflow</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    A seamless journey guiding users from multi-file import to verified final extraction.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { step: 1, title: 'Open Application', desc: 'User lands on clean workspace with immediate upload dropzone.' },
                    { step: 2, title: 'Import Files', desc: 'Drag-and-drop or file picker for multiple .csv and .xlsx files simultaneously.' },
                    { step: 3, title: 'Analyze & Profile', desc: 'Engine parses sheets, counts rows, infers column types, and gathers sample values.' },
                    { step: 4, title: 'Display Schema', desc: 'UI presents clear cards for each file/sheet with searchable column lists and type badges.' },
                    { step: 5, title: 'Select Fields', desc: 'User checks specific columns needed (e.g., Customer Name, City, Product, Revenue).' },
                    { step: 6, title: 'Define Conditions', desc: 'User adds filters (e.g., City = Ahmedabad, Revenue > 10,000) using visual dropdowns.' },
                    { step: 7, title: 'Relational Matching', desc: 'If multiple files are involved, user defines join key (e.g. Customers.id = Orders.c_id).' },
                    { step: 8, title: 'Generate Dataset', desc: 'Engine compiles ExtractionPlan and processes records deterministically in milliseconds.' },
                    { step: 9, title: 'Preview Results', desc: 'User views live paginated tabular preview with match count and column headers.' },
                    { step: 10, title: 'Iterate & Modify', desc: 'User can tweak filter values or toggle columns; preview updates automatically.' },
                    { step: 11, title: 'Confirm Extract', desc: 'User reviews total matching row count and verifies extracted sample data.' },
                    { step: 12, title: 'Download & Export', desc: 'User clicks download to receive clean, formatted CSV or Excel (.xlsx) file.' },
                  ].map((item) => (
                    <div key={item.step} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex space-x-3.5 items-start">
                      <div className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: TECH STACK */}
            {archTab === 'techstack' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Recommended Technology Stack</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Carefully selected zero-cloud-dependency libraries optimized for speed, precision, and privacy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="font-semibold text-sm text-cyan-400 mb-3">Data Parsing & Ingestion</h3>
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                        <div className="font-mono text-xs font-bold text-slate-200">PapaParse</div>
                        <div className="text-xs text-slate-400 mt-1">RFC 4180 CSV parser with streaming & chunking capabilities.</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                        <div className="font-mono text-xs font-bold text-slate-200">SheetJS (xlsx)</div>
                        <div className="text-xs text-slate-400 mt-1">Standard Excel workbook parser supporting multiple sheets and binary array buffers.</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="font-semibold text-sm text-cyan-400 mb-3">Processing & Engine Core</h3>
                    <div className="space-y-3">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                        <div className="font-mono text-xs font-bold text-slate-200">TypeScript 5+ (Strict)</div>
                        <div className="text-xs text-slate-400 mt-1">Type-safe contracts for AST nodes, schemas, and pipeline execution.</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                        <div className="font-mono text-xs font-bold text-slate-200">In-Memory Hash Joiner</div>
                        <div className="text-xs text-slate-400 mt-1">Deterministic O(N + M) join algorithm using native JS Maps & typed lookups.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: FOLDER STRUCTURE */}
            {archTab === 'folderstructure' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Folder Structure & Code Organization</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Modular architecture ensuring clear separation between UI, deterministic engine, and future AI translator.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 font-mono text-xs">
                  <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`├── ARCHITECTURE.md              # Complete architectural design document
├── src/
│   ├── core/                    # DETERMINISTIC ENGINE (Zero UI Dependencies)
│   │   ├── types.ts             # Domain contracts, schema metadata, AST query models
│   │   ├── pipeline.ts          # Pipeline stage contracts and plan validators
│   │   ├── ingestion/           # CSV (papaparse) & XLSX (sheetjs) parsers
│   │   │   ├── csvParser.ts
│   │   │   ├── xlsxParser.ts
│   │   │   └── index.ts
│   │   ├── profiler/            # Column type inferrer & summary statistics
│   │   │   └── schemaProfiler.ts
│   │   ├── planner/             # Query AST builder & schema integrity validator
│   │   ├── engine/              # Deterministic hash joiner & filter evaluator
│   │   ├── export/              # CSV & XLSX binary serializers
│   │   └── ai/                  # Local Ollama bridge (prompts -> JSON AST only)
│   │
│   ├── components/              # USER INTERFACE
│   │   └── ingestion/           # File dropzone, FileList, ColumnInspector, DataPreviewTable
│   └── App.tsx                  # Ingestion workspace & Architecture Console`}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 7: MVP SCOPE */}
            {archTab === 'mvp' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-5">
                    <h3 className="font-semibold text-sm text-emerald-400 mb-3">IN SCOPE for MVP</h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li>• Multi-file CSV & XLSX Ingestion with sheet navigation</li>
                      <li>• Deterministic Schema & Type inference (no AI)</li>
                      <li>• Paginated Raw Data Preview</li>
                      <li>• Field selection & deterministic filter builder</li>
                      <li>• Two-file relational joins on matching keys</li>
                      <li>• Verified binary export (.xlsx, .csv)</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="font-semibold text-sm text-slate-400 mb-3">EXCLUDED from MVP</h3>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li>• Cloud AI APIs (OpenAI/Gemini/ChatGPT strictly prohibited)</li>
                      <li>• Fuzzy/probabilistic joins</li>
                      <li>• External SQL database connections</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: LOCAL AI ISOLATION MODEL */}
            {archTab === 'ai_airgap' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <span className="text-xs font-mono uppercase text-amber-400 font-semibold">Air-gap Rule</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  AI Interprets Intent; Deterministic Engine Processes Data
                </h3>
                <p className="text-xs text-slate-300 mt-2">
                  Ollama is purely an optional Natural Language to AST Compiler. It is never allowed to view customer records, generate synthetic rows, or directly filter arrays.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>DataForge Engine Core: Active & Deterministic</span>
          </div>
          <div className="font-mono text-slate-400">
            CSV & XLSX Ingestion Module Ready • Stage 1 & 2 Complete
          </div>
        </div>
      </footer>
    </div>
  );
}
