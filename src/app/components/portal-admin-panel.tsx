/**
 * Portal Admin Panel — app-style fixed layout
 * Title bar · sidebar · scrollable data grid · status bar
 */
import { useState, useMemo, useRef } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Users, Search, UserCheck, UserX, ChevronDown, ChevronUp,
  Building2, Store, ShoppingBag, X, CheckCircle2,
  AlertCircle, Shield, LogOut, Package, SlidersHorizontal,
  ArrowUpDown, Circle, Minus, Maximize2,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Customer, Staff, CustomerType } from "@/app/types";
import { toast } from "sonner";

// ─── Palette ──────────────────────────────────────────────────────────────────
// App uses a dark titlebar + light-neutral body (Windows 11 Fluent / Figma-like)
const APP_BG   = "bg-[#f3f3f5]";
const SIDEBAR_BG = "bg-white";
const PANEL_BG   = "bg-white";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}
const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
];
function avatarGradient(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const TYPE_CFG: Record<CustomerType, {
  label: string; dot: string; chip: string; Icon: React.ElementType;
}> = {
  wholesaler: { label: "Wholesale", dot: "bg-blue-500",   chip: "bg-blue-50 text-blue-700 ring-blue-200",   Icon: Building2  },
  trader:     { label: "Trader",    dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200", Icon: Store      },
  retailer:   { label: "Retail",    dot: "bg-emerald-500",chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: ShoppingBag},
};

const ROLE_COLOR: Record<string, string> = {
  admin:     "text-red-600",
  manager:   "text-purple-600",
  cashier:   "text-blue-600",
  inventory: "text-amber-600",
};

// ─── Mini avatar ──────────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-10 h-10 text-xs" : "w-8 h-8 text-[10px]";
  return (
    <div className={cn("rounded-lg flex items-center justify-center text-white font-bold shrink-0 bg-gradient-to-br", sz, avatarGradient(name))}>
      {initials(name)}
    </div>
  );
}

// ─── Workload bar ─────────────────────────────────────────────────────────────
function MiniBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500",
          pct > 75 ? "bg-red-400" : pct > 45 ? "bg-amber-400" : "bg-emerald-400"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Staff assign dropdown ────────────────────────────────────────────────────
function AssignDropdown({ customerId, currentStaffId, allStaff, onAssign }: {
  customerId: string;
  currentStaffId: string | undefined;
  allStaff: Staff[];
  onAssign: (staffId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const current = allStaff.find(s => s.id === currentStaffId);
  const hits = allStaff.filter(s => s.status === "active" && (!q || s.name.toLowerCase().includes(q.toLowerCase())));

  const close = () => { setOpen(false); setQ(""); };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition-all w-full max-w-[180px] min-w-[130px]",
          current
            ? "bg-white border-gray-200 hover:border-blue-400 text-gray-700"
            : "bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-700"
        )}
      >
        {current
          ? <><Avatar name={current.name} size="sm" /><span className="flex-1 truncate text-left">{current.name}</span></>
          : <><UserX className="w-3 h-3 shrink-0" /><span className="flex-1 text-left">Unassigned</span></>
        }
        <ChevronDown className={cn("w-3 h-3 shrink-0 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute z-50 top-full mt-1 right-0 w-52 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-1.5 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-7 pl-6 pr-2 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-blue-400" />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {/* Remove */}
              <button onClick={() => { onAssign(null); close(); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-left">
                <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                  <UserX className="w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs font-medium text-red-500">Remove assignment</span>
              </button>
              <div className="h-px bg-gray-100 mx-2" />

              {hits.map(s => (
                <button key={s.id} onClick={() => { onAssign(s.id); close(); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left", s.id === currentStaffId && "bg-blue-50")}>
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className={cn("text-[9px] capitalize font-medium", ROLE_COLOR[s.role] ?? "text-gray-400")}>{s.role}</p>
                  </div>
                  {s.id === currentStaffId && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
                </button>
              ))}
              {hits.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No match</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function PortalAdminPanel({ adminStaff, onLogout }: {
  adminStaff: Staff;
  onLogout: () => void;
}) {
  const { customers, staff, staffAssignments, setStaffAssignment, customerOrders } = usePOS();

  const [search, setSearch]   = useState("");
  const [typeF, setTypeF]     = useState<"all" | CustomerType>("all");
  const [assignF, setAssignF] = useState<"all" | "assigned" | "unassigned">("all");
  const [sortCol, setSortCol] = useState<"name" | "type" | "assigned">("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [staffF, setStaffF]   = useState<string>("all");
  const [bulkStaff, setBulkStaff] = useState("");

  const activeStaff = useMemo(() => staff.filter(s => s.status === "active"), [staff]);

  const workload = useMemo(() => {
    const m: Record<string, number> = {};
    activeStaff.forEach(s => { m[s.id] = 0; });
    Object.values(staffAssignments).forEach(sid => { if (sid && m[sid] !== undefined) m[sid]++; });
    return m;
  }, [staffAssignments, activeStaff]);
  const maxLoad = Math.max(1, ...Object.values(workload));

  const unassignedCount = useMemo(() => customers.filter(c => !staffAssignments[c.id]).length, [customers, staffAssignments]);
  const assignedCount   = customers.length - unassignedCount;

  const sortToggle = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortCol(col); setSortDir(1); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col
      ? (sortDir === 1 ? <ChevronDown className="w-3 h-3 text-blue-500" /> : <ChevronUp className="w-3 h-3 text-blue-500" />)
      : <ArrowUpDown className="w-3 h-3 text-gray-300" />;

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone.includes(q)); }
    if (typeF !== "all")          list = list.filter(c => c.type === typeF);
    if (assignF === "assigned")   list = list.filter(c => !!staffAssignments[c.id]);
    if (assignF === "unassigned") list = list.filter(c => !staffAssignments[c.id]);
    if (staffF !== "all")         list = list.filter(c => staffAssignments[c.id] === staffF);

    list.sort((a, b) => {
      let v = 0;
      if (sortCol === "name")     v = a.name.localeCompare(b.name);
      if (sortCol === "type")     v = a.type.localeCompare(b.type);
      if (sortCol === "assigned") v = Number(!!staffAssignments[b.id]) - Number(!!staffAssignments[a.id]);
      return v * sortDir;
    });
    return list;
  }, [customers, search, typeF, assignF, staffF, sortCol, sortDir, staffAssignments]);

  const hasFilter = search || typeF !== "all" || assignF !== "all" || staffF !== "all";

  const handleAssign = (customerId: string, staffId: string | null, name: string) => {
    setStaffAssignment(customerId, staffId);
    const sName = staffId ? staff.find(s => s.id === staffId)?.name : null;
    toast.success(sName ? `${name} → ${sName}` : `${name} unassigned`);
  };

  const handleBulk = () => {
    if (!bulkStaff) return;
    const list = customers.filter(c => !staffAssignments[c.id]);
    if (list.length === 0) { toast.info("No unassigned customers"); return; }
    list.forEach(c => setStaffAssignment(c.id, bulkStaff));
    const sName = staff.find(s => s.id === bulkStaff)?.name ?? bulkStaff;
    toast.success(`${list.length} customers → ${sName}`);
    setBulkStaff("");
  };

  return (
    // ── App shell: h-screen, no overflow ──────────────────────────────────────
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ══ TITLE BAR ════════════════════════════════════════════════════════ */}
      <div className="h-11 shrink-0 bg-[#18181f] flex items-center px-4 gap-3 border-b border-white/[0.06]" style={{ WebkitAppRegion: "drag" } as any}>
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button onClick={onLogout} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff4444] transition-colors group flex items-center justify-center" title="Sign out">
            <X className="w-1.5 h-1.5 text-[#7a1800] opacity-0 group-hover:opacity-100" />
          </button>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* App icon + title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shrink-0">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-white/80 text-xs font-semibold tracking-tight truncate">BNM Parts · Admin</span>
          <span className="text-white/20 text-xs hidden sm:block">—</span>
          <span className="text-white/30 text-[11px] hidden sm:block truncate">Customer Assignment</span>
        </div>

        {/* Logged-in user */}
        <div className="flex items-center gap-2 shrink-0 bg-white/[0.06] rounded-lg px-2.5 py-1 border border-white/[0.08]" style={{ WebkitAppRegion: "no-drag" } as any}>
          <Avatar name={adminStaff.name} size="sm" />
          <div className="hidden sm:block">
            <p className="text-white/80 text-[11px] font-semibold leading-tight">{adminStaff.name.split(" ")[0]}</p>
            <p className={cn("text-[9px] capitalize font-medium leading-tight", ROLE_COLOR[adminStaff.role] ?? "text-white/40")}>{adminStaff.role}</p>
          </div>
          <button onClick={onLogout} className="w-5 h-5 rounded-md hover:bg-red-500/20 flex items-center justify-center transition-colors group" title="Sign out">
            <LogOut className="w-3 h-3 text-white/30 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
      <div className={cn("flex-1 flex overflow-hidden", APP_BG)}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className={cn("w-56 shrink-0 flex flex-col overflow-hidden border-r border-gray-200", SIDEBAR_BG)}>

          {/* Section: stats */}
          <div className="px-3 pt-4 pb-2 border-b border-gray-100">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-2">Overview</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Total",      value: customers.length,  color: "text-gray-800" },
                { label: "Active",     value: activeStaff.length, color: "text-purple-600" },
                { label: "Assigned",   value: assignedCount,     color: "text-emerald-600" },
                { label: "Unassigned", value: unassignedCount,   color: unassignedCount > 0 ? "text-amber-600" : "text-gray-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <p className={cn("text-lg font-black leading-none", color)}>{value}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: staff workload */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-1">Staff Workload</p>
            </div>

            {/* "All" reset */}
            <button onClick={() => { setStaffF("all"); setAssignF("all"); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2",
                staffF === "all" && assignF === "all" ? "border-blue-500 bg-blue-50/60 text-blue-700" : "border-transparent hover:bg-gray-50 text-gray-600"
              )}>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">All Staff</p>
                <MiniBar count={customers.length} max={customers.length} />
              </div>
              <span className="text-[10px] font-bold text-gray-400">{customers.length}</span>
            </button>

            {activeStaff.map(s => {
              const cnt = workload[s.id] ?? 0;
              const active = staffF === s.id;
              return (
                <button key={s.id} onClick={() => { setStaffF(active ? "all" : s.id); setAssignF("all"); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2",
                    active ? "border-purple-500 bg-purple-50/60" : "border-transparent hover:bg-gray-50"
                  )}>
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{s.name.split(" ")[0]}</p>
                      <span className={cn("text-[9px] font-bold capitalize", ROLE_COLOR[s.role] ?? "text-gray-400")}>{s.role.slice(0, 3)}</span>
                    </div>
                    <MiniBar count={cnt} max={maxLoad} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 w-4 text-right">{cnt}</span>
                </button>
              );
            })}

            {/* Unassigned row */}
            <button onClick={() => { setAssignF(assignF === "unassigned" ? "all" : "unassigned"); setStaffF("all"); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2",
                assignF === "unassigned" ? "border-amber-500 bg-amber-50/60" : "border-transparent hover:bg-gray-50"
              )}>
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <UserX className="w-3 h-3 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700">Unassigned</p>
                <MiniBar count={unassignedCount} max={maxLoad} />
              </div>
              <span className={cn("text-[10px] font-bold w-4 text-right", unassignedCount > 0 ? "text-amber-600" : "text-gray-400")}>{unassignedCount}</span>
            </button>
          </div>

          {/* Bulk assign footer */}
          {unassignedCount > 0 && (
            <div className="px-3 py-3 border-t border-amber-100 bg-amber-50/50 shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />Bulk Assign
              </p>
              <div className="flex gap-1">
                <select value={bulkStaff} onChange={e => setBulkStaff(e.target.value)}
                  className="flex-1 h-7 text-[11px] border border-amber-200 rounded-md bg-white px-1.5 outline-none min-w-0">
                  <option value="">Pick staff…</option>
                  {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name.split(" ")[0]}</option>)}
                </select>
                <button onClick={handleBulk} disabled={!bulkStaff}
                  className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Go
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* ── MAIN PANEL ───────────────────────────────────────────────────── */}
        <div className={cn("flex-1 flex flex-col overflow-hidden m-3 rounded-xl border border-gray-200 shadow-sm", PANEL_BG)}>

          {/* Toolbar */}
          <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-gray-100">
            {/* Search */}
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="w-full h-7 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-all" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Type */}
            <select value={typeF} onChange={e => setTypeF(e.target.value as any)}
              className="h-7 text-xs border border-gray-200 rounded-lg bg-gray-50 px-2 outline-none focus:border-blue-400">
              <option value="all">All types</option>
              <option value="wholesaler">Wholesale</option>
              <option value="trader">Trader</option>
              <option value="retailer">Retail</option>
            </select>

            {/* Status */}
            <select value={assignF} onChange={e => setAssignF(e.target.value as any)}
              className="h-7 text-xs border border-gray-200 rounded-lg bg-gray-50 px-2 outline-none focus:border-blue-400">
              <option value="all">All status</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>

            {/* Clear */}
            {hasFilter && (
              <button onClick={() => { setSearch(""); setTypeF("all"); setAssignF("all"); setStaffF("all"); }}
                className="h-7 px-2.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1">
                <X className="w-3 h-3" />Clear
              </button>
            )}

            <div className="flex-1" />

            {/* Result count */}
            <span className="text-[11px] text-gray-400">{filtered.length} of {customers.length}</span>

            {/* Filtered-by-staff indicator */}
            {staffF !== "all" && (
              <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2.5 h-7">
                <Avatar name={staff.find(s => s.id === staffF)?.name ?? "?"} size="sm" />
                <span className="text-[11px] font-semibold text-purple-700 truncate max-w-[80px]">{staff.find(s => s.id === staffF)?.name}</span>
                <button onClick={() => setStaffF("all")}><X className="w-3 h-3 text-purple-400 hover:text-purple-700" /></button>
              </div>
            )}
          </div>

          {/* Column headers */}
          <div className="h-8 shrink-0 flex items-center bg-gray-50 border-b border-gray-100 px-3 gap-3">
            <div className="w-8 shrink-0" />
            {/* Name */}
            <button onClick={() => sortToggle("name")}
              className="flex-1 min-w-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors text-left">
              Customer <SortIcon col="name" />
            </button>
            {/* Type */}
            <button onClick={() => sortToggle("type")}
              className="w-24 shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors">
              Type <SortIcon col="type" />
            </button>
            {/* Orders */}
            <div className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Orders</div>
            {/* Assigned staff */}
            <button onClick={() => sortToggle("assigned")}
              className="w-48 shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors">
              Assigned Staff <SortIcon col="assigned" />
            </button>
          </div>

          {/* Rows — only this div scrolls */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <Users className="w-12 h-12 opacity-30" />
                <p className="text-sm font-medium text-gray-400">No customers match</p>
                {hasFilter && (
                  <button onClick={() => { setSearch(""); setTypeF("all"); setAssignF("all"); setStaffF("all"); }}
                    className="text-xs text-blue-500 hover:text-blue-700 underline">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((c, i) => {
                  const cfg = TYPE_CFG[c.type];
                  const TypeIcon = cfg.Icon;
                  const totalOrders  = customerOrders.filter(o => o.customerId === c.id).length;
                  const activeOrders = customerOrders.filter(o => o.customerId === c.id && !["shipped","delivered","cancelled"].includes(o.status)).length;
                  const assigned = !!staffAssignments[c.id];

                  return (
                    <div key={c.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Row number */}
                      <div className="w-8 shrink-0 text-[10px] text-gray-300 text-right font-mono group-hover:text-gray-400">{i + 1}</div>

                      {/* Customer */}
                      <div className="flex-1 min-w-0 flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{c.name}</p>
                          {c.email && <p className="text-[10px] text-gray-400 truncate leading-tight">{c.email}</p>}
                        </div>
                      </div>

                      {/* Type */}
                      <div className="w-24 shrink-0">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ring-1", cfg.chip)}>
                          <TypeIcon className="w-2.5 h-2.5" />{cfg.label}
                        </span>
                      </div>

                      {/* Orders */}
                      <div className="w-16 shrink-0 flex items-center gap-1">
                        {activeOrders > 0 && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{activeOrders} active</span>
                        )}
                        {activeOrders === 0 && totalOrders > 0 && (
                          <span className="text-[10px] text-gray-400">{totalOrders}</span>
                        )}
                        {totalOrders === 0 && <span className="text-[10px] text-gray-300">—</span>}
                      </div>

                      {/* Assign dropdown */}
                      <div className="w-48 shrink-0">
                        <AssignDropdown
                          customerId={c.id}
                          currentStaffId={staffAssignments[c.id] || undefined}
                          allStaff={activeStaff}
                          onAssign={(staffId) => handleAssign(c.id, staffId, c.name)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── STATUS BAR ──────────────────────────────────────────────────── */}
          <div className="h-8 shrink-0 border-t border-gray-100 bg-gray-50/80 flex items-center px-3 gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-[11px] text-gray-400">{customers.length} customers</span>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />{assignedCount} assigned
              </span>
              {unassignedCount > 0 && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="flex items-center gap-1 text-[11px] text-amber-600">
                    <AlertCircle className="w-3 h-3" />{unassignedCount} unassigned
                  </span>
                </>
              )}
            </div>

            {/* Active filters summary */}
            {hasFilter && (
              <span className="text-[10px] text-blue-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />Filtered · {filtered.length} shown
              </span>
            )}

            {/* Staff breakdown */}
            <div className="hidden md:flex items-center gap-1">
              {activeStaff.slice(0, 5).map(s => (
                <button key={s.id} onClick={() => setStaffF(staffF === s.id ? "all" : s.id)}
                  title={`${s.name} (${workload[s.id] ?? 0})`}
                  className={cn("w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold transition-all",
                    `bg-gradient-to-br ${avatarGradient(s.name)}`,
                    staffF === s.id ? "ring-2 ring-blue-400 scale-110" : "opacity-70 hover:opacity-100"
                  )}>
                  {initials(s.name)[0]}
                </button>
              ))}
            </div>

            {/* BNM badge */}
            <div className="flex items-center gap-1 text-[10px] text-gray-300">
              <Package className="w-3 h-3" />BNM Parts Admin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
