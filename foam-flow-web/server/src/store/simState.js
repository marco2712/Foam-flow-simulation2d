export const state = {
  hist_t: [],
  hist_fp1: [], hist_fp2: [],
  hist_fp1_nD: [], hist_fp2_nD: [],
  hist_trans_z: [], hist_rec_pct: [],
  lastFrame: null,
  params: {
    // === Parameters confirmed from Python output image ===
    // K/P = (k1/k2)/(phi1/phi2) = (2e-12/1e-12)/(0.25/0.25) = 2.0 (matches image title)
    phi1: 0.25,
    phi2: 0.25,       // CONFIRMED: phi1=phi2=0.25 from K/P=2.0 in image
    Swc: 0.20,
    Sgr: 0.18,
    mu_w: 1e-3,
    mu_g: 2e-5,
    k1: 2e-12,
    k2: 1e-12,
    Sw_star: 0.37,
    A: 400.0,
    Kc: 200.0,
    theta_s: 3.2e-4,
    u1: 2.93e-5,        // CONFIRMED: v_theory≈18e-5 m/s in image → u1=2.93e-5
    u2: 1.465e-5,       // u2 = 0.5 * u1
    d: 5e-3,
    sigma: 0.03,
    c_cap: 0.01,
    Sw_minus: 0.372,
    Sw_plus: 0.72,
    L: 1.0,             // CONFIRMED: x-axis goes 0→1.0m in image
    Nx: 200,
    Nz: 40,
    dt: 0.20,           // CFL check: v*dt/dx = 1.8e-4*0.2/0.005 = 0.0072 → stable
    Tmax: 5000.0,       // CONFIRMED: "t=5000s (100%)" in image title
    zExtractL1: 0.5,    // 0=interface, 1=top boundary
    zExtractL2: 0.5,    // 0=interface, 1=bottom boundary
  },
  status: 'idle',
  progress: 0
};

export function resetState() {
  state.hist_t = [];
  state.hist_fp1 = [];
  state.hist_fp2 = [];
  state.hist_fp1_nD = [];
  state.hist_fp2_nD = [];
  state.hist_trans_z = [];
  state.hist_rec_pct = [];
  state.lastFrame = null;
  state.status = 'idle';
  state.progress = 0;
}
