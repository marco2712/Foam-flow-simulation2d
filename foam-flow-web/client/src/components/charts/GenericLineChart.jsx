import React from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function GenericLineChart({ dataKey1, dataKey2, title, xLabel, yLabel, color1 = "#4682b4", color2 = "#2e8b57" }) {
  const history = useSimStore(state => state.history);
  
  if (!history.hist_t || !history.hist_t.length) return <div className="text-xs text-[var(--color-on-surface-variant)] p-2">{title}: No data</div>;

  const data = history.hist_t.map((t, i) => ({
    time: t,
    [dataKey1]: history[dataKey1]?.[i] || 0,
    [dataKey2]: history[dataKey2]?.[i] || 0
  }));

  return (
    <div className="w-full h-full flex flex-col pt-4 pb-2">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center mb-1">{title}</h3>
      <div className="flex-1 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" tick={{fill: 'var(--color-on-surface-variant)'}} fontSize={10} angle={-30} textAnchor="end" />
            <YAxis stroke="var(--color-on-surface-variant)" tick={{fill: 'var(--color-on-surface-variant)'}} fontSize={10} width={40} />
            <Tooltip contentStyle={{backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', borderRadius: '4px', color: 'var(--color-on-surface)'}} />
            <Line type="monotone" dataKey={dataKey1} stroke={color1} dot={false} strokeWidth={2.5} isAnimationActive={false} />
            {dataKey2 && <Line type="monotone" dataKey={dataKey2} stroke={color2} dot={false} strokeWidth={2.5} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
