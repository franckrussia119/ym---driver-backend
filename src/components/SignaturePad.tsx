import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Edit3 } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  value: string;
  nom: string;
  date: string;
  onSave: (nom: string, signatureDataUrl: string, date: string) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  value,
  nom,
  date,
  onSave,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentNom, setCurrentNom] = useState(nom);
  const [currentDate, setCurrentDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(!value);

  useEffect(() => {
    setCurrentNom(nom);
    setCurrentDate(date || new Date().toISOString().split('T')[0]);
  }, [nom, date]);

  useEffect(() => {
    if (isEditing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isEditing]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !isEditing) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || !isEditing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleConfirm = () => {
    let dataUrl = value;
    if (canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png');
    }
    onSave(currentNom, dataUrl, currentDate);
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm uppercase tracking-wide">{label}</span>
        {value && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-medium cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> Modifier
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet</label>
          <input
            type="text"
            value={currentNom}
            onChange={(e) => setCurrentNom(e.target.value)}
            disabled={disabled || !isEditing}
            placeholder="Nom & Prénom"
            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Signature manuscrite</label>
          {isEditing ? (
            <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={340}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 touch-none cursor-crosshair bg-white"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs flex items-center gap-1 cursor-pointer"
                  title="Effacer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute bottom-1 left-2 text-[10px] text-slate-400 pointer-events-none">
                Dessinez votre signature ci-dessus
              </div>
            </div>
          ) : (
            <div className="h-28 border border-slate-200 rounded-lg bg-white flex items-center justify-center p-2">
              {value ? (
                <img src={value} alt={`Signature ${label}`} className="max-h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400 italic">Aucune signature enregistrée</span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            disabled={disabled || !isEditing}
            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
          />
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full mt-2 py-2 px-3 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" /> Enregistrer la signature
          </button>
        )}
      </div>
    </div>
  );
};
