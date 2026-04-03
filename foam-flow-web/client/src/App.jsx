import React, { useState } from 'react';
import DashboardLayout from './layout/DashboardLayout';
import StartScreen from './components/landing/StartScreen';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen text-slate-100 dark" style={{ backgroundColor: 'var(--color-base-bg)'}}>
      {showDashboard ? (
        <DashboardLayout />
      ) : (
        <StartScreen onStart={() => setShowDashboard(true)} />
      )}
    </div>
  );
}

export default App;
