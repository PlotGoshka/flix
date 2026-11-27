"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CreditCard, Download,
  LayoutDashboard, Plus, Search, Settings2, Sparkles, Trash2, Wallet, X,
  PencilLine, ReceiptText, ChartNoAxesCombined, Menu, Send, ShieldCheck, Smartphone,
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
const PREFERENCES_KEY = "flix.preferences.v1";
const NOTIFIED_KEY = "flix.notifications.sent.v1";
type Preferences = { browserNotifications: boolean; reminderDays: number };
const defaultPreferences: Preferences = { browserNotifications: false, reminderDays: 3 };
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
function projectedPayments(items: Subscription[], monthKey: string) {
  const monthStart = new Date(monthKey + "-01T12:00:00");
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 12);
  return items.flatMap((item) => {
    let date = item.nextDate;
    const matches: { item: Subscription; date: string }[] = [];
    let guard = 0;
    while (date < [monthStart.getFullYear(), String(monthStart.getMonth() + 1).padStart(2, "0"), "01"].join("-") && guard++ < 1200) {
      date = addCycle(date, item.cycle);
    }
    guard = 0;
    while (date < [monthEnd.getFullYear(), String(monthEnd.getMonth() + 1).padStart(2, "0"), "01"].join("-") && guard++ < 20) {
      matches.push({ item, date });
      date = addCycle(date, item.cycle);
    }
    return matches;
  });
}
function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00");
  return date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
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
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Subscription[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
      const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
      if (savedPreferences) setPreferences({ ...defaultPreferences, ...JSON.parse(savedPreferences) });
    } catch { /* Ignore invalid local browser data and start empty. */ }
    if ("Notification" in window) setNotificationPermission(Notification.permission);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!modalOpen && !mobileNav) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModalOpen(false); setMobileNav(false); }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [modalOpen, mobileNav]);

  useEffect(() => {
    if (!loaded) return;
    if (items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  }, [items, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences, loaded]);

  useEffect(() => {
    if (!loaded || !preferences.browserNotifications || !("Notification" in window) || Notification.permission !== "granted") return;
    let sent: string[] = [];
    try { sent = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]") as string[]; } catch { sent = []; }
    const due = items.filter(item => {
      const days = daysUntil(item.nextDate);
      const key = item.id + ":" + item.nextDate;
      return days >= 0 && days <= preferences.reminderDays && !sent.includes(key);
    });
    due.forEach(item => {
      const days = daysUntil(item.nextDate);
      const when = days === 0 ? "сегодня" : days === 1 ? "завтра" : "через " + days + " дн.";
      new Notification("FLIX · Скоро списание", { body: item.name + " — " + money(item.amount, item.currency) + " · " + when, tag: item.id + ":" + item.nextDate });
      sent.push(item.id + ":" + item.nextDate);
    });
    if (due.length) localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent));
  }, [items, loaded, preferences]);

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
  const calendarProjected = useMemo(() => projectedPayments(items, calendarMonth), [items, calendarMonth]);
  function shiftCalendarMonth(delta: number) {
    const next = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + delta, 1, 12);
    setCalendarMonth([next.getFullYear(), String(next.getMonth() + 1).padStart(2, "0")].join("-"));
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      setNotice("Этот браузер не поддерживает уведомления");
      window.setTimeout(() => setNotice(""), 2800);
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setPreferences(current => ({ ...current, browserNotifications: true }));
      setNotice("Уведомления включены");
    } else {
      setPreferences(current => ({ ...current, browserNotifications: false }));
      setNotice(permission === "denied" ? "Разрешите уведомления в настройках браузера" : "Уведомления не включены");
    }
    window.setTimeout(() => setNotice(""), 2800);
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
  function clearLocalData() {
    if (!window.confirm("Delete all subscriptions and reminder history stored in this browser? This cannot be undone. Export a backup first if you need one.")) return;
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NOTIFIED_KEY);
    setNotice("Local FLIX data cleared"); window.setTimeout(() => setNotice(""), 2600);
  }
  function exportBackup() {
    const backup = { app: "FLIX", formatVersion: 1, exportedAt: new Date().toISOString(), subscriptions: items, preferences };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "flix-backup.json"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Backup exported"); window.setTimeout(() => setNotice(""), 2600);
  }
  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.target;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const source = Array.isArray(parsed) ? parsed : parsed?.subscriptions;
        if (!Array.isArray(source) || source.some((item: any) => !item || typeof item.name !== "string" || !item.name.trim() || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 || !currencies.includes(item.currency) || !["weekly", "monthly", "yearly"].includes(item.cycle) || typeof item.nextDate !== "string" || !isValidDateString(item.nextDate))) {
          throw new Error("Invalid backup format");
        }
        const clean: Subscription[] = source.map((item: any) => ({
          id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
          name: item.name.trim(), category: categories.includes(item.category) ? item.category : "Other",
          amount: Number(item.amount), currency: item.currency, cycle: item.cycle, nextDate: item.nextDate,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        }));
        if (!window.confirm("Import " + clean.length + " subscriptions and replace your current FLIX list?")) return;
        setItems(clean);
        if (parsed?.preferences && typeof parsed.preferences.browserNotifications === "boolean" && [0, 1, 3, 7].includes(parsed.preferences.reminderDays)) {
          setPreferences({ browserNotifications: parsed.preferences.browserNotifications, reminderDays: parsed.preferences.reminderDays });
        }
        localStorage.removeItem(NOTIFIED_KEY);
        setNotice("Backup imported successfully"); window.setTimeout(() => setNotice(""), 2600);
      } catch {
        setNotice("File is not a valid FLIX backup"); window.setTimeout(() => setNotice(""), 3000);
      } finally { input.value = ""; }
    };
    reader.onerror = () => { setNotice("Could not read the backup file"); window.setTimeout(() => setNotice(""), 3000); input.value = ""; };
    reader.readAsText(file);
  }

  function exportCsv() {
    const rows = [["Service", "Category", "Amount", "Currency", "Billing cycle", "Next payment"], ...items.map((item) => [item.name, item.category, String(item.amount), item.currency, item.cycle, item.nextDate])];
    const csvCell = (cell: string) => { const safe = /^[\s]*[=+\-@]/.test(cell) ? "'" + cell : cell; return '"' + safe.replaceAll('"', '""') + '"'; };
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "flix-subscriptions.csv"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const nav = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Subscriptions", icon: CreditCard },
    { name: "Payments", icon: CalendarDays },
    { name: "Insights", icon: ChartNoAxesCombined },
    { name: "Settings", icon: Settings2 },
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
          <div className="topbar-actions"><span className="local-status"><i /> Local data</span><button className="icon-button" title="Reminder settings" onClick={() => setActiveTab("Settings")}><Bell size={18} /></button><div className="top-avatar">Y</div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY, IN FOCUS</div><h1>{activeTab === "Overview" ? "Money Center" : activeTab}</h1><p>{activeTab === "Overview" ? "A clear view of your subscriptions and recurring payments." : activeTab === "Subscriptions" ? "Manage the services and recurring charges you track." : activeTab === "Payments" ? "See what is coming up and stay ready for each charge." : activeTab === "Insights" ? "Understand where your recurring money goes." : "Control reminders, privacy, and your Telegram connection."}</p></div>
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
    <div className="panel-heading"><div><h2>Payment calendar</h2><p>Projected recurring charges for this month.</p></div><div className="calendar-controls"><button className="icon-button" onClick={() => shiftCalendarMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button><strong>{calendarTitle}</strong><button className="icon-button" onClick={() => shiftCalendarMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button></div></div>
    <div className="calendar-grid calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{calendarCells.map((day, index) => {
      const dateKey = day ? calendarMonth + "-" + String(day).padStart(2, "0") : "";
      const dayItems = day ? calendarProjected.filter(entry => entry.date === dateKey).map(entry => entry.item) : [];
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

          {activeTab === "Settings" && <div className="settings-layout">
            <section className="panel settings-panel">
              <div className="panel-heading"><div><h2>Reminders</h2><p>Choose when FLIX should alert you about upcoming charges.</p></div><div className="settings-icon"><Bell size={18} /></div></div>
              <div className="settings-row">
                <div className="settings-copy"><strong>Browser notifications</strong><p>Show a notification when you open FLIX and a payment is approaching. The app must be open for local reminders to be checked.</p><small>{notificationPermission === "granted" ? "Browser permission granted" : notificationPermission === "denied" ? "Blocked by browser settings" : "Permission not requested"}</small></div>
                {preferences.browserNotifications ? <button className="secondary-button" onClick={() => setPreferences(current => ({ ...current, browserNotifications: false }))}>Turn off</button> : <button className="primary-button" onClick={enableBrowserNotifications}>Enable</button>}
              </div>
              <div className="settings-row">
                <div className="settings-copy"><strong>Remind me before payment</strong><p>Local reminders are checked once when FLIX is opened. Each payment is notified only once per scheduled date.</p></div>
                <select className="settings-select" value={preferences.reminderDays} onChange={event => setPreferences(current => ({ ...current, reminderDays: Number(event.target.value) }))}><option value={0}>On the due date</option><option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>7 days before</option></select>
              </div>
              <div className="settings-footnote"><ShieldCheck size={16} /><span>Notification preferences are stored in this browser. These are local browser alerts, not Telegram or background push notifications.</span></div>
            </section>
            <section className="panel settings-panel telegram-panel">
              <div className="panel-heading"><div><h2>Telegram connection</h2><p>Get payment reminders in your Telegram chat.</p></div><div className="telegram-mark"><Send size={18} /></div></div>
              <div className="telegram-connect-row"><div className="telegram-visual"><Send size={22} /></div><div className="settings-copy"><strong>FLIX Telegram Bot</strong><p>Bot integration is being prepared. Once secure account linking and cloud sync are ready, you’ll be able to connect your chat here.</p><span className="connection-status"><i /> Not connected</span></div></div>
              <div className="telegram-steps"><div><span>01</span><p>Cloud account and secure sync</p></div><div><span>02</span><p>Link your Telegram account</p></div><div><span>03</span><p>Receive payment reminders</p></div></div>
              <div className="settings-footnote"><Smartphone size={16} /><span>Your current subscriptions remain on this device. Telegram cannot access them until cloud sync is implemented.</span></div>
            </section>
            <section className="panel settings-panel privacy-panel">
              <div className="panel-heading"><div><h2>Data & privacy</h2><p>Know exactly where your information lives.</p></div></div>
              <div className="privacy-status"><span className="privacy-dot" /><div><strong>Stored locally on this device</strong><p>{items.length} {items.length === 1 ? "subscription" : "subscriptions"} saved in this browser. No bank or email connections are active.</p></div></div>
              <div className="privacy-actions"><button className="secondary-button" onClick={exportCsv} disabled={!items.length}><Download size={15} /> Export CSV</button><button className="secondary-button danger-action" onClick={clearLocalData}><Trash2 size={15} /> Clear local data</button><div className="settings-backup-actions"><button className="secondary-button" onClick={exportBackup}><Download size={15} /> Export JSON backup</button><label className="secondary-button backup-import-label"><Download size={15} /> Import backup<input type="file" accept=".json,application/json" onChange={importBackup} /></label></div></div>
            </section>
          </div>}
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
