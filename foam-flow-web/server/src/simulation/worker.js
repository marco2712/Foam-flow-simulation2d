import { parentPort, workerData } from 'worker_threads';
import { fw, D_cap, nD_LE } from './constitutive.js';
import { advectionUpwindX, divDiffusion, applyBCs } from './operators.js';

let paused = false;
let running = true;


const { params } = workerData;
// Permitir que el usuario pase frameEvery en params, si no, usar 100 por defecto
const { Nx, Nz, Sw_plus, Sw_minus, Sw_star, A, u1, u2, d, sigma, c_cap, Swc, Sgr, mu_w, mu_g, phi1, phi2, k1, k2, dt, Tmax, L, frameEvery } = params;

// Control de cada cuántos pasos se envía un frame (múltiplo de 10, mínimo 10)
const FRAME_EVERY = Math.max(10, Math.round((frameEvery ?? 100) / 10) * 10);

const dx = L / Nx;
const dz = (2 * d) / Nz;
const thetaRaw = Number(params.theta_s);
const thetaS = Number.isFinite(thetaRaw) ? thetaRaw : 1;
const numCells = (Nz + 1) * (Nx + 1);

const Sw     = new Float64Array(numCells);
const nD     = new Float64Array(numCells);
const phi_2d = new Float64Array(numCells);
const k_2d   = new Float64Array(numCells);
const u_2d   = new Float64Array(numCells);
const M_phi  = new Float64Array(numCells);
const w_area = new Float64Array(numCells);

// Initialize geometry (z runs from -d to +d)
for (let j = 0; j <= Nz; j++) {
  const wz    = (j === 0 || j === Nz) ? 0.5 : 1.0;
  const z_val = -d + j * dz;
  const isL1  = z_val > 0.0;
  for (let i = 0; i <= Nx; i++) {
    const wx  = (i === 0 || i === Nx) ? 0.5 : 1.0;
    const idx = j * (Nx + 1) + i;
    phi_2d[idx] = isL1 ? phi1 : phi2;
    k_2d[idx]   = isL1 ? k1   : k2;
    u_2d[idx]   = isL1 ? u1   : u2;
    w_area[idx] = wz * wx * dx * dz;
    M_phi[idx]  = phi_2d[idx] * w_area[idx];
    Sw[idx]     = Sw_plus;
  }
}

// Initial nD = nD_LE(Sw_plus) everywhere
for (let idx = 0; idx < numCells; idx++) {
  nD[idx] = nD_LE(Sw[idx], params);
}

const nD_inj = Sw_minus > Sw_star ? Math.tanh(A * (Sw_minus - Sw_star)) : 0.0;
applyBCs(Sw, nD, Nx, Nz, Sw_minus, nD_inj);

const UMBRAL = (Sw_minus + Sw_plus) / 2.0;
const Nt = Math.floor(Tmax / dt);
let step = 1;
let t = 0;

const layer1Rows = [], layer2Rows = [];
for (let j = 0; j <= Nz; j++) {
  (-d + j * dz) > 0 ? layer1Rows.push(j) : layer2Rows.push(j);
}

// Mid-row of each layer for 1D profiles (Z_EXTRACT = 0.5)
const midL1 = layer1Rows[Math.floor(layer1Rows.length / 2)] ?? Math.floor(Nz * 3 / 4);
const midL2 = layer2Rows[Math.floor(layer2Rows.length / 2)] ?? Math.floor(Nz * 1 / 4);

function getFrontPos(arr, thresh, rows) {
  const pos = [];
  for (const j of rows) {
    let found = false;
    for (let i = 0; i <= Nx; i++) {
      const idx = j * (Nx + 1) + i;
      if (arr[idx] >= thresh) {
        if (i === 0) { pos.push(0); } else {
          const y0 = arr[j * (Nx + 1) + i - 1], y1 = arr[idx];
          const dy = y1 - y0;
          const xf = Math.abs(dy) > 1e-12 ? (i - 1) * dx + (thresh - y0) * dx / dy : i * dx;
          pos.push(Math.max(0, Math.min(xf, L)));
        }
        found = true; break;
      }
    }
    if (!found) pos.push(L);
  }
  return pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 0;
}

// History buffers — accumulated every 10 steps like Python
const hist_t = [], hist_fp1 = [], hist_fp2 = [];
const hist_fp1_nD = [], hist_fp2_nD = [];
const hist_trans_z = [], hist_rec_pct = [];

