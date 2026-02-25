/**
 * Unified Portal — /portal
 *
 * Single login screen for staff, customers, AND admins.
 * • Customer  → full shopping portal
 * • Staff     → order fulfilment dashboard
 * • Admin     → customer ↔ staff assignment panel (managers/admins only)
 */
import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Package, Users, User, LogIn, ArrowLeft, Mail,
  Eye, EyeOff, Building2, Store, ShoppingBag, Info,
  ChevronRight, AlertCircle, Sparkles,
  ShieldCheck, CheckCircle2, Shield,
  UserCog, Layers, LayoutDashboard, ArrowRight,
  LayoutGrid, ClipboardList, CircleUser, ShoppingCart
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Link } from "react-router";
import { CustomerPortal } from "@/app/components/customer-portal";
import { StaffPortal } from "@/app/components/staff-portal";
import { PortalAdminPanel } from "@/app/components/portal-admin-panel";
import { Customer, Staff } from "@/app/types";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEMO_PASSWORD = "1234";

function getCustomerPin(c: Customer) {
  return c.phone.replace(/\D/g, "").slice(-4);
}

function getUsername(item: Customer | Staff): string {
  // Generate username from email (part before @)
  const email = 'email' in item ? item.email : '';
  return email ? email.split('@')[0] : '';
}

type RoleMode = "customer" | "staff" | "admin";
type AuthState =
  | { role: "customer"; data: Customer }
  | { role: "staff";    data: Staff }
  | { role: "admin";    data: Staff }
  | null;

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

// ─── PIN dots ──────────────────────────────────────────────────────────────────
function PinDots({ value, accent }: { value: string; accent: string }) {
  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={cn(
          "w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-150",
          value.length > i
            ? `border-${accent}-400 bg-${accent}-500/10`
            : "border-white/20 bg-white/5"
        )}>
          {value.length > i && (
            <div className={cn("w-3 h-3 rounded-full", `bg-${accent}-400`)} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Numpad ────────────────────────────────────────────────────────────────────
function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const onKey = (k: string) => {
    if (k === "⌫") onChange(value.slice(0, -1));
    else if (value.length < 4) onChange(value + k);
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button key={i} onClick={() => k && onKey(k)}
          className={cn(
            "h-11 rounded-xl font-semibold text-lg text-white transition-all duration-100 active:scale-95",
            k ? "bg-white/10 hover:bg-white/20" : "pointer-events-none",
            k === "⌫" && "text-red-300 hover:bg-red-500/20"
          )}>
          {k}
        </button>
      ))}
    </div>
  );
}

// ─── Role card ─────────────────────────────────────────────────────────────────
const ROLE_META: Record<RoleMode, {
  label: string; desc: string;
  gradient: string; iconBg: string; checkColor: string;
  Icon: React.ElementType;
}> = {
  customer: {
    label: "Customer",
    desc: "Browse products, place orders & track deliveries",
    gradient: "border-blue-400 bg-blue-500/10 shadow-blue-500/20",
    iconBg: "from-blue-500 to-indigo-600 shadow-blue-500/30",
    checkColor: "text-blue-400 bg-blue-500/20",
    Icon: User,
  },
  staff: {
    label: "Staff Member",
    desc: "Manage & fulfil orders for your assigned customers",
    gradient: "border-orange-400 bg-orange-500/10 shadow-orange-500/20",
    iconBg: "from-orange-500 to-amber-600 shadow-orange-500/30",
    checkColor: "text-orange-400 bg-orange-500/20",
    Icon: Users,
  },
  admin: {
    label: "Admin",
    desc: "Assign customers to staff & manage the whole team",
    gradient: "border-purple-400 bg-purple-500/10 shadow-purple-500/20",
    iconBg: "from-purple-600 to-indigo-700 shadow-purple-500/30",
    checkColor: "text-purple-400 bg-purple-500/20",
    Icon: Shield,
  },
};

