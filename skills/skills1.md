---
name: foam-flow-simulation-web
description: >
  Builds and deploys the "Foam Flow Simulation Dashboard" as a full web application
  using the Stitch MCP, Node.js, and React. Use this skill WHENEVER the user mentions:
  converting the foam simulation to web, implementing the simulation dashboard in Stitch,
  making parameters editable in the UI, exporting simulation data to CSV, or any task
  combining the 2D finite-element foam simulation with an interactive web interface.
  Trigger on phrases like "move the simulation to web", "build the dashboard in Stitch",
  "editable parameters", "export charts to CSV", or "implement in React".
---

# Foam Flow Simulation – Web Dashboard (Stitch + Node.js + React)

## Goal

Port the 2D bilayer porous-media foam simulator (currently Python/matplotlib) to an
interactive web application with:

- **Editable physical parameters** in real time from the UI
- **Simulation engine** running in a Node.js worker (non-blocking UI)
- **Interactive visualizations** equivalent to all 12 panels in the Python code
- **CSV export** of all chart history data
- **Persistence** of settings and results via Stitch

---

## Step 0 — Prerequisites: read the existing mockup

Before writing any code:

1. Use the Stitch MCP to locate the "Foam Flow Simulation Dashboard" project:
   ```
   stitch.list_projects()
   stitch.get_project("Foam Flow Simulation Dashboard")
   ```
2. Read ALL components of the existing mockup. Do not invent new structure;
   extend what is already defined.
3. Record the exact component names, routes, and layouts from the mockup before
   proceeding.

---

## Step 1 — Project architecture

```
foam-flow-web/
├── server/                         # Node.js backend
│   ├── src/
│   │   ├── index.js                # Express + WebSocket server
│   │   ├── simulation/
│   │   │   ├── engine.js           # JS port of the Python core
│   │   │   ├── constitutive.js     # krw, krg0, MRF, nD_LE, fw, D_cap, Pc
│   │   │   ├── operators.js        # advection_upwind_x, div_diffusion
│   │   │   └── worker.js           # worker_threads: runs the loop without blocking
│   │   ├── routes/
│   │   │   ├── simulation.js       # POST /api/simulate/start|stop|pause
│   │   │   └── export.js           # GET  /api/export/csv
│   │   └── store/
│   │       └── simState.js         # In-memory state: hist_t, hist_fp1, …
│   └── package.json
│
├── client/                         # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ParameterPanel/     # Sliders and fields for physical parameters
│   │   │   ├── SimulationGrid/     # 12-panel layout (mirror of Python)
│   │   │   ├── charts/             # One component per panel
│   │   │   │   ├── SaturationMap.jsx
│   │   │   │   ├── FoamTextureMap.jsx
│   │   │   │   ├── CrossflowMap.jsx
│   │   │   │   ├── FrontVelocity2D.jsx     # |v_f| colormap + quiver
│   │   │   │   ├── Profiles1D.jsx
│   │   │   │   ├── FrontPosition.jsx
│   │   │   │   ├── FrontSpeedVsPos.jsx
│   │   │   │   ├── VerticalProfile.jsx     # v_fx(z)
│   │   │   │   ├── FrontDistance.jsx
│   │   │   │   ├── CrossTransfer.jsx
│   │   │   │   ├── PressureProfile.jsx
│   │   │   │   └── Streamlines.jsx
│   │   │   ├── controls/
│   │   │   │   ├── SimControls.jsx  # Play / Pause / Stop / Reset
│   │   │   │   └── ExportButton.jsx
│   │   │   └── layout/
│   │   │       └── DashboardLayout.jsx
│   │   ├── hooks/
│   │   │   ├── useSimulation.js    # WebSocket listener → React state
│   │   │   └── useExport.js        # CSV download
│   │   └── store/
│   │       └── simStore.js         # Zustand or Context: params + results
│   └── package.json
│
└── stitch.config.js                # Stitch project configuration
```

---

## Step 2 — Implementation with the Stitch MCP

### 2.1 Create / open the project

```javascript
// Copy the existing mockup and scaffold the project
await stitch.copyProject("Foam Flow Simulation Dashboard", "foam-flow-web");
await stitch.openProject("foam-flow-web");
```

### 2.2 Install dependencies

