import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Renders a 2D field (flat Float64Array, row-major) as a color map on canvas.
 * Matches matplotlib imshow(origin='lower') orientation:
 *   - Row j=0 (z = -d, bottom physical) drawn at BOTTOM of canvas
 *   - Row j=Nz (z = +d, top physical) drawn at TOP of canvas
 */
export default function CanvasMap2D({ field, Nx, Nz, d, vmin, vmax, colormapInterpolator, showZeroLine, label }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!field || field.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const Ncols = Nx + 1;
    const Nrows = Nz + 1;

    // Draw at native resolution first
    canvas.width  = Ncols;
    canvas.height = Nrows;

    // Build color scale: vmin → colormapInterpolator(0), vmax → colormapInterpolator(1)
    const range = vmax - vmin || 1;
    const imgData = ctx.createImageData(Ncols, Nrows);

    for (let j = 0; j <= Nz; j++) {
      // origin='lower': row j=0 (physical bottom) → canvas row (Nrows-1) (pixel top for inverted canvas)
      // We want j=0 at bottom of display → displayRow = Nz - j (so j=0 → displayRow=Nz, bottom)
      const displayRow = Nz - j;
      for (let i = 0; i <= Nx; i++) {
        const val = field[j * Ncols + i];
        // Normalize [vmin, vmax] → [0, 1]
        const t = Math.max(0, Math.min((val - vmin) / range, 1));
        const hexColor = colormapInterpolator(t);
        const rgb = d3.rgb(hexColor);

        const pxIdx = (displayRow * Ncols + i) * 4;
        imgData.data[pxIdx]     = rgb.r || 0;
        imgData.data[pxIdx + 1] = rgb.g || 0;
        imgData.data[pxIdx + 2] = rgb.b || 0;
        imgData.data[pxIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw z=0 interface line (white dashed, like Python: axhline(0, color='white', lw=1.5, ls='--'))
    if (showZeroLine) {
      // z=0 is at the physical middle. In our index space, j=Nz/2 corresponds to z≈0
      const midJ = Math.floor(Nz / 2);
      const displayMidRow = Nz - midJ; // canvas row for z=0

      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, displayMidRow + 0.5);
      ctx.lineTo(Ncols, displayMidRow + 0.5);
      ctx.stroke();
      ctx.restore();
    }

  }, [field, Nx, Nz, vmin, vmax, colormapInterpolator, showZeroLine]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ imageRendering: 'auto', objectFit: 'fill' }}
    />
  );
}
