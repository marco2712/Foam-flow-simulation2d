import React from 'react';
import GenericLineChart from './GenericLineChart';

export default function CrossTransfer() {
  return <GenericLineChart dataKey1="hist_trans_z" title="Crossflow Transfer (z)" xLabel="Time (s)" yLabel="Transfer" color1="#800080" />;
}
