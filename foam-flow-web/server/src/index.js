import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { state, resetState } from './store/simState.js';
import simulationRoutes from './routes/simulation.js';
import exportRoutes from './routes/export.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/simulate', simulationRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/params/defaults', (req, res) => {
  res.json(state.params);
});

const server = http.createServer(app);
export const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Send current state
  ws.send(JSON.stringify({ 
    type: 'init', 
    status: state.status, 
    params: state.params,
    progress: state.progress 
  }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
