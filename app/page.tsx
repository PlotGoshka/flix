"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

type Subscription = {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  cadence: "monthly" | "yearly" | "weekly";
  nextDate: string;
};

const STORAGE_KEY = "flix.subscriptions.v1";

const money = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

function nextChargeLabel(date: string) {
  const today = new Date();
  const target = new Date(date + "T12:00:00");
  const days = Math.ceil(
    (new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000,
  );
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return target.toLocaleDateString("en", { day: "numeric", month: "short" });
}

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "Entertainment",
    amount: "",
    currency: "EUR",
    cadence: "monthly" as Subscription["cadence"],
    nextDate: "",
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSubscriptions(JSON.parse(saved) as Subscription[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    }
  }, [subscriptions, loaded]);

  const monthlyTotals = useMemo(() => {
    return subscriptions.reduce<Record<string, number>>((totals, item) => {
      const amount =
        item.cadence === "yearly"
          ? item.amount / 12
          : item.cadence === "weekly"
            ? (item.amount * 52) / 12
            : item.amount;
      totals[item.currency] = (totals[item.currency] ?? 0) + amount;
      return totals;
    }, {});
  }, [subscriptions]);

  const formatTotals = (multiplier = 1) => {
    const entries = Object.entries(monthlyTotals);
    if (entries.length === 0) return money(0);
    return entries
      .map(([currency, amount]) => money(amount * multiplier, currency))
      .join(" + ");
  };

  const upcoming = useMemo(
    () =>
      [...subscriptions]
        .filter((item) => item.nextDate)
        .sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    [subscriptions],
  );

  const filtered = subscriptions.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function addSubscription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.amount || !form.nextDate) return;
    const item: Subscription = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount),
      currency: form.currency,
      cadence: form.cadence,
      nextDate: form.nextDate,
    };
    setSubscriptions((current) => [...current, item]);
    setForm({
      name: "",
      category: "Entertainment",
      amount: "",
      currency: "EUR",
      cadence: "monthly",
      nextDate: "",
    });
    setModalOpen(false);
  }

  function removeSubscription(id: string) {
    setSubscriptions((current) => current.filter((item) => item.id !== id));
  }

  const next = upcoming[0];

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="FLIX home">
          <span className="brand-mark">f</span>
          <span>flix</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav">
          <a className="nav-item active" href="#overview"><LayoutDashboard size={18} /> Overview</a>
          <a className="nav-item" href="#subscriptions"><CreditCard size={18} /> Subscriptions <span className="nav-count">{subscriptions.length}</span></a>
          <a className="nav-item" href="#upcoming"><CalendarDays size={18} /> Upcoming</a>
          <a className="nav-item" href="#insights"><Activity size={18} /> Insights</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note">
            <ShieldCheck size={17} />
            <div><strong>Your data stays yours</strong><span>Stored on this device for now</span></div>
          </div>
          <a className="nav-item muted" href="#settings"><Settings2 size={18} /> Settings</a>
          <a className="nav-item muted" href="#help"><CircleHelp size={18} /> Help center</a>
          <div className="profile">
            <div className="avatar">Y</div>
            <div><strong>Your workspace</strong><span>Personal account</span></div>
            <ChevronDown size={16} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="top-actions">
            <span className="local-badge"><span /> Local mode</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <div className="avatar small">Y</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR MONEY, IN ONE PLACE</div>
              <h1>Money center<span>.</span></h1>
              <p>A clearer picture of the recurring charges in your life.</p>
            </div>
            <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={17} /> Add subscription</button>
          </div>

          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-label"><Wallet size={15} /> MONTHLY COMMITMENT</div>
              <div className="hero-amount">{formatTotals()}</div>
              <p>Estimated recurring spend per month</p>
              <div className="hero-footnote"><span className="footnote-dot" /> Based on the subscriptions you add</div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="visual-core"><span>f</span></div>
              <div className="visual-chip chip-one"><ArrowDownRight size={15} /></div>
              <div className="visual-chip chip-two"><CreditCard size={15} /></div>
              <div className="visual-chip chip-three"><Sparkles size={15} /></div>
            </div>
          </section>

          <div className="stats-grid">
            <article className="stat-card">
              <div className="stat-top"><span>Active subscriptions</span><CreditCard size={17} /></div>
              <strong>{subscriptions.length}</strong>
              <small>Added by you</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Next payment</span><CalendarDays size={17} /></div>
              <strong className="stat-date">{next ? money(next.amount, next.currency) : "—"}</strong>
              <small>{next ? `${next.name} · ${nextChargeLabel(next.nextDate)}` : "No upcoming payments"}</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Yearly estimate</span><ArrowUpRight size={17} /></div>
              <strong>{formatTotals(12)}</strong>
              <small>Projected from current entries</small>
            </article>
          </div>

          <section className="section-block" id="subscriptions">
            <div className="section-heading">
              <div><h2>Your subscriptions</h2><p>Keep every recurring payment visible.</p></div>
              <div className="table-actions">
                <label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subscriptions" /></label>
                <button className="secondary-button" onClick={() => setModalOpen(true)}><Plus size={16} /> Add new</button>
              </div>
            </div>
            <div className="table-card">
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><CreditCard size={22} /></div>
                  <h3>{subscriptions.length === 0 ? "Your subscriptions will appear here" : "No matching subscriptions"}</h3>
                  <p>{subscriptions.length === 0 ? "Add your first recurring payment to see your monthly spend and upcoming charges in one place." : "Try another search term."}</p>
                  {subscriptions.length === 0 && <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={17} /> Add your first subscription</button>}
                </div>
              ) : (
                <div className="subscription-list">
                  <div className="list-head"><span>SERVICE</span><span>PRICE</span><span>BILLING</span><span>NEXT CHARGE</span><span /></div>
                  {filtered.map((item) => (
                    <div className="subscription-row" key={item.id}>
                      <div className="service-cell"><div className="service-icon">{item.name.slice(0, 1).toUpperCase()}</div><div><strong>{item.name}</strong><span>{item.category}</span></div></div>
                      <strong>{money(item.amount, item.currency)}</strong>
                      <span className="billing-pill">{item.cadence}</span>
                      <div className="next-cell"><strong>{new Date(item.nextDate + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</strong><span>{nextChargeLabel(item.nextDate)}</span></div>
                      <button className="delete-button" onClick={() => removeSubscription(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bottom-grid">
            <article className="info-card" id="upcoming">
              <div className="info-title"><div><h2>Payment radar</h2><p>Your next scheduled charges.</p></div><CalendarDays size={18} /></div>
              {upcoming.length === 0 ? <div className="mini-empty">Nothing on the radar yet. Add a subscription to start tracking dates.</div> : upcoming.slice(0, 4).map((item) => (
                <div className="radar-row" key={item.id}><div className="radar-date"><strong>{new Date(item.nextDate + "T12:00:00").getDate()}</strong><span>{new Date(item.nextDate + "T12:00:00").toLocaleDateString("en", { month: "short" })}</span></div><div className="radar-name"><strong>{item.name}</strong><span>{nextChargeLabel(item.nextDate)}</span></div><strong>{money(item.amount, item.currency)}</strong></div>
              ))}
            </article>
            <article className="info-card insight-card" id="insights">
              <div className="info-title"><div><h2>Spending insight</h2><p>A simple view of your recurring costs.</p></div><Sparkles size={18} /></div>
              <div className="insight-empty"><div className="insight-ring"><span>{subscriptions.length}</span></div><div><strong>{subscriptions.length === 0 ? "Your overview starts here" : "You’re building your picture"}</strong><p>{subscriptions.length === 0 ? "Once you add subscriptions, FLIX will calculate your monthly and yearly commitments." : "Your estimates update automatically when you add or remove a subscription."}</p></div></div>
            </article>
          </section>
          <footer className="footer-note">FLIX is an independent tracker. It does not connect to banks or move money in this early version.</footer>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={addSubscription}>
            <div className="modal-heading"><div><div className="eyebrow">NEW RECURRING PAYMENT</div><h2>Add subscription</h2></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <label>Service name<input required autoFocus placeholder="e.g. Streaming service" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <div className="form-two"><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Entertainment</option><option>Software</option><option>Music</option><option>Cloud storage</option><option>Shopping</option><option>Fitness</option><option>Other</option></select></label><label>Billing cycle<select value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value as Subscription["cadence"] })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="weekly">Weekly</option></select></label></div>
            <div className="form-two"><label>Amount<input required type="number" min="0.01" step="0.01" placeholder="9.99" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Currency<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="EUR">EUR €</option><option value="USD">USD $</option><option value="GBP">GBP £</option><option value="RUB">RUB ₽</option></select></label></div>
            <label>Next payment date<input required type="date" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Save subscription</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