**Server (`server/package.json`):**
```json
{
  "dependencies": {
    "express": "^4.18",
    "ws": "^8.16",
    "cors": "^2.8",
    "uuid": "^9.0"
  }
}
```

**Client (`client/package.json`):**
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^2.12",
    "d3": "^7",
    "zustand": "^4",
    "axios": "^1.6"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4"
  }
}
```

Run from Stitch:
```javascript
await stitch.runCommand("cd server && npm install");
await stitch.runCommand("cd client && npm install");
```

---

## Step 3 — Simulation engine in JavaScript (`server/src/simulation/`)

### 3.1 Constitutive relations (`constitutive.js`)

Translate **exactly** the Python functions to vectorized JS using flat `Float64Array`
buffers:

```javascript
// Parameters received as an object { phi1, phi2, Swc, Sgr, mu_w, mu_g,
//   k1, k2, Sw_star, A, Kc, u1, u2, d, sigma, c_cap,
//   Sw_minus, Sw_plus, Nx, Nz, dt, Tmax }

export function krw(Sw, Swc, Sgr)                  { /* 0.2 * clip(...)^4.2 */ }
export function krg0(Sw, Swc, Sgr)                 { /* 0.94 * clip(...)^1.3 */ }
export function MRF(nD)                             { /* clip(18500*nD+1, 1, 1e7) */ }
export function nD_LE(Sw, Sw_star, A)               { /* tanh(A*(Sw-Sw_star)) if Sw>Sw_star */ }
export function fw(Sw, nD, k_b, params)             { /* lw/(lw+lg) */ }
export function lambdaT(Sw, nD, k_b, params)        { /* lw+lg */ }
export function Phi_foam(Sw, nD, params)             { /* Kc*(nD_LE-nD) */ }
export function Pc(Sw, k_b, phi_b, params)           { /* sigma*sqrt(phi/k)*0.022*... */ }
export function dPc_dSw(Sw, k_b, phi_b, params)     { /* centered finite difference */ }
export function D_cap(Sw, nD, k_b, phi_b, params)   { /* -lg*fw*dPc_dSw */ }
```

**Rule:** one JS function per Python function, same names, same logic.
If there is any doubt about a calculation, use the original Python code as the
source of truth.

### 3.2 FE operators (`operators.js`)

```javascript
export function advectionUpwindX(q, u, Nx, Nz, dx)         { /* 1st-order upwind */ }
export function divDiffusion(S, D, Nx, Nz, dx, dz)          { /* harmonic face average */ }
export function applyBCs(Sw, nD, Nx, Nz, Sw_minus, nD_inj) { /* Dirichlet x=0, Neumann elsewhere */ }
```

### 3.3 Main worker (`worker.js`)

```javascript
import { parentPort, workerData } from 'worker_threads';

// workerData = { params, command }
// Messages emitted every FRAME_EVERY = 200 steps:
// { type: 'frame', step, t, Sw, nD, hist_t, hist_fp1, hist_fp2,
//   hist_fp1_nD, hist_fp2_nD, hist_trans_z, hist_rec_pct }
// Final message:
// { type: 'done', summary: { v1_num, v2_num, v_num, v_teorico, K_P } }

