import express from 'express';
import { state } from '../store/simState.js';

const router = express.Router();

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

function nD_LE(Sw, params) {
  return Sw > params.Sw_star ? Math.tanh(params.A * (Sw - params.Sw_star)) : 0.0;
}

function fwScalar(Sw, nD, k, params) {
  const lw = (k * krw(Sw, params)) / params.mu_w;
  const lg = (k * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return lw / (lw + lg + 1e-30);
}

function lambdaT(Sw, nD, k, params) {
  const lw = (k * krw(Sw, params)) / params.mu_w;
  const lg = (k * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return lw + lg;
}

function dPc_dSw(Sw, k_b, phi_b, params) {
  const h = 1e-5;
  const Swp = clip(Sw + h, params.Swc + 1e-6, 1 - params.Sgr - 1e-6);
  const Swm = clip(Sw - h, params.Swc + 1e-6, 1 - params.Sgr - 1e-6);

  const pc = (s) => {
    const term1 = params.sigma * Math.sqrt(phi_b / k_b) * 0.022;
    const term2 = Math.pow(clip(1 - s - params.Sgr, 1e-8, 1), params.c_cap);
    const term3 = clip(s - params.Swc, 1e-8, 1);
    return (term1 * term2) / term3;
  };

  return (pc(Swp) - pc(Swm)) / (2 * h);
}

function dCap(Sw, nD, k_b, phi_b, params) {
  const lg = (k_b * krg0(Sw, params)) / mrf(nD) / params.mu_g;
  return -lg * fwScalar(Sw, nD, k_b, params) * dPc_dSw(Sw, k_b, phi_b, params);
}

function calcTheory(params) {
  const nDp = nD_LE(params.Sw_plus, params);
  const nDm = nD_LE(params.Sw_minus, params);

  const fw1p = fwScalar(params.Sw_plus, nDp, params.k1, params);
  const fw1m = fwScalar(params.Sw_minus, nDm, params.k1, params);
  const fw2p = fwScalar(params.Sw_plus, nDp, params.k2, params);
  const fw2m = fwScalar(params.Sw_minus, nDm, params.k2, params);
  const dSw = params.Sw_plus - params.Sw_minus;

  const v1_iso = (params.u1 / params.phi1) * (fw1p - fw1m) / (dSw || 1e-30);
  const v2_iso = (params.u2 / params.phi2) * (fw2p - fw2m) / (dSw || 1e-30);
  const theta_s = params.theta_s ?? 3.2e-4;
  const a1 = params.phi1 * dSw * theta_s;
  const a2 = params.phi2 * dSw * theta_s;
  // Evitar NaN si theta_s=0
  const v_theory = (a1 + a2) > 0
    ? (a1 * v1_iso + a2 * v2_iso) / (a1 + a2)
    : (v1_iso + v2_iso) / 2.0;

  return { v1_iso, v2_iso, v_theory };
}

function buildProfilesFromLastFrame() {
  if (!state.lastFrame) return null;

  const { Sw, nD } = state.lastFrame;
  const p = state.params;
  const { Nx, Nz, d, L } = p;
  const dz = (2 * d) / Nz;
  const dx = L / Nx;

  const layer1Rows = [];
  const layer2Rows = [];
  for (let j = 0; j <= Nz; j++) {
    const z = -d + j * dz;
    if (z > 0) layer1Rows.push(j);
    else layer2Rows.push(j);
  }

  const midL1 = layer1Rows[Math.floor(layer1Rows.length / 2)] ?? Math.floor((Nz * 3) / 4);
  const midL2 = layer2Rows[Math.floor(layer2Rows.length / 2)] ?? Math.floor(Nz / 4);
  const midJ = Math.floor(Nz / 2);

  const out = [];
  const dpdxL1 = [];
  const dpdxL2 = [];
  const uzCross = [];
  const thetaRaw = Number(p.theta_s);
  const thetaS = Number.isFinite(thetaRaw) ? thetaRaw : 1;

  for (let i = 0; i <= Nx; i++) {
    const idxL1 = midL1 * (Nx + 1) + i;
    const idxL2 = midL2 * (Nx + 1) + i;

    const swL1 = Sw[idxL1];
    const swL2 = Sw[idxL2];
    const ndL1 = nD[idxL1];
    const ndL2 = nD[idxL2];

    dpdxL1.push(p.u1 / (lambdaT(swL1, ndL1, p.k1, p) + 1e-30));
    dpdxL2.push(p.u2 / (lambdaT(swL2, ndL2, p.k2, p) + 1e-30));

    const idxLo = midJ * (Nx + 1) + i;
    const idxHi = (midJ + 1) * (Nx + 1) + i;
    const DcLo = Math.max(0, dCap(Sw[idxLo], nD[idxLo], p.k2, p.phi2, p));
    const DcHi = Math.max(0, dCap(Sw[idxHi], nD[idxHi], p.k1, p.phi1, p));
    if (thetaS <= 0) {
      uzCross.push(0);
    } else {
      const Di = (2 * DcHi * DcLo) / (DcHi + DcLo + 1e-30);
      uzCross.push(Di * (Sw[idxLo] - Sw[idxHi]) / dz);
    }

    out.push({
      x_m: i * dx,
      water_saturation_layer1: swL1,
      water_saturation_layer2: swL2,
      foam_texture_layer1: ndL1,
      foam_texture_layer2: ndL2,
    });
  }

  // Integrate from right to left with P(L) = 0 bar
  let acc1 = 0;
  let acc2 = 0;
  const p1 = new Array(Nx + 1).fill(0);
  const p2 = new Array(Nx + 1).fill(0);
  for (let i = Nx; i >= 0; i--) {
    acc1 += dpdxL1[i] * dx * 1e-5;
    acc2 += dpdxL2[i] * dx * 1e-5;
    p1[i] = acc1;
    p2[i] = acc2;
  }

  for (let i = 0; i <= Nx; i++) {
    out[i].foam_pressure_layer1_bar = p1[i];
    out[i].foam_pressure_layer2_bar = p2[i];
    out[i].vertical_crossflow_velocity_uz_m_per_s = uzCross[i];
  }

  return out;
}

router.get('/csv', (req, res) => {
  const { hist_t, hist_fp1, hist_fp2, hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct } = state;

  const theory = calcTheory(state.params);

  const timeHeader = [
    'time_s',
    'Sw1',
    'Sw2',
    'nD1',
    'nD2',
    'front_distance_abs_m',
    'front_velocity_layer1_m_per_s',
    'front_velocity_layer2_m_per_s',
    'foam_front_velocity_layer1_m_per_s',
    'foam_front_velocity_layer2_m_per_s',
    'crossflow_transfer_z',
    'recovery_percent',
    'theory_front_position_m',
    'theory_velocity_m_per_s',
    'layer1_isotropic_velocity_m_per_s',
    'layer2_isotropic_velocity_m_per_s',
    'z_extract_layer1_ratio',
    'z_extract_layer2_ratio',
  ].join(',');

  const timeRows = hist_t.map((t, i) => {
    const tPrev = i > 0 ? hist_t[i - 1] : null;
    const dt = tPrev !== null ? (t - tPrev) : 0;

    const fp1 = hist_fp1[i] ?? 0;
    const fp2 = hist_fp2[i] ?? 0;
    const fp1nD = hist_fp1_nD[i] ?? 0;
    const fp2nD = hist_fp2_nD[i] ?? 0;

    const fp1Prev = i > 0 ? (hist_fp1[i - 1] ?? fp1) : fp1;
    const fp2Prev = i > 0 ? (hist_fp2[i - 1] ?? fp2) : fp2;
    const fp1nDPrev = i > 0 ? (hist_fp1_nD[i - 1] ?? fp1nD) : fp1nD;
    const fp2nDPrev = i > 0 ? (hist_fp2_nD[i - 1] ?? fp2nD) : fp2nD;

    const v1 = dt > 0 ? (fp1 - fp1Prev) / dt : 0;
    const v2 = dt > 0 ? (fp2 - fp2Prev) / dt : 0;
    const v1nD = dt > 0 ? (fp1nD - fp1nDPrev) / dt : 0;
    const v2nD = dt > 0 ? (fp2nD - fp2nDPrev) / dt : 0;

    return [
      t,
      fp1,
      fp2,
      fp1nD,
      fp2nD,
      Math.abs(fp1 - fp2),
      v1,
      v2,
      v1nD,
      v2nD,
      hist_trans_z[i] ?? 0,
      hist_rec_pct[i] ?? 0,
      theory.v_theory * t,
      theory.v_theory,
      theory.v1_iso,
      theory.v2_iso,
      state.params.zExtractL1 ?? 0.5,
      state.params.zExtractL2 ?? 0.5,
    ].join(',');
  }).join('\n');

  const profiles = buildProfilesFromLastFrame();
  const profilesHeader = [
    'x_m',
    'water_saturation_layer1',
    'water_saturation_layer2',
    'foam_texture_layer1',
    'foam_texture_layer2',
    'foam_pressure_layer1_bar',
    'foam_pressure_layer2_bar',
    'vertical_crossflow_velocity_uz_m_per_s',
  ].join(',');
  const profileRows = profiles
    ? profiles.map((r) => [
        r.x_m,
        r.water_saturation_layer1,
        r.water_saturation_layer2,
        r.foam_texture_layer1,
        r.foam_texture_layer2,
        r.foam_pressure_layer1_bar,
        r.foam_pressure_layer2_bar,
        r.vertical_crossflow_velocity_uz_m_per_s,
      ].join(',')).join('\n')
    : 'no_profile_data_available';

  const csvContent = [
    timeHeader,
    timeRows,
    '',
    profilesHeader,
    profileRows,
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="foam_simulation.csv"');
  res.send(csvContent);
});

router.get('/csv-matrix', (req, res) => {
  if (!state.lastFrame) {
    return res.status(404).send('No frame data available');
  }

  const { Sw, nD } = state.lastFrame;
  const { Nx, Nz, d, L } = state.params;
  const dx = L / Nx;
  const dz = (2 * d) / Nz;

  const header = 'row_index,col_index,x_m,z_m,water_saturation_Sw,foam_texture_nD\n';
  let rows = '';
  // Convert 1D Sw / nD arrays to explicit 2D coords
  for (let j = 0; j <= Nz; j++) {
    const z_val = -d + j * dz;
    for (let i = 0; i <= Nx; i++) {
      const x_val = i * dx;
      const idx = j * (Nx + 1) + i;
      rows += `${j},${i},${x_val},${z_val},${Sw[idx]},${nD[idx]}\n`;
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="foam_simulation_matrix.csv"');
  res.send(header + rows);
});

export default router;
