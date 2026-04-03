import React from 'react';
import CanvasMap2D from './CanvasMap2D';
import { useSimStore } from '../../store/simStore';
import * as d3 from 'd3';

/**
 * Saturation map matching Python:
 *   ax.imshow(Sw_arr, cmap='RdYlBu_r', norm=Normalize(vmin=Sw_minus-0.01, vmax=Sw_plus+0.01))
 *
 * RdYlBu_r: low values → BLUE (cold), high values → RED (warm)
 *   Sw_minus=0.372 (injected) → BLUE
 *   Sw_plus=0.72  (initial)  → RED
 */
export default function SaturationMap() {
  const latestFrame = useSimStore(state => state.latestFrame);
  const params = useSimStore(state => state.params);

  if (!latestFrame || !params) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)]">
        Esperando simulación...
      </div>
    );
  }

  const { Sw_plus, Sw_minus, Nx, Nz, d } = params;

  // RdYlBu_r: t=0 → blue (low=Sw_minus), t=1 → red (high=Sw_plus)
  // d3.interpolateRdYlBu(0) = RED, d3.interpolateRdYlBu(1) = BLUE
  // So we need: normalizedT → d3.interpolateRdYlBu(1 - normalizedT)
  const colormap = (t) => d3.interpolateRdYlBu(1 - t);

  return (
    <CanvasMap2D
      field={latestFrame.Sw}
      Nx={Nx} Nz={Nz} d={d}
      vmin={Sw_minus - 0.01}
      vmax={Sw_plus + 0.01}
      colormapInterpolator={colormap}
      showZeroLine={true}
    />
  );
}
