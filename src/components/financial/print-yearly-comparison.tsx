
'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';

interface PrintYearlyComparisonProps {
  data: any[];
  year1?: number;
  year2?: number;
  dataTypeLabel: string;
}

const PrintYearlyComparisonLayout: React.FC<PrintYearlyComparisonProps> = ({ data, year1, year2, dataTypeLabel }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const lineColors = ['#8884d8', '#82ca9d'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', fontSize: '10pt' }}>
          <p style={{ fontWeight: 'bold' }}>{`${label}`}</p>
          {payload.map((p: any, i: number) => (
             <p key={i} style={{ color: p.stroke || p.fill }}>
                {`${dataTypeLabel} ${p.name}: ${formatCurrency(p.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <PrintLayoutWrapper title={`Multi-Year Comparison: ${dataTypeLabel}`}>
      <main>
        <div style={{ width: '100%', height: '600px' }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 50, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize="11pt" />
                <YAxis tickFormatter={(value) => formatCurrency(value as number)} fontSize="11pt" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "11pt"}} formatter={(value, entry) => `${dataTypeLabel} ${value}`}/>
                {year1 && <Line type="monotone" name={String(year1)} dataKey={year1} stroke={lineColors[0]} strokeWidth={2} activeDot={{ r: 8 }} />}
                {year2 && <Line type="monotone" name={String(year2)} dataKey={year2} stroke={lineColors[1]} strokeWidth={2} activeDot={{ r: 8 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </PrintLayoutWrapper>
  );
};

export default PrintYearlyComparisonLayout;
