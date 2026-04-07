import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';
import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const configuredWs = import.meta.env.VITE_WS_URL || '';

function apiUrl(path) {
  return apiBase ? `${apiBase}${path}` : path;
}

function wsUrlFromApiBase() {
  if (!apiBase) return null;
  if (apiBase.startsWith('https://')) return `${apiBase.replace('https://', 'wss://')}/ws`;
  if (apiBase.startsWith('http://')) return `${apiBase.replace('http://', 'ws://')}/ws`;
  return null;
}

export function useSimulation() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const shouldReconnect = useRef(true);
  const store = useSimStore();

  useEffect(() => {
    // Always hydrate params over HTTP so UI doesn't block if WS is delayed.
    axios.get(apiUrl('/api/params/defaults'))
      .then((res) => {
        if (res?.data) store.setParams(res.data);
      })
      .catch(() => {});

    const connectWs = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = configuredWs || wsUrlFromApiBase() || `${proto}//${window.location.host}/ws`;
      ws.current = new WebSocket(wsUrl);

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
      ws.current.onclose = () => {
        if (!shouldReconnect.current) return;
        reconnectTimer.current = setTimeout(connectWs, 1500);
      };
    };

    connectWs();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  return {
    start: async (params) => {
      store.resetSim();
      await axios.post(apiUrl('/api/simulate/start'), { params });
    },
    pause:  () => axios.post(apiUrl('/api/simulate/pause')),
    resume: () => axios.post(apiUrl('/api/simulate/resume')),
    stop:   () => axios.post(apiUrl('/api/simulate/stop')),
  };
}
