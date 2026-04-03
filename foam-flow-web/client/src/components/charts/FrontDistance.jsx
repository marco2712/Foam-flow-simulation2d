import React from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FrontDistance() {
  const history = useSimStore(state => state.history);
  
  if (!history.hist_t || !history.hist_t.length) return <div className="text-xs text-[var(--color-on-surface-variant)] p-2">Front Distance: No data</div>;

  const data = history.hist_t.map((t, i) => {
    // Calculamos la distancia entre el frente de agua en capa 1 y capa 2
    const dist = Math.abs((history.hist_fp1?.[i] || 0) - (history.hist_fp2?.[i] || 0));
    return {
      time: t,
      dist
    };
  });

  return (
    <div className="w-full h-full flex flex-col pt-4">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1">Distancia entre frentes |Δx| (m)</h3>
      <div className="flex-1 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" tick={{fill: 'var(--color-on-surface-variant)'}} fontSize={10} angle={-30} textAnchor="end" />
            <YAxis stroke="var(--color-on-surface-variant)" tick={{fill: 'var(--color-on-surface-variant)'}} fontSize={10} width={40} />
            <Tooltip contentStyle={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', borderRadius: '4px', color: 'var(--color-on-surface)'}} />
            <Line type="monotone" dataKey="dist" stroke="#dc143c" dot={false} strokeWidth={2.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
