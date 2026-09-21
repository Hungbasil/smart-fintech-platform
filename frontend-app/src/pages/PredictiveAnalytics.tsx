import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '../components';
import { getPredictiveAnalytics, type PredictiveAnalytics as PredictiveAnalyticsData } from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage } from '../services/notifications';

const trendCopy = {
  INCREASING: { label: 'Spending is rising', color: 'text-[#c25344]', icon: ArrowUpRight },
  DECREASING: { label: 'Spending is falling', color: 'text-[#087f74]', icon: ArrowDownRight },
  STABLE: { label: 'Spending is stable', color: 'text-[#bd7a22]', icon: Minus },
} as const;

export const PredictiveAnalytics: React.FC = () => {
  const [data, setData] = useState<PredictiveAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        setLoading(true);
        setData((await getPredictiveAnalytics()).data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to fetch spending forecast'));
      } finally {
        setLoading(false);
      }
    };
    loadPrediction();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error || !data) return <div className="rounded-xl bg-[#fff1ef] p-4 text-sm font-semibold text-[#c25344]">{error || 'Forecast is unavailable'}</div>;

  const trend = trendCopy[data.trend];
  const TrendIcon = trend.icon;
  const chartData = [
    ...data.historicalData.map((item) => ({ month: item.month, actual: item.amount, forecast: undefined as number | undefined })),
    { month: 'Next month', actual: undefined as number | undefined, forecast: data.predictedAmount },
  ];
  chartData[chartData.length - 2].forecast = data.historicalData[data.historicalData.length - 1]?.amount;

  return <div>
    <div className="mb-8"><div className="eyebrow">Plan with more confidence</div><h1 className="page-title">Spending forecast</h1><p className="page-subtitle">A simple three-month moving average based on your recorded expenses.</p></div>
    <div className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="surface surface-pad flex items-center justify-between gap-6 border-[#c5e4dc] bg-[#f3fbf8]"><div><div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#087f74]"><Sparkles size={15} />Next month estimate</div><div className="text-4xl font-extrabold tracking-[-.05em] text-[#17212b]">{currency.format(data.predictedAmount)}</div><p className="mt-2 text-sm text-[#71808c]">Average monthly spending from the last three months.</p></div><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ${trend.color}`}><TrendIcon size={30} /></div></div>
      <div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Current direction</p><div className={`mt-3 flex items-center gap-2 text-xl font-extrabold ${trend.color}`}><TrendIcon size={24} />{trend.label}</div><p className="mt-2 text-sm text-[#71808c]">Compared with the first month in this forecast window.</p></div>
    </div>
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Current balance</p><p className="mt-2 text-2xl font-extrabold text-[#17212b]">{currency.format(data.currentBalance)}</p></div>
      <div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Expected income</p><p className="mt-2 text-2xl font-extrabold text-[#087f74]">{currency.format(data.predictedIncome)}</p></div>
      <div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Projected balance</p><p className={`mt-2 text-2xl font-extrabold ${data.projectedBalance >= 0 ? 'text-[#087f74]' : 'text-[#d76756]'}`}>{currency.format(data.projectedBalance)}</p></div>
    </div>
    <Card><CardHeader><h2 className="section-title">Monthly spending history</h2><p className="section-caption mt-1">Actual expenses and the moving-average estimate</p></CardHeader><CardBody><ResponsiveContainer width="100%" height={340}><LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}><CartesianGrid stroke="#e3ebe8" strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fill: '#71808c', fontSize: 12 }} /><YAxis tick={{ fill: '#71808c', fontSize: 12 }} tickFormatter={(value) => currency.format(Number(value))} /><Tooltip formatter={(value, name) => [currency.format(Number(value)), name === 'actual' ? 'Actual' : 'Forecast']} /><Line type="monotone" dataKey="actual" name="Actual" stroke="#087f74" strokeWidth={3} dot={{ r: 4, fill: '#087f74' }} connectNulls={false} /><Line type="monotone" dataKey="forecast" name="Forecast" stroke="#d76756" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5, fill: '#d76756' }} connectNulls={false} /></LineChart></ResponsiveContainer><div className="mt-5 flex flex-wrap gap-5 border-t border-[#edf2f0] pt-4 text-xs font-bold text-[#71808c]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#087f74]" />Actual spending</span><span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#d76756]" />Forecast</span></div></CardBody></Card>
  </div>;
};

export default PredictiveAnalytics;
