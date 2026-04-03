export function clip(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export function krw(Sw, params) {
  const { Swc, Sgr } = params;
  const clipped = clip((Sw - Swc) / (1 - Swc - Sgr), 0, 1);
  return 0.2 * Math.pow(clipped, 4.2);
}

export function krg0(Sw, params) {
  const { Swc, Sgr } = params;
  const clipped = clip((1 - Sw - Sgr) / (1 - Swc - Sgr), 0, 1);
  return 0.94 * Math.pow(clipped, 1.3);
}

export function MRF(nD, params) {
  return clip(18500.0 * nD + 1.0, 1.0, 1e7);
}

export function nD_LE(Sw, params) {
  const { Sw_star, A } = params;
  if (Sw > Sw_star) {
    return Math.tanh(A * (Sw - Sw_star));
  }
  return 0.0;
}

export function fw(Sw, nD, k_b, params) {
  const { mu_w, mu_g } = params;
  const lw = (k_b * krw(Sw, params)) / mu_w;
  const lg = (k_b * krg0(Sw, params)) / MRF(nD, params) / mu_g;
  return lw / (lw + lg + 1e-30);
}

export function lambdaT(Sw, nD, k_b, params) {
  const { mu_w, mu_g } = params;
  const lw = (k_b * krw(Sw, params)) / mu_w;
  const lg = (k_b * krg0(Sw, params)) / MRF(nD, params) / mu_g;
  return lw + lg;
}

export function Phi_foam(Sw, nD, params) {
  const { Kc } = params;
  return Kc * (nD_LE(Sw, params) - nD);
}

export function Pc(Sw, k_b, phi_b, params) {
  const { sigma, c_cap, Sgr, Swc } = params;
  const term1 = sigma * Math.sqrt(phi_b / k_b) * 0.022;
  const term2 = Math.pow(clip(1 - Sw - Sgr, 1e-8, 1), c_cap);
  const term3 = clip(Sw - Swc, 1e-8, 1);
  return (term1 * term2) / term3;
}

export function dPc_dSw(Sw, k_b, phi_b, params) {
  const { Sgr, Swc } = params;
  const h = 1e-5;
  const Swp = clip(Sw + h, Swc + 1e-6, 1 - Sgr - 1e-6);
  const Swm = clip(Sw - h, Swc + 1e-6, 1 - Sgr - 1e-6);
  return (Pc(Swp, k_b, phi_b, params) - Pc(Swm, k_b, phi_b, params)) / (2 * h);
}

export function D_cap(Sw, nD, k_b, phi_b, params) {
  const { mu_g } = params;
  const lg = (k_b * krg0(Sw, params)) / MRF(nD, params) / mu_g;
  return -lg * fw(Sw, nD, k_b, params) * dPc_dSw(Sw, k_b, phi_b, params);
}
