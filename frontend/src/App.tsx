import { useEffect, useMemo, useState, type FormEvent } from "react";
import { db } from "./db";

type View = "Overview" | "Services" | "Patients" | "Appointments" | "Home visits" | "Investigations" | "Referrals" | "Billing" | "Reports";
type Patient = { initials: string; name: string; id: string; visit: string; status: string; tone: string };
type Role = "Administrator" | "Clinician" | "Nurse" | "Field officer" | "Receptionist" | "Finance officer" | "Patient";
type User = { name: string; email: string; role: Role; initials: string; tone: string; allowed: View[] };

const allViews: View[] = ["Overview", "Services", "Patients", "Appointments", "Home visits", "Investigations", "Referrals", "Billing", "Reports"];
const demoUsers: User[] = [
  { name: "Dr. Alex Kato", email: "admin@gbl.health", role: "Administrator", initials: "AK", tone: "green", allowed: allViews },
  { name: "Dr. Miriam Nansubuga", email: "clinician@gbl.health", role: "Clinician", initials: "MN", tone: "purple", allowed: ["Overview", "Services", "Patients", "Appointments", "Investigations", "Referrals", "Reports"] },
  { name: "Nurse Sarah Namukasa", email: "nurse@gbl.health", role: "Nurse", initials: "SN", tone: "rose", allowed: ["Overview", "Services", "Patients", "Appointments", "Home visits", "Investigations"] },
  { name: "John Ouma", email: "field@gbl.health", role: "Field officer", initials: "JO", tone: "blue", allowed: ["Overview", "Services", "Patients", "Home visits", "Appointments"] },
  { name: "Grace Namuli", email: "reception@gbl.health", role: "Receptionist", initials: "GN", tone: "gold", allowed: ["Overview", "Services", "Patients", "Appointments"] },
  { name: "Peter Okello", email: "finance@gbl.health", role: "Finance officer", initials: "PO", tone: "gold", allowed: ["Overview", "Services", "Billing", "Reports"] },
  { name: "Sarah Atim", email: "patient@gbl.health", role: "Patient", initials: "SA", tone: "blue", allowed: ["Overview", "Services", "Appointments", "Reports"] }
];

const patients: Patient[] = [
  { initials: "SN", name: "Sarah Namukasa", id: "UG-024-891", visit: "Today, 08:42", status: "Follow-up", tone: "rose" },
  { initials: "JO", name: "John Ouma", id: "UG-019-442", visit: "Yesterday, 15:10", status: "Stable", tone: "blue" },
  { initials: "GA", name: "Grace Achieng", id: "UG-031-205", visit: "Yesterday, 11:35", status: "Follow-up", tone: "gold" },
  { initials: "PO", name: "Peter Okello", id: "UG-015-773", visit: "14 Nov, 09:20", status: "Pending review", tone: "purple" }
];
const nav: { label: View; icon: string; count?: string }[] = [
  { label: "Overview", icon: "⌂" }, { label: "Services", icon: "✦" }, { label: "Patients", icon: "♙", count: "1,248" },
  { label: "Appointments", icon: "▣", count: "8" }, { label: "Home visits", icon: "⌂" },
  { label: "Investigations", icon: "⌁" }, { label: "Referrals", icon: "↗", count: "12" },
  { label: "Billing", icon: "▤" }, { label: "Reports", icon: "◒" }
];

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date()).toUpperCase();
}

