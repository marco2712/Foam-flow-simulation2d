import { create } from 'zustand';

export const useSimStore = create((set, get) => ({
  status: 'idle',
  progress: 0,
  params: null,
  history: {
    hist_t: [], hist_fp1: [], hist_fp2: [],
    hist_fp1_nD: [], hist_fp2_nD: [],
    hist_trans_z: [], hist_rec_pct: []
  },
  latestFrame: null,
  profiles1D: null,

  setStatus:   (status)   => set({ status }),
  setProgress: (progress) => set({ progress }),
  setParams:   (params)   => set({ params }),
  getParams:   ()         => get().params,

  updateParams: (patch) => set(s => ({ params: { ...s.params, ...patch } })),

  addHistoryBatch: (batch) => set(s => ({
    history: {
      hist_t:      [...s.history.hist_t,      ...(batch.hist_t      || [])],
      hist_fp1:    [...s.history.hist_fp1,    ...(batch.hist_fp1    || [])],
      hist_fp2:    [...s.history.hist_fp2,    ...(batch.hist_fp2    || [])],
      hist_fp1_nD: [...s.history.hist_fp1_nD, ...(batch.hist_fp1_nD|| [])],
      hist_fp2_nD: [...s.history.hist_fp2_nD, ...(batch.hist_fp2_nD|| [])],
      hist_trans_z:[...s.history.hist_trans_z,...(batch.hist_trans_z|| [])],
      hist_rec_pct:[...s.history.hist_rec_pct,...(batch.hist_rec_pct|| [])],
    }
  })),

  setLatestFrame: (Sw, nD) => set({ latestFrame: { Sw, nD } }),
  setProfiles1D:  (p)      => set({ profiles1D: p }),

  resetSim: () => set({
    status: 'idle', progress: 0,
    history: {
      hist_t: [], hist_fp1: [], hist_fp2: [],
      hist_fp1_nD: [], hist_fp2_nD: [],
      hist_trans_z: [], hist_rec_pct: []
    },
    latestFrame: null, profiles1D: null
  })
}));
