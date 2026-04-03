import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

/**
 * Matches Python Panel [1,1] - Posición del frente vs tiempo
 * Lines:
 *   v_theory  (black dashed)  - theoretical front velocity × time
 *   v1_iso    (blue dotted)   - layer 1 isotropic velocity (no foam)
 *   v2_iso    (green dotted)  - layer 2 isotropic velocity (no foam)
 *   fp1       (steelblue solid) - simulated layer 1 front
 *   fp2       (seagreen solid)  - simulated layer 2 front
 */

function krw(Sw, Swc, Sgr) {
  const s = Math.max(0, Math.min((Sw - Swc) / (1 - Swc - Sgr), 1));
  return 0.2 * Math.pow(s, 4.2);
}
function krg0(Sw, Swc, Sgr) {
  const s = Math.max(0, Math.min((1 - Sw - Sgr) / (1 - Swc - Sgr), 1));
  return 0.94 * Math.pow(s, 1.3);
}
function MRF(nD) {
  return Math.max(1.0, Math.min(18500 * nD + 1.0, 1e7));
}
function nD_LE(Sw, Sw_star, A) {
  return Sw > Sw_star ? Math.tanh(A * (Sw - Sw_star)) : 0.0;
}
function fw_scalar(Sw, nD, k, mu_w, mu_g) {
  const lw = k * krw(Sw, 0.20, 0.18) / mu_w;
  const lg = k * krg0(Sw, 0.20, 0.18) / MRF(nD) / mu_g;
  return lw / (lw + lg + 1e-30);
}

export default function FrontPosition() {
  const history = useSimStore(state => state.history);
  const params  = useSimStore(state => state.params);

  // Compute theoretical velocities (same as Python)
  const theory = useMemo(() => {
    if (!params) return null;
    const { Sw_plus, Sw_minus, Sw_star, A, k1, k2, phi1, phi2, u1, u2, mu_w, mu_g, theta_s } = params;

    const nDp = nD_LE(Sw_plus,  Sw_star, A);
    const nDm = nD_LE(Sw_minus, Sw_star, A);

    const fw1p = fw_scalar(Sw_plus,  nDp, k1, mu_w, mu_g);
    const fw1m = fw_scalar(Sw_minus, nDm, k1, mu_w, mu_g);
    const fw2p = fw_scalar(Sw_plus,  nDp, k2, mu_w, mu_g);
    const fw2m = fw_scalar(Sw_minus, nDm, k2, mu_w, mu_g);
    const dSw = Sw_plus - Sw_minus;

    const v1_iso    = (u1 / phi1) * (fw1p - fw1m) / dSw;
    const v2_iso    = (u2 / phi2) * (fw2p - fw2m) / dSw;
    const a1        = phi1 * dSw * (theta_s || 3.2e-4);
    const a2        = phi2 * dSw * (theta_s || 3.2e-4);
    const v_teorico = (a1 * v1_iso + a2 * v2_iso) / (a1 + a2);

    return { v1_iso, v2_iso, v_teorico };
  }, [params]);

  if (!history.hist_t || !history.hist_t.length) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-on-surface-variant)] p-2">
        Frente vs Tiempo: Esperando datos...
      </div>
    );
  }

  const Tmax = params?.Tmax || 5000;
  const L    = params?.L    || 1.0;

  // Build chart data: simulated fronts only
  const data = history.hist_t.map((t, i) => ({
    t,
    fp1: history.hist_fp1[i] || 0,
    fp2: history.hist_fp2[i] || 0,
    // Reference lines as data only at boundaries to draw straight lines
    v_theory: theory ? theory.v_teorico * t : 0,
    v1_iso:   theory ? theory.v1_iso * t    : 0,
    v2_iso:   theory ? theory.v2_iso * t    : 0,
  }));

  const v1Str  = theory ? (theory.v1_iso    * 1e5).toFixed(2) : '–';
  const v2Str  = theory ? (theory.v2_iso    * 1e5).toFixed(2) : '–';
  const vtStr  = theory ? (theory.v_teorico * 1e5).toFixed(2) : '–';

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded p-2 text-xs shadow-lg">
          <p className="font-bold mb-1">t = {Number(label).toFixed(0)} s</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(3)} m</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center flex-none">
        Frente vs Tiempo
      </h3>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] text-center mb-1 flex-none">
        v_theory={vtStr} · v1_iso={v1Str} · v2_iso={v2Str} [×10⁻⁵ m/s]
      </p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, Tmax]}
              tickFormatter={v => v.toFixed(0)}
              label={{ value: 't [s]', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
            />
            <YAxis
              domain={[0, L]}
              label={{ value: 'frente x [m]', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              stroke="var(--color-on-surface-variant)"
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }}
              width={38}
            />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: '9px' }} />

            {/* v_theory - black dashed (Python: 'k--') */}
            <Line type="linear" dataKey="v_theory" name="v_theory" stroke="#000000"
              strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
            {/* v1_iso - blue dotted (Python: 'b:') */}
            <Line type="linear" dataKey="v1_iso" name="v1_iso" stroke="#4169e1"
              strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            {/* v2_iso - green dotted (Python: 'g:') */}
            <Line type="linear" dataKey="v2_iso" name="v2_iso" stroke="#2e8b57"
              strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />

            {/* Simulated fronts */}
            {/* fp1 - steelblue solid (Python: color='steelblue') */}
            <Line type="monotone" dataKey="fp1" name="frente capa 1" stroke="#4682b4"
              strokeWidth={2.5} dot={false} isAnimationActive={false} />
            {/* fp2 - seagreen solid (Python: color='seagreen') */}
            <Line type="monotone" dataKey="fp2" name="frente capa 2" stroke="#2e8b57"
              strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
