import express from 'express';
import { state } from '../store/simState.js';

const router = express.Router();

router.get('/csv', (req, res) => {
  const { hist_t, hist_fp1, hist_fp2, hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct } = state;

  const header = 't,fp1_m,fp2_m,fp1_nD_m,fp2_nD_m,trans_z,rec_pct\n';
  const rows = hist_t.map((t, i) =>
    `${t},${hist_fp1[i]},${hist_fp2[i]},${hist_fp1_nD[i]},${hist_fp2_nD[i]},${hist_trans_z[i]},${hist_rec_pct[i]}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="foam_simulation.csv"');
  res.send(header + rows);
});

router.get('/csv-matrix', (req, res) => {
  if (!state.lastFrame) {
    return res.status(404).send('No frame data available');
  }

  const { Sw, nD } = state.lastFrame;
  const { Nx, Nz, d } = state.params;
  const dx = 0.6 / Nx;
  const dz = (2 * d) / Nz;

  const header = 'row,col,x,z,Sw,nD\n';
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
