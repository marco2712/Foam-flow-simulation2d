import React from 'react';
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

import { useSimulation } from '../hooks/useSimulation';
import { useSimStore } from '../store/simStore';

export default function DashboardLayout() {
  const { start, pause, resume, stop } = useSimulation();
  const params = useSimStore(state => state.params);
  const status = useSimStore(state => state.status);
  const history = useSimStore(state => state.history);
  
  if (!params) {
    return <div className="p-8 flex items-center justify-center text-[var(--color-on-surface)]">Connecting to engine...</div>;
  }

  // Get current time
  const current_t = history.hist_t.length > 0 ? history.hist_t[history.hist_t.length - 1] : 0;
  
  return (
    <div className="flex flex-col h-screen overflow-hidden text-[var(--color-on-surface)]">
      {/* Header bar */}
      <div className="flex-none h-16 glass-panel flex items-center justify-between px-6 z-10 m-2 mb-0">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-primary)]">FOAM FLOW LOCAL EQUILIBRIUM</h1>
        
        {/* Simulation Time Highlight */}
        <div className="flex bg-[var(--color-surface-container-highest)] px-4 py-2 rounded-lg text-sm items-center gap-6 font-semibold shadow-inner border border-[var(--color-outline-variant)]">
           <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase">Sim Time (t)</span>
              <span className="text-[var(--color-primary)] text-lg tabular-nums">{current_t.toFixed(1)} s</span>
           </div>
           <div className="w-px h-6 bg-[var(--color-outline-variant)]"></div>
           <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase">Target Time (Tmax)</span>
              <span className="tabular-nums">{params.Tmax.toFixed(0)} s</span>
           </div>
        </div>

        <SimControls onStart={() => start(params)} onPause={pause} onResume={resume} onStop={stop} />
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

        </div>
      </div>
    </div>
  );
}
