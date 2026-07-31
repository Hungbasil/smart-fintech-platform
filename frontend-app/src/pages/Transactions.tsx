import React, { useState, useEffect } from 'react';
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

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </CardHeader>
        <CardBody>
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
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.transactionDate}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    ${transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{transaction.walletId}</TableCell>
                  <TableCell>{transaction.categoryId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};
