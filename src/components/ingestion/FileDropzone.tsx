/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FileDropzone Component
 * Multi-file drag & drop and file picker for .csv and .xlsx files.
 */

import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, FileText, Sparkles, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadDemoData: () => void;
  isLoading: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  onLoadDemoData,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
      // Reset input value so re-uploading the same file triggers change
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
            : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-950/60 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Drag & Drop your CSV or Excel files here
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select multiple files simultaneously • Maximum local browser capacity
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel (.xlsx)</span>
            </span>
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Delimited (.csv)</span>
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {isLoading ? 'Ingesting Files...' : 'Browse Local Files'}
            </button>
          </div>
        </div>
      </div>

      {/* Demo sample loader for rapid testing */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="font-mono text-cyan-400">PRO-TIP:</span>
          <span>Want to test multi-file Excel sheets without uploading your own?</span>
        </div>
        <button
          type="button"
          onClick={onLoadDemoData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg transition-colors font-medium shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Load Sample 'Customers.xlsx' & 'Orders.csv'</span>
        </button>
      </div>
    </div>
  );
};
