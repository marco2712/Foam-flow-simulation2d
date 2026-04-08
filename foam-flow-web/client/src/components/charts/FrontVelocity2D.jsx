
import React, { useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Funciones auxiliares copiadas de FrontPosition.jsx
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


export default function FrontVelocity2D() {
  const history = useSimStore(state => state.history);
  const params = useSimStore(state => state.params);

  // Calcular proporción K/P y velocidades teóricas
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
    // Proporción K/P
    const K = k1 / k2;
    const P = (phi1 / phi2);
    const KP = K / P;
    return { v1_iso, v2_iso, v_teorico, K, P, KP };
  }, [params]);

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

      // Líneas teóricas (constantes)
      out.push({
        t: t[i],
        v1,
        v2,
        v1nD,
        v2nD,
        v1_teorico: theory ? theory.v1_iso : null,
        v2_teorico: theory ? theory.v2_iso : null,
        v_teorico:  theory ? theory.v_teorico : null,
      });
    }
    return out;
  }, [history, theory]);

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

  // Strings para mostrar valores teóricos y K/P
  const v1Str  = theory ? (theory.v1_iso    * 1e5).toFixed(2) : '–';
  const v2Str  = theory ? (theory.v2_iso    * 1e5).toFixed(2) : '–';
  const vtStr  = theory ? (theory.v_teorico * 1e5).toFixed(2) : '–';
  const kpStr  = theory ? theory.KP.toFixed(3) : '–';

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-xs font-bold text-[var(--color-on-surface)] text-center flex-none">
        Velocidad 1D del Frente v = dx/dt
      </h3>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] text-center mb-1 flex-none">
        (k₁/k₂)/(ϕ₁/ϕ₂) = K/P = {kpStr} &nbsp;|&nbsp; v_theory={vtStr} · v1_iso={v1Str} · v2_iso={v2Str} [×10⁻⁵ m/s]
      </p>
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

            {/* Líneas simuladas */}
            <Line type="monotone" dataKey="v1" name="v frente capa 1" stroke="#4682b4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v2" name="v frente capa 2" stroke="#2e8b57" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v1nD" name="v nD capa 1" stroke="#4169e1" strokeWidth={1.4} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="v2nD" name="v nD capa 2" stroke="#1f7a4f" strokeWidth={1.4} strokeDasharray="5 3" dot={false} isAnimationActive={false} />

            {/* Líneas teóricas (constantes) */}
            <Line type="linear" dataKey="v1_teorico" name="v₁ teoría" stroke="#4169e1" strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            <Line type="linear" dataKey="v2_teorico" name="v₂ teoría" stroke="#2e8b57" strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            <Line type="linear" dataKey="v_teorico" name="v global teoría" stroke="#000000" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
