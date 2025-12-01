
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import type { PoFinancialSummary } from '@/app/(app)/management/financial/reports/page';
import PrintLayoutWrapper from '@/components/layout/print-layout-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DollarSign, TrendingDown, Receipt, TrendingUp } from 'lucide-react';

interface PrintFinancialReportLayoutProps {
  summaries: PoFinancialSummary[];
  stats: {
    totalAllocation: number;
    totalExpenses: number;
    totalTaxDeduction: number;
    totalProfitLoss: number;
  };
  expensesByCategoryData: { name: string; value: number }[];
  profitLossChartData: { name: string; profit: number }[];
}

const PrintFinancialReportLayout: React.FC<PrintFinancialReportLayoutProps> = ({ summaries, stats, expensesByCategoryData, profitLossChartData }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  const PIE_COLORS = ['#10b981', '#f97316', '#3b82f6'];
  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.001) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const displayPercent = (percent * 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10pt">
        {`${displayPercent}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '5px', border: '1px solid #ccc', fontSize: '10pt' }}>
          <p style={{ fontWeight: 'bold' }}>{`${label}`}</p>
          <p style={{ color: payload[0].value >= 0 ? '#22c55e' : '#ef4444' }}>
            {`Profit/Loss: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <PrintLayoutWrapper title="Expenditure & Profit Analysis Report" useLandscape disableHeader disableFooter>
      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          background-color: #f9fafb;
        }
        .stat-card-title {
          font-size: 10pt;
          font-weight: 600;
          color: #4b5563;
        }
        .stat-card-value {
          font-size: 16pt;
          font-weight: 700;
        }
        .charts-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin: 2rem 0;
          page-break-inside: avoid;
        }
        .chart-box {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
        }
        .chart-box h3 {
          font-size: 12pt;
          font-weight: 600;
          margin-bottom: 1rem;
        }
      `}</style>
      <main>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-card-title">Total PO Allocation</p>
            <p className="stat-card-value">{formatCurrency(stats.totalAllocation)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-title">Total Expenses</p>
            <p className="stat-card-value">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-title">Total Tax Deduction</p>
            <p className="stat-card-value">{formatCurrency(stats.totalTaxDeduction)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-title">Net Profit / Loss</p>
            <p className="stat-card-value" style={{color: stats.totalProfitLoss >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(stats.totalProfitLoss)}</p>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-box">
            <h3>Profit/Loss per PO</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitLossChartData} margin={{ top: 5, right: 5, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize="8pt" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize="9pt" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Profit/Loss">
                  {profitLossChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-box">
            <h3>Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expensesByCategoryData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={100} dataKey="value">
                  {expensesByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{fontSize: "10pt"}}/>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>PO #</th>
              <th>Source</th>
              <th className="text-right">Allocation</th>
              <th className="text-right">Expenses</th>
              <th className="text-right">Tax</th>
              <th className="text-right">LD</th>
              <th className="text-right">Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id}>
                <td>{summary.po.poNumber}</td>
                <td>{summary.po.source}</td>
                <td className="text-right">{formatCurrency(summary.totalAllocation)}</td>
                <td className="text-right">{formatCurrency(summary.totalExpenses)}</td>
                <td className="text-right">{formatCurrency(summary.taxDeduction)}</td>
                <td className="text-right">{formatCurrency(summary.ldCost)}</td>
                <td className="text-right font-medium" style={{color: summary.profit >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(summary.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </PrintLayoutWrapper>
  );
};

export default PrintFinancialReportLayout;