function RoleCard({ role, selected, onClick }: { role: RoleMode; selected: boolean; onClick: () => void }) {
  const m = ROLE_META[role];
  const Icon = m.Icon;
  return (
    <button onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 w-full",
        selected ? `${m.gradient} shadow-lg` : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br", m.iconBg)}>
        <Icon className="w-6 h-6 text-white" />
        {selected && <CheckCircle2 className="absolute -top-2 -right-2 w-5 h-5 text-white bg-emerald-500 rounded-full" />}
      </div>
      <h3 className="font-bold text-white text-sm mb-0.5">{m.label}</h3>
      <p className="text-[10px] text-white/45 leading-relaxed">{m.desc}</p>
      {selected && (
        <span className={cn("mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full", m.checkColor)}>
          Selected
        </span>
      )}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function UnifiedPortal() {
  const { staff, customers } = usePOS();

  const [auth, setAuth]   = useState<AuthState>(null);
  const [step, setStep]   = useState<"role" | "form">("role");
  const [role, setRole]   = useState<RoleMode>("customer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectRole = (r: RoleMode) => { setRole(r); setStep("form"); setError(""); setUsername(""); setPassword(""); };
  const goBack     = () => { setStep("role"); setError(""); setUsername(""); setPassword(""); };

  // Demo accounts
  const staffDemos   = useMemo(() => staff.filter(s => s.status === "active").slice(0, 3), [staff]);
  const adminDemos   = useMemo(() => staff.filter(s => s.status === "active" && (s.role === "admin" || s.role === "manager")).slice(0, 3), [staff]);
  const customerDemos = useMemo(() => customers.filter(c => c.email).slice(0, 3), [customers]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      if (role === "customer") {
        const c = customers.find(x => x.email?.toLowerCase() === username.toLowerCase().trim());
        if (!c) { setError("No customer account found with that email."); setLoading(false); return; }
        if (password !== getCustomerPin(c)) { setError("Incorrect PIN. Use the last 4 digits of your registered phone number."); setLoading(false); return; }
        setAuth({ role: "customer", data: c });
        toast.success(`Welcome back, ${c.name.split(" ")[0]}! 👋`);
      } else if (role === "staff") {
        const member = staff.find(s => s.email.toLowerCase() === username.toLowerCase().trim() && s.status === "active");
        if (!member) { setError("Email not found or account inactive."); setLoading(false); return; }
        if (password !== DEMO_PASSWORD) { setError("Incorrect PIN. All staff use PIN: 1234 (demo)."); setLoading(false); return; }
        setAuth({ role: "staff", data: member });
        toast.success(`Welcome back, ${member.name.split(" ")[0]}! 👋`);
      } else {
        // Admin — must be manager or admin role
        const member = staff.find(s => s.email.toLowerCase() === username.toLowerCase().trim() && s.status === "active");
        if (!member) { setError("Email not found or account inactive."); setLoading(false); return; }
        if (member.role !== "admin" && member.role !== "manager") {
          setError("Admin access requires manager or admin role."); setLoading(false); return;
        }
        if (password !== DEMO_PASSWORD) { setError("Incorrect PIN. All staff use PIN: 1234 (demo)."); setLoading(false); return; }
        setAuth({ role: "admin", data: member });
        toast.success(`Admin panel ready — welcome, ${member.name.split(" ")[0]}!`);
      }
      setLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setAuth(null); setStep("role"); setUsername(""); setPassword(""); setError("");
  };

  // ── Render authenticated portals ──────────────────────────────────────────
  if (auth?.role === "staff")    return <StaffPortal    initialStaff={auth.data}      onLogout={handleLogout} />;
  if (auth?.role === "customer") return <CustomerPortal initialCustomer={auth.data}   onLogout={handleLogout} />;
  if (auth?.role === "admin")    return <PortalAdminPanel adminStaff={auth.data}       onLogout={handleLogout} />;

  // ── Login UI ──────────────────────────────────────────────────────────────
  const m = ROLE_META[role];
  const accentMap: Record<RoleMode, string> = { customer: "blue", staff: "orange", admin: "purple" };
  const accent = accentMap[role];

  // Colors for the sign-in button
  const btnGradient: Record<RoleMode, string> = {
    customer: "from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20",
    staff:    "from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-orange-500/20",
    admin:    "from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-purple-500/20",
  };

  const demosToShow = role === "customer" ? customerDemos : role === "admin" ? adminDemos : staffDemos;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">

      {/* ── Left brand panel (hidden on mobile for app-like feel) ──────────────────────────────────────────────── */}
      <div className="hidden xl:flex flex-col justify-between w-[420px] shrink-0 relative overflow-hidden p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="absolute top-1/4 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2" />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-xl">BNM Parts</h1>
              <p className="text-blue-400 text-xs">www.bnmparts.com</p>
            </div>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Portal Hub</span>
          </h2>
          <p className="text-blue-200/60 text-sm leading-relaxed">
            One login. Three experiences. Customers shop, staff fulfil, and admins keep the team running — all from a single URL.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 space-y-3">
          {[
            { Icon: User,    label: "Customer Shopping",        desc: "Browse, cart & checkout" },
            { Icon: Users,   label: "Staff Order Management",   desc: "Process & dispatch orders" },
            { Icon: Shield,  label: "Admin Assignment Control", desc: "Assign staff to customers live" },
            { Icon: ShieldCheck, label: "Role-based Access",    desc: "Everyone sees only their data" },
          ].map(({ Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-[11px] text-blue-300/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-white/20 text-xs">© 2026 BNM Parts · info@bnmparts.com</p>
      </div>

      {/* ── Right login panel — Mobile App Style ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-transparent to-gray-900/50" />
        
        <div className="relative w-full max-w-md">

          {/* Mobile App Container with rounded edges */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            
            {/* Status bar simulation (mobile app style) */}
            <div className="bg-gray-950/50 px-6 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm">BNM Portal</span>
              </div>
              <Link to="/">
                <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
                  <LayoutDashboard className="w-4 h-4 text-white/60" />
                </button>
              </Link>
            </div>

            {/* Main content area */}
            <div className="p-6">

              {/* ══ STEP 1: Role selection ══ */}
              {step === "role" && (
                <div className="space-y-6">
                  {/* Welcome header */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-4">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-blue-300 font-semibold">Select Your Role</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Welcome Back</h2>
                    <p className="text-white/50 text-sm">Sign in to continue</p>
                  </div>

                  {/* 3 role cards - Stacked vertically for mobile app feel */}
                  <div className="space-y-3">
                    {(["customer", "staff", "admin"] as RoleMode[]).map((r) => {
                      const m = ROLE_META[r];
                      const Icon = m.Icon;
                      return (
                        <button
                          key={r}
                          onClick={() => selectRole(r)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 group hover:scale-[1.02]",
                            "bg-white/5 border-white/10 hover:border-white/20 active:scale-[0.98]"
                          )}
                        >
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0", m.iconBg)}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-white text-sm mb-0.5">{m.label}</h3>
                            <p className="text-[11px] text-white/50 leading-snug">{m.desc}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Demo accounts divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs font-medium">Quick Access</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Demo quick-fill buttons */}
                  <div className="space-y-2">
                    {staffDemos.slice(0, 1).map(s => (
                      <button key={s.id}
                        onClick={() => { selectRole("staff"); setUsername(s.email); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                          <p className="text-xs text-white/40 truncate">Staff · PIN: 1234</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                    {adminDemos.slice(0, 1).map(s => (
                      <button key={s.id}
                        onClick={() => { selectRole("admin"); setUsername(s.email); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                          <p className="text-xs text-white/40 truncate">Admin · PIN: 1234</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                    {customerDemos.slice(0, 1).map(c => (
                      <button key={c.id}
                        onClick={() => { selectRole("customer"); setUsername(c.email || ""); setPassword(getCustomerPin(c)); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                          <p className="text-xs text-white/40 truncate">Customer · PIN: {getCustomerPin(c)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ STEP 2: Login form ══ */}
              {step === "form" && (
                <div>
                  {/* Back + role indicator */}
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={goBack}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
                      <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className={cn(
                      "flex-1 flex items-center justify-between px-3 py-2 rounded-xl border",
                      role === "customer" ? "bg-blue-500/10 border-blue-500/20" :
                      role === "staff"    ? "bg-orange-500/10 border-orange-500/20" :
                                           "bg-purple-500/10 border-purple-500/20"
                    )}>
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = m.Icon; return <Icon className={cn("w-4 h-4", role === "customer" ? "text-blue-400" : role === "staff" ? "text-orange-400" : "text-purple-400")} />; })()}
                        <span className={cn("text-sm font-semibold", role === "customer" ? "text-blue-300" : role === "staff" ? "text-orange-300" : "text-purple-300")}>
                          {role === "admin" ? "Admin Sign In" : `${m.label} Sign In`}
                        </span>
                      </div>
                      <button onClick={goBack} className="text-white/30 hover:text-white/60 text-xs underline">Change</button>
                    </div>
                  </div>

                  {/* Admin info note */}
                  {role === "admin" && (
                    <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-4">
                      <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-300">Admin access requires <strong>manager</strong> or <strong>admin</strong> role. You'll be taken directly to the customer assignment panel.</p>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Username/Email */}
                  <div className="mb-4">
                    <label className={cn("block text-xs font-semibold mb-1.5",
                      role === "customer" ? "text-blue-300/80" : role === "staff" ? "text-orange-300/80" : "text-purple-300/80"
                    )}>
                      {role === "customer" ? "Email or Username" : "Email Address"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && username && password && handleLogin()}
                        placeholder={role === "customer" ? "your@email.com" : "name@bnmparts.com"}
                        className={cn(
                          "w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border text-white placeholder-white/25 text-sm outline-none transition-all",
                          role === "customer" ? "border-white/10 focus:border-blue-400/60" :
                          role === "staff"    ? "border-white/10 focus:border-orange-400/60" :
                                               "border-white/10 focus:border-purple-400/60"
                        )}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mb-5">
                    <label className={cn("block text-xs font-semibold mb-1.5",
                      role === "customer" ? "text-blue-300/80" : role === "staff" ? "text-orange-300/80" : "text-purple-300/80"
                    )}>
                      Password
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && username && password && handleLogin()}
                        placeholder="Enter your password"
                        className={cn(
                          "w-full h-11 pl-10 pr-11 rounded-xl bg-white/5 border text-white placeholder-white/25 text-sm outline-none transition-all",
                          role === "customer" ? "border-white/10 focus:border-blue-400/60" :
                          role === "staff"    ? "border-white/10 focus:border-orange-400/60" :
                                               "border-white/10 focus:border-purple-400/60"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-white/30">
                      {role === "customer" 
                        ? "Use last 4 digits of your phone number" 
                        : "Demo password: 1234"}
                    </p>
                  </div>

                  {/* Sign in button */}
                  <button
                    onClick={handleLogin}
                    disabled={!username || !password || loading}
                    className={cn(
                      "w-full h-12 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all shadow-lg bg-gradient-to-r disabled:opacity-40 disabled:cursor-not-allowed",
                      btnGradient[role]
                    )}
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                      : <><LogIn className="w-4 h-4" />
                        {role === "admin" ? "Open Admin Panel" : role === "staff" ? "Enter Staff Portal" : "Enter My Account"}
                      </>
                    }
                  </button>

                  {/* Demo hint */}
                  <div className={cn("mt-4 p-3 rounded-xl border",
                    role === "customer" ? "bg-blue-500/5 border-blue-500/15" :
                    role === "staff"    ? "bg-orange-500/5 border-orange-500/15" :
                                         "bg-purple-500/5 border-purple-500/15"
                  )}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5",
                      role === "customer" ? "text-blue-400" : role === "staff" ? "text-orange-400" : "text-purple-400"
                    )}>Demo Accounts</p>
                    <div className="space-y-1">
                      {demosToShow.map((item: any) => (
                        <button key={item.id}
                          onClick={() => {
                            setUsername(item.email || "");
                            if (role === "customer") setPassword(getCustomerPin(item as Customer));
                          }}
                          className="w-full flex items-center justify-between hover:bg-white/5 px-2 py-1 rounded-lg transition-colors text-left"
                        >
                          <span className="text-xs text-white/50 truncate">{item.email}</span>
                          <span className={cn("text-[10px] font-bold ml-2 shrink-0",
                            role === "customer" ? "text-blue-400" : role === "staff" ? "text-orange-400" : "text-purple-400"
                          )}>
                            {role === "customer" ? `PIN: ${getCustomerPin(item as Customer)}` : "PIN: 1234"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation Bar (Mobile App Style) */}
            <div className="bg-white/5 backdrop-blur-xl border-t border-white/10 px-6 py-3">
              <div className="flex items-center justify-between gap-2 relative">
                {/* Shop */}
                <button className="flex flex-col items-center gap-1.5 flex-1 group relative">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                    <LayoutGrid className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-blue-400">Shop</span>
                  {/* Active indicator */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-t-full" />
                </button>
                
                {/* My Orders */}
                <button className="flex flex-col items-center gap-1.5 flex-1 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <ClipboardList className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                  </div>
                  <span className="text-xs font-medium text-white/40 group-hover:text-white/60">My Orders</span>
                </button>
                
                {/* Account */}
                <button className="flex flex-col items-center gap-1.5 flex-1 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <CircleUser className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                  </div>
                  <span className="text-xs font-medium text-white/40 group-hover:text-white/60">Account</span>
                </button>
                
                {/* Cart */}
                <button className="flex flex-col items-center gap-1.5 flex-1 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                    <ShoppingCart className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                  </div>
                  <span className="text-xs font-medium text-white/40 group-hover:text-white/60">Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}