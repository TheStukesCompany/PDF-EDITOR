import React from 'react';
import { ToolType, ToolSettings, Annotation } from '../types';
import { Trash2, Type, AlignLeft, Bold, Italic } from 'lucide-react';

interface PropertiesBarProps {
  activeTool: ToolType;
  settings: ToolSettings;
  onSettingsChange: (settings: ToolSettings) => void;
  selectedAnnotation: Annotation | null;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation: (ann: Annotation) => void;
}

export const PropertiesBar: React.FC<PropertiesBarProps> = ({
  activeTool,
  settings,
  onSettingsChange,
  selectedAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation
}) => {
  // If an annotation is selected, we show its properties.
  // Otherwise, we show tool defaults.
  
  const isTextTool = activeTool === ToolType.TEXT || activeTool === ToolType.EDIT_TEXT || selectedAnnotation?.type === ToolType.TEXT;
  const isShapeTool = activeTool === ToolType.RECTANGLE || activeTool === ToolType.PEN || activeTool === ToolType.HIGHLIGHT;
  
  if (!selectedAnnotation && !isTextTool && !isShapeTool) return null;

  const handleChange = (key: keyof ToolSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    
    if (selectedAnnotation) {
      // Map settings to annotation properties
      const updates: Partial<Annotation> = {};
      if (key === 'color') updates.color = value;
      if (key === 'fontSize') updates.fontSize = Number(value);
      if (key === 'fontFamily') updates.fontFamily = value;
      
      onUpdateAnnotation({ ...selectedAnnotation, ...updates });
    }
  };

  const colors = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#FFA500', '#800080', '#FFFFFF'];
  const fontSizes = [8, 10, 11, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72];
  
  const fontFamilies = [
    "Helvetica",
    "Arial", 
    "Times New Roman", 
    "Courier New", 
    "Verdana", 
    "Georgia", 
    "Tahoma", 
    "Trebuchet MS", 
    "Impact", 
    "Comic Sans MS"
  ];

  return (
    <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-6 shadow-inner animate-fade-in z-10 w-full overflow-x-auto">
      
      {/* Context Label */}
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 pr-4 mr-2 whitespace-nowrap">
        {selectedAnnotation ? 'Editing Selection' : 'Tool Properties'}
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-500 font-medium">Color:</span>
        <div className="flex gap-1">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => handleChange('color', c)}
              className={`w-5 h-5 rounded-full border border-slate-300 focus:outline-none ring-2 ring-offset-1 ${
                (selectedAnnotation ? selectedAnnotation.color === c : settings.color === c) 
                ? 'ring-blue-500' 
                : 'ring-transparent hover:ring-slate-300'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <input 
            type="color" 
            value={selectedAnnotation?.color || settings.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-6 h-6 p-0 border-0 rounded bg-transparent cursor-pointer ml-1"
          />
        </div>
      </div>

      {/* Text Properties */}
      {isTextTool && (
        <>
          <div className="h-6 w-px bg-slate-300 mx-2"></div>
          
          {/* Font Family */}
          <div className="flex items-center gap-2 shrink-0">
             <select
                value={selectedAnnotation?.fontFamily || settings.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                className="h-7 text-sm border-slate-300 rounded-md border px-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-32"
             >
                {fontFamilies.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
             </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-2 shrink-0">
            <Type size={16} className="text-slate-500" />
            <select 
              value={selectedAnnotation?.fontSize || settings.fontSize}
              onChange={(e) => handleChange('fontSize', Number(e.target.value))}
              className="h-7 text-sm border-slate-300 rounded-md border px-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {fontSizes.map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shrink-0">
             <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Bold size={14} /></button>
             <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Italic size={14} /></button>
             <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><AlignLeft size={14} /></button>
          </div>
        </>
      )}
      
      {/* Selection Actions */}
      {selectedAnnotation && (
         <>
            <div className="flex-1"></div>
            <button 
                onClick={() => onDeleteAnnotation(selectedAnnotation.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors ml-auto shrink-0"
            >
                <Trash2 size={16} />
                Delete
            </button>
         </>
      )}
    </div>
  );
};