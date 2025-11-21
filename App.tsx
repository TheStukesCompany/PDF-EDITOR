import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PropertiesBar } from './components/PropertiesBar';
import { ToolType, Annotation, Position, ToolSettings } from './types';
import { readFileAsArrayBuffer, savePDF } from './utils/pdfUtils';
import { analyzePDFPage } from './services/geminiService';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

// @ts-ignore - pdfjs is loaded via CDN
const pdfjs = window.pdfjsLib;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // PDFJS DocumentProxy
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null); // Raw bytes for pdf-lib
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const annotations = history[historyIndex] || [];

  const setAnnotations = (newAnnotations: Annotation[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
      if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const redo = () => {
      if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };
  
  // Tool Settings
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
      color: '#000000',
      fontSize: 16,
      fontFamily: 'Helvetica',
      strokeWidth: 2
  });

  // Selection
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId) || null;

  // Analysis State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{summary: string, keyPoints: string[]} | null>(null);

  // Canvas & Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Used for text input position/value while editing
  const [editingText, setEditingText] = useState<{id: string, text: string} | null>(null);

  // Load PDF Document
  const loadPDF = async (arrayBuffer: ArrayBuffer) => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      setPdfBytes(arrayBuffer);
      // Reset History
      setHistory([[]]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try another file.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      const buffer = await readFileAsArrayBuffer(file);
      loadPDF(buffer);
    }
  };

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Render Text Layer
    if (textLayerRef.current) {
        textLayerRef.current.innerHTML = ''; // Clear previous
        const textContent = await page.getTextContent();
        pdfjs.renderTextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
            textDivs: []
        });
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Click handler for "Edit Text" tool interaction with PDF text layer
  const handleTextLayerClick = (e: React.MouseEvent) => {
      if (activeTool !== ToolType.EDIT_TEXT) return;
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'SPAN' && wrapperRef.current) {
          const rect = target.getBoundingClientRect();
          const wrapperRect = wrapperRef.current.getBoundingClientRect();
          
          // Calculate relative position in PDF coordinates
          const relativeX = (rect.left - wrapperRect.left) / scale;
          const relativeY = (rect.top - wrapperRect.top) / scale;
          const width = rect.width / scale;
          const height = rect.height / scale;
          
          const textContent = target.textContent || "";
          
          // Create Whiteout
          const whiteoutId = Date.now().toString() + "_bg";
          const whiteout: Annotation = {
              id: whiteoutId,
              type: ToolType.RECTANGLE,
              pageIndex: currentPage - 1,
              x: relativeX,
              y: relativeY,
              width: width,
              height: height,
              color: '#ffffff' // White background
          };
          
          // Create New Text
          const newTextId = Date.now().toString() + "_text";
          const newText: Annotation = {
              id: newTextId,
              type: ToolType.TEXT,
              pageIndex: currentPage - 1,
              x: relativeX,
              y: relativeY + (height * 0.1), // slight adjustment for baseline
              content: textContent,
              fontSize: (height * 0.8), // Estimate font size from height
              fontFamily: toolSettings.fontFamily,
              color: '#000000'
          };

          const newAnns = [...annotations, whiteout, newText];
          setAnnotations(newAnns);
          setSelectedAnnotationId(newTextId);
          
          // Switch to select tool so they can edit the text immediately
          setActiveTool(ToolType.SELECT);
      }
  };

  // General Canvas Mouse Handlers
  const getMousePos = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!pdfDoc || activeTool === ToolType.EDIT_TEXT) return;
    const pos = getMousePos(e);
    
    // Deselect unless clicking an annotation
    if (e.target === wrapperRef.current || e.target === canvasRef.current) {
         if(activeTool === ToolType.SELECT) {
             setSelectedAnnotationId(null);
         }
    }

    if (activeTool === ToolType.PEN || activeTool === ToolType.HIGHLIGHT) {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (activeTool === ToolType.TEXT) {
      // Create text annotation immediately and enter editing mode
      const id = Date.now().toString();
      const newAnn: Annotation = {
          id,
          type: ToolType.TEXT,
          pageIndex: currentPage - 1,
          x: pos.x,
          y: pos.y,
          content: "Type here",
          color: toolSettings.color,
          fontSize: toolSettings.fontSize,
          fontFamily: toolSettings.fontFamily
      };
      setAnnotations([...annotations, newAnn]);
      setSelectedAnnotationId(id);
      setActiveTool(ToolType.SELECT); // Switch to select after placement
    } else if (activeTool === ToolType.RECTANGLE) {
        const newAnn: Annotation = {
            id: Date.now().toString(),
            type: ToolType.RECTANGLE,
            pageIndex: currentPage - 1,
            x: pos.x,
            y: pos.y,
            width: 100,
            height: 50,
            color: toolSettings.color === '#000000' ? '#ffffff' : toolSettings.color // Default white if black selected for whiteout
        };
        setAnnotations([...annotations, newAnn]);
        setActiveTool(ToolType.SELECT);
    } else if (activeTool === ToolType.SIGNATURE) {
        const signatureData = createSignaturePlaceholder();
        const newAnn: Annotation = {
            id: Date.now().toString(),
            type: ToolType.SIGNATURE,
            pageIndex: currentPage - 1,
            x: pos.x,
            y: pos.y,
            width: 150,
            height: 60,
            image: signatureData
        };
        setAnnotations([...annotations, newAnn]);
        setSelectedAnnotationId(newAnn.id);
        setActiveTool(ToolType.SELECT);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setCurrentPath(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      const newAnn: Annotation = {
        id: Date.now().toString(),
        type: activeTool,
        pageIndex: currentPage - 1,
        x: 0,
        y: 0,
        points: currentPath,
        color: activeTool === ToolType.HIGHLIGHT ? '#FFFF00' : toolSettings.color
      };
      setAnnotations([...annotations, newAnn]);
      setIsDrawing(false);
      setCurrentPath([]);
    }
  };

  // Annotation Editing
  const updateAnnotation = (updatedAnn: Annotation) => {
      const newAnns = annotations.map(a => a.id === updatedAnn.id ? updatedAnn : a);
      setAnnotations(newAnns); // Handles history
  };

  const deleteAnnotation = (id: string) => {
      const newAnns = annotations.filter(a => a.id !== id);
      setAnnotations(newAnns);
      setSelectedAnnotationId(null);
  };

  const createSignaturePlaceholder = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if(ctx) {
          ctx.font = "30px cursive";
          ctx.fillStyle = "blue";
          ctx.fillText("Signed", 20, 50);
      }
      return canvas.toDataURL();
  }

  const handleSave = async () => {
      if (!pdfBytes) return;
      const newBytes = await savePDF(pdfBytes, annotations);
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (file?.name.replace('.pdf', '') || 'document') + '_edited.pdf';
      a.click();
  };

  const handleAnalyze = async () => {
      if (!canvasRef.current) return;
      setIsAnalyzing(true);
      setIsSidebarOpen(true);
      try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          const result = await analyzePDFPage(dataUrl);
          setAnalysisResult(result);
      } catch (err) {
          console.error(err);
      } finally {
          setIsAnalyzing(false);
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative">
      <Toolbar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool} 
        scale={scale}
        onZoomIn={() => setScale(s => Math.min(s + 0.25, 3))}
        onZoomOut={() => setScale(s => Math.max(s - 0.25, 0.5))}
        onUpload={handleUpload}
        onDownload={handleSave}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        fileName={file?.name}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
      />
      
      <PropertiesBar 
          activeTool={activeTool}
          settings={toolSettings}
          onSettingsChange={setToolSettings}
          selectedAnnotation={selectedAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          onUpdateAnnotation={updateAnnotation}
      />

      <div className="flex-1 relative overflow-hidden flex">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto flex justify-center p-8 bg-slate-200/50 relative custom-scrollbar">
            {pdfDoc ? (
                <div 
                    className={clsx(
                        "relative shadow-lg transition-transform duration-200 origin-top",
                        activeTool === ToolType.EDIT_TEXT ? "editing-mode cursor-text" : "cursor-default"
                    )}
                    style={{ width: 'fit-content', height: 'fit-content' }}
                >
                    {/* 1. Rendering Layer */}
                    <canvas 
                        ref={canvasRef} 
                        className="bg-white block" 
                    />
                    
                    {/* 2. Text Selection Layer (PDF.js) */}
                    <div 
                        ref={textLayerRef}
                        className="textLayer"
                        onClick={handleTextLayerClick}
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                    />

                    {/* 3. Interaction/Annotation Layer */}
                    <div 
                        ref={wrapperRef}
                        className="absolute top-0 left-0 w-full h-full"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ pointerEvents: activeTool === ToolType.EDIT_TEXT ? 'none' : 'auto' }}
                    >
                        {/* Render Annotations */}
                        {annotations.filter(a => a.pageIndex === currentPage - 1).map(ann => {
                            const isSelected = selectedAnnotationId === ann.id;
                            
                            if (ann.type === ToolType.TEXT) {
                                return (
                                    <div 
                                        key={ann.id}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setSelectedAnnotationId(ann.id);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: ann.x * scale,
                                            top: ann.y * scale,
                                            color: ann.color,
                                            fontSize: (ann.fontSize || 12) * scale,
                                            fontFamily: ann.fontFamily || 'Helvetica, sans-serif',
                                            cursor: activeTool === ToolType.SELECT ? 'move' : 'default',
                                            border: isSelected ? '1px dashed blue' : 'none',
                                            padding: '2px',
                                            whiteSpace: 'pre'
                                        }}
                                    >
                                        {isSelected ? (
                                            <input 
                                                autoFocus
                                                value={ann.content}
                                                onChange={(e) => updateAnnotation({...ann, content: e.target.value})}
                                                className="bg-transparent outline-none w-full h-full p-0 m-0 border-none font-inherit text-inherit"
                                                style={{ minWidth: '50px', fontFamily: 'inherit' }}
                                            />
                                        ) : ann.content}
                                    </div>
                                )
                            }
                            
                            if (ann.type === ToolType.RECTANGLE) {
                                return (
                                    <div key={ann.id} 
                                        onMouseDown={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}
                                        style={{
                                            position: 'absolute',
                                            left: ann.x * scale,
                                            top: ann.y * scale,
                                            width: (ann.width || 0) * scale,
                                            height: (ann.height || 0) * scale,
                                            backgroundColor: ann.color,
                                            border: isSelected ? '2px solid blue' : 'none',
                                        }} 
                                    />
                                )
                            }
                            
                             if (ann.type === ToolType.SIGNATURE && ann.image) {
                                return (
                                    <img key={ann.id} 
                                        src={ann.image} 
                                        onMouseDown={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}
                                        style={{
                                            position: 'absolute',
                                            left: ann.x * scale,
                                            top: ann.y * scale,
                                            width: (ann.width || 0) * scale,
                                            height: (ann.height || 0) * scale,
                                            border: isSelected ? '2px solid blue' : 'none',
                                        }} 
                                        alt="Signature" 
                                    />
                                )
                            }

                            return null; 
                        })}
                        
                        {/* SVG for Paths */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            {annotations.filter(a => (a.pageIndex === currentPage - 1) && (a.type === ToolType.PEN || a.type === ToolType.HIGHLIGHT)).map(ann => (
                                <polyline
                                    key={ann.id}
                                    points={ann.points?.map(p => `${p.x * scale},${p.y * scale}`).join(' ')}
                                    stroke={ann.color}
                                    strokeWidth={ann.type === ToolType.HIGHLIGHT ? 14 * scale : 2 * scale}
                                    strokeOpacity={ann.type === ToolType.HIGHLIGHT ? 0.4 : 1}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ cursor: 'pointer', pointerEvents: 'visibleStroke' }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedAnnotationId(ann.id);
                                    }}
                                />
                            ))}
                            {isDrawing && (
                                <polyline
                                    points={currentPath.map(p => `${p.x * scale},${p.y * scale}`).join(' ')}
                                    stroke={activeTool === ToolType.HIGHLIGHT ? '#FFFF00' : toolSettings.color}
                                    strokeWidth={activeTool === ToolType.HIGHLIGHT ? 14 * scale : 2 * scale}
                                    strokeOpacity={activeTool === ToolType.HIGHLIGHT ? 0.4 : 1}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                        </svg>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-32 h-40 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center mb-4 bg-white shadow-sm">
                        <span className="text-4xl font-light">PDF</span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-600">Zenith PDF Editor</h2>
                    <p className="text-sm mt-2 text-center max-w-xs">
                        Professional PDF editing with Gemini AI power. Import, Edit, Sign, and Analyze.
                    </p>
                    <label className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer font-medium shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                        <span>Open Document</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            )}
        </div>

        {/* Page Navigation */}
        {pdfDoc && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-4 border border-slate-200 z-20">
                <button 
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 hover:bg-slate-100 rounded-full disabled:opacity-30 text-slate-700"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="font-mono text-sm text-slate-700 font-medium">
                    {currentPage} / {totalPages}
                </span>
                <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 hover:bg-slate-100 rounded-full disabled:opacity-30 text-slate-700"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        )}
        
        {/* Sidebar */}
        <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            analysis={analysisResult}
        />
      </div>
    </div>
  );
};

export default App;