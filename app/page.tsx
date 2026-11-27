"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CreditCard, Download,
  LayoutDashboard, Plus, Search, Settings2, Sparkles, Trash2, Wallet, X,
  PencilLine, ReceiptText, ChartNoAxesCombined, Menu,
} from "lucide-react";

type Currency = "EUR" | "USD" | "GBP" | "RUB";
type Cycle = "weekly" | "monthly" | "yearly";
type Subscription = {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: Currency;
  cycle: Cycle;
  nextDate: string;
  createdAt: string;
};

const STORAGE_KEY = "flix.subscriptions.v1";
const currencies: Currency[] = ["EUR", "USD", "GBP", "RUB"];
const categories = ["Entertainment", "Software", "Music", "Shopping", "Cloud", "Education", "Other"];
const money = (amount: number, currency: Currency) =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

function addCycle(dateString: string, cycle: Cycle) {
  const date = new Date(dateString + "T12:00:00");
  if (cycle === "weekly") date.setDate(date.getDate() + 7);
  if (cycle === "monthly" || cycle === "yearly") {
    const originalDay = date.getDate();
    const targetYear = date.getFullYear() + (cycle === "yearly" ? 1 : 0);
    const targetMonth = date.getMonth() + (cycle === "monthly" ? 1 : 0);
    const normalized = new Date(targetYear, targetMonth, 1, 12);
    const lastDay = new Date(normalized.getFullYear(), normalized.getMonth() + 1, 0).getDate();
    normalized.setDate(Math.min(originalDay, lastDay));
    return [normalized.getFullYear(), String(normalized.getMonth() + 1).padStart(2, "0"), String(normalized.getDate()).padStart(2, "0")].join("-");
  }
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function daysUntil(dateString: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}
function monthEquivalent(item: Subscription) {
  if (item.cycle === "weekly") return item.amount * 52 / 12;
  if (item.cycle === "yearly") return item.amount / 12;
  return item.amount;
}
function localDateString() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

const blankForm = {
  name: "", category: "Entertainment" as string, amount: "", currency: "EUR" as Currency,
  cycle: "monthly" as Cycle, nextDate: localDateString(),
};

export default function Home() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(localDateString().slice(0, 7));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Subscription[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch { /* Ignore invalid local browser data and start empty. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const upcoming = useMemo(() => [...items].sort((a, b) => a.nextDate.localeCompare(b.nextDate)), [items]);
  const filtered = useMemo(() => items.filter((item) =>
    (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase())
  ), [items, query]);
  const totals = useMemo(() => {
    const result: Record<Currency, number> = { EUR: 0, USD: 0, GBP: 0, RUB: 0 };
    items.forEach((item) => { result[item.currency] += monthEquivalent(item); });
    return result;
  }, [items]);
  const dueSoon = upcoming.filter((item) => daysUntil(item.nextDate) >= 0 && daysUntil(item.nextDate) <= 7);
  const nextItem = upcoming.find((item) => daysUntil(item.nextDate) >= 0) ?? upcoming[0];
  const calendarStart = new Date(calendarMonth + "-01T12:00:00");
  const calendarOffset = (calendarStart.getDay() + 6) % 7;
  const calendarDays = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((calendarOffset + calendarDays) / 7) * 7 }, (_, index) => {
    const day = index - calendarOffset + 1;
    return day > 0 && day <= calendarDays ? day : null;
  });
  const calendarTitle = calendarStart.toLocaleDateString("en", { month: "long", year: "numeric" });
  function shiftCalendarMonth(delta: number) {
    const next = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + delta, 1, 12);
    setCalendarMonth([next.getFullYear(), String(next.getMonth() + 1).padStart(2, "0")].join("-"));
  }

  function openAdd() {
    setEditing(null); setForm(blankForm); setModalOpen(true);
  }
  function openEdit(item: Subscription) {
    setEditing(item.id);
    setForm({ name: item.name, category: item.category, amount: String(item.amount), currency: item.currency, cycle: item.cycle, nextDate: item.nextDate });
    setModalOpen(true);
  }
  function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.nextDate) return;
    if (editing) {
      setItems((current) => current.map((item) => item.id === editing ? { ...item, ...form, name: form.name.trim(), amount } : item));
    } else {
      setItems((current) => [...current, { ...form, id: crypto.randomUUID(), name: form.name.trim(), amount, createdAt: new Date().toISOString() }]);
    }
    setModalOpen(false); setNotice(editing ? "Subscription updated" : "Subscription added");
    window.setTimeout(() => setNotice(""), 2600);
  }
  function markPaid(item: Subscription) {
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, nextDate: addCycle(entry.nextDate, entry.cycle) } : entry));
    setNotice(item.name + " marked as paid"); window.setTimeout(() => setNotice(""), 2600);
  }
  function removeItem(id: string) {
    if (!window.confirm("Delete this subscription?")) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }
  function exportCsv() {
    const rows = [["Service", "Category", "Amount", "Currency", "Billing cycle", "Next payment"], ...items.map((item) => [item.name, item.category, String(item.amount), item.currency, item.cycle, item.nextDate])];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "flix-subscriptions.csv"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const nav = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Subscriptions", icon: CreditCard },
    { name: "Payments", icon: CalendarDays },
    { name: "Insights", icon: ChartNoAxesCombined },
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">f</div><span>flix</span><span className="brand-beta">BETA</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch"><div className="workspace-avatar">P</div><div><strong>Personal space</strong><small>Free plan</small></div><ChevronRight size={15} /></div>
        <div className="nav-label">MENU</div>
        <nav className="nav-list">
          {nav.map(({ name, icon: Icon }) => <button key={name} onClick={() => { setActiveTab(name); setMobileNav(false); }} className={`nav-link ${activeTab === name ? "active" : ""}`}><Icon size={18} /><span>{name}</span>{name === "Payments" && dueSoon.length > 0 && <em>{dueSoon.length}</em>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17} /></div><strong>Stay ahead of every charge</strong><p>Keep recurring payments visible and predictable.</p><span>FLIX MONEY CENTER</span></div>
          <div className="profile-row"><div className="profile-avatar">Y</div><div><strong>Your account</strong><small>Personal workspace</small></div><Settings2 size={17} /></div>
        </div>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button><span className="breadcrumb">Workspace</span><ChevronRight size={14} /><strong>{activeTab}</strong></div>
          <div className="topbar-actions"><span className="local-status"><i /> Local data</span><button className="icon-button" title="Notifications"><Bell size={18} /></button><div className="top-avatar">Y</div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY, IN FOCUS</div><h1>{activeTab === "Overview" ? "Money Center" : activeTab}</h1><p>{activeTab === "Overview" ? "A clear view of your subscriptions and recurring payments." : activeTab === "Subscriptions" ? "Manage the services and recurring charges you track." : activeTab === "Payments" ? "See what is coming up and stay ready for each charge." : "Understand where your recurring money goes."}</p></div>
            <button className="primary-button" onClick={openAdd}><Plus size={17} /> Add subscription</button>
          </div>

          {activeTab === "Overview" && <>
            <div className="stats-grid">
              <article className="stat-card"><div className="stat-top"><span>MONTHLY COMMITMENT</span><div className="stat-icon green"><Wallet size={18} /></div></div><div className="stat-value-list">{currencies.filter(c => totals[c] > 0).length ? currencies.filter(c => totals[c] > 0).map(c => <strong key={c}>{money(totals[c], c)} <small>/ mo</small></strong>) : <strong>—</strong>}</div><div className="stat-foot"><ArrowUpRight size={14} /> Estimated recurring spend</div></article>
              <article className="stat-card"><div className="stat-top"><span>ACTIVE SUBSCRIPTIONS</span><div className="stat-icon purple"><CreditCard size={18} /></div></div><div className="stat-value">{items.length}</div><div className="stat-foot">Services you currently track</div></article>
              <article className="stat-card"><div className="stat-top"><span>UP NEXT</span><div className="stat-icon blue"><CalendarDays size={18} /></div></div><div className="stat-value">{nextItem ? money(nextItem.amount, nextItem.currency) : "—"}</div><div className="stat-foot">{nextItem ? `${nextItem.name} · ${new Date(nextItem.nextDate + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}` : "No upcoming payments"}</div></article>
              <article className="stat-card"><div className="stat-top"><span>COMING IN 7 DAYS</span><div className="stat-icon orange"><Bell size={18} /></div></div><div className="stat-value">{dueSoon.length}</div><div className="stat-foot">Upcoming charges to prepare for</div></article>
            </div>
            <div className="content-grid">
              <section className="panel subscriptions-panel"><div className="panel-heading"><div><h2>Subscriptions</h2><p>Your tracked recurring services</p></div><button className="text-button" onClick={() => setActiveTab("Subscriptions")}>View all <ChevronRight size={15} /></button></div>
                {items.length === 0 ? <EmptyState onAdd={openAdd} /> : <SubscriptionTable items={upcoming.slice(0, 5)} onEdit={openEdit} onPaid={markPaid} onDelete={removeItem} />}
              </section>
              <section className="panel radar-panel"><div className="panel-heading"><div><h2>Payment radar</h2><p>Next charges on your calendar</p></div><div className="radar-icon"><Activity size={17} /></div></div>
                {upcoming.length === 0 ? <div className="empty-radar"><div className="radar-empty-icon"><CalendarDays size={22} /></div><strong>Nothing on the radar</strong><p>Add a subscription to see upcoming payments here.</p></div> : <div className="radar-list">{upcoming.slice(0, 5).map((item) => { const days = daysUntil(item.nextDate); return <div className="radar-item" key={item.id}><div className="radar-date"><strong>{new Date(item.nextDate + "T00:00:00").toLocaleDateString("en", { day: "2-digit" })}</strong><small>{new Date(item.nextDate + "T00:00:00").toLocaleDateString("en", { month: "short" })}</small></div><div className="radar-detail"><strong>{item.name}</strong><small>{days < 0 ? "Overdue" : days === 0 ? "Due today" : days === 1 ? "Tomorrow" : `In ${days} days`}</small></div><strong className="radar-amount">{money(item.amount, item.currency)}</strong></div>; })}</div>}
              </section>
            </div>
            <section className="bottom-note"><div className="note-icon"><ShieldCheckIcon /></div><div><strong>Your data stays in this browser</strong><p>FLIX currently stores your subscription list locally on this device. No bank connection or automatic detection is active.</p></div><span>PRIVATE BY DEFAULT</span></section>
          </>}

          {activeTab === "Subscriptions" && <section className="panel full-panel"><div className="panel-heading"><div><h2>All subscriptions <span className="count-pill">{items.length}</span></h2><p>Update prices, billing cycles, and payment dates.</p></div><div className="table-actions"><div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services..." /></div><button className="secondary-button" onClick={exportCsv} disabled={!items.length}><Download size={15} /> Export CSV</button></div></div>{filtered.length ? <SubscriptionTable items={filtered} onEdit={openEdit} onPaid={markPaid} onDelete={removeItem} /> : <EmptyState onAdd={openAdd} />}</section>}

          {activeTab === "Payments" && <div className="payments-layout">
  <section className="panel calendar-panel">
    <div className="panel-heading"><div><h2>Payment calendar</h2><p>Every charge, mapped by date.</p></div><div className="calendar-controls"><button className="icon-button" onClick={() => shiftCalendarMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button><strong>{calendarTitle}</strong><button className="icon-button" onClick={() => shiftCalendarMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button></div></div>
    <div className="calendar-grid calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{calendarCells.map((day, index) => {
      const dateKey = day ? calendarMonth + "-" + String(day).padStart(2, "0") : "";
      const dayItems = day ? upcoming.filter(item => item.nextDate === dateKey) : [];
      const isToday = dateKey === localDateString();
      return <div key={index} className={"calendar-day " + (day ? "" : "outside ") + (isToday ? "today " : "") + (dayItems.length ? "has-payment" : "")}>
        {day && <><span className="calendar-day-number">{day}</span>{dayItems.slice(0, 2).map(item => <button key={item.id} className="calendar-event" title={item.name + ": " + money(item.amount, item.currency)} onClick={() => openEdit(item)}>{item.name}</button>)}{dayItems.length > 2 && <small className="calendar-more">+{dayItems.length - 2} more</small>}</>}
      </div>;
    })}</div>
    <div className="calendar-legend"><span><i /> Payment scheduled</span><span>Tap a payment to edit it</span></div>
  </section>
  <section className="panel full-panel"><div className="panel-heading"><div><h2>All upcoming payments</h2><p>Sorted by the next scheduled charge.</p></div></div>{upcoming.length ? <SubscriptionTable items={upcoming} onEdit={openEdit} onPaid={markPaid} onDelete={removeItem} /> : <EmptyState onAdd={openAdd} />}</section>
</div>}

          {activeTab === "Insights" && <section className="panel full-panel"><div className="panel-heading"><div><h2>Spending breakdown</h2><p>Monthly equivalent by currency and category.</p></div></div>{items.length ? <div className="insights-layout"><div className="insight-total"><span>TRACKED SERVICES</span><strong>{items.length}</strong><p>Monthly estimates are calculated from each billing cycle.</p></div><div className="category-breakdown">{categories.map((category) => { const amount = items.filter(i => i.category === category).reduce((sum, i) => sum + monthEquivalent(i), 0); const count = items.filter(i => i.category === category).length; return count ? <div className="category-row" key={category}><div><strong>{category}</strong><small>{count} {count === 1 ? "service" : "services"}</small></div><div className="category-bars">{currencies.filter(c => items.some(i => i.category === category && i.currency === c)).map(c => { const value = items.filter(i => i.category === category && i.currency === c).reduce((sum, i) => sum + monthEquivalent(i), 0); const maximum = Math.max(...categories.map(group => items.filter(i => i.category === group && i.currency === c).reduce((sum, i) => sum + monthEquivalent(i), 0))); return <div className="category-currency" key={c}><div className="category-currency-top"><span>{c}</span><strong>{money(value, c)}</strong></div><div className="category-bar-track"><i style={{ width: Math.max(4, value / maximum * 100) + "%" }} /></div></div>; })}</div></div> : null; })}</div></div> : <EmptyState onAdd={openAdd} />}</section>}
          <footer className="footer"><span>FLIX © 2026</span><span>Subscription clarity, without the noise.</span><span>Version 0.1 · MVP</span></footer>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}><form className="modal" onSubmit={saveItem}><div className="modal-heading"><div><span className="eyebrow">SUBSCRIPTION DETAILS</span><h2>{editing ? "Edit subscription" : "Add subscription"}</h2><p>Enter the details of a recurring charge.</p></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={19} /></button></div><label>Service name<input autoFocus required maxLength={60} placeholder="e.g. Netflix" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><div className="form-row"><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Price<input required type="number" min="0.01" step="0.01" placeholder="9.99" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label></div><div className="form-row"><label>Currency<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label><label>Billing cycle<select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as Cycle })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label></div><label>Next payment date<input required type="date" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> {editing ? "Save changes" : "Add subscription"}</button></div><p className="form-footnote">This information is saved locally in your browser only.</p></form></div>}
      {notice && <div className="toast"><Check size={16} /> {notice}</div>}
    </main>
  );
}

function SubscriptionTable({ items, onEdit, onPaid, onDelete }: { items: Subscription[]; onEdit: (item: Subscription) => void; onPaid: (item: Subscription) => void; onDelete: (id: string) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>SERVICE</th><th>CATEGORY</th><th>PRICE</th><th>NEXT PAYMENT</th><th>STATUS</th><th /></tr></thead><tbody>{items.map((item) => { const days = daysUntil(item.nextDate); return <tr key={item.id}><td><div className="service-cell"><div className="service-logo">{item.name.trim().charAt(0).toUpperCase()}</div><strong>{item.name}</strong></div></td><td><span className="category-tag">{item.category}</span></td><td><strong className="price-cell">{money(item.amount, item.currency)}</strong><small className="cycle-label">/{item.cycle === "yearly" ? "year" : item.cycle === "weekly" ? "week" : "month"}</small></td><td><span className="date-cell">{new Date(item.nextDate + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span></td><td><span className={`status-pill ${days < 0 ? "overdue" : days <= 7 ? "soon" : "scheduled"}`}><i />{days < 0 ? "Overdue" : days === 0 ? "Due today" : days <= 7 ? "Due soon" : "Scheduled"}</span></td><td><div className="row-actions"><button title="Mark as paid" onClick={() => onPaid(item)}><Check size={15} /></button><button title="Edit" onClick={() => onEdit(item)}><PencilLine size={15} /></button><button title="Delete" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table></div>;
}
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><ReceiptText size={25} /></div><h3>Your list starts here</h3><p>Add your first subscription to see recurring costs and upcoming payments in one place.</p><button className="secondary-button" onClick={onAdd}><Plus size={15} /> Add first subscription</button></div>;
}
function ShieldCheckIcon() { return <Check size={18} />; }
