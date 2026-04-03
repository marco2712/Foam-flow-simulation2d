import express from 'express';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { state, resetState } from '../store/simState.js';
import { wss } from '../index.js';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

let worker = null;

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

router.post('/start', (req, res) => {
  const { params } = req.body;
  if (state.status === 'running') {
    return res.status(400).json({ error: 'Simulation already running' });
  }
  
  // Merge any params from UI on top of defaults
  if (params) {
    state.params = { ...state.params, ...params };
  }
  resetState();
  state.status = 'running';
  // Broadcast running status so UI updates immediately
  broadcast({ type: 'status', status: 'running' });

  worker = new Worker(path.resolve(__dirname, '../simulation/worker.js'), {
    workerData: { params: state.params }
  });

  worker.on('message', (msg) => {
    if (msg.type === 'frame') {
      const { t, metricsBatch } = msg;
      
      // Accumulate metrics batch into server state
      if (metricsBatch && metricsBatch.hist_t.length > 0) {
        state.hist_t.push(...metricsBatch.hist_t);
        state.hist_fp1.push(...metricsBatch.hist_fp1);
        state.hist_fp2.push(...metricsBatch.hist_fp2);
        state.hist_fp1_nD.push(...metricsBatch.hist_fp1_nD);
        state.hist_fp2_nD.push(...metricsBatch.hist_fp2_nD);
        state.hist_trans_z.push(...metricsBatch.hist_trans_z);
        state.hist_rec_pct.push(...metricsBatch.hist_rec_pct);
      }
      
      state.lastFrame = { Sw: msg.Sw, nD: msg.nD };
      state.progress = t / state.params.Tmax;

      // Broadcast the full frame to all connected clients
      broadcast(msg);

    } else if (msg.type === 'done') {
      state.status = 'done';
      worker = null;
      broadcast({ type: 'done', summary: msg.summary });
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
    state.status = 'idle';
    broadcast({ type: 'status', status: 'idle' });
    worker = null;
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error('Worker exited with code', code);
      state.status = 'idle';
      broadcast({ type: 'status', status: 'idle' });
      worker = null;
    }
  });

  res.json({ message: 'Simulation started', params: state.params });
});

router.post('/pause', (req, res) => {
  if (worker && state.status === 'running') {
    worker.postMessage({ command: 'pause' });
    state.status = 'paused';
    broadcast({ type: 'status', status: 'paused' });
    res.json({ message: 'Simulation paused' });
  } else {
    res.status(400).json({ error: 'Simulation not running' });
  }
});

router.post('/resume', (req, res) => {
  if (worker && (state.status === 'paused')) {
    worker.postMessage({ command: 'resume' });
    state.status = 'running';
    broadcast({ type: 'status', status: 'running' });
    res.json({ message: 'Simulation resumed' });
  } else {
    res.status(400).json({ error: 'Simulation not paused' });
  }
});

router.post('/stop', (req, res) => {
  if (worker) {
    worker.postMessage({ command: 'stop' });
    // Give it 100ms to clean up gracefully, then force terminate
    setTimeout(() => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    }, 100);
    state.status = 'idle';
    broadcast({ type: 'status', status: 'idle' });
    worker = null;
    res.json({ message: 'Simulation stopped' });
  } else {
    // Even if no worker, reset to idle so UI can restart
    state.status = 'idle';
    broadcast({ type: 'status', status: 'idle' });
    res.json({ message: 'No active simulation, reset to idle' });
  }
});

export default router;
