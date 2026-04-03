import React from 'react';
import CanvasMap2D from './CanvasMap2D';
import { useSimStore } from '../../store/simStore';
import * as d3 from 'd3';

/**
 * Foam texture map matching Python:
 *   ax.imshow(nD_arr, cmap='plasma', norm=Normalize(vmin=0.0, vmax=1.0))
 *
 * plasma: 0→dark purple, 0.5→orange-red, 1.0→bright yellow
 *   nD=0 (no foam, unswept by foam front) → dark purple
 *   nD=1 (full foam) → bright yellow
 *
 * Note: In local_eq mode, nD_LE(Sw_plus=0.72, Sw_star=0.37) ≈ 1.0 → yellow everywhere initially
 *       After injection: nD_LE(Sw_minus=0.372) = tanh(400*0.002) ≈ 0.664 → orange on left
 */
export default function FoamTextureMap() {
  const latestFrame = useSimStore(state => state.latestFrame);
  const params = useSimStore(state => state.params);

  if (!latestFrame || !params) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)]">
        Esperando simulación...
      </div>
    );
  }

  const { Nx, Nz, d } = params;

  return (
    <CanvasMap2D
      field={latestFrame.nD}
      Nx={Nx} Nz={Nz} d={d}
      vmin={0.0}
      vmax={1.0}
      colormapInterpolator={d3.interpolatePlasma}
      showZeroLine={true}
    />
  );
}
