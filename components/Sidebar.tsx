import React from 'react';
import { X, Sparkles, List, FileText } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: { summary: string; keyPoints: string[] } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, analysis }) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full overflow-y-auto shadow-xl absolute right-0 top-0 z-30 flex flex-col transition-transform duration-300">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                <Sparkles size={18} />
                <span>Gemini Insights</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 flex-1">
            {!analysis ? (
                <div className="text-center text-slate-500 mt-10">
                    <p>Select "Smart Analysis" in the toolbar to analyze the current PDF page with Gemini AI.</p>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText size={16} /> Summary
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {analysis.summary}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <List size={16} /> Key Features
                        </h3>
                        <ul className="space-y-2">
                            {analysis.keyPoints.map((point, i) => (
                                <li key={i} className="text-sm text-slate-700 flex gap-2 items-start">
                                    <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    <span className="bg-white p-2 rounded-md shadow-sm border border-slate-100 w-full">
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
