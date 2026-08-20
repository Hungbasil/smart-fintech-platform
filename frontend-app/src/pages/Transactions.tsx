import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Card, CardHeader, CardBody } from '../components';
import api from '../services/api';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  walletId: string;
  categoryId: string;
}

interface TransactionPage {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get<TransactionPage | Transaction[]>('/transactions', { params: { page: page - 1, size: pageSize } });
        if (Array.isArray(response.data)) {
          setTransactions(response.data);
          setTotalElements(response.data.length);
          setTotalPages(Math.max(1, Math.ceil(response.data.length / pageSize)));
        } else {
          setTransactions(response.data.content);
          setTotalElements(response.data.totalElements);
          setTotalPages(Math.max(1, response.data.totalPages));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Money movement</div><h1 className="page-title">Transactions</h1><p className="page-subtitle">Review and understand every movement across your wallets.</p></div><button className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><span className="text-lg leading-none">+</span>Add transaction</button></div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><div><h3 className="section-title">All transactions</h3><p className="section-caption mt-1">{totalElements} records in your workspace</p></div><button className="hidden items-center gap-2 rounded-lg border border-[#e3ebe8] px-3 py-2 text-xs font-bold text-[#71808c] transition hover:bg-[#f4f7f6] sm:flex"><SlidersHorizontal size={14} />Filters</button></div></CardHeader>
          <CardBody>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa7af]" /><input className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#a8b3b0] focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" placeholder="Search this page..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div><button className="flex items-center justify-center gap-2 rounded-xl border border-[#e3ebe8] px-3 py-2 text-xs font-bold text-[#71808c] sm:hidden"><SlidersHorizontal size={14} />Filters</button></div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                  <TableHeaderCell>Wallet</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filtered = transactions.filter((t) =>
                    `${t.description} ${t.walletId} ${t.categoryId}`.toLowerCase().includes(search.toLowerCase())
                  );
                  return filtered.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell><span className="font-semibold text-[#17212b]">{new Date(transaction.transactionDate).toLocaleDateString()}</span><span className="block text-[11px] text-[#9aa7af]">{new Date(transaction.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></TableCell>
                      <TableCell><span className="font-bold text-[#17212b]">{transaction.description || 'Untitled transaction'}</span></TableCell>
                      <TableCell className="text-right font-extrabold text-[#d76756]">
                        -{currency.format(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell><span className="rounded-lg bg-[#edf4f2] px-2 py-1 text-[11px] font-bold text-[#075c57]">{transaction.walletId.slice(0, 8)}</span></TableCell>
                      <TableCell><span className="text-xs text-[#71808c]">{transaction.categoryId.slice(0, 8)}</span></TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
            {transactions.length === 0 && <div className="py-12 text-center"><p className="font-bold text-[#17212b]">No transactions found</p><p className="mt-1 text-sm text-[#9aa7af]">Your latest activity will appear here.</p></div>}
            <div className="mt-5 flex items-center justify-between border-t border-[#edf2f0] pt-4"><div className="text-xs font-semibold text-[#9aa7af]">Page {page} of {totalPages}</div><div className="flex gap-2"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[#e3ebe8] px-3 py-1.5 text-xs font-bold text-[#71808c] transition hover:bg-[#f4f7f6] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg bg-[#087f74] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </CardBody>
      </Card>
    </div>
  );
};
