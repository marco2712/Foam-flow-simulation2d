export function advectionUpwindX(q, u, Nx, Nz, dx) {
  const adv = new Float64Array((Nz + 1) * (Nx + 1));
  for (let j = 0; j <= Nz; j++) {
    for (let i = 1; i < Nx; i++) {
      const idx = j * (Nx + 1) + i;
      const idx_prev = j * (Nx + 1) + (i - 1);
      adv[idx] = (u[idx] * q[idx] - u[idx_prev] * q[idx_prev]) / dx;
    }
  }
  return adv;
}

export function divDiffusion(S, D, Nx, Nz, dx, dz) {
  const div = new Float64Array((Nz + 1) * (Nx + 1));
  
  // X-axis diffusion
  for (let j = 0; j <= Nz; j++) {
    for (let i = 1; i < Nx; i++) {
      const idx = j * (Nx + 1) + i;
      const idx_next = j * (Nx + 1) + (i + 1);
      const idx_prev = j * (Nx + 1) + (i - 1);
      
      const Dx_next = 2.0 * D[idx_next] * D[idx] / (D[idx_next] + D[idx] + 1e-30);
      const Dx_prev = 2.0 * D[idx] * D[idx_prev] / (D[idx] + D[idx_prev] + 1e-30);
      
      const flux_x_next = Dx_next * (S[idx_next] - S[idx]) / dx;
      const flux_x_prev = Dx_prev * (S[idx] - S[idx_prev]) / dx;
      
      div[idx] += (flux_x_next - flux_x_prev) / dx;
    }
  }

  // Z-axis diffusion
  for (let j = 1; j < Nz; j++) {
    for (let i = 0; i <= Nx; i++) {
      const idx = j * (Nx + 1) + i;
      const j_next = (j + 1) * (Nx + 1) + i;
      const j_prev = (j - 1) * (Nx + 1) + i;
      
      const Dz_next = 2.0 * D[j_next] * D[idx] / (D[j_next] + D[idx] + 1e-30);
      const Dz_prev = 2.0 * D[idx] * D[j_prev] / (D[idx] + D[j_prev] + 1e-30);
      
      const flux_z_next = Dz_next * (S[j_next] - S[idx]) / dz;
      const flux_z_prev = Dz_prev * (S[idx] - S[j_prev]) / dz;
      
      div[idx] += (flux_z_next - flux_z_prev) / dz;
    }
  }
  return div;
}

export function applyBCs(Sw, nD, Nx, Nz, Sw_minus, nD_inj) {
  // Dirichlet x=0
  for (let j = 0; j <= Nz; j++) {
    const idx0 = j * (Nx + 1) + 0;
    Sw[idx0] = Sw_minus;
    nD[idx0] = nD_inj;
  }

  // Neumann at x = L (copy second to last column to last column)
  for (let j = 0; j <= Nz; j++) {
    const idx_L = j * (Nx + 1) + Nx;
    const idx_L1 = j * (Nx + 1) + (Nx - 1);
    Sw[idx_L] = Sw[idx_L1];
    nD[idx_L] = nD[idx_L1];
  }

  // Neumann at z=0 and z=H (copy second row to first row, and second to last to last)
  for (let i = 0; i <= Nx; i++) {
    const idx_row0 = i;
    const idx_row1 = 1 * (Nx + 1) + i;
    Sw[idx_row0] = Sw[idx_row1];
    nD[idx_row0] = nD[idx_row1];

    const idx_rowNz = Nz * (Nx + 1) + i;
    const idx_rowNz1 = (Nz - 1) * (Nx + 1) + i;
    Sw[idx_rowNz] = Sw[idx_rowNz1];
    nD[idx_rowNz] = nD[idx_rowNz1];
  }
}
