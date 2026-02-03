import React, { useCallback } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, onFilesSelected, onRemoveFile, disabled }) => {
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((f: File) => 
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  }, [disabled, onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <UploadCloud className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-slate-800">Weekly Ads</h2>
      </div>
      
      <p className="text-sm text-slate-500 mb-4">
        Upload the weekly flyers (PDF) or screenshots (Images).
      </p>

      {/* Drop Zone */}
      <div 
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          disabled ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={disabled}
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-emerald-100 p-3 rounded-full mb-3">
            <div className="flex -space-x-1">
                <FileText className="w-6 h-6 text-emerald-600 relative z-10" />
                <ImageIcon className="w-6 h-6 text-emerald-500 relative -ml-3 mt-1 opacity-70" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDFs, PNGs, JPEGs supported
          </p>
        </div>
      </div>

      {/* File List */}
      <div className="mt-6 space-y-3">
        {files.length === 0 && (
          <div className="flex items-center justify-center py-4 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No files uploaded yet
          </div>
        )}
        {files.map((fileObj) => (
          <div key={fileObj.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-emerald-200 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              {fileObj.file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="text-sm text-slate-700 truncate font-medium">{fileObj.file.name}</span>
              <span className="text-xs text-slate-400 shrink-0">
                ({(fileObj.file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={() => onRemoveFile(fileObj.id)}
              disabled={disabled}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploader;