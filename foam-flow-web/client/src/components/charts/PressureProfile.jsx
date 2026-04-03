import React from 'react';
import GenericLineChart from './GenericLineChart';

export default function PressureProfile() {
  // Using the historical recovery percentage here although named PressureProfile for historical reasons or as a placeholder.
  return <GenericLineChart dataKey1="hist_rec_pct" title="Recovery (%)" xLabel="Time (s)" yLabel="%" />;
}
