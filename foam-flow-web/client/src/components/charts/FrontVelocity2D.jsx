import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FrontVelocity2D() {
  const history = useSimStore(state => state.history);

  const data = useMemo(() => {
    const t = history.hist_t || [];
    const fp1 = history.hist_fp1 || [];
    const fp2 = history.hist_fp2 || [];
    const fp1nD = history.hist_fp1_nD || [];
    const fp2nD = history.hist_fp2_nD || [];

    if (t.length < 2) return [];

    const out = [];
    for (let i = 1; i < t.length; i += 1) {
      const dt = t[i] - t[i - 1];
      if (dt <= 0) continue;

      const v1 = ((fp1[i] ?? fp1[i - 1] ?? 0) - (fp1[i - 1] ?? 0)) / dt;
      const v2 = ((fp2[i] ?? fp2[i - 1] ?? 0) - (fp2[i - 1] ?? 0)) / dt;
      const v1nD = ((fp1nD[i] ?? fp1nD[i - 1] ?? 0) - (fp1nD[i - 1] ?? 0)) / dt;
      const v2nD = ((fp2nD[i] ?? fp2nD[i - 1] ?? 0) - (fp2nD[i - 1] ?? 0)) / dt;

      out.push({
        t: t[i],
        v1,
        v2,
        v1nD,
        v2nD,
      });
    }

    return out;
  }, [history]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)] p-2">
        Velocidad 1D: Esperando datos...
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded p-2 text-xs shadow-lg">
          <p className="font-bold mb-1">t = {Number(label).toFixed(0)} s</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toExponential(2)} m/s</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1 flex-none">
        Velocidad 1D del Frente v = dx/dt
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
            <XAxis
              dataKey="t"
              type="number"
              tickFormatter={v => v.toFixed(0)}
              label={{ value: 't [s]', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
            />
            <YAxis
              tickFormatter={v => Number(v).toExponential(1)}
              label={{ value: 'v [m/s]', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
              width={46}
            />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: '9px' }} />

            <Line type="monotone" dataKey="v1" name="v frente capa 1" stroke="#4682b4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v2" name="v frente capa 2" stroke="#2e8b57" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v1nD" name="v nD capa 1" stroke="#4169e1" strokeWidth={1.4} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v2nD" name="v nD capa 2" stroke="#1f7a4f" strokeWidth={1.4} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
