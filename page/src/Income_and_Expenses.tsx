// ExpenseTracker.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Chart,
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from "chart.js";

import "./Income_and_Expenses.css";

Chart.register(
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend
);

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType   = "income" | "expense";
type PageName = "dashboard" | "transactions" | "categories";
type CatTab   = "income" | "expense";

const BANKS = ["SCB", "KBank", "BBL", "Krungthai", "TMBThanachart", "Other"];

interface Transaction {
  id:       number;
  type:     TxType;
  desc:     string;
  amount:   number;
  date:     string;
  category: string;
  group:    string;
  bank:     string;   // ← ใหม่
  note:     string;
}

interface FormState {
  type:     TxType;
  desc:     string;
  amount:   string;
  date:     string;
  category: string;
  group:    string;
  bank:     string;   // ← ใหม่
  note:     string;
}

interface FilterState {
  search: string;
  type:   string;
  cat:    string;
  group:  string;
  bank:   string;     // ← ใหม่
  month:  string;
}

interface DashFilter {
  month: string;
  year:  string;
  group: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const DEFAULT_INCOME_CATS  = ["Income", "Freelance", "Dividends", "Gifts", "Other Income"];
const DEFAULT_EXPENSE_CATS = ["Food", "Travel", "Shopping", "Utilities", "Healthcare", "Entertainment", "Other Expense"];
const DEFAULT_GROUPS       = ["Personal", "Business"];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id:1, type:"income",  desc:"Salary - May",       amount:45000, date:"2026-05-01", category:"Salary",      group:"Business",   bank:"SCB",    note:"" },
  { id:2, type:"expense", desc:"Weekly Groceries",   amount:1200,  date:"2026-05-03", category:"Food",        group:"Personal",   bank:"KBank",  note:"Market" },
  { id:3, type:"income",  desc:"Freelance Project",  amount:15000, date:"2026-05-05", category:"Freelance",   group:"Business",   bank:"SCB",    note:"" },
  { id:4, type:"expense", desc:"Car Maintenance",    amount:350,   date:"2026-05-07", category:"Travel",      group:"Personal",   bank:"BBL",    note:"" },
  { id:5, type:"income",  desc:"Stock Dividends",    amount:3500,  date:"2026-05-10", category:"Dividends",   group:"Investment", bank:"KBank",  note:"" },
  { id:6, type:"expense", desc:"Clothing Purchase",  amount:2800,  date:"2026-05-12", category:"Shopping",    group:"Personal",   bank:"SCB",    note:"" },
  { id:7, type:"expense", desc:"Restaurant Meal",    amount:650,   date:"2026-05-14", category:"Food",        group:"Personal",   bank:"KBank",  note:"" },
  { id:8, type:"income",  desc:"Quarterly Bonus",    amount:10000, date:"2026-05-15", category:"Freelance",   group:"Business",   bank:"SCB",    note:"Q1" },
  { id:9, type:"expense", desc:"Electricity Bill",   amount:1800,  date:"2026-05-02", category:"Utilities",   group:"Home",       bank:"BBL",    note:"" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  "฿" + Math.abs(n).toLocaleString("th-TH", { minimumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });

const CHART_COLORS = [
  "#4f46e5","#059669","#dc2626","#d97706","#7c3aed",
  "#0891b2","#be185d","#16a34a","#9333ea","#c2410c",
];

let nextId = 100;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExpenseTracker() {
  const [page, setPage] = useState<PageName>("dashboard");

  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [incomeCats,   setIncomeCats]   = useState<string[]>(DEFAULT_INCOME_CATS);
  const [expenseCats,  setExpenseCats]  = useState<string[]>(DEFAULT_EXPENSE_CATS);
  const [groups,       setGroups]       = useState<string[]>(DEFAULT_GROUPS);

  const [form, setForm] = useState<FormState>({
    type: "income", desc: "", amount: "", date: "", category: "", group: "", bank: "", note: "",
  });

  const [editId,   setEditId]   = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>({
    type: "income", desc: "", amount: "", date: "", category: "", group: "", bank: "", note: "",
  });

  const [filter, setFilter] = useState<FilterState>({
    search: "", type: "", cat: "", group: "", bank: "", month: "",
  });

  const [dashFilter, setDashFilter] = useState<DashFilter>({
    month: "", year: "", group: "",
  });

  const [catTab,     setCatTab]     = useState<CatTab>("income");
  const [newCatName, setNewCatName] = useState("");
  const [newGrpName, setNewGrpName] = useState("");
  const [viewMode]                  = useState<"list" | "group">("list");

  const chartMonthlyRef    = useRef<Chart | null>(null);
  const chartExpensePieRef = useRef<Chart | null>(null);
  const chartIncomePieRef  = useRef<Chart | null>(null);
  const canvasMonthly      = useRef<HTMLCanvasElement>(null);
  const canvasExpensePie   = useRef<HTMLCanvasElement>(null);
  const canvasIncomePie    = useRef<HTMLCanvasElement>(null);

  // ─── Filtered data ────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (
          !t.desc.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !t.group.toLowerCase().includes(q)
        ) return false;
      }
      if (filter.type  && t.type     !== filter.type)  return false;
      if (filter.cat   && t.category !== filter.cat)   return false;
      if (filter.group && t.group    !== filter.group)  return false;
      if (filter.bank  && t.bank     !== filter.bank)   return false;  // ← filter bank
      if (filter.month && !t.date.startsWith(filter.month)) return false;
      return true;
    });
  }, [transactions, filter]);

  const dashTx = useMemo(() => {
    return transactions.filter(t => {
      if (dashFilter.month && !t.date.startsWith(`${dashFilter.year || "2026"}-${dashFilter.month}`)) return false;
      if (dashFilter.year  && !t.date.startsWith(dashFilter.year))  return false;
      if (dashFilter.group && t.group !== dashFilter.group) return false;
      return true;
    });
  }, [transactions, dashFilter]);

  const totalIncome  = useMemo(() => dashTx.filter(t => t.type === "income") .reduce((s,t) => s + t.amount, 0), [dashTx]);
  const totalExpense = useMemo(() => dashTx.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0), [dashTx]);
  const balance      = totalIncome - totalExpense;

  useEffect(() => {
    if (page !== "dashboard") return;
    updateCharts();
  }, [dashTx, page]);

  function updateCharts() {
    const monthMap: Record<string, { income: number; expense: number }> = {};
    dashTx.forEach(t => {
      const mon = t.date.slice(0, 7);
      if (!monthMap[mon]) monthMap[mon] = { income: 0, expense: 0 };
      if (t.type === "income") monthMap[mon].income  += t.amount;
      else                     monthMap[mon].expense += t.amount;
    });
    const months   = Object.keys(monthMap).sort();
    const incomes  = months.map(m => monthMap[m].income);
    const expenses = months.map(m => monthMap[m].expense);

    if (chartMonthlyRef.current) chartMonthlyRef.current.destroy();
    if (canvasMonthly.current) {
      chartMonthlyRef.current = new Chart(canvasMonthly.current, {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            { label: "Income",  data: incomes,  backgroundColor: "#059669" },
            { label: "Expense", data: expenses, backgroundColor: "#dc2626" },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } } },
      });
    }

    const expCatMap: Record<string, number> = {};
    dashTx.filter(t => t.type === "expense").forEach(t => {
      expCatMap[t.category] = (expCatMap[t.category] || 0) + t.amount;
    });
    if (chartExpensePieRef.current) chartExpensePieRef.current.destroy();
    if (canvasExpensePie.current) {
      const labels = Object.keys(expCatMap);
      chartExpensePieRef.current = new Chart(canvasExpensePie.current, {
        type: "doughnut",
        data: { labels, datasets: [{ data: labels.map(l => expCatMap[l]),
          backgroundColor: CHART_COLORS.slice(0, labels.length) }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } } },
      });
    }

    const incCatMap: Record<string, number> = {};
    dashTx.filter(t => t.type === "income").forEach(t => {
      incCatMap[t.category] = (incCatMap[t.category] || 0) + t.amount;
    });
    if (chartIncomePieRef.current) chartIncomePieRef.current.destroy();
    if (canvasIncomePie.current) {
      const labels = Object.keys(incCatMap);
      chartIncomePieRef.current = new Chart(canvasIncomePie.current, {
        type: "doughnut",
        data: { labels, datasets: [{ data: labels.map(l => incCatMap[l]),
          backgroundColor: CHART_COLORS.slice(0, labels.length) }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } } },
      });
    }
  }

  function showPage(p: PageName) { setPage(p); }

  function addTransaction() {
    if (!form.desc || !form.amount || !form.date || !form.category) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    const newTx: Transaction = {
      id:       nextId++,
      type:     form.type,
      desc:     form.desc,
      amount:   Number(form.amount),
      date:     form.date,
      category: form.category,
      group:    form.group,
      bank:     form.bank,    // ← ใหม่
      note:     form.note,
    };
    setTransactions(prev => [newTx, ...prev]);
    setForm(prev => ({ ...prev, desc: "", amount: "", category: "", group: "", bank: "", note: "" }));
  }

  function deleteTransaction(id: number) {
    if (!confirm("ลบรายการนี้?")) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  function openEdit(tx: Transaction) {
    setEditId(tx.id);
    setEditForm({
      type: tx.type, desc: tx.desc, amount: String(tx.amount),
      date: tx.date, category: tx.category, group: tx.group, bank: tx.bank, note: tx.note,
    });
  }

  function saveEdit() {
    if (editId === null) return;
    setTransactions(prev => prev.map(t =>
      t.id === editId
        ? { ...t, ...editForm, amount: Number(editForm.amount) }
        : t
    ));
    setEditId(null);
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (catTab === "income") {
      if (!incomeCats.includes(name)) setIncomeCats(prev => [...prev, name]);
    } else {
      if (!expenseCats.includes(name)) setExpenseCats(prev => [...prev, name]);
    }
    setNewCatName("");
  }

  function deleteCategory(name: string) {
    if (catTab === "income") setIncomeCats(prev => prev.filter(c => c !== name));
    else                     setExpenseCats(prev => prev.filter(c => c !== name));
  }

  function addGroup() {
    const name = newGrpName.trim();
    if (!name || groups.includes(name)) return;
    setGroups(prev => [...prev, name]);
    setNewGrpName("");
  }

  function deleteGroup(name: string) {
    setGroups(prev => prev.filter(g => g !== name));
  }

  function exportCSV() {
    const headers = ["Date","Type","Detail","Category","Group","Bank","Income","Expense","Note"];
    const rows = filteredTx.map(t => [
      t.date,
      t.type === "income" ? "Income" : "Expense",
      t.desc,
      t.category,
      t.group,
      t.bank,
      t.type === "income"  ? t.amount : "",
      t.type === "expense" ? t.amount : "",
      t.note,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const catSummary = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    dashTx.forEach(t => {
      if (!map[t.category]) map[t.category] = { income: 0, expense: 0 };
      if (t.type === "income") map[t.category].income  += t.amount;
      else                     map[t.category].expense += t.amount;
    });
    return Object.entries(map).sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense));
  }, [dashTx]);

  const maxCatTotal = useMemo(() =>
    Math.max(...catSummary.map(([, v]) => v.income + v.expense), 1),
  [catSummary]);

  const groupedTx = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filteredTx.forEach(t => {
      const key = t.group || "(No group)";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map);
  }, [filteredTx]);

  const currentCats = form.type === "income" ? incomeCats : expenseCats;
  const uniqueCats   = useMemo(() => [...new Set(transactions.map(t => t.category))], [transactions]);
  const uniqueGroups = useMemo(() => [...new Set(transactions.map(t => t.group).filter(Boolean))], [transactions]);
  const editCats     = editForm.type === "income" ? incomeCats : expenseCats;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="et-app">

      {/* TOPBAR */}
      <div className="et-topbar">
        <span className="et-topbar-title">Revenue</span>
        <nav className="et-nav-tabs">
          {(["dashboard","transactions","categories"] as PageName[]).map(p => (
            <button
              key={p}
              className={`et-nav-tab ${page === p ? "active" : ""}`}
              onClick={() => showPage(p)}
            >
              {{ dashboard:"Dashboard", transactions:"List", categories:"Add Group" }[p]}
            </button>
          ))}
        </nav>
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {page === "dashboard" && (
        <div className="et-page">
          <div className="et-summary-grid">
            <div className="et-stat-card">
              <div className="et-stat-label">Income</div>
              <div className="et-stat-value income">{fmtMoney(totalIncome)}</div>
              <div className="et-stat-sub">{dashTx.filter(t=>t.type==="income").length} items</div>
            </div>
            <div className="et-stat-card">
              <div className="et-stat-label">Expense</div>
              <div className="et-stat-value expense">{fmtMoney(totalExpense)}</div>
              <div className="et-stat-sub">{dashTx.filter(t=>t.type==="expense").length} items</div>
            </div>
            <div className="et-stat-card">
              <div className="et-stat-label">Balance</div>
              <div className={`et-stat-value ${balance >= 0 ? "income" : "expense"}`}>{fmtMoney(balance)}</div>
            </div>
          </div>

          <div className="et-filter-bar" style={{ marginBottom: 20 }}>
            <span className="et-filter-label">Filter by:</span>
            <select value={dashFilter.year} onChange={e => setDashFilter(p => ({...p, year: e.target.value}))}>
              <option value="">All Years</option>
              {[...new Set(transactions.map(t => t.date.slice(0,4)))].sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={dashFilter.month} onChange={e => setDashFilter(p => ({...p, month: e.target.value}))}>
              <option value="">All Months</option>
              {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
            <select value={dashFilter.group} onChange={e => setDashFilter(p => ({...p, group: e.target.value}))}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="et-chart-grid">
            <div className="et-card">
              <div className="et-card-title">Income - Expenses by Month</div>
              <div className="et-chart-wrap"><canvas ref={canvasMonthly} /></div>
            </div>
            <div className="et-card">
              <div className="et-card-title">Expense Categories</div>
              <div className="et-chart-wrap"><canvas ref={canvasExpensePie} /></div>
            </div>
          </div>

          <div className="et-card">
            <div className="et-card-title">Income Categories</div>
            <div className="et-chart-wrap" style={{ height: 200 }}>
              <canvas ref={canvasIncomePie} />
            </div>
          </div>

          <div className="et-card">
            <div className="et-card-title">Category Summary</div>
            {catSummary.length === 0 ? (
              <div className="et-empty">No data available</div>
            ) : (
              catSummary.map(([cat, v], i) => {
                const total = v.income + v.expense;
                return (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                      <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span className="et-color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {cat}
                      </span>
                      <span style={{ color:"var(--et-text-muted)", fontSize:12 }}>
                        {v.income  > 0 && <span className="et-amount-income">+{fmtMoney(v.income)}</span>}
                        {v.expense > 0 && <span className="et-amount-expense" style={{marginLeft:6}}>-{fmtMoney(v.expense)}</span>}
                      </span>
                    </div>
                    <div className="et-progress-bar">
                      <div className="et-progress-fill"
                        style={{ width:`${(total/maxCatTotal)*100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ──────────────────────────────────────────────────── */}
      {page === "transactions" && (
        <div className="et-page">

          {/* Add form */}
          <div className="et-card">
            <div className="et-card-title">Add list</div>

            <div style={{ marginBottom: 16 }}>
              <div className="et-type-toggle">
                <button
                  className={`et-type-btn income ${form.type === "income" ? "active" : ""}`}
                  onClick={() => setForm(p => ({ ...p, type: "income", category: "" }))}
                >+ Income</button>
                <button
                  className={`et-type-btn expense ${form.type === "expense" ? "active" : ""}`}
                  onClick={() => setForm(p => ({ ...p, type: "expense", category: "" }))}
                >- Expense</button>
              </div>
            </div>

            <div className="et-form-row">
              <div className="et-form-group" style={{ minWidth: 180 }}>
                <label>Details</label>
                <input type="text" placeholder="e.g., Food, Salary, etc."
                  value={form.desc} onChange={e => setForm(p => ({...p, desc: e.target.value}))} />
              </div>
              <div className="et-form-group" style={{ maxWidth: 150 }}>
                <label>Amount (฿)</label>
                <input type="number" placeholder="0.00" min="0"
                  value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
              </div>
              <div className="et-form-group" style={{ maxWidth: 160 }}>
                <label>Date</label>
                <input type="date"
                  value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
              </div>
              <div className="et-form-group" style={{ maxWidth: 160 }}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                  <option value="">-- Select Category --</option>
                  {currentCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="et-form-group" style={{ maxWidth: 160 }}>
                <label>Group</label>
                <select value={form.group} onChange={e => setForm(p => ({...p, group: e.target.value}))}>
                  <option value="">-- No Group --</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {/* ── Bank dropdown ── */}
              <div className="et-form-group" style={{ maxWidth: 160 }}>
                <label>Bank</label>
                <select value={form.bank} onChange={e => setForm(p => ({...p, bank: e.target.value}))}>
                  <option value="">-- Select Bank --</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="et-form-row" style={{ marginTop: 10 }}>
              <div className="et-form-group">
                <label>Note (if any)</label>
                <input type="text" placeholder="Additional notes..."
                  value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} />
              </div>
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <button className="et-btn et-btn-primary" onClick={addTransaction}>+ Add List</button>
              </div>
            </div>
          </div>

          {/* Transaction list */}
          <div className="et-card">
            <div className="et-card-title">
              <span>All items</span>
              <div style={{ display:"flex", gap:8 }}>
                <button className="et-btn et-btn-ghost et-btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
              </div>
            </div>

            {/* Filters */}
            <div className="et-filter-bar">
              <input type="month" value={filter.month}
                onChange={e => setFilter(p => ({...p, month: e.target.value}))} />

              <select value={filter.type} onChange={e => setFilter(p => ({...p, type: e.target.value}))}>
                <option value="">All Transactions</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              {/* ── Bank filter ── */}
              <select value={filter.bank} onChange={e => setFilter(p => ({...p, bank: e.target.value}))}>
                <option value="">All Banks</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <select value={filter.cat} onChange={e => setFilter(p => ({...p, cat: e.target.value}))}>
                <option value="">All Categories</option>
                {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={filter.group} onChange={e => setFilter(p => ({...p, group: e.target.value}))}>
                <option value="">All Groups</option>
                {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>

              <button className="et-btn et-btn-ghost et-btn-sm"
                onClick={() => setFilter({ search:"", type:"", cat:"", group:"", bank:"", month:"" })}>
                Clear Filters
              </button>
            </div>

            {filteredTx.length === 0 ? (
              <div className="et-empty">No matching transactions</div>
            ) : viewMode === "list" ? (
              <div className="et-table-wrap">
                <table className="et-table">
                  <thead>
                    <tr>
                      {/* ── คอลัมน์ตามที่ต้องการ ── */}
                      <th>Date</th>
                      <th>Bank</th>
                      <th>Group</th>
                      <th>Category</th>
                      <th>Detail</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th></th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map(tx => (
                      <tr key={tx.id}>
                        {/* Date */}
                        <td style={{ whiteSpace:"nowrap" }}>{fmtDate(tx.date)}</td>

                        {/* Bank */}
                        <td>
                          {tx.bank
                            ? <span className="et-badge et-badge-bank">{tx.bank}</span>
                            : <span style={{ color:"var(--et-text-muted)" }}>-</span>}
                        </td>

                        {/* Group */}
                        <td>{tx.group || "-"}</td>

                        {/* Category */}
                        <td><span className="et-badge ">{tx.category}</span></td>

                        {/* Detail + note */}
                        <td>
                          <div style={{ fontWeight:500 }}>{tx.desc}</div>
                          {tx.note && <div style={{ fontSize:12, color:"var(--et-text-muted)" }}>{tx.note}</div>}
                        </td>

                        {/* Income */}
                        <td className="et-amount-income">
                          {tx.type === "income" ? fmtMoney(tx.amount) : ""}
                        </td>

                        {/* Expense */}
                        <td className="et-amount-expense">
                          {tx.type === "expense" ? fmtMoney(tx.amount) : ""}
                        </td>

                        {/* Action */}
                        <td>
                          <div style={{ display:"flex", gap:6 }}>
                            {/* <button className="et-btn et-btn-ghost et-btn-sm" onClick={() => openEdit(tx)}>Edit</button> */}
                            <button className="et-btn et-btn-danger et-btn-sm" onClick={() => deleteTransaction(tx.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              groupedTx.map(([grp, txs]) => (
                <div key={grp} className="et-group-section">
                  <div className="et-group-header">
                    <span>{grp}</span>
                    <span style={{ fontSize:13, color:"var(--et-text-muted)" }}>{txs.length} items</span>
                  </div>
                  {txs.map(tx => (
                    <div key={tx.id} className="et-group-row">
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:14 }}>{tx.desc}</div>
                        <div style={{ fontSize:12, color:"var(--et-text-muted)" }}>
                          {fmtDate(tx.date)} · {tx.category} · {tx.bank || "-"}
                        </div>
                      </div>
                      <span className={tx.type === "income" ? "et-amount-income" : "et-amount-expense"}>
                        {tx.type === "income" ? "+" : "-"}{fmtMoney(tx.amount)}
                      </span>
                      <div style={{ display:"flex", gap:4, marginLeft:12 }}>
                        <button className="et-btn et-btn-ghost et-btn-sm" onClick={() => openEdit(tx)}>Edit</button>
                        <button className="et-btn et-btn-danger et-btn-sm" onClick={() => deleteTransaction(tx.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES ────────────────────────────────────────────────────── */}
      {page === "categories" && (
        <div className="et-page">
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:20 }}>
            <div className="et-card">
              <div className="et-card-title">Manage Groups</div>
              <p style={{ fontSize:13, color:"var(--et-text-muted)", marginBottom:12 }}>
                Groups are high-level labels e.g. "Personal", "Business", "Home"
              </p>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input type="text" placeholder="New group name" className="et-input-standalone"
                  value={newGrpName} onChange={e => setNewGrpName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addGroup()} />
                <button className="et-btn et-btn-primary" onClick={addGroup}>+ Add</button>
              </div>
              <div className="et-cat-list">
                {groups.map(g => (
                  <div key={g} className="et-cat-item">
                    {/*<span style={{ fontSize:18 }}>📁</span>*/}
                    <span className="et-cat-name">{g}</span>
                    <button className="et-btn et-btn-danger et-btn-sm"
                      onClick={() => deleteGroup(g)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="et-card">
              <div className="et-card-title">Manage Categories</div>
              <div className="et-tab-bar">
                <button className={`et-tab ${catTab === "income" ? "active" : ""}`}
                  onClick={() => setCatTab("income")}>Income</button>
                <button className={`et-tab ${catTab === "expense" ? "active" : ""}`}
                  onClick={() => setCatTab("expense")}>Expense</button>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input type="text" placeholder="New category name" className="et-input-standalone"
                  value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCategory()} />
                <button className="et-btn et-btn-primary" onClick={addCategory}>+ Add</button>
              </div>
              <div className="et-cat-list">
                {(catTab === "income" ? incomeCats : expenseCats).map((cat) => (
                  <div key={cat} className="et-cat-item">
                    {/*<span className="et-color-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />*/}
                    <span className="et-cat-name">{cat}</span>
                    <button className="et-btn et-btn-danger et-btn-sm"
                      onClick={() => deleteCategory(cat)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      {editId !== null && (
        <div className="et-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="et-modal">
            <div className="et-modal-title">Edit Transaction</div>

            <div style={{ marginBottom: 16 }}>
              <div className="et-type-toggle">
                <button className={`et-type-btn income ${editForm.type==="income" ? "active":""}`}
                  onClick={() => setEditForm(p => ({...p, type:"income", category:""}))}>+ Income</button>
                <button className={`et-type-btn expense ${editForm.type==="expense" ? "active":""}`}
                  onClick={() => setEditForm(p => ({...p, type:"expense", category:""}))}>- Expense</button>
              </div>
            </div>

            <div className="et-form-row">
              <div className="et-form-group">
                <label>Detail</label>
                <input type="text" value={editForm.desc}
                  onChange={e => setEditForm(p => ({...p, desc: e.target.value}))} />
              </div>
              <div className="et-form-group" style={{ maxWidth:140 }}>
                <label>Amount</label>
                <input type="number" min="0" value={editForm.amount}
                  onChange={e => setEditForm(p => ({...p, amount: e.target.value}))} />
              </div>
            </div>

            <div className="et-form-row" style={{ marginTop:10 }}>
              <div className="et-form-group">
                <label>Date</label>
                <input type="date" value={editForm.date}
                  onChange={e => setEditForm(p => ({...p, date: e.target.value}))} />
              </div>
              <div className="et-form-group">
                <label>Category</label>
                <select value={editForm.category}
                  onChange={e => setEditForm(p => ({...p, category: e.target.value}))}>
                  <option value="">-- Select --</option>
                  {editCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="et-form-group">
                <label>Group</label>
                <select value={editForm.group}
                  onChange={e => setEditForm(p => ({...p, group: e.target.value}))}>
                  <option value="">-- No Group --</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {/* ── Bank in edit modal ── */}
              <div className="et-form-group">
                <label>Bank</label>
                <select value={editForm.bank}
                  onChange={e => setEditForm(p => ({...p, bank: e.target.value}))}>
                  <option value="">-- Select Bank --</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="et-form-group" style={{ marginTop:10 }}>
              <label>Note</label>
              <input type="text" value={editForm.note}
                onChange={e => setEditForm(p => ({...p, note: e.target.value}))} />
            </div>

            <div className="et-modal-footer">
              <button className="et-btn et-btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
              <button className="et-btn et-btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}