import React from 'react';
import GenericLineChart from './GenericLineChart';

export default function VerticalCrossflowExtra1D() {
  return (
    <GenericLineChart
      dataKey1="hist_trans_z"
      title="Vertical Crossflow (Extra 1D)"
      xLabel="Time (s)"
      yLabel="Transfer"
      color1="#d81b60"
    />
  );
}
