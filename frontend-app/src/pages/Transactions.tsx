import React, { useState, useEffect } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Card, CardHeader, CardBody } from '../components';
import api from '../services/api';
import { Card as TremorCard, Title, Text, Badge } from '@tremor/react';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  walletId: string;
  categoryId: string;
}

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get<Transaction[]>('/transactions');
      setTransactions(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Transactions</h1>

      <TremorCard>
        <Title>Recent Transactions</Title>
        <Text className="mb-4">Latest transactions across your wallets</Text>
          <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
          </CardHeader>
          <CardBody>
            <div className="mb-4">
              <input
                className="w-full border px-3 py-2 rounded"
                placeholder="Search description, wallet, category..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Wallet</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filtered = transactions.filter((t) =>
                    `${t.description} ${t.walletId} ${t.categoryId}`.toLowerCase().includes(search.toLowerCase())
                  );
                  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
                  return pageItems.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.transactionDate).toLocaleString()}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge>{transaction.walletId}</Badge>
                      </TableCell>
                      <TableCell>{transaction.categoryId}</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">Page {page}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded">Next</button>
              </div>
            </div>
          </CardBody>
        </Card>
      </TremorCard>
    </div>
  );
};
