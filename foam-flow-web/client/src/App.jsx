import React from 'react';
import DashboardLayout from './layout/DashboardLayout';
import { useSimStore } from './store/simStore';

function App() {
  return (
    <div className="min-h-screen text-slate-100 dark" style={{ backgroundColor: 'var(--color-base-bg)'}}>
      <DashboardLayout />
    </div>
  );
}

export default App;
