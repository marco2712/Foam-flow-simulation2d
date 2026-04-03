import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

/**
 * Profiles1D - matches Python Panel [1,0]:
 *   ax_1d.plot(x, Sw_L1, 'b-',  lw=2, label='Sw L1')
 *   ax_1d.plot(x, Sw_L2, 'g-',  lw=2, label='Sw L2')
 *   ax_1d.plot(x, nD_L1, 'b--', lw=1.5, label='nD L1')
 *   ax_1d.plot(x, nD_L2, 'g--', lw=1.5, label='nD L2')
 */
export default function Profiles1D() {
  const profiles1D = useSimStore(state => state.profiles1D);
  const params = useSimStore(state => state.params);

  const data = useMemo(() => {
    if (!profiles1D || !params) return null;
    const { SwL1, SwL2, nDL1, nDL2 } = profiles1D;
    const { Nx, L } = params;
    const dx = L / Nx;
    
    return SwL1.map((_, i) => ({
      x: parseFloat((i * dx).toFixed(4)),
      SwL1: SwL1[i],
      SwL2: SwL2[i],
      nDL1: nDL1[i],
      nDL2: nDL2[i],
    }));
  }, [profiles1D, params]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)] p-2">
        Perfiles 1D: Esperando datos...
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded p-2 text-xs shadow-lg">
          <p className="font-bold mb-1">x = {label} m</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(4)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1 flex-none">
        Perfiles 1D — S<sub>w</sub> y n<sub>D</sub> por Capa
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
            <XAxis 
              dataKey="x" 
              type="number"
              domain={[0, params?.L || 0.6]}
              tickFormatter={v => v.toFixed(2)}
              label={{ value: 'x [m]', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)" 
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
            />
            <YAxis 
              domain={[0, 1.05]}
              label={{ value: 'Sw / nD', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)" 
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
              width={35}
            />
            <Tooltip content={customTooltip} />
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
              formatter={(value) => <span style={{ color: 'var(--color-on-surface)' }}>{value}</span>}
            />
            {/* Python: 'b-' = blue solid for Sw L1 */}
            <Line 
              type="monotone" dataKey="SwL1" name="Sw L1" 
              stroke="#4169e1" strokeWidth={2} dot={false} 
              strokeDasharray="none" isAnimationActive={false} 
            />
            {/* Python: 'g-' = green solid for Sw L2 */}
            <Line 
              type="monotone" dataKey="SwL2" name="Sw L2" 
              stroke="#2e8b57" strokeWidth={2} dot={false} 
              strokeDasharray="none" isAnimationActive={false} 
            />
            {/* Python: 'b--' = blue dashed for nD L1 */}
            <Line 
              type="monotone" dataKey="nDL1" name="nD L1" 
              stroke="#4169e1" strokeWidth={1.5} dot={false}
              strokeDasharray="5 3" isAnimationActive={false} 
            />
            {/* Python: 'g--' = green dashed for nD L2 */}
            <Line 
              type="monotone" dataKey="nDL2" name="nD L2" 
              stroke="#2e8b57" strokeWidth={1.5} dot={false} 
              strokeDasharray="5 3" isAnimationActive={false} 
            />
            {/* Reference line at Sw_minus (injection saturation) */}
            {params?.Sw_minus && (
              <ReferenceLine y={params.Sw_minus} stroke="#999" strokeDasharray="3 3" label={{ value: 'Sw-', fill: '#999', fontSize: 9 }} />
            )}
            {/* Reference line at Sw_plus (initial saturation) */}
            {params?.Sw_plus && (
              <ReferenceLine y={params.Sw_plus} stroke="#bbb" strokeDasharray="3 3" label={{ value: 'Sw+', fill: '#bbb', fontSize: 9 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
