import React from 'react';
import GenericLineChart from './GenericLineChart';

export default function PressureExtra1D() {
  return (
    <GenericLineChart
      dataKey1="hist_rec_pct"
      title="Recovery (%)"
      xLabel="Time (s)"
      yLabel="%"
      color1="#f57c00"
    />
  );
}
