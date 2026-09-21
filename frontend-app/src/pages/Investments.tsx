import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bitcoin, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader, PageState } from '../components';
import { createInvestment, deleteInvestment, getInvestments, getMarketCandles, getMarketPrices, updateInvestment, type Investment, type InvestmentRequest, type MarketCandle, type MarketPrice } from '../services/api';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

type ModalMode = 'create' | 'edit' | null;
const emptyForm: InvestmentRequest = { coinSymbol: '', quantity: 0, buyPrice: 0 };
const defaultWatchlist = ['BTC', 'ETH', 'BNB', 'SOL'];

export const Investments: React.FC = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Investment | null>(null);
  const [form, setForm] = useState<InvestmentRequest>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [watchlist, setWatchlist] = useState(defaultWatchlist);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [previousMarketPrices, setPreviousMarketPrices] = useState<Record<string, number>>({});
  const [watchSymbol, setWatchSymbol] = useState('');
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);
  const [selectedSymbol, setSelectedSymbol] = useState(defaultWatchlist[0]);
  const [chartInterval, setChartInterval] = useState('1h');
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const load = async (background = false) => {
    try {
      if (background) setRefreshing(true); else setLoading(true);
      setInvestments((await getInvestments()).data);
      setError(null);
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to load investments')); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadMarket = useCallback(async () => {
    try {
      const nextPrices = (await getMarketPrices(watchlist)).data;
      setPreviousMarketPrices((previous) => Object.fromEntries(nextPrices.map((item) => [item.coinSymbol, previous[item.coinSymbol] ?? item.price])));
      setMarketPrices(nextPrices);
      setSecondsToRefresh(30);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to load market prices')); }
  }, [watchlist]);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSecondsToRefresh((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(countdown);
  }, []);

  const loadCandles = useCallback(async () => {
    try {
      setChartLoading(true);
      setCandles((await getMarketCandles(selectedSymbol, chartInterval)).data);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to load chart data')); }
    finally { setChartLoading(false); }
  }, [chartInterval, selectedSymbol]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadMarket();
    const interval = window.setInterval(loadMarket, 30000);
    return () => window.clearInterval(interval);
  }, [loadMarket]);

  useEffect(() => {
    if (watchlist.includes(selectedSymbol)) return;
    setSelectedSymbol(watchlist[0] || defaultWatchlist[0]);
  }, [selectedSymbol, watchlist]);

  useEffect(() => {
    loadCandles();
    const interval = window.setInterval(loadCandles, 30000);
    return () => window.clearInterval(interval);
  }, [loadCandles]);

  const closeModal = () => { setModal(null); setSelected(null); setForm(emptyForm); };
  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (investment: Investment) => { setSelected(investment); setForm({ coinSymbol: investment.coinSymbol, quantity: investment.quantity, buyPrice: investment.buyPrice }); setModal('edit'); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const request = { coinSymbol: form.coinSymbol.trim().toUpperCase(), quantity: Number(form.quantity), buyPrice: Number(form.buyPrice) };
    if (!request.coinSymbol || !Number.isFinite(request.quantity) || request.quantity <= 0 || !Number.isFinite(request.buyPrice) || request.buyPrice <= 0) { toast.error('Enter a valid coin, quantity and buy price'); return; }
    setSaving(true);
    try {
      if (modal === 'edit' && selected) await updateInvestment(selected.id, request); else await createInvestment(request);
      closeModal(); await load(true); toast.success(modal === 'edit' ? 'Investment updated' : 'Investment added');
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to save investment')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this investment?')) return;
    try { await deleteInvestment(id); setInvestments((current) => current.filter((investment) => investment.id !== id)); toast.success('Investment deleted'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to delete investment')); }
  };

  const addToWatchlist = (event: React.FormEvent) => {
    event.preventDefault();
    const symbol = watchSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,20}$/.test(symbol)) { toast.error('Enter a valid coin symbol'); return; }
    if (watchlist.includes(symbol)) { toast.error('Coin is already being watched'); return; }
    setWatchlist((current) => [...current, symbol]);
    setWatchSymbol('');
  };

  const removeFromWatchlist = (symbol: string) => setWatchlist((current) => current.filter((item) => item !== symbol));

  if (loading || error) return <PageState loading={loading} error={error} loadingLabel="Loading investments" />;
  const totalCost = investments.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0);
  const totalValue = investments.reduce((sum, item) => sum + item.quantity * item.currentPrice, 0);
  const totalProfit = totalValue - totalCost;

  return <div>
    <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-center justify-end bg-[var(--canvas)]/95 py-1 backdrop-blur-sm"><span className="inline-flex items-center rounded-full border border-[#e3ebe8] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#71808c] shadow-sm"><span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[#087f74]" />Next refresh in <span className="ml-1 text-[#087f74]">{secondsToRefresh}s</span></span></div>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Build your digital holdings</div><h1 className="page-title">Crypto portfolio</h1><p className="page-subtitle">Track live market value and performance across your coins.</p></div><div className="flex items-center gap-3"><button type="button" title="Refresh prices" onClick={() => load(true)} disabled={refreshing} className="rounded-xl border border-[#e3ebe8] bg-white p-2.5 text-[#71808c] hover:text-[#087f74] disabled:opacity-50"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#075c57]"><Plus size={17} />Add holding</button></div></div>
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Invested</p><p className="mt-2 text-2xl font-extrabold text-[#17212b]">{currency.format(totalCost)}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Current value</p><p className="mt-2 text-2xl font-extrabold text-[#087f74]">{currency.format(totalValue)}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Total P/L</p><p className={`mt-2 text-2xl font-extrabold ${totalProfit >= 0 ? 'text-[#087f74]' : 'text-[#d76756]'}`}>{totalProfit >= 0 ? '+' : ''}{currency.format(totalProfit)}</p></div></div>
    <Card className="mb-5 overflow-hidden bg-[#17212b] text-white"><CardHeader className="border-[#2d3d48] bg-[#17212b]"><div className="flex flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7931a] text-sm font-extrabold">₿</span><div><h2 className="text-xl font-extrabold tracking-[-.04em]">{selectedSymbol}/USDT</h2><p className="text-xs font-semibold text-[#9aa7af]">Live market chart</p></div></div></div><div className="flex gap-1 rounded-lg bg-[#202d38] p-1">{['15m', '1h', '4h', '1d'].map((interval) => <button key={interval} type="button" onClick={() => setChartInterval(interval)} className={`rounded-md px-3 py-1.5 text-xs font-extrabold ${chartInterval === interval ? 'bg-[#f3b51b] text-[#17212b]' : 'text-[#9aa7af] hover:text-white'}`}>{interval}</button>)}</div></div><div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{marketPrices.map((market) => <button key={market.coinSymbol} type="button" onClick={() => setSelectedSymbol(market.coinSymbol)} className={`shrink-0 rounded-lg border px-3 py-2 text-left ${selectedSymbol === market.coinSymbol ? 'border-[#f3b51b] bg-[#2d3d48]' : 'border-[#2d3d48] bg-[#202d38] hover:border-[#60717d]'}`}><span className="block text-[11px] font-extrabold text-white">{market.coinSymbol}/USDT</span><span className="block text-xs font-semibold text-[#9aa7af]">{currency.format(market.price)}</span></button>)}</div></div></CardHeader><CardBody className="bg-[#17212b] pt-0"><div className="h-[320px] w-full">{chartLoading ? <div className="flex h-full items-center justify-center text-sm font-bold text-[#9aa7af]">Loading chart...</div> : <ResponsiveContainer width="100%" height="100%"><LineChart data={candles} margin={{ top: 10, right: 18, left: 2, bottom: 10 }}><CartesianGrid stroke="#2d3d48" strokeDasharray="3 3" /><XAxis dataKey="openTime" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: '#9aa7af', fontSize: 11 }} minTickGap={32} /><YAxis domain={['auto', 'auto']} tick={{ fill: '#9aa7af', fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} width={65} /><Tooltip labelFormatter={(value) => new Date(Number(value)).toLocaleString()} formatter={(value) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Price']} contentStyle={{ background: '#202d38', border: '1px solid #3c4c57', borderRadius: 10 }} /><Line type="monotone" dataKey="close" stroke="#f3b51b" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>}</div></CardBody></Card><Card className="mb-5"><CardHeader><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="section-title">Market watch</h2><p className="section-caption mt-1">Live Binance prices, refreshed every 30 seconds</p></div><form onSubmit={addToWatchlist} className="flex gap-2"><input aria-label="Coin symbol to watch" value={watchSymbol} onChange={(event) => setWatchSymbol(event.target.value)} placeholder="Add coin" maxLength={20} className="w-28 rounded-lg border border-[#e3ebe8] px-3 py-2 text-xs font-bold uppercase outline-none focus:border-[#087f74]" /><button aria-label="Add coin to watchlist" title="Add coin" className="rounded-lg bg-[#17212b] p-2 text-white hover:bg-[#2d3d48]"><Plus size={16} /></button></form></div></CardHeader><CardBody><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left"><thead><tr className="border-b border-[#e3ebe8] text-[11px] font-extrabold uppercase tracking-[.08em] text-[#9aa7af]"><th className="px-3 py-3">Market</th><th className="px-3 py-3">Last price</th><th className="px-3 py-3">Change</th><th className="px-3 py-3 text-right">Watchlist</th></tr></thead><tbody>{marketPrices.map((market) => { const previous = previousMarketPrices[market.coinSymbol] ?? market.price; const change = market.price - previous; const rising = change >= 0; return <tr key={market.coinSymbol} className="border-b border-[#edf2f0] last:border-0"><td className="px-3 py-4"><span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff5df] text-xs font-extrabold text-[#bd7a22]">{market.coinSymbol.slice(0, 1)}</span><span className="font-extrabold text-[#17212b]">{market.coinSymbol}/USDT</span></td><td className="px-3 py-4 text-sm font-extrabold text-[#17212b]">{currency.format(market.price)}</td><td className={`px-3 py-4 text-sm font-extrabold ${rising ? 'text-[#087f74]' : 'text-[#d76756]'}`}>{rising ? <ArrowUpRight size={15} className="mr-1 inline" /> : <ArrowDownRight size={15} className="mr-1 inline" />}{rising ? '+' : ''}{currency.format(change)}</td><td className="px-3 py-4 text-right"><button aria-label={`Remove ${market.coinSymbol} from watchlist`} title="Remove from watchlist" onClick={() => removeFromWatchlist(market.coinSymbol)} className="rounded-lg px-2 py-1 text-xs font-bold text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]">Remove</button></td></tr>; })}</tbody></table></div></CardBody></Card><Card><CardHeader><div className="flex items-center justify-between gap-4"><div><h2 className="section-title">Your holdings</h2><p className="section-caption mt-1">Prices refresh automatically every 30 seconds</p></div><Bitcoin size={25} className="text-[#bd7a22]" /></div></CardHeader><CardBody><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-[#e3ebe8] text-[11px] font-extrabold uppercase tracking-[.08em] text-[#9aa7af]"><th className="px-3 py-3">Coin</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Buy price</th><th className="px-3 py-3">Current price</th><th className="px-3 py-3">P/L</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{investments.map((investment) => <tr key={investment.id} className="border-b border-[#edf2f0] last:border-0"><td className="px-3 py-4"><span className="font-extrabold text-[#17212b]">{investment.coinSymbol}</span><span className="ml-2 rounded-full bg-[#f4f7f6] px-2 py-1 text-[10px] font-bold text-[#71808c]">USDT</span></td><td className="px-3 py-4 text-sm font-semibold text-[#71808c]">{investment.quantity}</td><td className="px-3 py-4 text-sm font-semibold text-[#71808c]">{currency.format(investment.buyPrice)}</td><td className="px-3 py-4 text-sm font-extrabold text-[#17212b]">{currency.format(investment.currentPrice)}</td><td className={`px-3 py-4 text-sm font-extrabold ${investment.profitLoss >= 0 ? 'text-[#087f74]' : 'text-[#d76756]'}`}>{investment.profitLoss >= 0 ? '+' : ''}{currency.format(investment.profitLoss)}<span className="ml-1 text-xs">({investment.profitLossPercentage.toFixed(2)}%)</span></td><td className="px-3 py-4 text-right"><button aria-label={`Edit ${investment.coinSymbol}`} title="Edit investment" onClick={() => openEdit(investment)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={15} /></button><button aria-label={`Delete ${investment.coinSymbol}`} title="Delete investment" onClick={() => remove(investment.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>{!investments.length && <div className="py-12 text-center"><Bitcoin size={30} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No holdings yet</p><button onClick={openCreate} className="mt-5 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white">Add your first coin</button></div>}</CardBody></Card>
    {modal && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div role="dialog" aria-modal="true" className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">Crypto portfolio</div><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">{modal === 'edit' ? 'Edit holding' : 'Add holding'}</h2></div><button aria-label="Close" onClick={closeModal} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6]"><X size={18} /></button></div><form onSubmit={submit} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Coin symbol</label><input autoFocus required maxLength={20} value={form.coinSymbol} onChange={(event) => setForm({ ...form, coinSymbol: event.target.value })} placeholder="BTC" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Quantity</label><input required min="0.00000001" step="any" type="number" value={form.quantity || ''} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Buy price (USD)</label><input required min="0.00000001" step="any" type="number" value={form.buyPrice || ''} onChange={(event) => setForm({ ...form, buyPrice: Number(event.target.value) })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={closeModal} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]">Cancel</button><button disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : modal === 'edit' ? 'Save changes' : 'Add holding'}</button></div></form></div></div>}
  </div>;
};

export default Investments;
