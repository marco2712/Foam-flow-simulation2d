import React from 'react';
import { useSimStore } from '../../store/simStore';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const PARAMS_CONFIG = [
  { key: 'L', label: 'L', desc: "Domain Length", min: 0.1, max: 1.0, step: 0.1, unit: 'm' },
  { key: 'd', label: 'd', desc: "Layer Thickness", min: 1e-3, max: 1e-2, step: 'log', unit: 'm' },
  { key: 'phi1', label: '\\phi_1', desc: "Porosity (L1)", min: 0.05, max: 0.40, step: 0.01 },
  { key: 'phi2', label: '\\phi_2', desc: "Porosity (L2)", min: 0.05, max: 0.40, step: 0.01 },
  { key: 'k1', label: 'k_1', desc: "Permeability (L1)", min: 1e-13, max: 1e-11, step: 'log', unit: 'm²' },
  { key: 'k2', label: 'k_2', desc: "Permeability (L2)", min: 1e-13, max: 1e-11, step: 'log', unit: 'm²' },
  { key: 'u1', label: 'u_1', desc: "Injection Vel (L1)", min: 1e-7, max: 1e-4, step: 'log', unit: 'm/s' },
  { key: 'u2', label: 'u_2', desc: "Injection Vel (L2)", min: 1e-7, max: 1e-4, step: 'log', unit: 'm/s' },
  { key: 'Sw_minus', label: 'S_{w-}', desc: "Injection Saturation", min: 0.20, max: 1.0, step: 0.001 },
  { key: 'Sw_plus', label: 'S_{w+}', desc: "Initial Saturation", min: 0.20, max: 1.0, step: 0.001 },
  { key: 'Swc', label: 'S_{wc}', desc: "Connate Water Sat", min: 0.0, max: 0.4, step: 0.01 },
  { key: 'Sgr', label: 'S_{gr}', desc: "Residual Gas Sat", min: 0.0, max: 0.4, step: 0.01 },
  { key: 'Sw_star', label: 'S_w^*', desc: "Limiting Foaming Sat", min: 0.2, max: 0.8, step: 0.01 },
  { key: 'mu_w', label: '\\mu_w', desc: "Water Viscosity", min: 1e-4, max: 1e-2, step: 'log' },
  { key: 'mu_g', label: '\\mu_g', desc: "Gas Viscosity", min: 1e-6, max: 1e-3, step: 'log' },
  { key: 'sigma', label: '\\sigma', desc: "Surface Tension", min: 0.01, max: 0.1, step: 0.01 },
  { key: 'c_cap', label: 'c_{cap}', desc: "Capillary Const", min: 0.001, max: 0.1, step: 0.001 },
  { key: 'A', label: 'A', desc: "Foam Gen. Parameter", min: 10, max: 1000, step: 10 },
  { key: 'Kc', label: 'K_c', desc: "Coalescence Rate", min: 10, max: 1000, step: 10 },
  { key: 'theta_s', label: '\\theta_s', desc: "Trapping Parameter", min: 0, max: 1e-2, step: 'log' },
  { key: 'Tmax', label: 'T_{max}', desc: "Total Sim Time", min: 1000, max: 50000, step: 100, unit: 's' },
  { key: 'Nx', label: 'N_x', desc: "Grid Cells X", min: 50, max: 500, step: 10 },
  { key: 'Nz', label: 'N_z', desc: "Grid Cells Z", min: 10, max: 100, step: 5 },
  { key: 'zExtractL1', label: 'Z_{L1}', desc: "Layer-1 Guide Ratio", min: 0.0, max: 1.0, step: 0.01 },
  { key: 'zExtractL2', label: 'Z_{L2}', desc: "Layer-2 Guide Ratio", min: 0.0, max: 1.0, step: 0.01 },
];

const PARAMS_FALLBACK = {
  zExtractL1: 0.5,
  zExtractL2: 0.5,
};

