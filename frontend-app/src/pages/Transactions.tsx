import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  Camera,
  Download,
  FileUp,
  LoaderCircle,
  Mic,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Card,
  CardHeader,
  CardBody,
} from "../components";
import api from "../services/api";
import { createVoiceTransaction, scanReceipt, transferFunds } from "../services/api";
import { formatSignedAmount } from "../services/format";
import { getApiErrorMessage, toast } from "../services/notifications";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  walletId: string;
  categoryId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
}

interface TransactionPage {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
}

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const localDateTimeValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const dateTimeWithSpokenTime = (transcript: string, fallback: string) => {
  const date = new Date(`${fallback.slice(0, 10)}T00:00:00`);
  if (/hôm qua|ngày hôm qua/i.test(transcript)) date.setDate(date.getDate() - 1);
  if (/ngày mai|mai/i.test(transcript)) date.setDate(date.getDate() + 1);
  const dateValue = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0"))
    .join("-");
  const match = transcript.match(/(?:lúc|vào lúc|khoảng)\s*(\d{1,2})(?::(\d{2}))?\s*(?:giờ|h)\s*(sáng|trưa|chiều|tối)?|\b(\d{1,2})(?::(\d{2}))?\s*(?:giờ|h)\s*(sáng|trưa|chiều|tối)?/i);
  if (!match) return `${dateValue}T${fallback.slice(11, 16)}`;
  let hour = Number(match[1] || match[4]);
  const minute = Number(match[2] || match[5] || 0);
  const period = (match[3] || match[6])?.toLowerCase();
  if (hour > 23 || minute > 59) return fallback;
  if ((period === "chiều" || period === "tối") && hour < 12) hour += 12;
  if (period === "sáng" && hour === 12) hour = 0;
  return `${dateValue}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceAnalyzing, setIsVoiceAnalyzing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState({
    type: "",
    walletId: "",
    categoryId: "",
  });
  const [form, setForm] = useState({
    description: "",
    amount: "",
    transactionDate: localDateTimeValue(),
    walletId: "",
    categoryId: "",
  });
  const [isSplit, setIsSplit] = useState(false);
  const [splitWithNames, setSplitWithNames] = useState<string[]>([]);
  const [splitNameInput, setSplitNameInput] = useState("");
  const [transferForm, setTransferForm] = useState({
    fromWalletId: "",
    toWalletId: "",
    amount: "",
    description: "",
    transactionDate: localDateTimeValue(),
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.get<TransactionPage | Transaction[]>(
          "/transactions",
          {
            params: {
              page: page - 1,
              size: pageSize,
              keyword: debouncedKeyword || undefined,
              ...filters,
            },
          },
        );
        if (Array.isArray(response.data)) {
          setTransactions(response.data);
          setTotalElements(response.data.length);
          setTotalPages(
            Math.max(1, Math.ceil(response.data.length / pageSize)),
          );
        } else {
          setTransactions(response.data.content);
          setTotalElements(response.data.totalElements);
          setTotalPages(Math.max(1, response.data.totalPages));
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to fetch transactions"));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, reloadToken, filters, debouncedKeyword]);

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [walletResponse, categoryResponse] = await Promise.all([
          api.get<WalletOption[]>("/wallets"),
          api.get<CategoryOption[]>("/categories"),
        ]);
        setWallets(walletResponse.data);
        setCategories(categoryResponse.data);
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Unable to load form options",
        );
      }
    };

    loadFormOptions();
  }, []);

  const createTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const pendingName = splitNameInput.trim();
      const names = pendingName && !splitWithNames.includes(pendingName)
        ? [...splitWithNames, pendingName]
        : splitWithNames;
      const payload = {
        description: form.description,
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        walletId: form.walletId,
        categoryId: form.categoryId,
      };
      if (editingTransactionId) {
        await api.put(`/transactions/${editingTransactionId}`, payload);
      } else {
        await api.post("/transactions", {
          ...payload,
          isSplit,
          splitWithNames: names,
        });
      }
      setIsCreateOpen(false);
      setEditingTransactionId(null);
      setForm({
        description: "",
        amount: "",
        transactionDate: localDateTimeValue(),
        walletId: "",
        categoryId: "",
      });
      setIsSplit(false);
      setSplitWithNames([]);
      setSplitNameInput("");
      setReloadToken((value) => value + 1);
      toast.success(
        editingTransactionId ? "Transaction updated" : "Transaction added",
      );
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to save transaction");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingTransactionId(null);
    setFormError(null);
    setForm({
      description: "",
      amount: "",
      transactionDate: localDateTimeValue(),
      walletId: "",
      categoryId: "",
    });
    setIsSplit(false);
    setSplitWithNames([]);
    setSplitNameInput("");
    setVoiceTranscript("");
    setIsListening(false);
    setIsVoiceAnalyzing(false);
    setIsCreateOpen(true);
  };

  const startVoiceTransaction = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      const message = "Trình duyệt này không hỗ trợ nhập giao dịch bằng giọng nói.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (!form.walletId) {
      const message = "Vui lòng chọn ví trước khi nhập bằng giọng nói.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (!form.categoryId) {
      const message = "Vui lòng chọn danh mục trước khi nhập bằng giọng nói.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const recognition = new Recognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (!transcript) return;
      setVoiceTranscript(transcript);
      setIsListening(false);
      setIsVoiceAnalyzing(true);
      createVoiceTransaction({
        text: transcript,
        walletId: form.walletId,
        categoryId: form.categoryId,
        transactionDate: dateTimeWithSpokenTime(transcript, form.transactionDate),
      })
        .then(() => {
          setIsCreateOpen(false);
          setReloadToken((value) => value + 1);
          toast.success("Đã thêm giao dịch bằng giọng nói");
        })
        .catch((err: unknown) => {
          const message = getApiErrorMessage(err, "Không thể tạo giao dịch bằng giọng nói");
          setFormError(message);
          toast.error(message);
        })
        .finally(() => setIsVoiceAnalyzing(false));
    };
    recognition.onerror = () => {
      setIsListening(false);
      setFormError("Không nghe rõ giọng nói. Vui lòng thử lại.");
      toast.error("Không nghe rõ giọng nói. Vui lòng thử lại.");
    };
    recognition.onend = () => setIsListening(false);
    setFormError(null);
    setVoiceTranscript("");
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => () => speechRecognitionRef.current?.stop(), []);

  const addSplitName = () => {
    const name = splitNameInput.trim();
    if (name && !splitWithNames.includes(name))
      setSplitWithNames([...splitWithNames, name]);
    setSplitNameInput("");
  };

  const scanReceiptImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFormError(null);
    setIsScanning(true);
    try {
      const response = await scanReceipt(file);
      setForm((current) => ({
        ...current,
        amount: String(response.data.amount),
        transactionDate: `${response.data.date}T12:00`,
      }));
      toast.success("Receipt scanned. Please review the values before saving.");
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to scan receipt");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const openTransferModal = () => {
    setFormError(null);
    setTransferForm({
      fromWalletId: "",
      toWalletId: "",
      amount: "",
      description: "",
      transactionDate: localDateTimeValue(),
    });
    setIsTransferOpen(true);
  };

  const createTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const amount = Number(transferForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be greater than zero");
      toast.error("Amount must be greater than zero");
      return;
    }
    if (
      !transferForm.fromWalletId ||
      !transferForm.toWalletId ||
      transferForm.fromWalletId === transferForm.toWalletId
    ) {
      setFormError("Please select two different wallets");
      toast.error("Please select two different wallets");
      return;
    }

    setIsSaving(true);
    try {
      await transferFunds({ ...transferForm, amount });
      const walletResponse = await api.get<WalletOption[]>("/wallets");
      setWallets(walletResponse.data);
      setReloadToken((value) => value + 1);
      setIsTransferOpen(false);
      toast.success("Transfer completed successfully");
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to transfer funds");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setFormError(null);
    setForm({
      description: transaction.description,
      amount: String(transaction.amount),
      transactionDate: transaction.transactionDate.slice(0, 16),
      walletId: transaction.walletId,
      categoryId: transaction.categoryId,
    });
    setIsSplit(false);
    setSplitWithNames([]);
    setSplitNameInput("");
    setIsCreateOpen(true);
  };

  const deleteTransaction = async (id: string) => {
    if (
      !window.confirm(
        "Delete this transaction? The wallet balance will be recalculated.",
      )
    )
      return;
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/transactions/${id}`);
      setReloadToken((value) => value + 1);
      toast.success("Transaction deleted");
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to delete transaction");
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const exportTransactions = async () => {
    try {
      const response = await api.get<TransactionPage>("/transactions", {
        params: {
          page: 0,
          size: 10000,
          ...filters,
          keyword: debouncedKeyword || undefined,
        },
      });
      const rows = response.data.content;
      const csv = [
        ["Date", "Description", "Amount", "Type", "Wallet ID", "Category ID"],
        ...rows.map((transaction) => [
          transaction.transactionDate,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.walletId,
          transaction.categoryId,
        ]),
      ]
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Report exported");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to export report"));
    }
  };

  const importTransactions = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine
        .split(",")
        .map((header) =>
          header.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, ""),
        );
      const indexOf = (...names: string[]) =>
        names
          .map((name) => headers.indexOf(name))
          .find((index) => index >= 0) ?? -1;
      const indexes = {
        date: indexOf("date", "transactiondate"),
        description: indexOf("description", "desc"),
        amount: indexOf("amount"),
        walletId: indexOf("walletid", "wallet_id"),
        categoryId: indexOf("categoryid", "category_id"),
      };
      if (indexes.amount < 0 || indexes.walletId < 0 || indexes.categoryId < 0)
        throw new Error("CSV needs amount, walletId and categoryId columns");
      const parseLine = (line: string) =>
        line
          .match(/("(?:[^"]|"")*"|[^,]*)/g)
          ?.filter((_, index, values) => index < values.length - 1)
          .map((value) =>
            value.trim().replace(/^"|"$/g, "").replace(/""/g, '"'),
          ) || [];
      for (const line of lines) {
        const values = parseLine(line);
        await api.post("/transactions", {
          amount: Math.abs(Number(values[indexes.amount])),
          description: values[indexes.description] || "Imported transaction",
          transactionDate:
            values[indexes.date] || localDateTimeValue(),
          walletId: values[indexes.walletId],
          categoryId: values[indexes.categoryId],
        });
      }
      setReloadToken((value) => value + 1);
      toast.success(
        `${lines.length} transaction${lines.length === 1 ? "" : "s"} imported`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to import CSV"));
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div>
      {isCreateOpen && !editingTransactionId && (
        <div className="fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#b9e2d9] bg-[#f3fbf8] px-4 py-3 shadow-xl">
          <div>
            <p className="text-sm font-bold text-[#17212b]">
              Receipt assistant
            </p>
            <p className="text-xs text-[#71808c]">
              Scan an image to fill amount and date.
            </p>
          </div>
          <button
            type="button"
            disabled={isScanning}
            onClick={() => ocrInputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#087f74] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera size={15} />
            {isScanning ? "Scanning..." : "Scan with AI"}
          </button>
          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*"
            onChange={scanReceiptImage}
            className="hidden"
          />
        </div>
      )}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">Money movement</div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            Review and understand every movement across your wallets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportTransactions}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#e3ebe8] bg-white px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]"
          >
            <Download size={17} />
            Export CSV
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#e3ebe8] bg-white px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]"
          >
            <FileUp size={17} />
            Import CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={importTransactions}
            className="hidden"
          />
          <button
            onClick={openTransferModal}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#087f74] bg-[#e4f4f0] px-4 py-2.5 text-sm font-bold text-[#075c57] shadow-sm transition hover:bg-[#dcefeb]"
          >
            <ArrowLeftRight size={17} />
            Transfer
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"
          >
            <Plus size={17} />
            Add transaction
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title">All transactions</h3>
              <p className="section-caption mt-1">
                {totalElements} records in your workspace
              </p>
            </div>
            <span className="hidden items-center gap-2 rounded-lg border border-[#e3ebe8] px-3 py-2 text-xs font-bold text-[#71808c] sm:flex">
              <SlidersHorizontal size={14} />
              Filters below
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px_150px_150px]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa7af]"
              />
              <input
                className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[#a8b3b0] focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                placeholder="Search this page..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Filter by type"
              value={filters.type}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value });
                setPage(1);
              }}
              className="rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-xs font-semibold text-[#71808c] outline-none focus:border-[#087f74]"
            >
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <select
              aria-label="Filter by wallet"
              value={filters.walletId}
              onChange={(e) => {
                setFilters({ ...filters, walletId: e.target.value });
                setPage(1);
              }}
              className="rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-xs font-semibold text-[#71808c] outline-none focus:border-[#087f74]"
            >
              <option value="">All wallets</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by category"
              value={filters.categoryId}
              onChange={(e) => {
                setFilters({ ...filters, categoryId: e.target.value });
                setPage(1);
              }}
              className="rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-xs font-semibold text-[#71808c] outline-none focus:border-[#087f74]"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                <TableHeaderCell>Wallet</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Actions
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <span className="font-semibold text-[#17212b]">
                      {new Date(
                        transaction.transactionDate,
                      ).toLocaleDateString()}
                    </span>
                    <span className="block text-[11px] text-[#9aa7af]">
                      {new Date(transaction.transactionDate).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-[#17212b]">
                      {transaction.description || "Untitled transaction"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-extrabold ${transaction.type === "INCOME" ? "text-[#087f74]" : transaction.type === "EXPENSE" ? "text-[#d76756]" : "text-[#bd7a22]"}`}
                  >
                    {formatSignedAmount(transaction.amount, transaction.type || "EXPENSE")}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-[#edf4f2] px-2 py-1 text-[11px] font-bold text-[#075c57]">
                      {wallets.find(
                        (wallet) => wallet.id === transaction.walletId,
                      )?.name || transaction.walletId.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[#71808c]">
                      {categories.find(
                        (category) => category.id === transaction.categoryId,
                      )?.name || transaction.categoryId.slice(0, 8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label="Edit transaction"
                        title="Edit transaction"
                        onClick={() => openEditModal(transaction)}
                        className="rounded-lg p-2 text-[#9aa7af] transition hover:bg-[#e4f4f0] hover:text-[#087f74]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="Delete transaction"
                        title="Delete transaction"
                        disabled={deletingId === transaction.id}
                        onClick={() => deleteTransaction(transaction.id)}
                        className="rounded-lg p-2 text-[#9aa7af] transition hover:bg-[#fff1ef] hover:text-[#d76756] disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transactions.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-bold text-[#17212b]">No transactions found</p>
              <p className="mt-1 text-sm text-[#9aa7af]">
                Your latest activity will appear here.
              </p>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between border-t border-[#edf2f0] pt-4">
            <div className="text-xs font-semibold text-[#9aa7af]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[#e3ebe8] px-3 py-1.5 text-xs font-bold text-[#71808c] transition hover:bg-[#f4f7f6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-[#087f74] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-transaction-title"
            className="w-full max-w-[520px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="eyebrow">
                  {editingTransactionId ? "Update record" : "New record"}
                </div>
                <h2
                  id="create-transaction-title"
                  className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]"
                >
                  {editingTransactionId
                    ? "Edit transaction"
                    : "Add transaction"}
                </h2>
                <p className="mt-1 text-xs text-[#71808c]">
                  Amounts are positive. Category type determines income or
                  expense.
                </p>
              </div>
              <button
                aria-label="Close"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTransactionId(null);
                }}
                className="rounded-lg p-2 text-[#9aa7af] transition hover:bg-[#f4f7f6] hover:text-[#17212b]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createTransaction} className="space-y-4">
              {formError && (
                <div className="rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">
                  {formError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                  Description
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="e.g. Monthly salary"
                    className="min-w-0 flex-1 rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                  />
                  {!editingTransactionId && <button
                    type="button"
                    onClick={startVoiceTransaction}
                    disabled={isListening || isVoiceAnalyzing || isSaving}
                    aria-label="Add transaction by voice"
                    title="Add transaction by voice"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition ${isListening ? "animate-pulse bg-[#d76756]" : "bg-[#bd7a22] hover:bg-[#9b6217]"} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isVoiceAnalyzing ? <LoaderCircle size={18} className="animate-spin" /> : <Mic size={18} />}
                  </button>}
                </div>
                {isListening && <p className="mt-2 text-xs font-bold text-[#bd7a22]">Đang lắng nghe... Hãy nói khoản chi của bạn.</p>}
                {voiceTranscript && <div className="mt-2 rounded-xl border border-[#f0d9aa] bg-[#fff9eb] px-3 py-2 text-xs text-[#765313]"><span className="font-extrabold">Bạn đã nói:</span> {voiceTranscript}</div>}
                {isVoiceAnalyzing && <p className="mt-2 text-xs font-bold text-[#087f74]">AI đang phân tích... Giao dịch sẽ dùng danh mục đã chọn.</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9aa7af]">
                      $
                    </span>
                    <input
                      required
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={form.amount}
                      onChange={(event) =>
                        setForm({ ...form, amount: event.target.value })
                      }
                      className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-7 pr-3 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    Date and time
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={form.transactionDate}
                    onChange={(event) =>
                      setForm({ ...form, transactionDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    Wallet
                  </label>
                  <select
                    required
                    value={form.walletId}
                    onChange={(event) =>
                      setForm({ ...form, walletId: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"
                  >
                    <option value="">Select wallet</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    Category
                  </label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm({ ...form, categoryId: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.type.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!editingTransactionId && (
                <div className="rounded-xl border border-[#b9e2d9] bg-[#f3fbf8] p-3">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#17212b]">
                    <input
                      type="checkbox"
                      checked={isSplit}
                      onChange={(event) => setIsSplit(event.target.checked)}
                      className="h-4 w-4 accent-[#087f74]"
                    />
                    Split this bill
                  </label>
                  {isSplit && (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                        People sharing this bill
                      </label>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-[#e3ebe8] bg-white p-2 focus-within:border-[#087f74]">
                        {splitWithNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#dcefeb] px-2 py-1 text-xs font-bold text-[#075c57]"
                          >
                            {name}
                            <button
                              type="button"
                              aria-label={`Remove ${name}`}
                              onClick={() =>
                                setSplitWithNames(
                                  splitWithNames.filter((current) => current !== name),
                                )
                              }
                              className="rounded p-0.5 hover:bg-[#b9e2d9]"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <input
                          value={splitNameInput}
                          onChange={(event) => setSplitNameInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === ",") {
                              event.preventDefault();
                              addSplitName();
                            }
                          }}
                          onBlur={addSplitName}
                          placeholder="Type a name and press Enter"
                          className="min-w-[180px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#71808c]">
                        Each person will have a pending receivable debt for their share.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3 border-t border-[#edf2f0] pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingTransactionId(null);
                  }}
                  className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !wallets.length || !categories.length}
                  className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : editingTransactionId
                      ? "Update transaction"
                      : "Save transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isTransferOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-title"
            className="w-full max-w-[520px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="eyebrow">Move money</div>
                <h2
                  id="transfer-title"
                  className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]"
                >
                  Transfer between wallets
                </h2>
                <p className="mt-1 text-xs text-[#71808c]">
                  Move funds without changing your income or expense totals.
                </p>
              </div>
              <button
                aria-label="Close transfer modal"
                onClick={() => setIsTransferOpen(false)}
                className="rounded-lg p-2 text-[#9aa7af] transition hover:bg-[#f4f7f6] hover:text-[#17212b]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createTransfer} className="space-y-4">
              {formError && (
                <div className="rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    From wallet
                  </label>
                  <select
                    required
                    value={transferForm.fromWalletId}
                    onChange={(event) =>
                      setTransferForm({
                        ...transferForm,
                        fromWalletId: event.target.value,
                        toWalletId:
                          event.target.value === transferForm.toWalletId
                            ? ""
                            : transferForm.toWalletId,
                      })
                    }
                    className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"
                  >
                    <option value="">Select source</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.balance.toLocaleString("vi-VN")}{" "}
                        VND)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                    To wallet
                  </label>
                  <select
                    required
                    value={transferForm.toWalletId}
                    onChange={(event) =>
                      setTransferForm({
                        ...transferForm,
                        toWalletId: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"
                  >
                    <option value="">Select destination</option>
                    {wallets.map((wallet) => (
                      <option
                        key={wallet.id}
                        value={wallet.id}
                        disabled={wallet.id === transferForm.fromWalletId}
                      >
                        {wallet.name} ({wallet.balance.toLocaleString("vi-VN")}{" "}
                        VND)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                  Amount
                </label>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={transferForm.amount}
                  onChange={(event) =>
                    setTransferForm({
                      ...transferForm,
                      amount: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                  Description
                </label>
                <input
                  required
                  value={transferForm.description}
                  onChange={(event) =>
                    setTransferForm({
                      ...transferForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="e.g. Move savings"
                  className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#71808c]">
                  Date and time
                </label>
                <input
                  required
                  type="datetime-local"
                  value={transferForm.transactionDate}
                  onChange={(event) =>
                    setTransferForm({
                      ...transferForm,
                      transactionDate: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-[#edf2f0] pt-5">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || wallets.length < 2}
                  className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Transferring..." : "Transfer funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
