import React from 'react';
import { useSimStore } from '../../store/simStore';
import { FaPlay, FaPause, FaStop, FaDownload } from 'react-icons/fa';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function SimControls({ onStart, onPause, onResume, onStop }) {
  const { status, progress } = useSimStore();

  const handleExport = () => {
    const exportUrl = apiBase ? `${apiBase}/api/export/csv` : '/api/export/csv';
    window.open(exportUrl, '_blank');
  };

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'done';

  return (
    <div className="flex items-center gap-6">
      
      {/* Status Badge & Progress */}
      <div className="flex flex-col items-end gap-1 w-48">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[var(--color-primary)] animate-pulse' : isPaused ? 'bg-orange-400' : 'bg-gray-400'}`}></div>
           <span className="text-[var(--color-on-surface-variant)] text-xs uppercase font-bold tracking-wider">{status}</span>
        </div>
        <div className="w-full bg-[var(--color-surface-container)] h-1.5 rounded overflow-hidden">
           <div className="h-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}></div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 bg-[var(--color-surface-container)] p-1 rounded-md border border-[var(--color-outline-variant)] text-sm shadow-sm">
        {(isIdle || isPaused) ? (
          <button 
            onClick={isPaused ? onResume : onStart} 
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-primary)] transition-colors font-medium"
          >
            <FaPlay size={10} /> {isPaused ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button 
            onClick={onPause} 
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--color-surface)] text-orange-500 transition-colors font-medium"
          >
            <FaPause size={10} /> Pause
          </button>
        )}
        
        <button 
          onClick={onStop} 
          disabled={isIdle}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--color-surface)] text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <FaStop size={10} /> Stop
        </button>

        <div className="w-px h-5 bg-[var(--color-outline-variant)] mx-1"></div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] transition-colors font-medium"
          title="Export History to CSV"
        >
          <FaDownload size={10} /> CSV
        </button>
      </div>

    </div>
  );
}