function LogSlider({ value, min, max, onChange, disabled }) {
  const minLog = Math.log10(min);
  const maxLog = Math.log10(max);
  const valLog = value > 0 ? Math.log10(value) : minLog;
  
  const handleChange = (e) => {
    const newVal = Math.pow(10, parseFloat(e.target.value));
    onChange(newVal);
  };
  
  return (
    <input 
      type="range" 
      min={minLog} max={maxLog} step="0.01" 
      value={valLog} 
      onChange={handleChange}
      disabled={disabled}
      className="w-full h-1 bg-[var(--color-outline-variant)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
    />
  );
}

export default function ParameterPanel() {
  const params = useSimStore(state => state.params);
  const updateParams = useSimStore(state => state.updateParams);
  const status = useSimStore(state => state.status);
  const disabled = status === 'running';

  if (!params) return null;

  // Evaluate Rules for Exceptions
  const warnings = [];
  if (params.k1 / params.k2 > 20 || params.k2 / params.k1 > 20) {
    warnings.push("⚠️ Alto contraste de permeabilidad. Podría causar inestabilidad numérica grave o canalización severa por crossflow extremo.");
  }
  if (params.Sw_minus < params.Swc) {
    warnings.push(`⚠️ Saturación inyectada (Sw-) es menor a Swc (${params.Swc}). Físicamente imposible fluir por debajo de condicional connata.`);
  }
  if (params.Sw_minus < params.Sw_star) {
    warnings.push(`⚠️ Sw- < Sw*. No se generará onda viajante de espuma en la frontera de inyección (calidad muy seca).`);
  }
  if (params.Nx > 300 || params.Nz > 60) {
    warnings.push("⚠️ Resolución (Nx, Nz) muy alta. El tiempo en navegador podría ralentizarse al calcular dominios tan compactos.");
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[var(--color-on-surface)] font-display text-lg font-bold tracking-wide border-b border-[var(--color-outline-variant)] pb-2 mb-2">Físico / Numéricos</h2>
      
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-2 text-xs rounded">
           {warnings.map((msg, i) => <span key={i}>{msg}</span>)}
        </div>
      )}

      {PARAMS_CONFIG.map(({ key, label, desc, min, max, step, unit }) => {
        const val = params[key] ?? PARAMS_FALLBACK[key];
        const isLog = step === 'log';
        if (val === undefined) return null; // Keep hiding truly unknown params

        return (
          <div key={key} className="flex flex-col gap-1 mb-2">
            <div className="flex justify-between items-center text-sm mb-1">
              <div className="flex flex-col">
                 <label className="text-[var(--color-on-surface)] flex items-center gap-2 font-semibold">
                   <InlineMath math={label} />
                 </label>
                 <span className="text-[10px] text-[var(--color-on-surface-variant)] leading-tight">{desc}</span>
              </div>
              <div className="flex items-center gap-1">
                 <input
                   type="number"
                   value={val !== undefined ? val : 0}
                   min={min} max={max}
                   step={isLog ? 'any' : step}
                   disabled={disabled}
                   onChange={e => updateParams({ [key]: parseFloat(e.target.value) })}
                   className="w-20 bg-[var(--color-surface-container)] tabular-nums text-right text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] rounded px-2 py-1 text-xs focus:border-[var(--color-primary)] outline-none"
                 />
                 {unit && <span className="text-[10px] text-[var(--color-on-surface-variant)] w-4">{unit}</span>}
              </div>
            </div>
            
            <div className="w-full">
               {isLog ? (
                  <LogSlider value={val} min={min} max={max} onChange={v => updateParams({ [key]: v })} disabled={disabled} />
               ) : (
                  <input
                    type="range"
                    min={min} max={max} step={step}
                    value={val !== undefined ? val : 0}
                    disabled={disabled}
                    onChange={e => updateParams({ [key]: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-[var(--color-outline-variant)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