function App() {
  const [accounts, setAccounts] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem("gbl-demo-accounts");
      return saved ? [...demoUsers, ...JSON.parse(saved) as User[]] : demoUsers;
    } catch {
      return demoUsers;
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("gbl-demo-user");
    if (!saved) return null;
    const custom = localStorage.getItem("gbl-demo-accounts");
    const available = custom ? [...demoUsers, ...JSON.parse(custom) as User[]] : demoUsers;
    return available.find((candidate) => candidate.email === saved) ?? null;
  });
  const [view, setView] = useState<View>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    db.syncQueue.count().then(setQueueSize);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3000); };
  const filtered = useMemo(() => patients.filter((p) => `${p.name} ${p.id}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const visibleNav = nav.filter((item) => user?.allowed.includes(item.label));
  const chooseView = (next: View) => { if (!user?.allowed.includes(next)) { notify("Your role does not have access to this workspace."); return; } setView(next); setMenuOpen(false); if (next !== "Overview") notify(`${next} workspace is ready for integration.`); };
  const signIn = (next: User) => { localStorage.setItem("gbl-demo-user", next.email); setUser(next); setView("Overview"); notify(`Welcome, ${next.name}.`); };
  const signOut = () => { localStorage.removeItem("gbl-demo-user"); setUser(null); setMenuOpen(false); };

  const createAccount = (next: User) => {
    const customAccounts = accounts.filter((account) => !demoUsers.some((demo) => demo.email === account.email));
    const updated = [...customAccounts, next];
    setAccounts([...demoUsers, ...updated]);
    localStorage.setItem("gbl-demo-accounts", JSON.stringify(updated));
    signIn(next);
  };

  if (!user) return <LoginScreen accounts={accounts} onSignIn={signIn} onCreateAccount={createAccount} />;

  return <div className="shell">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">+</div><div><strong>GBL</strong><span>Mobile Health</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{visibleNav.map((item) => <button key={item.label} className={`nav-item ${view === item.label ? "active" : ""}`} onClick={() => chooseView(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.count && <span className={`nav-count ${item.label === "Appointments" ? "alert" : ""}`}>{item.count}</span>}</button>)}<button className="nav-item logout-nav" onClick={signOut}><span className="nav-icon">↪</span>Log out</button></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">?</div><strong>Need help?</strong><span>Visit the support centre</span><button onClick={() => notify("Support centre opened.")}>Get support →</button></div><button className="profile-mini" onClick={() => signOut()} title="Sign out"><div className={`avatar ${user.tone}`}>{user.initials}</div><div><strong>{user.name}</strong><span>{user.role} · Sign out</span></div><b>↪</b></button></div>
    </aside>
    {menuOpen && <button className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="top-actions"><label className={`search ${searchOpen ? "open" : ""}`} onClick={() => setSearchOpen(true)}><span>⌕</span><input autoFocus={searchOpen} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients, records..." aria-label="Search patients and records" /></label><button className="icon-btn" onClick={() => notify("You have 3 unread notifications.")}>♢<i /></button><button className="top-profile" onClick={() => notify(`${user.role} account settings opened.`)}><div className={`avatar ${user.tone}`}>{user.initials}</div><span>{user.name}</span><b>⌄</b></button></div></header>
      <div className="sync-bar"><span className={`sync-dot ${online ? "online" : ""}`} />{online ? "Online · Changes sync automatically" : "Offline mode · Changes saved on this device"}{queueSize > 0 && <span className="queue">{queueSize} pending</span>}</div>
      {view === "Overview" ? <RoleDashboard user={user} onRegister={() => setModal(true)} onNavigate={chooseView} patients={filtered} onNotify={notify} /> : <Workspace view={view} onRegister={() => setModal(true)} onNotify={notify} />}
      <footer><span>GBL Mobile Health Services</span><span>Healthcare that comes to you · <a href="#" onClick={(e) => { e.preventDefault(); notify("Privacy and security centre opened."); }}>Privacy & security</a></span></footer>
    </main>
    {modal && <PatientModal onClose={() => setModal(false)} onSave={(name) => { setModal(false); notify(`${name} was added to the patient directory.`); }} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function LoginScreen({ accounts, onSignIn, onCreateAccount }: { accounts: User[]; onSignIn: (user: User) => void; onCreateAccount: (user: User) => void }) {
  const [signUp, setSignUp] = useState(false);
  const [email, setEmail] = useState("admin@gbl.health");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<Role>("Patient");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const selected = accounts.find((candidate) => candidate.email === email);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const storedPassword = localStorage.getItem(`gbl-password-${email.toLowerCase()}`);
    if ((!selected || (password !== "demo1234" && password !== storedPassword))) { setError("Use the account password or choose a demo account."); return; }
    setError(""); onSignIn(selected);
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) { setError("An account with this email already exists."); return; }
    const initials = name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    localStorage.setItem(`gbl-password-${email.toLowerCase()}`, password);
    onCreateAccount({ name: name.trim(), email: email.toLowerCase(), role, initials, tone: "teal", allowed: role === "Patient" ? ["Overview", "Services", "Appointments", "Reports"] : ["Overview", "Services", "Patients", "Appointments"] });
  };
  return <main className="auth-shell"><section className="auth-brand"><div className="brand-mark">+</div><p className="eyebrow">GBL MOBILE HEALTH SERVICES</p><h1>Healthcare that comes to you.</h1><p>One secure workspace for every member of your care team, from registration to follow-up.</p><div className="auth-points"><span>✓ Offline-ready field workflows</span><span>✓ Role-based access for every user</span><span>✓ Auditable patient care records</span></div></section><section className="login-card"><div className="login-heading"><p className="eyebrow">{signUp ? "NEW ACCOUNT" : "SECURE WORKSPACE"}</p><h2>{signUp ? "Create your GBL account" : "Sign in to GBL"}</h2><p className="muted">{signUp ? "Create an account to access GBL services." : "Choose your account type to continue."}</p></div><form onSubmit={signUp ? create : submit}>{signUp && <label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Namusoke" /></label>}<label>Email address<input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>{signUp && <label>Account type<select value={role} onChange={(e) => setRole(e.target.value as Role)}><option>Patient</option><option>Receptionist</option><option>Nurse</option><option>Clinician</option><option>Field officer</option><option>Finance officer</option></select></label>}<label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={signUp ? "At least 8 characters" : "demo1234"} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{signUp && <label>Confirm password<div className="password-field"><input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /><button type="button" className="password-toggle" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? "Hide" : "Show"}</button></div></label>}{!signUp && <div className="login-options"><label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember this device</label><button type="button" className="link" onClick={() => setError("Contact your administrator to reset your password.")}>Forgot password?</button></div>}{error && <p className="form-error">{error}</p>}<button className="primary login-button">{signUp ? "Create account →" : "Sign in securely →"}</button></form><button className="auth-switch link" onClick={() => { setSignUp(!signUp); setError(""); setPassword(signUp ? "demo1234" : ""); setShowPassword(false); setShowConfirmPassword(false); }}>{signUp ? "Already have an account? Sign in" : "New to GBL? Create an account"}</button>{!signUp && <div className="demo-accounts"><div className="demo-title"><strong>Demo accounts</strong><span>Password: demo1234</span></div><div className="account-grid">{accounts.map((candidate) => <button type="button" key={candidate.email} className={`account-option ${selected?.email === candidate.email ? "selected" : ""}`} onClick={() => { setEmail(candidate.email); setPassword("demo1234"); setError(""); }}><span className={`avatar ${candidate.tone}`}>{candidate.initials}</span><span><b>{candidate.role}</b><small>{candidate.name}</small></span></button>)}</div></div>}<p className="login-note">Prototype accounts are stored locally. Production authentication must use Django, Argon2, TOTP, server sessions, and audit logging.</p></section></main>;
}

function RoleDashboard({ user, onRegister, onNavigate, patients, onNotify }: { user: User; onRegister: () => void; onNavigate: (v: View) => void; patients: Patient[]; onNotify: (m: string) => void }) {
  if (user.role === "Patient") return <PatientDashboard user={user} onNavigate={onNavigate} onNotify={onNotify} />;
  const dashboard = {
    Administrator: { title: "Organisation overview", subtitle: "Monitor care delivery, team activity, and service performance.", plan: ["Organisation KPIs and trends", "Staff activity and permissions", "Patient safety and audit alerts", "Service, finance, and backup health"], cards: [["♙", "Registered patients", "1,248", "Patients"], ["▣", "Today's appointments", "18", "Appointments"], ["⌂", "Home visits", "14", "Home visits"], ["◒", "Follow-up completion", "92.4%", "Reports"]] },
    Clinician: { title: "Clinical worklist", subtitle: "Review today's consultations, investigations, and continuity of care.", plan: ["Consultation queue and clinical notes", "Investigation results requiring review", "Referral feedback and escalation", "Follow-up plan and continuity tracking"], cards: [["▣", "Today's consultations", "8", "Appointments"], ["⌁", "Results to review", "3", "Investigations"], ["↗", "Open referrals", "12", "Referrals"], ["◒", "Follow-ups due", "6", "Reports"]] },
    Nurse: { title: "Nursing desk", subtitle: "Coordinate patient observations, visits, and clinical follow-up.", plan: ["Assigned patient observations", "Home-visit preparation and completion", "Appointment readiness and triage", "Vitals and care-plan updates"], cards: [["♙", "Patients assigned", "42", "Patients"], ["⌂", "Visits today", "7", "Home visits"], ["▣", "Appointments", "11", "Appointments"], ["⌁", "Observations due", "9", "Investigations"]] },
    "Field officer": { title: "Field work today", subtitle: "Stay on top of assigned home visits and offline patient records.", plan: ["Route and visit schedule", "Assigned patient cache", "Offline registration and vitals", "Sync queue and conflict review"], cards: [["⌂", "Assigned visits", "5", "Home visits"], ["♙", "Patients on route", "12", "Patients"], ["▣", "Pending check-ins", "3", "Appointments"], ["↗", "Follow-ups", "4", "Reports"]] },
    Receptionist: { title: "Front desk", subtitle: "Register patients and keep the day's appointment desk moving.", plan: ["Patient registration and duplicate checks", "Appointment booking and reminders", "Check-in and waiting queue", "Referral intake and routing"], cards: [["♙", "Registered patients", "1,248", "Patients"], ["▣", "Appointments today", "18", "Appointments"], ["⌂", "Waiting for check-in", "4", "Appointments"], ["↗", "Referral requests", "2", "Referrals"]] },
    "Finance officer": { title: "Finance overview", subtitle: "Track invoices, collections, and service revenue.", plan: ["Invoice and corporate account queue", "Payment reconciliation", "Outstanding balances and receipts", "Revenue and finance reports"], cards: [["▤", "Outstanding invoices", "24", "Billing"], ["▤", "Collected this month", "UGX 18.4M", "Reports"], ["▤", "Pending payments", "8", "Billing"], ["◒", "Monthly revenue", "+12.4%", "Reports"]] }
  }[user.role as Exclude<Role, "Patient">];
  return <div className="page"><section className="welcome"><div><p className="eyebrow">{formatCurrentDate()} · {user.role.toUpperCase()}</p><h1>{dashboard.title} <span>✦</span></h1><p className="muted">{dashboard.subtitle}</p></div>{user.allowed.includes("Patients") && <button className="primary" onClick={onRegister}>＋ Register patient</button>}</section><section className="role-banner"><div className="role-banner-icon">{user.initials}</div><div><strong>Welcome back, {user.name}</strong><p>You are signed in as <b>{user.role}</b>. Your workspace is tailored to your responsibilities.</p></div><button className="link" onClick={() => onNotify("Your role permissions are managed by the administrator.")}>View permissions →</button></section><DashboardPlan items={dashboard.plan} onNotify={onNotify} /><section className="stats">{dashboard.cards.map(([icon, label, value, target]) => <Stat key={label} icon={icon} tone={target === "Billing" ? "orange" : target === "Reports" ? "blue" : target === "Investigations" ? "purple" : "teal"} label={label} value={value} detail="Open role workspace" trend="→" onClick={() => onNavigate(target as View)} />)}</section><section className="grid"><Activity onNotify={onNotify} /><Appointments onNotify={onNotify} /></section><section className="grid lower"><PatientPanel patients={patients} onNavigate={onNavigate} /><Tasks onNotify={onNotify} /></section></div>;
}

function DashboardPlan({ items, onNotify }: { items: string[]; onNotify: (message: string) => void }) {
  return <section className="dashboard-plan"><div><span className="summary-label">DASHBOARD PLAN</span><strong>Today's focus</strong><p>Complete these role-specific workflows from one place.</p></div><div className="plan-items">{items.map((item) => <button key={item} onClick={() => onNotify(`${item} workflow opened.`)}><span>✓</span>{item}<b>→</b></button>)}</div></section>;
}

function PatientDashboard({ user, onNavigate, onNotify }: { user: User; onNavigate: (v: View) => void; onNotify: (m: string) => void }) {
  const services = [["▣", "General consultation", "Speak with a qualified healthcare professional.", "Appointments"], ["⌂", "Home visit", "Get care in the comfort of your home.", "Home visits"], ["⌁", "Lab investigations", "View and manage your investigation requests.", "Reports"], ["◒", "Follow-up care", "Keep track of your care plan and next steps.", "Reports"]];
  return <div className="page"><section className="welcome"><div><p className="eyebrow">{formatCurrentDate()} · PATIENT PORTAL</p><h1>Hello, {user.name.split(" ")[0]} <span>✦</span></h1><p className="muted">Access your care, book services, and stay connected with your healthcare team.</p></div><button className="primary" onClick={() => onNavigate("Appointments")}>＋ Book an appointment</button></section><section className="patient-summary"><div><span className="summary-label">YOUR CARE STATUS</span><strong>Good continuity of care</strong><p>Your next follow-up is on 20 November 2026.</p></div><button className="outline" onClick={() => onNotify("Your care plan opened.")}>View care plan</button></section><DashboardPlan items={["Book a consultation or home visit", "Review your care plan and follow-up date", "View investigation results", "Contact support when you need help"]} onNotify={onNotify} /><div className="section-title"><div><h2>Services available to you</h2><p className="muted">Choose the care you need from GBL Mobile Health Services.</p></div></div><section className="service-grid">{services.map(([icon, title, description, target]) => <button className="service-card" key={title} onClick={() => { onNotify(`${title} selected.`); onNavigate(target as View); }}><span className="service-icon">{icon}</span><strong>{title}</strong><p>{description}</p><span className="service-link">Explore service →</span></button>)}</section><section className="grid patient-lower"><article className="panel"><div className="panel-heading"><div><h2>Upcoming care</h2><p className="muted">Your next appointments and visits</p></div><button className="link" onClick={() => onNavigate("Appointments")}>View all →</button></div><div className="patient-appointment"><span className="date-box">20<br /><small>NOV</small></span><div><strong>Follow-up consultation</strong><small>Dr. Miriam Nansubuga · 10:30</small></div><span className="status stable">Confirmed</span></div></article><article className="panel"><div className="panel-heading"><div><h2>Quick support</h2><p className="muted">We are here to help</p></div></div><button className="support-action" onClick={() => onNotify("Support centre opened.")}>? Contact support <span>→</span></button><button className="support-action" onClick={() => onNotify("Emergency guidance opened.")}>＋ Emergency guidance <span>→</span></button></article></section></div>;
}

function Overview({ user, onRegister, onNavigate, patients, onNotify }: { user: User; onRegister: () => void; onNavigate: (v: View) => void; patients: Patient[]; onNotify: (m: string) => void }) {
  const canRegister = user.allowed.includes("Patients");
  return <div className="page"><section className="welcome"><div><p className="eyebrow">{formatCurrentDate()} · {user.role.toUpperCase()}</p><h1>Good morning, {user.name.split(" ")[1] ?? user.name} <span>✦</span></h1><p className="muted">Here’s what’s happening across your healthcare service today.</p></div>{canRegister && <button className="primary" onClick={onRegister}>＋ Register patient</button>}</section>
    <section className="stats"><Stat icon="♙" tone="teal" label="Registered patients" value="1,248" detail="vs. 1,110 last month" trend="↗ 12.4%" onClick={() => onNavigate("Patients")} /><Stat icon="▣" tone="purple" label="Consultations" value="86" detail="this month" trend="↗ 8.2%" onClick={() => onNavigate("Appointments")} /><Stat icon="⌂" tone="orange" label="Home visits" value="14" detail="5 visits still pending" trend="Today" onClick={() => onNavigate("Home visits")} /><Stat icon="◒" tone="blue" label="Follow-up completion" value="92.4%" detail="excellent patient continuity" trend="↗ 4.7%" onClick={() => onNavigate("Reports")} /></section>
    <section className="grid"><Activity onNotify={onNotify} /><Appointments onNotify={onNotify} /></section>
    <section className="grid lower"><PatientPanel patients={patients} onNavigate={onNavigate} /><Tasks onNotify={onNotify} /></section>
  </div>;
}
function Stat({ icon, tone, label, value, detail, trend, onClick }: { icon: string; tone: string; label: string; value: string; detail: string; trend: string; onClick: () => void }) { return <article className="stat clickable" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}><div className="stat-head"><span className={`stat-icon ${tone}`}>{icon}</span><span className={`trend ${trend === "Today" ? "neutral" : ""}`}>{trend}</span></div><p>{label}</p><strong>{value}</strong><small>{detail}</small><span className="card-link">Open workspace →</span></article>; }
function Activity({ onNotify }: { onNotify: (m: string) => void }) { return <article className="panel activity clickable-panel" onClick={() => onNotify("Service activity details opened.")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onNotify("Service activity details opened.")}><div className="panel-heading"><div><h2>Service activity</h2><p className="muted">Patient care delivered over the last 7 days</p></div><select onClick={(e) => e.stopPropagation()} onChange={(e) => onNotify(`Showing ${e.target.value.toLowerCase()} of service activity.`)}><option>Last 7 days</option><option>Last 30 days</option></select></div><div className="chart"><div className="y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="plot"><div className="grid-lines">{[1, 2, 3, 4, 5].map((n) => <i key={n} />)}</div><svg viewBox="0 0 640 220" preserveAspectRatio="none"><path className="area" d="M0,170 C35,175 45,120 85,143 S125,110 165,125 S205,95 245,116 S285,44 325,85 S365,90 405,102 S445,67 485,85 S525,42 565,73 S605,30 640,49 L640,220 L0,220Z" /><path className="line" d="M0,170 C35,175 45,120 85,143 S125,110 165,125 S205,95 245,116 S285,44 325,85 S365,90 405,102 S445,67 485,85 S525,42 565,73 S605,30 640,49" /></svg><div className="x-axis">{["10 Nov", "11 Nov", "12 Nov", "13 Nov", "14 Nov", "15 Nov", "16 Nov"].map((x) => <span key={x}>{x}</span>)}</div></div></div><div className="legend"><span>● Consultations <b>86</b></span><span>● Home visits <b>42</b></span><span>● Follow-ups <b>64</b></span></div></article>; }
function Appointments({ onNotify }: { onNotify: (m: string) => void }) { const list = [["09:00", "Mary Atim", "General consultation", ""], ["10:30", "John Ouma", "Follow-up review", "purple"], ["12:00", "Grace Namuli", "Home visit", "orange"], ["14:30", "Peter Okello", "General consultation", ""]]; return <article className="panel"><div className="panel-heading"><div><h2>Upcoming appointments</h2><p className="muted">Your schedule for today</p></div><button className="link" onClick={() => onNotify("Calendar workspace opened.")}>View calendar →</button></div><div className="appointment-list">{list.map(([time, name, type, color]) => <button className="appointment clickable-row" key={time} onClick={() => onNotify(`${name}'s appointment details opened.`)}><span className="time">{time}</span><i className={`apt-line ${color}`} /><div><strong>{name}</strong><small>{type}</small></div><span className={`apt-status ${time === "12:00" ? "pending" : ""}`}>{time === "12:00" ? "Pending" : "Confirmed"}</span></button>)}</div><button className="outline" onClick={() => onNotify("Appointment booking form is ready.")}>＋ Add appointment</button></article>; }
function PatientPanel({ patients, onNavigate }: { patients: Patient[]; onNavigate: (v: View) => void }) { return <article className="panel patients"><div className="panel-heading"><div><h2>Recent patients</h2><p className="muted">Latest patient activity</p></div><button className="link" onClick={() => onNavigate("Patients")}>View all →</button></div><div className="table-wrap"><table><thead><tr><th>Patient</th><th>Patient ID</th><th>Last visit</th><th>Care status</th></tr></thead><tbody>{patients.map((p) => <tr className="clickable-row" key={p.id} onClick={() => onNavigate("Patients")}><td><div className="patient-name"><div className={`avatar ${p.tone}`}>{p.initials}</div>{p.name}</div></td><td className="muted">{p.id}</td><td>{p.visit}</td><td><span className={`status ${p.status === "Stable" ? "stable" : p.status === "Follow-up" ? "follow" : "pending"}`}>{p.status}</span></td></tr>)}</tbody></table></div></article>; }
function Tasks({ onNotify }: { onNotify: (m: string) => void }) { return <article className="panel tasks"><div className="panel-heading"><div><h2>Tasks to review</h2><p className="muted">Items that need your attention</p></div><span className="task-total">6 open</span></div>{[["Review lab results", "3 results require clinical review", "High"], ["Complete referral feedback", "2 referrals awaiting response", "Medium"], ["Follow-up appointments", "1 patient missed their review", "Low"]].map(([title, detail, priority]) => <label className="task" key={title}><input type="checkbox" onChange={() => onNotify(`${title} marked complete.`)} /><span><b>{title}</b><small>{detail}</small></span><em className={priority.toLowerCase()}>{priority}</em></label>)}<button className="link" onClick={() => onNotify("All tasks opened.")}>View all tasks →</button></article>; }
function Workspace({ view, onRegister, onNotify }: { view: View; onRegister: () => void; onNotify: (m: string) => void }) { const copy: Record<View, [string, string, string]> = { Services: ["Healthcare services", "Explore consultations, home visits, investigations, and follow-up care.", "Book service"], Patients: ["Patient directory", "Manage registrations, clinical records and care status.", "Register patient"], Appointments: ["Appointments", "Plan consultations, reviews and reminders.", "Book appointment"], "Home visits": ["Home visits", "Coordinate field teams and follow-up care.", "Schedule visit"], Investigations: ["Investigations", "Review lab results and clinical attachments.", "Upload result"], Referrals: ["Referrals", "Track referrals and feedback across providers.", "Create referral"], Billing: ["Billing", "Manage corporate accounts, invoices and payments.", "Create invoice"], Reports: ["Reports", "Monitor service delivery and export operational reports.", "Build report"], Overview: ["Overview", "", ""] }; const [title, subtitle, action] = copy[view]; return <div className="page workspace"><div className="workspace-hero"><div><p className="eyebrow">GBL WORKSPACE</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><button className="primary" onClick={view === "Patients" ? onRegister : () => onNotify(`${action} flow is ready.`)}>＋ {action}</button></div><div className="workspace-cards"><article className="panel empty clickable-panel" onClick={() => onNotify(`${title} records opened.`)} role="button" tabIndex={0}><div className="empty-icon">{nav.find((n) => n.label === view)?.icon}</div><h2>{title} module</h2><p>Connect this workspace to the Django REST API to load live records. The screen is ready for permissions, pagination, and offline sync.</p><button className="outline" onClick={(e) => { e.stopPropagation(); onNotify("Demo data is already available on the overview."); }}>Explore demo data</button></article><article className="panel checklist"><h2>Implementation checklist</h2>{["Role and object permissions", "Offline cache and sync queue", "Audit history and activity log", "Responsive mobile workflow"].map((item) => <label key={item}><input type="checkbox" onChange={(e) => onNotify(`${item} ${e.target.checked ? "marked complete" : "reopened"}.`)} />{item}</label>)}</article></div></div>; }
function PatientModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) { const [name, setName] = useState(""); return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}><div className="modal-head"><div><p className="eyebrow">PATIENT REGISTRY</p><h2>Register a patient</h2></div><button type="button" className="close" onClick={onClose}>×</button></div><label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Namusoke" /></label><div className="form-grid"><label>Date of birth<input type="date" /></label><label>Phone number<input type="tel" placeholder="+256 700 000 000" /></label></div><label>Care notes<textarea placeholder="Optional notes for the clinical team" /></label><div className="modal-actions"><button type="button" className="outline" onClick={onClose}>Cancel</button><button className="primary">Save patient</button></div></form></div>; }

export default App;
