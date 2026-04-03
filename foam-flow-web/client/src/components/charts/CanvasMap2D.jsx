import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Renders a 2D field with BILINEAR interpolation matching matplotlib's
 *   imshow(arr, interpolation='bilinear', origin='lower')
 *
 * Renders at SCALE × native resolution so the result is smooth and
 * crisp regardless of the CSS container size.
 *
 * Layout convention (matches matplotlib origin='lower'):
 *   - j=0  (z = -d, physical bottom) → drawn at BOTTOM of canvas
 *   - j=Nz (z = +d, physical top)    → drawn at TOP of canvas
 */
const SCALE = 4; // render at 4× native grid resolution → smooth like matplotlib

export default function CanvasMap2D({
  field, Nx, Nz, d,
  vmin, vmax,
  colormapInterpolator,
  showZeroLine
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!field || field.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const Ncols = Nx + 1;   // source cols
    const Nrows = Nz + 1;   // source rows

    const outW = Ncols * SCALE;
    const outH = Nrows * SCALE;

    canvas.width  = outW;
    canvas.height = outH;

    const range = (vmax - vmin) || 1;
    const imgData = ctx.createImageData(outW, outH);

    // Pre-cache colormap samples for performance (1024 entries)
    const LUT_SIZE = 1024;
    const lut = new Uint8Array(LUT_SIZE * 3);
    for (let k = 0; k < LUT_SIZE; k++) {
      const c = d3.rgb(colormapInterpolator(k / (LUT_SIZE - 1)));
      lut[k * 3]     = c.r;
      lut[k * 3 + 1] = c.g;
      lut[k * 3 + 2] = c.b;
    }

    function getColor(normT) {
      const k = Math.max(0, Math.min(Math.round(normT * (LUT_SIZE - 1)), LUT_SIZE - 1));
      return [lut[k * 3], lut[k * 3 + 1], lut[k * 3 + 2]];
    }

    // Helper: get field value at grid index (i, j), clamped to boundaries
    function fieldVal(i, j) {
      const ic = Math.max(0, Math.min(i, Nx));
      const jc = Math.max(0, Math.min(j, Nz));
      return field[jc * Ncols + ic];
    }

    // Render each output pixel using bilinear interpolation
    for (let py = 0; py < outH; py++) {
      // py=0 is top of canvas → physical top (j=Nz)
      // py=outH-1 is bottom of canvas → physical bottom (j=0)
      // Map py → continuous j in [0, Nz]
      const j_real = Nz - (py / (outH - 1)) * Nz;

      const j0 = Math.floor(j_real);
      const j1 = Math.min(j0 + 1, Nz);
      const tj = j_real - j0;

      for (let px = 0; px < outW; px++) {
        // px=0 → i=0, px=outW-1 → i=Nx
        const i_real = (px / (outW - 1)) * Nx;

        const i0 = Math.floor(i_real);
        const i1 = Math.min(i0 + 1, Nx);
        const ti = i_real - i0;

        // Bilinear interpolation of the field value
        const v00 = fieldVal(i0, j0);
        const v10 = fieldVal(i1, j0);
        const v01 = fieldVal(i0, j1);
        const v11 = fieldVal(i1, j1);

        const val =
          v00 * (1 - ti) * (1 - tj) +
          v10 *  ti      * (1 - tj) +
          v01 * (1 - ti) *  tj      +
          v11 *  ti      *  tj;

        const normT = Math.max(0, Math.min((val - vmin) / range, 1));
        const [r, g, b] = getColor(normT);

        const pxIdx = (py * outW + px) * 4;
        imgData.data[pxIdx]     = r;
        imgData.data[pxIdx + 1] = g;
        imgData.data[pxIdx + 2] = b;
        imgData.data[pxIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // White dashed line at z=0 interface (like matplotlib axhline(0, color='white', ls='--'))
    if (showZeroLine) {
      // Physical z=0 corresponds to j = Nz/2
      // In canvas: py = outH - (Nz/2 / Nz) * outH = outH/2
      const py0 = Math.round(outH / 2);
      ctx.save();
      ctx.setLineDash([Math.round(outW / 30), Math.round(outW / 50)]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(1, SCALE);
      ctx.beginPath();
      ctx.moveTo(0, py0);
      ctx.lineTo(outW, py0);
      ctx.stroke();
      ctx.restore();
    }

  }, [field, Nx, Nz, vmin, vmax, colormapInterpolator, showZeroLine]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ imageRendering: 'auto' }}
    />
  );
}