parentPort.on('message', ({ command }) => {
  if (command === 'pause')  paused  = true;
  if (command === 'resume') paused  = false;
  if (command === 'stop')   running = false;
});
```

**Important:** use `setImmediate` or micro-batches of 50 steps per tick to avoid
freezing the worker's event loop.

---

## Step 4 — REST API + WebSocket (`server/src/index.js`)

```javascript
// WebSocket: streams simulation frames to the client in real time
// REST endpoints:
//   POST /api/simulate/start   body: { params }  → starts the worker
//   POST /api/simulate/pause
//   POST /api/simulate/resume
//   POST /api/simulate/stop
//   GET  /api/export/csv       → downloads CSV with all history arrays
//   GET  /api/params/defaults  → returns default parameter values
```

The server stores the full history in `simState.js`:

```javascript
const state = {
  hist_t:       [],
  hist_fp1:     [], hist_fp2:     [],
  hist_fp1_nD:  [], hist_fp2_nD:  [],
  hist_trans_z: [], hist_rec_pct: [],
  lastFrame:    null,   // { Sw, nD } from the most recent rendered frame
  params:       {},
  status:       'idle', // 'running' | 'paused' | 'done'
};
```

---

## Step 5 — React Frontend

### 5.1 Parameter panel (`ParameterPanel/`)

Each physical parameter must have:
- **Label** with LaTeX symbol where applicable (use `react-katex` or plain-text
  subscripts)
- **`<input type="range">`** and **`<input type="number">`** kept in sync
- Defined minimum, maximum, and step values:

| Parameter  | Min   | Max   | Step | Unit |
|------------|-------|-------|------|------|
| `phi1`     | 0.05  | 0.40  | 0.01 | —    |
| `phi2`     | 0.05  | 0.40  | 0.01 | —    |
| `k1`       | 1e-13 | 1e-11 | log  | m²   |
| `k2`       | 1e-13 | 1e-11 | log  | m²   |
| `u1`       | 1e-7  | 1e-4  | log  | m/s  |
| `u2`       | 1e-7  | 1e-4  | log  | m/s  |
| `Sw_minus` | 0.20  | 0.50  | 0.001| —    |
| `Sw_plus`  | 0.50  | 0.95  | 0.001| —    |
| `Tmax`     | 1000  | 20000 | 100  | s    |
| `Nx`       | 50    | 500   | 10   | —    |
| `Nz`       | 10    | 100   | 5    | —    |

Use a **logarithmic scale** on the slider for `k1`, `k2`, `u1`, and `u2`.

### 5.2 Chart panels (`charts/`)

Use **Recharts** for time-series data and 1D profiles.
Use **D3** for 2D field maps (Sw, nD, |v_f|) rendered on `<canvas>`.

| Python panel | React component | Library |
|---|---|---|
| Saturation Sw 2D map | `SaturationMap.jsx` | D3 + canvas |
| Foam texture nD 2D map | `FoamTextureMap.jsx` | D3 + canvas |
| Crossflow uz map | `CrossflowMap.jsx` | D3 + canvas |
| Front velocity 2D + quiver | `FrontVelocity2D.jsx` | D3 + canvas + SVG arrows |
| 1D profiles Sw and nD | `Profiles1D.jsx` | Recharts LineChart |
| Front position vs time | `FrontPosition.jsx` | Recharts LineChart |
| Front speed vs position | `FrontSpeedVsPos.jsx` | Recharts LineChart |
| Vertical profile v_fx(z) | `VerticalProfile.jsx` | Recharts LineChart (rotated) |
| Distance between fronts | `FrontDistance.jsx` | Recharts LineChart |
| Cross-layer transfer | `CrossTransfer.jsx` | Recharts LineChart |
| Pressure profile P(x) | `PressureProfile.jsx` | Recharts LineChart |
| Streamlines v_f | `Streamlines.jsx` | D3 + canvas |

**Every chart component must:**
1. Receive `data` as a prop (array of history objects)
2. Expose a `getData()` method so `useExport` can collect it
3. Display the same theoretical reference lines (`v_teorico`, `v1_iso`, `v2_iso`)
   that appear in the Python plots

### 5.3 Simulation controls (`SimControls.jsx`)

```jsx
// Buttons: ▶ Start | ⏸ Pause | ▶ Resume | ⏹ Stop | 🔄 Reset
// Status badge: idle / running / paused / done
// Progress bar: t / Tmax as %
// Elapsed wall-clock time updated in real time
```

### 5.4 CSV export (`ExportButton.jsx` + `useExport.js`)

When the user clicks **"Export CSV"**:

1. Call `GET /api/export/csv`
2. The server builds a CSV with these columns:

```
t,fp1,fp2,fp1_nD,fp2_nD,trans_z,rec_pct
```

3. Optionally a second CSV with the last Sw and nD frame (flattened matrix):

```
row,col,x,z,Sw,nD
```

4. The client triggers both downloads automatically using a temporary `<a>` anchor.

**Server route (`routes/export.js`):**

```javascript
router.get('/csv', (req, res) => {
  const { hist_t, hist_fp1, hist_fp2, ...rest } = simState;

  const header = 't,fp1_m,fp2_m,fp1_nD_m,fp2_nD_m,trans_z,rec_pct\n';
  const rows = hist_t.map((t, i) =>
    `${t},${hist_fp1[i]},${hist_fp2[i]},${hist_fp1_nD[i]},` +
    `${hist_fp2_nD[i]},${hist_trans_z[i]},${hist_rec_pct[i]}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="foam_simulation.csv"');
  res.send(header + rows);
});
```

---

## Step 6 — Stitch integration

### 6.1 Configuration (`stitch.config.js`)

```javascript
export default {
  project:   "Foam Flow Simulation Dashboard",
  framework: "react",
  runtime:   "node",
  port:      3001,   // server
  devPort:   5173,   // Vite client
  proxy: {
    '/api': 'http://localhost:3001',
    '/ws':  'ws://localhost:3001',
  },
  env: {
    NODE_ENV: "development"
  }
};
```

### 6.2 Start commands

```javascript
// Register scripts in Stitch
await stitch.setStartCommand("server", "node src/index.js");
await stitch.setStartCommand("client", "vite");
await stitch.openPreview();  // opens the dashboard in the built-in browser
```

---

## Step 7 — 2D field maps with D3 + Canvas

Standard `useEffect` pattern for each 2D map (Sw, nD, |v_f|, streamlines):

```javascript
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx    = canvas.getContext('2d');
  const Nrows  = data.Nz + 1;
  const Ncols  = data.Nx + 1;

  // Colormaps: RdYlBu_r (Sw), plasma (nD), hot_r (|v_f|), coolwarm (uz)
  const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([vmax, vmin]);

  const imgData = ctx.createImageData(Ncols, Nrows);
  data.field.forEach((val, idx) => {
    const [r, g, b] = hexToRgb(colorScale(val));
    imgData.data[idx * 4]     = r;
    imgData.data[idx * 4 + 1] = g;
    imgData.data[idx * 4 + 2] = b;
    imgData.data[idx * 4 + 3] = 255;
  });

  // Scale the canvas element to the panel size via CSS
  ctx.putImageData(imgData, 0, 0);

  // Overlay quiver as SVG (for FrontVelocity2D only)
}, [data]);
```

For the **quiver** in `FrontVelocity2D.jsx`, render SVG arrows on top of the canvas:

```jsx
<div style={{ position: 'relative' }}>
  <canvas ref={canvasRef} />
  <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
    {quiverPoints.map(({ x, y, vx, vz, mag }, i) => (
      <Arrow key={i} x={x} y={y} dx={vx/mag*scale} dy={vz/mag*scale}
             color={magColor(mag)} />
    ))}
  </svg>
</div>
```

---

## Step 8 — Verification checklist

Before declaring the implementation complete, confirm every item below:

- [ ] Stitch mockup was read with `stitch.get_project()` before creating any files
- [ ] All 12 Python panels have a React equivalent
- [ ] All physical parameters in the Step 5.1 table are editable
- [ ] Logarithmic sliders work correctly for k1, k2, u1, u2
- [ ] Simulation runs in a `worker_thread` and does not freeze the UI
- [ ] WebSocket streams frames every 200 steps (same cadence as Python)
- [ ] `GET /api/export/csv` returns the correct columns
- [ ] The export button downloads the CSV automatically
- [ ] Progress bar shows `t / Tmax` in real time
- [ ] Play / Pause / Stop / Reset controls work correctly
- [ ] 2D maps use the same colormaps as in Python
- [ ] Theoretical reference lines (v_teorico, v1_iso, v2_iso) appear on the
      relevant charts
- [ ] The 2D velocity figure includes the `|v_f|` colormap + quiver + streamlines +
      vertical profile

---

## Important notes

**Physical fidelity:** The JS engine must produce results identical to Python.
For any numerical discrepancy, the Python code is the source of truth.

**Performance:** For Nx=300, Nz=50, each time step involves ~30 k vectorial
operations. Use `Float64Array` (not plain JS arrays) for all 2D fields.

**D3 colormaps equivalent to matplotlib:**
- `RdYlBu_r` → `d3.interpolateRdYlBu` (reversed: `.domain([vmax, vmin])`)
- `plasma`   → `d3.interpolatePlasma`
- `hot_r`    → `d3.interpolateInferno` (close approximation)
- `coolwarm` → `d3.interpolateRdBu`

**2D matrix CSV export:** If the user wants to export the full Sw and nD fields
(not just the 1D history arrays), generate a separate CSV with columns
`row,col,x,z,Sw,nD` using the last frame stored in `simState.lastFrame`.