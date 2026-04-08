import React, { useMemo } from 'react';
import * as d3 from 'd3';
import CanvasMap2D from './CanvasMap2D';
import Map2DWithAxes from './Map2DWithAxes';
import { useSimStore } from '../../store/simStore';

function clip(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function krw(Sw, params) {
  const clipped = clip((Sw - params.Swc) / (1 - params.Swc - params.Sgr), 0, 1);
  return 0.2 * Math.pow(clipped, 4.2);
}

function krg0(Sw, params) {
  const clipped = clip((1 - Sw - params.Sgr) / (1 - params.Swc - params.Sgr), 0, 1);
  return 0.94 * Math.pow(clipped, 1.3);
}

function mrf(nD) {
  return clip(18500.0 * nD + 1.0, 1.0, 1e7);
}

function fw(Sw, nD, k_b, params) {
  const lw = (k_b * krw(Sw, params)) / params.mu_w;
  const lg = (k_b * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return lw / (lw + lg + 1e-30);
}

function pc(Sw, k_b, phi_b, params) {
  const term1 = params.sigma * Math.sqrt(phi_b / k_b) * 0.022;
  const term2 = Math.pow(clip(1 - Sw - params.Sgr, 1e-8, 1), params.c_cap);
  const term3 = clip(Sw - params.Swc, 1e-8, 1);
  return (term1 * term2) / term3;
}

function dPc_dSw(Sw, k_b, phi_b, params) {
  const h = 1e-5;
  const Swp = clip(Sw + h, params.Swc + 1e-6, 1 - params.Sgr - 1e-6);
  const Swm = clip(Sw - h, params.Swc + 1e-6, 1 - params.Sgr - 1e-6);
  return (pc(Swp, k_b, phi_b, params) - pc(Swm, k_b, phi_b, params)) / (2 * h);
}

function dCap(Sw, nD, k_b, phi_b, params) {
  const lg = (k_b * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return -lg * fw(Sw, nD, k_b, params) * dPc_dSw(Sw, k_b, phi_b, params);
}

function buildArrowPath(xPct, norm, lengthPct) {
  const y0 = 50;
  const y1 = y0 - norm * lengthPct;
  return {
    x: xPct,
    y0,
    y1,
  };
}

export default function CrossflowMap() {
  const latestFrame = useSimStore(state => state.latestFrame);
  const params = useSimStore(state => state.params);
  const history = useSimStore(state => state.history);

  const computed = useMemo(() => {
    if (!latestFrame || !params) return null;

    const { Sw, nD } = latestFrame;
    const { Nx, Nz, d, L, phi1, phi2, k1, k2 } = params;
    const thetaRaw = Number(params.theta_s);
    const thetaS = Number.isFinite(thetaRaw) ? thetaRaw : 1;

    if (!Sw || !nD || Sw.length === 0 || nD.length === 0) return null;

    const numCells = (Nz + 1) * (Nx + 1);
    const dz = (2 * d) / Nz;
    const dx = L / Nx;
    const midJ = Math.floor(Nz / 2);

    const Dc = new Float64Array(numCells);
    for (let j = 0; j <= Nz; j++) {
      const z = -d + j * dz;
      const isLayer1 = z > 0;
      const k_b = isLayer1 ? k1 : k2;
      const phi_b = isLayer1 ? phi1 : phi2;
      for (let i = 0; i <= Nx; i++) {
        const idx = j * (Nx + 1) + i;
        Dc[idx] = Math.max(0, dCap(Sw[idx], nD[idx], k_b, phi_b, params));
      }
    }

    const uzArr = new Float64Array(numCells);
    const uzCross = new Float64Array(Nx + 1);

    for (let i = 0; i <= Nx; i++) {
      const idxLo = midJ * (Nx + 1) + i;
      const idxHi = (midJ + 1) * (Nx + 1) + i;
      const Di = 2 * Dc[idxHi] * Dc[idxLo] / (Dc[idxHi] + Dc[idxLo] + 1e-30);
      const uz = thetaS <= 0 ? 0 : Di * (Sw[idxLo] - Sw[idxHi]) / dz;
      uzCross[i] = uz;
      uzArr[idxLo] = uz;
    }

    const vmax = Math.max(1e-12, ...Array.from(uzCross, v => Math.abs(v)));
    const xFront = (history.hist_fp1?.length && history.hist_fp2?.length)
      ? 0.5 * (history.hist_fp1[history.hist_fp1.length - 1] + history.hist_fp2[history.hist_fp2.length - 1])
      : 0;

    const xVals = Array.from({ length: Nx + 1 }, (_, i) => i * dx);

    let beforeIdx = -1;
    let beforeMag = 0;
    let afterIdx = -1;
    let afterMag = 0;

    for (let i = 0; i <= Nx; i++) {
      const mag = Math.abs(uzCross[i]);
      if (xVals[i] < xFront && mag > beforeMag) {
        beforeMag = mag;
        beforeIdx = i;
      }
      if (xVals[i] > xFront && mag > afterMag) {
        afterMag = mag;
        afterIdx = i;
      }
    }

    const arrows = [];
    const minNorm = 0.05;

    if (beforeIdx >= 0) {
      const norm = uzCross[beforeIdx] / (vmax + 1e-30);
      if (Math.abs(norm) > minNorm) {
        arrows.push(buildArrowPath((xVals[beforeIdx] / L) * 100, norm, 16));
      }
    }

    if (afterIdx >= 0) {
      const norm = uzCross[afterIdx] / (vmax + 1e-30);
      if (Math.abs(norm) > minNorm) {
        arrows.push(buildArrowPath((xVals[afterIdx] / L) * 100, norm, 16));
      }
    }

    return {
      uzArr,
      vmin: -vmax,
      vmax,
      xFrontPct: (xFront / L) * 100,
      arrows,
      Nx,
      Nz,
      d,
      L,
    };
  }, [latestFrame, params, history.hist_fp1, history.hist_fp2]);

  if (!computed) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)]">
        Esperando simulacion...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pt-1 pb-1">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1">
        V. Vertical (crossflow) u_z [m/s]
      </h3>

      <div className="flex-1 w-full bg-[var(--color-surface-container-low)] rounded overflow-hidden relative">
        <Map2DWithAxes
          L={computed.L}
          d={computed.d}
          vmin={computed.vmin}
          vmax={computed.vmax}
          xLabel="x [m]"
          zLabel="z [m]"
          colormapInterpolator={(t) => d3.interpolateRdBu(1 - t)}
        >
          <div className="w-full h-full relative">
            <CanvasMap2D
              field={computed.uzArr}
              Nx={computed.Nx}
              Nz={computed.Nz}
              d={computed.d}
              vmin={computed.vmin}
              vmax={computed.vmax}
              colormapInterpolator={(t) => d3.interpolateRdBu(1 - t)}
              showZeroLine={true}
            />

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="crossflow-arrow-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,0,0,0.9)" />
                </marker>
              </defs>

              <line
                x1={computed.xFrontPct}
                x2={computed.xFrontPct}
                y1="8"
                y2="92"
                stroke="rgba(34,197,94,0.95)"
                strokeWidth="0.8"
                strokeDasharray="2.2,2.2"
              />

              {computed.arrows.map((a, idx) => (
                <line
                  key={`arrow-${idx}`}
                  x1={a.x}
                  y1={a.y0}
                  x2={a.x}
                  y2={a.y1}
                  stroke="rgba(0,0,0,0.95)"
                  strokeWidth="1.2"
                  markerEnd="url(#crossflow-arrow-head)"
                />
              ))}
            </svg>
          </div>
        </Map2DWithAxes>
      </div>
    </div>
  );
}
