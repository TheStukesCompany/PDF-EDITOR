import React from 'react';
import { 
  MousePointer2, 
  Type, 
  Highlighter, 
  PenTool, 
  Square, 
  Download, 
  Upload,
  ZoomIn,
  ZoomOut,
  Cpu,
  Feather,
  Undo2,
  Redo2,
  TextSelect
} from 'lucide-react';
import { ToolType } from '../types';
import clsx from 'clsx';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  fileName?: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  scale,
  onZoomIn,
  onZoomOut,
  onUpload,
  onDownload,
  onAnalyze,
  isAnalyzing,
  fileName,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  
  const tools = [
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Select & Move' },
    { id: ToolType.EDIT_TEXT, icon: TextSelect, label: 'Edit Existing Text' },
    { id: ToolType.TEXT, icon: Type, label: 'Add Text' },
    { id: ToolType.HIGHLIGHT, icon: Highlighter, label: 'Highlight' },
    { id: ToolType.PEN, icon: PenTool, label: 'Draw' },
    { id: ToolType.RECTANGLE, icon: Square, label: 'Whiteout / Rectangle' },
    { id: ToolType.SIGNATURE, icon: Feather, label: 'Sign' },
  ];

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between shadow-sm shrink-0 z-30 relative">
      {/* Left: File Operations */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                Z
            </div>
            <span className="font-bold text-slate-800 hidden md:block">Zenith</span>
        </div>
        
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        
        <div className="flex items-center gap-1">
            <label className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md cursor-pointer transition-colors" title="Open PDF">
                <Upload size={18} />
                <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
            </label>
            <button onClick={onDownload} className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors" title="Save PDF">
                <Download size={18} />
            </button>
        </div>

        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button 
                onClick={onUndo} 
                disabled={!canUndo}
                className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors disabled:opacity-30"
                title="Undo"
            >
                <Undo2 size={18} />
            </button>
            <button 
                onClick={onRedo} 
                disabled={!canRedo}
                className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors disabled:opacity-30"
                title="Redo"
            >
                <Redo2 size={18} />
            </button>
        </div>
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg shadow-inner">
        {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    title={tool.label}
                    className={clsx(
                        "p-2 rounded-md transition-all",
                        isActive ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5 scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                    )}
                >
                    <Icon size={20} />
                </button>
            );
        })}
      </div>

      {/* Right: Zoom & AI */}
      <div className="flex items-center gap-3">
         <div className="flex items-center bg-slate-100 rounded-md p-1 border border-slate-200">
            <button onClick={onZoomOut} className="p-1.5 hover:bg-white rounded text-slate-600 hover:shadow-sm"><ZoomOut size={16} /></button>
            <span className="w-12 text-center text-xs font-mono text-slate-600">{Math.round(scale * 100)}%</span>
            <button onClick={onZoomIn} className="p-1.5 hover:bg-white rounded text-slate-600 hover:shadow-sm"><ZoomIn size={16} /></button>
         </div>
         
         <button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border",
                isAnalyzing 
                    ? "bg-purple-50 text-purple-500 border-purple-200" 
                    : "bg-white text-slate-700 border-slate-300 hover:border-purple-300 hover:text-purple-600 hover:shadow-md"
            )}
        >
            <Cpu size={16} className={isAnalyzing ? "animate-spin" : "text-purple-500"} />
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Insights'}</span>
         </button>
      </div>
    </div>
  );
};