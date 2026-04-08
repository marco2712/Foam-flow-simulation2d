import React, { useEffect, useState } from 'react';
import ParameterPanel from '../components/ParameterPanel/ParameterPanel';
import SimControls from '../components/controls/SimControls';
import SaturationMap from '../components/charts/SaturationMap';
import FoamTextureMap from '../components/charts/FoamTextureMap';
import Profiles1D from '../components/charts/Profiles1D';
import FrontPosition from '../components/charts/FrontPosition';
import FrontVelocity2D from '../components/charts/FrontVelocity2D';
import CrossflowMap from '../components/charts/CrossflowMap';
import FrontDistance from '../components/charts/FrontDistance';
import CrossTransfer from '../components/charts/CrossTransfer';
import PressureProfile from '../components/charts/PressureProfile';
import PressureExtra1D from '../components/charts/PressureExtra1D';

import { useSimulation } from '../hooks/useSimulation';
import { useSimStore } from '../store/simStore';

export default function DashboardLayout() {
  const { start, pause, resume, stop } = useSimulation();
  const params = useSimStore(state => state.params);
  const history = useSimStore(state => state.history);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (params) return;
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [params]);
  
  if (!params) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-[var(--color-on-surface)]">
        <div className="glass-panel rounded-xl p-8 w-full max-w-md text-center border border-[var(--color-outline-variant)]/40">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full border-2 border-[var(--color-outline-variant)] relative">
            <div className="absolute inset-[7px] rounded-full border border-[var(--color-outline-variant)]/50" />
            <div className="absolute left-1/2 top-1/2 w-[2px] h-4 bg-[var(--color-primary)] origin-bottom -translate-x-1/2 -translate-y-full animate-spin" style={{ animationDuration: '1.5s' }} />
            <div className="absolute left-1/2 top-1/2 w-[2px] h-5 bg-[var(--color-secondary)] origin-bottom -translate-x-1/2 -translate-y-full animate-spin" style={{ animationDuration: '12s' }} />
            <div className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-[var(--color-on-surface)] -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connecting to engine...</h2>
          <p className="text-sm text-[var(--color-on-surface-variant)]">Establishing secure link with simulation backend.</p>
          <p className="mt-3 font-mono text-sm text-[var(--color-primary)]">{elapsedSec}s elapsed</p>
        </div>
      </div>
    );
  }

  // Get current time
  const current_t = history.hist_t.length > 0 ? history.hist_t[history.hist_t.length - 1] : 0;
  const tmax = Math.max(params.Tmax || 1, 1);
  const progressPct = Math.max(0, Math.min((current_t / tmax) * 100, 100));
  
  return (
    <div className="flex flex-col h-screen overflow-hidden text-[var(--color-on-surface)]">
      {/* Header bar */}
      <div className="flex-none h-16 glass-panel flex items-center gap-4 px-4 md:px-6 z-10 m-2 mb-0 overflow-hidden">
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-[var(--color-primary)] min-w-0 flex-1 truncate">FOAM FLOW LOCAL EQUILIBRIUM</h1>
        
        {/* Simulation Time Highlight */}
        <div className="hidden lg:flex min-w-[340px] max-w-[400px] flex-col bg-[var(--color-surface-container-highest)] px-3 py-2 rounded-lg border border-[var(--color-outline-variant)] shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">Simulation Clock</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">t</span>
              <span className="text-base font-bold tabular-nums text-[var(--color-primary)] truncate">{current_t.toFixed(1)} s</span>
            </div>
            <div className="text-[var(--color-on-surface-variant)] text-xs">/</div>
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">Tmax</span>
              <span className="text-base font-semibold tabular-nums text-[var(--color-on-surface)] truncate">{params.Tmax.toFixed(0)} s</span>
            </div>
            <span className="text-xs tabular-nums text-[var(--color-on-surface-variant)]">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden border border-[var(--color-outline-variant)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-container))',
              }}
            />
          </div>
        </div>

        <div className="shrink-0">
          <SimControls onStart={() => start(params)} onPause={pause} onResume={resume} onStop={stop} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-2 gap-2">
        {/* Left Sidebar: Parameter Panel */}
        <div className="w-80 flex-none overflow-y-auto glass-panel p-4 pb-12 shadow">
          <ParameterPanel />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-2 gap-6 relative">
          
          {/* Top Main Section: Stacked 2D Maps (Sw and nD) */}
          <div className="grid grid-cols-1 gap-6 w-full max-w-5xl mx-auto">
            <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[350px]">
              <div className="flex justify-between w-full mb-4 items-center">
                 <h2 className="text-lg font-bold">Water Saturation S_w(x, z)</h2>
                 <span className="text-xs text-[var(--color-on-surface-variant)]">Red = High, Blue = Low</span>
              </div>
              <div className="flex-1 w-full bg-[var(--color-surface-container-low)] rounded overflow-hidden relative">
                <SaturationMap />
              </div>
            </div>
            
            <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[350px]">
              <div className="flex justify-between w-full mb-4 items-center">
                 <h2 className="text-lg font-bold">Foam Texture n_D(x, z)</h2>
                 <span className="text-xs text-[var(--color-on-surface-variant)]">Yellow = High, Purple = Low</span>
              </div>
              <div className="flex-1 w-full bg-[var(--color-surface-container-low)] rounded overflow-hidden relative">
                <FoamTextureMap />
              </div>
            </div>
          </div>

          {/* Bottom Section: Smaller Metrics & Secondary Charts */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mx-auto pb-8">
            <div className="glass-panel p-3 min-h-[220px]">
              <Profiles1D />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
              <FrontPosition />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
               <FrontVelocity2D />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
               <FrontDistance />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
               <CrossTransfer />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
               <PressureProfile />
            </div>
          </div>

          {/* Extra 1D charts from base-code style metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-6xl mx-auto pb-8">
            <div className="glass-panel p-3 min-h-[280px]">
              <CrossflowMap />
            </div>
            <div className="glass-panel p-3 min-h-[220px]">
              <PressureExtra1D />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