function runBatch() {
  if (!running) return;
  if (paused) { setTimeout(runBatch, 30); return; }

  const batchSize = Math.min(50, Nt - step + 1);

  for (let b = 0; b < batchSize; b++) {
    t = step * dt;

    const Fw = new Float64Array(numCells);
    const Dc = new Float64Array(numCells);
    for (let idx = 0; idx < numCells; idx++) {
      Fw[idx] = fw(Sw[idx], nD[idx], k_2d[idx], params);
      Dc[idx] = Math.max(0, D_cap(Sw[idx], nD[idx], k_2d[idx], phi_2d[idx], params));
    }

    const adv  = advectionUpwindX(Fw, u_2d, Nx, Nz, dx);
    const diff = divDiffusion(Sw, Dc, Nx, Nz, dx, dz, thetaS);

    const Sw_new = new Float64Array(numCells);
    for (let idx = 0; idx < numCells; idx++) {
      const rhs = (-adv[idx] + diff[idx]) * w_area[idx];
      Sw_new[idx] = Math.max(Swc + 1e-6, Math.min(Sw[idx] + dt * rhs / (M_phi[idx] + 1e-30), 1 - Sgr - 1e-6));
    }

    // Crossflow at z=0 interface
    const midJ = Math.floor(Nz / 2);
    let q_cross = 0;
    if (thetaS > 0) {
      for (let i = 0; i <= Nx; i++) {
        const idxLo = midJ * (Nx + 1) + i;
        const idxHi = (midJ + 1) * (Nx + 1) + i;
        const Di = 2 * Dc[idxHi] * Dc[idxLo] / (Dc[idxHi] + Dc[idxLo] + 1e-30);
        q_cross += Di * (Sw_new[idxLo] - Sw_new[idxHi]) / dz * dx;
      }
    }

    // nD local equilibrium: nD = nD_LE(Sw_new)
    for (let idx = 0; idx < numCells; idx++) {
      Sw[idx] = Sw_new[idx];
      nD[idx] = Math.max(0, Math.min(nD_LE(Sw_new[idx], params), 1));
    }
    applyBCs(Sw, nD, Nx, Nz, Sw_minus, nD_inj);

    // Swept area
    let swept = 0;
    for (let idx = 0; idx < numCells; idx++) {
      if (Sw[idx] > Sw_minus + 0.01) swept += dx * dz;
    }
    const rec_pct = 100 * swept / (L * 2 * d);

    // Record metrics every 10 steps (like Python `if step % 10 == 0`)
    if (step % 10 === 0) {
      hist_t.push(t);
      hist_fp1.push(getFrontPos(Sw, UMBRAL, layer1Rows));
      hist_fp2.push(getFrontPos(Sw, UMBRAL, layer2Rows));
      hist_fp1_nD.push(getFrontPos(nD, 0.5, layer1Rows));
      hist_fp2_nD.push(getFrontPos(nD, 0.5, layer2Rows));
      hist_trans_z.push(q_cross);
      hist_rec_pct.push(rec_pct);
    }

    step++;
  }

  // Enviar frame cada FRAME_EVERY pasos con historia acumulada y perfiles 1D
  if (step % FRAME_EVERY < batchSize || step > Nt) {
    const SwL1 = [], SwL2 = [], nDL1 = [], nDL2 = [];
    for (let i = 0; i <= Nx; i++) {
      SwL1.push(Sw[midL1 * (Nx + 1) + i]);
      SwL2.push(Sw[midL2 * (Nx + 1) + i]);
      nDL1.push(nD[midL1 * (Nx + 1) + i]);
      nDL2.push(nD[midL2 * (Nx + 1) + i]);
    }

    parentPort.postMessage({
      type: 'frame', step, t,
      Sw: Array.from(Sw),
      nD: Array.from(nD),
      profiles1D: { SwL1, SwL2, nDL1, nDL2 },
      metricsBatch: {
        hist_t:      [...hist_t],      hist_fp1:    [...hist_fp1],
        hist_fp2:    [...hist_fp2],    hist_fp1_nD: [...hist_fp1_nD],
        hist_fp2_nD: [...hist_fp2_nD], hist_trans_z:[...hist_trans_z],
        hist_rec_pct:[...hist_rec_pct]
      }
    });
    // Clear buffers after send
    hist_t.length = hist_fp1.length = hist_fp2.length = 0;
    hist_fp1_nD.length = hist_fp2_nD.length = 0;
    hist_trans_z.length = hist_rec_pct.length = 0;
  }

  if (step > Nt) {
    running = false;
    parentPort.postMessage({ type: 'done', summary: {} });
  } else {
    setTimeout(runBatch, 0);
  }
}

parentPort.on('message', ({ command }) => {
  if (command === 'pause')  paused = true;
  if (command === 'resume') paused = false;
  if (command === 'stop')   running = false;
});

runBatch();
