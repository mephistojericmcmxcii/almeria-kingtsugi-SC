
'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PoFinancialSummary } from '@/app/(app)/management/financial/page';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';
import { format } from 'date-fns';

interface PrintFinancialReportProps {
  data: PoFinancialSummary[];
  totals: {
    paidCount: number;
    unpaidCount: number;
    totalTaxDeduction: number;
    totalProfitLoss: number;
  };
}

const PrintFinancialReport: React.FC<PrintFinancialReportProps> = ({ data, totals }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const chartData = data.map(summary => {
      const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
      const expenses = summary.totalExpenses;
      const taxDeduction = summary.po.amountDeposited && summary.po.amountDeposited > 0 ? allocation - (summary.po.amountDeposited || 0) : 0;
      const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
      const profitLoss = allocation - expenses - taxDeduction - ldCost;
      return {
          name: summary.po.poNumber,
          profit: profitLoss,
      };
  }).reverse(); // Reverse to show oldest first in chart

  const pieChartData = [
    { name: 'Paid', value: totals.paidCount },
    { name: 'Unpaid', value: totals.unpaidCount },
  ];

  const PIE_COLORS = ['#10b981', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
          <p className="label" style={{ fontWeight: 'bold' }}>{`PO #: ${label}`}</p>
          <p className="intro" style={{ color: payload[0].value >= 0 ? 'green' : 'red' }}>
            {`Profit/Loss: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <PrintLayoutWrapper useLandscape disableHeader disableFooter>
        <style>{`
          .document-title {
            text-align: center;
            margin-bottom: 2rem;
          }
          .document-title h2 {
            font-family: 'Playfair Display', serif;
            font-size: 24pt;
            margin: 0;
          }
          .document-title p {
            font-size: 11pt;
            color: #6b7280;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            padding: 1rem;
            background-color: #f9fafb;
          }
          .summary-card-title {
            font-size: 10pt;
            font-weight: 600;
            color: #4b5563;
          }
          .summary-card-value {
            font-size: 18pt;
            font-weight: 700;
            margin-top: 0.25rem;
          }
          .chart-container {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
            margin-top: 2rem;
            page-break-before: auto;
          }
        `}</style>
        <main>
          <div className="document-title">
            <h2>Financial Report: Purchase Orders</h2>
            <p>Generated on: {format(new Date(), 'dd-MMM-yyyy, h:mm a')}</p>
          </div>

           <div className="summary-grid">
                <div className="summary-card">
                    <p className="summary-card-title">Total Profit / Loss</p>
                    <p className="summary-card-value" style={{ color: totals.totalProfitLoss >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(totals.totalProfitLoss)}</p>
                </div>
                <div className="summary-card">
                    <p className="summary-card-title">Total Tax Deduction</p>
                    <p className="summary-card-value">{formatCurrency(totals.totalTaxDeduction)}</p>
                </div>
                 <div className="summary-card">
                    <p className="summary-card-title">Paid POs</p>
                    <p className="summary-card-value">{totals.paidCount}</p>
                </div>
                 <div className="summary-card">
                    <p className="summary-card-title">Unpaid POs</p>
                    <p className="summary-card-value">{totals.unpaidCount}</p>
                </div>
           </div>
           
           <div className="chart-container">
               <div className="chart-section">
                   <h3 style={{fontSize: '14pt', fontWeight: 'bold', marginBottom: '1rem'}}>Profit/Loss per PO</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} fontSize="8pt" />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="9pt" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 240, 240, 0.5)' }} />
                            <Bar dataKey="profit">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
               </div>
               <div className="chart-section" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <h3 style={{fontSize: '14pt', fontWeight: 'bold', marginBottom: '1rem'}}>PO Payment Status</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={110}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend />
                             <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
               </div>
           </div>

          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Care Of</th>
                <th className="text-right">Allocation</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Tax</th>
                <th className="text-right">LD</th>
                <th className="text-right">Profit/Loss</th>
                <th>Pay Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((summary) => {
                  const allocation = summary.po.totalAllocation ?? summary.totalAllocation;
                  const expenses = summary.totalExpenses;
                  const taxDeduction = summary.po.amountDeposited && summary.po.amountDeposited > 0 ? allocation - (summary.po.amountDeposited || 0) : 0;
                  const ldCost = summary.po.liquidatedDamages?.reduce((sum, item) => sum + item.cost, 0) || 0;
                  const profitLoss = allocation - expenses - taxDeduction - ldCost;
                return (
                  <tr key={summary.id}>
                    <td className="font-medium">{summary.po.poNumber}</td>
                    <td>{summary.po.careOf}</td>
                    <td className="text-right">{formatCurrency(allocation)}</td>
                    <td className="text-right">{formatCurrency(expenses)}</td>
                    <td className="text-right">{formatCurrency(taxDeduction)}</td>
                    <td className="text-right">{formatCurrency(ldCost)}</td>
                    <td className="text-right font-medium" style={{ color: profitLoss >= 0 ? '#15803d' : '#b91c1c' }}>{formatCurrency(profitLoss)}</td>
                    <td>{summary.paymentStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>
    </PrintLayoutWrapper>
  );
};

export default PrintFinancialReport;

  