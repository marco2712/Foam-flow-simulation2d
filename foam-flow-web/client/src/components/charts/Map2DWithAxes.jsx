import React, { useMemo } from 'react';

/**
 * Wraps a canvas 2D map with matplotlib-style axes:
 *   X axis: 0 → L [m]  (bottom)
 *   Z axis: -d → +d [m] (left, physical z coordinate)
 *   Colorbar ticks on the right (optional)
 *
 * Uses SVG for tick rendering like matplotlib.
 */
export default function Map2DWithAxes({
  children,       // <CanvasMap2D /> or similar
  L, d,           // physical domain size
  vmin, vmax,     // colormap range for colorbar
  xLabel = 'x [m]',
  zLabel = 'z [m]',
  colormapInterpolator, // for colorbar swatches
}) {
  const margin = { top: 8, right: 70, bottom: 42, left: 58 };

  // Generate X ticks: 0 → L
  const xTicks = useMemo(() => {
    const count = 6;
    return Array.from({ length: count }, (_, i) => ({
      val: (L * i) / (count - 1),
      pct: (i / (count - 1)) * 100
    }));
  }, [L]);

  // Generate Z ticks: -d → +d
  const zTicks = useMemo(() => {
    const vals = [-d, -d / 2, 0, d / 2, d];
    return vals.map(v => ({
      val: v,
      pct: ((v + d) / (2 * d)) * 100  // 0% = bottom (-d), 100% = top (+d)
    }));
  }, [d]);

  // Colorbar ticks
  const cbTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => ({
      val: vmin + (vmax - vmin) * (i / (count - 1)),
      pct: (i / (count - 1)) * 100
    }));
  }, [vmin, vmax]);

  // Format numbers nicely (like matplotlib)
  const fmt = (v) => {
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(1);
    if (Math.abs(v) >= 100) return v.toFixed(0);
    if (Math.abs(v) >= 1)   return v.toFixed(2);
    return v.toFixed(3);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="flex-1 relative"
        style={{
          paddingLeft:   margin.left,
          paddingRight:  margin.right,
          paddingTop:    margin.top,
          paddingBottom: margin.bottom,
        }}
      >
        {/* ── Canvas (fills the inner plot area) ── */}
        <div className="absolute inset-0"
          style={{
            top:    margin.top,
            right:  margin.right,
            bottom: margin.bottom,
            left:   margin.left,
          }}
        >
          {children}
        </div>

        {/* ── SVG overlay for axes ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* ──── X AXIS (bottom) ──── */}
          {xTicks.map(({ val, pct }) => (
            <g key={`x-${val}`}>
              {/* tick line */}
              <line
                x1={`${margin.left + pct * (100 - (margin.left + margin.right) / 100) / 100}%`}
                x2={`${margin.left + pct * (100 - (margin.left + margin.right) / 100) / 100}%`}
                y1="100%"
                y2="100%"
                transform={`translate(0, ${-margin.bottom + 4})`}
                stroke="var(--color-on-surface)"
                strokeWidth={1}
              />
              {/* label */}
              <text
                x={`${pct}%`}
                y="100%"
                dy="-4"
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-on-surface-variant)"
                style={{ dominantBaseline: 'auto' }}
              >
                {fmt(val)}
              </text>
            </g>
          ))}

          {/* X axis label */}
          <text
            x="50%"
            y="100%"
            dy="-2"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--color-on-surface)"
          >
            {xLabel}
          </text>
        </svg>

        {/* ── Z axis (left, vertical) ── */}
        <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between pointer-events-none"
          style={{ width: margin.left, paddingTop: margin.top, paddingBottom: margin.bottom }}
        >
          {/* ticks top to bottom: pct=100% (z=+d) at top, pct=0% (z=-d) at bottom */}
          {[...zTicks].reverse().map(({ val, pct }) => (
            <div
              key={`z-${val}`}
              className="absolute w-full flex items-center justify-end pr-1"
              style={{
                // top = (1 - pct/100) * 100% within the plot area
                top: `calc(${margin.top}px + ${(1 - pct / 100) * 100}% * ((100% - ${margin.top + margin.bottom}px) / 100%))`,
                transform: 'translateY(-50%)'
              }}
            >
              <span className="text-[9px] text-[var(--color-on-surface-variant)] tabular-nums">
                {fmt(val)}
              </span>
              <div className="w-1.5 h-px bg-[var(--color-on-surface)] ml-0.5 flex-none" />
            </div>
          ))}

          {/* Z axis label (rotated) */}
          <div className="absolute inset-0 flex items-center justify-start">
            <span
              className="text-[11px] font-semibold text-[var(--color-on-surface)]"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                whiteSpace: 'nowrap',
                marginLeft: '2px',
              }}
            >
              {zLabel}
            </span>
          </div>
        </div>

        {/* ── Colorbar (right) ── */}
        {colormapInterpolator && (
          <div
            className="absolute top-0 bottom-0 right-0 flex flex-col items-start pointer-events-none"
            style={{ width: margin.right, paddingTop: margin.top, paddingBottom: margin.bottom }}
          >
            {/* Colorbar gradient strip */}
            <div
              className="absolute rounded-sm overflow-hidden border border-[var(--color-outline-variant)]"
              style={{
                top: margin.top, bottom: margin.bottom,
                left: 6, width: 14,
              }}
            >
              <div className="w-full h-full" style={{
                background: `linear-gradient(to top, ${
                  [0, 0.25, 0.5, 0.75, 1].map(t => colormapInterpolator(t)).join(', ')
                })`,
              }} />
            </div>

            {/* Colorbar ticks */}
            {[...cbTicks].reverse().map(({ val, pct }) => (
              <div
                key={`cb-${val}`}
                className="absolute flex items-center"
                style={{
                  top: `calc(${margin.top}px + ${(1 - pct / 100) * 100}% * ((100% - ${margin.top + margin.bottom}px) / 100%))`,
                  left: 22,
                  transform: 'translateY(-50%)',
                }}
              >
                <div className="w-1.5 h-px bg-[var(--color-on-surface)] flex-none mr-0.5" />
                <span className="text-[9px] text-[var(--color-on-surface-variant)] tabular-nums whitespace-nowrap">
                  {fmt(val)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
