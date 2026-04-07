import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

function lambdaT(Sw, nD, k_b, params) {
  const lw = (k_b * krw(Sw, params)) / params.mu_w;
  const lg = (k_b * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return lw + lg;
}

export default function FoamPressureProfile1D({ title = 'Pressure P(x) [bar]' }) {
  const profiles1D = useSimStore(state => state.profiles1D);
  const params = useSimStore(state => state.params);

  const data = useMemo(() => {
    if (!profiles1D || !params) return null;

    const { SwL1, SwL2, nDL1, nDL2 } = profiles1D;
    const { Nx, L, k1, k2, u1, u2 } = params;

    if (!SwL1 || !SwL2 || !nDL1 || !nDL2 || SwL1.length === 0) return null;

    const dx = L / Nx;

    const dpdx1 = SwL1.map((sw, i) => u1 / (lambdaT(sw, nDL1[i], k1, params) + 1e-30));
    const dpdx2 = SwL2.map((sw, i) => u2 / (lambdaT(sw, nDL2[i], k2, params) + 1e-30));

    const P1 = new Array(dpdx1.length).fill(0);
    const P2 = new Array(dpdx2.length).fill(0);

    let acc1 = 0;
    let acc2 = 0;
    for (let i = dpdx1.length - 1; i >= 0; i--) {
      acc1 += dpdx1[i] * dx * 1e-5;
      acc2 += dpdx2[i] * dx * 1e-5;
      P1[i] = acc1;
      P2[i] = acc2;
    }

    return SwL1.map((_, i) => ({
      x: parseFloat((i * dx).toFixed(4)),
      P_L1: P1[i],
      P_L2: P2[i],
    }));
  }, [profiles1D, params]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)] p-2">
        Presion: Esperando datos...
      </div>
    );
  }

  const yMax = Math.max(
    0.01,
    ...data.map(p => Math.max(Number.isFinite(p.P_L1) ? p.P_L1 : 0, Number.isFinite(p.P_L2) ? p.P_L2 : 0))
  );

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded p-2 text-xs shadow-lg">
          <p className="font-bold mb-1">x = {label} m</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.value?.toExponential(3)} bar</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1 flex-none">{title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, params?.L || 1]}
              tickFormatter={v => v.toFixed(2)}
              label={{ value: 'x [m]', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
            />
            <YAxis
              domain={[0, yMax * 1.1]}
              label={{ value: 'P [bar]', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
              width={45}
            />
            <Tooltip content={customTooltip} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
              formatter={(value) => <span style={{ color: 'var(--color-on-surface)' }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="P_L1"
              name="Capa 1"
              stroke="#4169e1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="P_L2"
              name="Capa 2"
              stroke="#2e8b57"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
