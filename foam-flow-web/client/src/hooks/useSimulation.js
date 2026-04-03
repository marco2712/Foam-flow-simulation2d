import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';
import axios from 'axios';

export function useSimulation() {
  const ws = useRef(null);
  const store = useSimStore();

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'init') {
        store.setStatus(data.status);
        store.setParams(data.params);
        store.setProgress(data.progress || 0);

      } else if (data.type === 'frame') {
        // Update 2D field maps
        store.setLatestFrame(data.Sw, data.nD);

        // Update 1D profiles
        if (data.profiles1D) store.setProfiles1D(data.profiles1D);

        // Append accumulated metric history
        if (data.metricsBatch && data.metricsBatch.hist_t.length > 0) {
          store.addHistoryBatch(data.metricsBatch);
        }

        // Update progress
        store.setProgress(data.t / (store.getParams()?.Tmax || 1));

      } else if (data.type === 'status') {
        store.setStatus(data.status);

      } else if (data.type === 'done') {
        store.setStatus('done');
      }
    };

    ws.current.onerror = () => {};
    return () => ws.current?.close();
  }, []);

  return {
    start: async (params) => {
      store.resetSim();
      await axios.post('/api/simulate/start', { params });
    },
    pause:  () => axios.post('/api/simulate/pause'),
    resume: () => axios.post('/api/simulate/resume'),
    stop:   () => axios.post('/api/simulate/stop'),
  };
}
