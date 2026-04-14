import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const MONO = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const SERIF = "'Playfair Display','Georgia',serif";
const SANS = "'DM Sans','Helvetica Neue','Segoe UI',sans-serif";
const GOLD = "#c8a44e";
const GOLD_DIM = "rgba(200,164,78,0.15)";
const BG = "#0c0b09";
const SURFACE = "#141310";
const BORDER = "#1f1d18";
const TEXT = "#a89e8c";
const TEXT_DIM = "#5a5347";
const WHITE = "#e8e0d0";
const RED_DIM = "#3a1515";

// ─── API helpers ────────────────────────────────────────────────────────────
const API = "/api";
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ─── Debounce helper ────────────────────────────────────────────────────────
function useDebounce(fn, ms) {
  const timer = useRef(null);
  return useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}

// ─── Date Helpers ───────────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().slice(0, 10);
const today = () => fmt(new Date());
const dayLabel = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const shiftDay = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return fmt(d); };
const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDayOfWeek = (y, m) => new Date(y, m, 1).getDay();

const blankDay = () => ({
  items: Array.from({ length: 6 }, () => ({ text: "", done: false })),
  locked: false, lockedAt: null, reflection: "",
});

// ─── Icons ──────────────────────────────────────────────────────────────────
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 9 7.5 12.5 14 5.5"/></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="8" height="6" rx="1"/><path d="M5 6V4a2 2 0 014 0v2"/></svg>;
const ChevronLeft = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 4 6 10 12 16"/></svg>;
const ChevronRight = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 4 14 10 8 16"/></svg>;
const CalIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5.5" y1="1.5" x2="5.5" y2="4.5"/><line x1="10.5" y1="1.5" x2="10.5" y2="4.5"/></svg>;
const TeamIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5"/><circle cx="11" cy="6" r="2"/><path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4"/><path d="M11 9c2 0 4 1 4 3"/></svg>;
const XIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>;
const SyncIcon = ({ syncing }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={syncing ? GOLD : TEXT_DIM} strokeWidth="1.2" strokeLinecap="round" style={syncing ? { animation: "spin 1s linear infinite" } : {}}><path d="M1 6a5 5 0 019-2"/><path d="M11 6a5 5 0 01-9 2"/><polyline points="1 2 1 6 5 6" style={{ fill: "none" }}/><polyline points="11 10 11 6 7 6" style={{ fill: "none" }}/></svg>;

// ─── Calendar Heatmap ───────────────────────────────────────────────────────
function CalendarHeatmap({ days, selectedDate, onSelect }) {
  const d = new Date(selectedDate + "T12:00:00");
  const [calYear, setCalYear] = useState(d.getFullYear());
  const [calMonth, setCalMonth] = useState(d.getMonth());

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const dim = daysInMonth(calYear, calMonth);
  const offset = firstDayOfWeek(calYear, calMonth);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let dd = 1; dd <= dim; dd++) cells.push(dd);
  const todayStr = today();
  const DOW = ["S","M","T","W","T","F","S"];

  const isoFor = (day) => day ? `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : null;

  const getCellColor = (day) => {
    if (!day) return "transparent";
    const iso = isoFor(day);
    const entry = days[iso];
    if (!entry?.locked) return iso < todayStr ? RED_DIM : "transparent";
    const total = entry.items.filter(i => i.text).length;
    const done = entry.items.filter(i => i.text && i.done).length;
    if (total === 0) return "transparent";
    const pct = done / total;
    if (pct === 1) return "#2a3a1a";
    if (pct >= 0.66) return "#1f2e18";
    if (pct >= 0.33) return "#2a2615";
    return "#2a1a15";
  };

  const getCompletionDot = (day) => {
    if (!day) return null;
    const entry = days[isoFor(day)];
    if (!entry?.locked) return null;
    const total = entry.items.filter(i => i.text).length;
    const done = entry.items.filter(i => i.text && i.done).length;
    if (total === 0) return null;
    if (done === total) return GOLD;
    if (done / total >= 0.5) return "#6a6240";
    return "#4a3020";
  };

  const monthStats = useMemo(() => {
    let committed = 0, totalDone = 0, totalTasks = 0, perfectDays = 0;
    for (let dd = 1; dd <= dim; dd++) {
      const entry = days[isoFor(dd)];
      if (entry?.locked) {
        committed++;
        const t = entry.items.filter(i => i.text).length;
        const dn = entry.items.filter(i => i.text && i.done).length;
        totalTasks += t; totalDone += dn;
        if (t > 0 && dn === t) perfectDays++;
      }
    }
    return { committed, totalDone, totalTasks, perfectDays };
  }, [days, calYear, calMonth, dim]);

  const rate = monthStats.totalTasks > 0 ? Math.round((monthStats.totalDone / monthStats.totalTasks) * 100) : 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 8, display: "flex" }}><ChevronLeft /></button>
        <span style={{ fontFamily: SERIF, fontSize: 18, color: WHITE }}>{monthName(calYear, calMonth)}</span>
        <button onClick={nextMonth} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 8, display: "flex" }}><ChevronRight /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DOW.map((d, i) => <div key={i} style={{ textAlign: "center", fontFamily: MONO, fontSize: 9, color: TEXT_DIM, padding: "4px 0", letterSpacing: "0.08em" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          const dot = getCompletionDot(day);
          const iso = isoFor(day);
          return (
            <button key={i} onClick={() => { if (day && onSelect) onSelect(iso); }}
              style={{
                aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: day ? getCellColor(day) : "transparent",
                border: iso === selectedDate ? `1.5px solid ${GOLD}` : iso === todayStr ? `1px solid ${TEXT_DIM}` : "1px solid transparent",
                borderRadius: 6, color: day ? (iso === todayStr ? WHITE : days[iso]?.locked ? TEXT : TEXT_DIM) : "transparent",
                fontFamily: MONO, fontSize: 12, cursor: day ? "pointer" : "default", padding: 0, position: "relative",
              }}>
              {day || ""}
              {dot && <div style={{ width: 4, height: 4, borderRadius: 2, background: dot, position: "absolute", bottom: 3 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16, padding: "14px 0", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        {[{ label: "COMMITTED", value: monthStats.committed }, { label: "DONE", value: monthStats.totalDone }, { label: "RATE", value: `${rate}%` }, { label: "PERFECT", value: monthStats.perfectDays }].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: i === 2 && rate >= 80 ? GOLD : WHITE, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: TEXT_DIM, letterSpacing: "0.1em", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
        {[{ color: "#2a3a1a", label: "All done" }, { color: "#2a2615", label: "Partial" }, { color: RED_DIM, label: "Missed" }].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color, border: `1px solid ${BORDER}` }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: TEXT_DIM }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team Board ─────────────────────────────────────────────────────────────
function TeamBoard({ teamData, onSelectMember }) {
  const todayStr = today();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.06em" }}>TODAY — {dayLabel(todayStr)}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM }}>{teamData.length} members</span>
      </div>
      {teamData.map(member => {
        const days = member.days || {};
        const todayEntry = days[todayStr];
        const committed = todayEntry?.locked || false;
        const total = todayEntry ? todayEntry.items.filter(i => i.text).length : 0;
        const done = todayEntry ? todayEntry.items.filter(i => i.text && i.done).length : 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        let streak = 0, d = todayStr;
        while (days[d]?.locked) { streak++; d = shiftDay(d, -1); }

        let weekDone = 0, weekTotal = 0;
        for (let i = 0; i < 7; i++) {
          const iso = shiftDay(todayStr, -i);
          const entry = days[iso];
          if (entry?.locked) {
            weekTotal += entry.items.filter(it => it.text).length;
            weekDone += entry.items.filter(it => it.text && it.done).length;
          }
        }
        const weekRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

        return (
          <button key={member.slug} onClick={() => onSelectMember(member.slug)}
            style={{
              display: "flex", flexDirection: "column", gap: 8, padding: 14, background: SURFACE,
              border: `1px solid ${committed ? (pct === 100 ? `${GOLD}44` : BORDER) : RED_DIM}`,
              borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 16, background: committed ? GOLD_DIM : `${RED_DIM}88`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: MONO, fontSize: 13, fontWeight: 600, color: committed ? GOLD : TEXT_DIM,
                  border: `1px solid ${committed ? `${GOLD}33` : "transparent"}`,
                }}>{member.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: WHITE, fontWeight: 500 }}>{member.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM }}>
                    {committed ? `${done}/${total} done` : "not committed"}{streak > 1 ? ` · ${streak}d streak` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM }}>{weekRate}% / 7d</div>
                {committed && pct === 100 && <span style={{ color: GOLD, fontSize: 16 }}>✦</span>}
              </div>
            </div>
            {todayEntry?.locked && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 42 }}>
                {todayEntry.items.filter(i => i.text).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: item.done ? GOLD : TEXT_DIM, width: 12 }}>{item.done ? "✓" : "○"}</span>
                    <span style={{ fontFamily: SANS, fontSize: 13, color: item.done ? TEXT_DIM : TEXT, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
            {committed && total > 0 && (
              <div style={{ paddingLeft: 42, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: BORDER, borderRadius: 1, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: pct === 100 ? GOLD : "#555", borderRadius: 1, width: `${pct}%` }} />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Team Management ────────────────────────────────────────────────────────
function TeamManage({ team, onAdd, onRemove }) {
  const [newName, setNewName] = useState("");
  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!slug || team.find(m => m.slug === slug)) return;
    onAdd({ name, slug });
    setNewName("");
  };
  return (
    <div style={{ marginTop: 20, padding: "20px 0", borderTop: `1px solid ${BORDER}` }}>
      <label style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.04em", display: "block", marginBottom: 12 }}>MANAGE TEAM</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add team member…"
          style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontFamily: SANS, fontSize: 14, padding: "8px 12px", outline: "none" }} />
        <button onClick={handleAdd} style={{ background: GOLD, border: "none", color: BG, fontFamily: MONO, fontSize: 11, fontWeight: 600, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {team.map(m => (
          <div key={m.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
            <div>
              <span style={{ fontFamily: SANS, fontSize: 14, color: WHITE }}>{m.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, marginLeft: 10 }}>/list/{m.slug}</span>
            </div>
            <button onClick={() => onRemove(m.slug)} style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 4, display: "flex" }}><XIcon /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [team, setTeam] = useState([]);
  const [teamData, setTeamData] = useState([]);  // enriched team with days
  const [userDays, setUserDays] = useState({});   // active user's full days
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("day");
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const inputRefs = useRef([]);

  // ── Parse URL and load initial data ──
  useEffect(() => {
    (async () => {
      try {
        const t = await api("/team");
        setTeam(t);

        const path = window.location.pathname;
        const match = path.match(/\/list\/([a-z0-9-]+)/);
        if (match) {
          const slug = match[1];
          if (t.find(m => m.slug === slug)) {
            setCurrentUser(slug);
            const days = await api(`/days/${slug}`);
            setUserDays(days);
          }
        }

        // Load team board data
        const td = await api("/team/today");
        setTeamData(td);
      } catch (e) {
        console.error("Failed to load:", e);
      }
      setLoading(false);
    })();
  }, []);

  // ── Server-side save (fires on every mutation) ──
  const saveDay = useCallback(async (slug, dateStr, dayData) => {
    setSyncing(true);
    try {
      await api(`/days/${slug}/${dateStr}`, {
        method: "PUT",
        body: JSON.stringify({
          items: dayData.items,
          locked: dayData.locked,
          lockedAt: dayData.lockedAt,
          reflection: dayData.reflection,
        }),
      });
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSyncing(false);
  }, []);

  // Debounced save for keystrokes (300ms)
  const debouncedSave = useDebounce(saveDay, 300);

  // Immediate save (for locks, checks, carry-forward)
  const immediateSave = saveDay;

  // Refresh team board
  const refreshTeam = useCallback(async () => {
    try {
      const td = await api("/team/today");
      setTeamData(td);
    } catch (e) { console.error(e); }
  }, []);

  // Active user context
  const activeSlug = viewingMember || currentUser;
  const activeMember = team.find(m => m.slug === activeSlug);

  // When viewing another member, load their days
  const [viewingDays, setViewingDays] = useState({});
  useEffect(() => {
    if (viewingMember && viewingMember !== currentUser) {
      api(`/days/${viewingMember}`).then(setViewingDays).catch(() => setViewingDays({}));
    }
  }, [viewingMember, currentUser]);

  const activeDays = viewingMember && viewingMember !== currentUser ? viewingDays : userDays;
  const day = activeDays[selectedDate] || blankDay();
  const isToday_ = selectedDate === today();
  const canEdit = activeSlug === currentUser && !viewingMember;

  // ── Mutations (update local state + fire save) ──
  const updateDay = (dateStr, newDayData, immediate = false) => {
    const slug = currentUser;
    setUserDays(prev => ({ ...prev, [dateStr]: newDayData }));
    if (immediate) {
      immediateSave(slug, dateStr, newDayData);
    } else {
      debouncedSave(slug, dateStr, newDayData);
    }
  };

  const updateItem = (idx, patch) => {
    if (!canEdit) return;
    const d = structuredClone(activeDays[selectedDate] || blankDay());
    Object.assign(d.items[idx], patch);
    // Text changes are debounced, done toggles are immediate
    updateDay(selectedDate, d, patch.done !== undefined);
  };

  const lockList = () => {
    if (!canEdit) return;
    const d = structuredClone(activeDays[selectedDate] || blankDay());
    d.locked = true;
    d.lockedAt = new Date().toISOString();
    updateDay(selectedDate, d, true);
  };

  const unlockList = () => {
    if (!canEdit) return;
    const d = structuredClone(activeDays[selectedDate] || blankDay());
    d.locked = false;
    d.lockedAt = null;
    updateDay(selectedDate, d, true);
  };

  const setReflection = (val) => {
    if (!canEdit) return;
    const d = structuredClone(activeDays[selectedDate] || blankDay());
    d.reflection = val;
    updateDay(selectedDate, d, false); // debounced
  };

  const carryForward = () => {
    if (!canEdit) return;
    const tomorrow = shiftDay(selectedDate, 1);
    const d = structuredClone(activeDays[tomorrow] || blankDay());
    const unfinished = day.items.filter(i => i.text && !i.done);
    unfinished.forEach((item, idx) => {
      if (idx < 6 && !d.items[idx].text) d.items[idx].text = item.text;
    });
    updateDay(tomorrow, d, true);
    setSelectedDate(tomorrow);
  };

  // Team management
  const addMember = async (member) => {
    try {
      await api("/team", { method: "POST", body: JSON.stringify(member) });
      const t = await api("/team");
      setTeam(t);
      await refreshTeam();
    } catch (e) { console.error(e); }
  };
  const removeMember = async (slug) => {
    try {
      await api(`/team/${slug}`, { method: "DELETE" });
      const t = await api("/team");
      setTeam(t);
      await refreshTeam();
      if (viewingMember === slug) setViewingMember(null);
    } catch (e) { console.error(e); }
  };

  const calcStreak = (days) => {
    let streak = 0, d = today();
    while (days[d]?.locked) { streak++; d = shiftDay(d, -1); }
    return streak;
  };

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: TEXT_DIM, fontFamily: MONO }}>Loading…</p>
      </div>
    );
  }

  const streak = activeSlug ? calcStreak(activeDays) : 0;
  const filledItems = day.items.filter(i => i.text).length;
  const doneItems = day.items.filter(i => i.text && i.done).length;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: SANS, WebkitFontSmoothing: "antialiased" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Header */}
        <header style={{ paddingTop: 36, paddingBottom: 16, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: WHITE, margin: 0, letterSpacing: "0.06em" }}>TEN31 TASKS</h1>
            <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: "0.04em" }}>Six things. In order. Starting with the first.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SyncIcon syncing={syncing} />
            {currentUser && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: GOLD, border: `1px solid ${GOLD}33`, padding: "3px 10px", borderRadius: 4 }}>
                {team.find(m => m.slug === currentUser)?.name || currentUser}
              </span>
            )}
          </div>
        </header>

        {/* User selector */}
        {!currentUser && team.length > 0 && !viewingMember && (
          <div style={{ padding: "24px 0", borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }}>
            <label style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.04em", display: "block", marginBottom: 12 }}>SELECT YOUR NAME</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {team.map(m => (
                <button key={m.slug} onClick={async () => {
                  setCurrentUser(m.slug);
                  window.history.pushState(null, "", `/list/${m.slug}`);
                  const days = await api(`/days/${m.slug}`);
                  setUserDays(days);
                }}
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontFamily: SANS, fontSize: 14, padding: "10px 18px", cursor: "pointer" }}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {[
            { key: "day", label: viewingMember && viewingMember !== currentUser ? `${activeMember?.name || ""}` : "My Tasks" },
            { key: "calendar", label: "Calendar", icon: <CalIcon /> },
            { key: "team", label: "Team", icon: <TeamIcon /> },
          ].map(t => (
            <button key={t.key} onClick={() => {
              setView(t.key);
              if (t.key === "team") { setViewingMember(null); refreshTeam(); }
              if (t.key !== "team" && !activeSlug && currentUser) setViewingMember(null);
            }}
              style={{
                flex: 1, background: "transparent", border: "none",
                borderBottom: view === t.key ? `2px solid ${GOLD}` : "2px solid transparent",
                color: view === t.key ? GOLD : TEXT_DIM,
                fontFamily: MONO, fontSize: 11, padding: "14px 8px 12px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.04em",
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ═══ DAY VIEW ═══ */}
        {view === "day" && activeSlug && (
          <>
            {viewingMember && viewingMember !== currentUser && (
              <button onClick={() => { setViewingMember(null); setView("team"); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: GOLD_DIM, border: `1px solid ${GOLD}22`, borderRadius: 6, padding: "8px 14px", marginBottom: 16, cursor: "pointer", fontFamily: MONO, fontSize: 11, color: GOLD, width: "100%" }}>
                ← Back to Team Board
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 8, display: "flex" }} onClick={() => setSelectedDate(shiftDay(selectedDate, -1))}><ChevronLeft /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 14, color: WHITE }}>{dayLabel(selectedDate)}</span>
                {isToday_ && <span style={{ fontFamily: MONO, fontSize: 9, color: GOLD, border: `1px solid ${GOLD}44`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.08em" }}>TODAY</span>}
                {day.locked && <span style={{ fontFamily: MONO, fontSize: 9, color: TEXT_DIM, display: "flex", alignItems: "center", gap: 4 }}><LockIcon /> Committed</span>}
              </div>
              <button style={{ background: "transparent", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 8, display: "flex" }} onClick={() => setSelectedDate(shiftDay(selectedDate, 1))}><ChevronRight /></button>
            </div>

            {streak > 0 && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 20, padding: "10px 14px", background: GOLD_DIM, borderRadius: 6, border: `1px solid ${GOLD}22` }}>
                <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: GOLD }}>{streak}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM }}>day streak</span>
              </div>
            )}

            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {day.items.map((item, idx) => {
                const isActive = day.locked && !item.done && item.text && day.items.slice(0, idx).every(i => !i.text || i.done);
                return (
                  <li key={idx} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: isActive ? `${GOLD}08` : SURFACE, borderRadius: 6,
                    border: isActive ? `1px solid ${GOLD}66` : `1px solid ${BORDER}`,
                    opacity: item.done ? 0.5 : 1,
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: isActive ? GOLD : TEXT_DIM, width: 18, textAlign: "center", flexShrink: 0 }}>{idx + 1}</span>
                    {day.locked || !canEdit ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: SANS, fontSize: 15, color: item.done ? TEXT_DIM : WHITE, textDecoration: item.done ? "line-through" : "none", flex: 1 }}>
                          {item.text || <span style={{ color: "#333" }}>—</span>}
                        </span>
                        {item.text && canEdit && day.locked && (
                          <button onClick={() => updateItem(idx, { done: !item.done })} style={{
                            background: item.done ? GOLD_DIM : "transparent", border: item.done ? `1px solid ${GOLD}66` : `1px solid ${BORDER}`,
                            borderRadius: 4, color: item.done ? GOLD : TEXT_DIM, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                          }}><CheckIcon /></button>
                        )}
                      </div>
                    ) : (
                      <input
                        ref={el => (inputRefs.current[idx] = el)}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: WHITE, fontFamily: SANS, fontSize: 15, padding: 0 }}
                        value={item.text} onChange={e => updateItem(idx, { text: e.target.value })}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (idx < 5) inputRefs.current[idx + 1]?.focus(); } }}
                        placeholder={idx === 0 ? "Most important thing…" : `Task ${idx + 1}`} spellCheck={false}
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            {day.locked && filledItems > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: GOLD, borderRadius: 2, width: `${(doneItems / filledItems) * 100}%`, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM }}>{doneItems}/{filledItems}</span>
              </div>
            )}

            {canEdit && (
              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                {!day.locked && filledItems > 0 && (
                  <button onClick={lockList} style={{ background: GOLD, border: "none", color: BG, fontFamily: MONO, fontSize: 12, fontWeight: 600, padding: "10px 20px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.04em" }}>
                    <LockIcon /> Commit List
                  </button>
                )}
                {day.locked && <button onClick={unlockList} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_DIM, fontFamily: MONO, fontSize: 11, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Edit List</button>}
                {day.locked && doneItems < filledItems && filledItems > 0 && (
                  <button onClick={carryForward} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_DIM, fontFamily: MONO, fontSize: 11, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Carry forward →</button>
                )}
              </div>
            )}

            {canEdit && day.locked && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
                <label style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>End-of-day reflection</label>
                <textarea style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontFamily: SANS, fontSize: 14, padding: "10px 12px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
                  value={day.reflection} onChange={e => setReflection(e.target.value)} placeholder="What got done. What didn't. Why." rows={3} />
              </div>
            )}
            {!canEdit && day.locked && day.reflection && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
                <label style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: "0.04em", display: "block", marginBottom: 8 }}>Reflection</label>
                <p style={{ fontFamily: SANS, fontSize: 14, color: TEXT, lineHeight: 1.5, margin: 0 }}>{day.reflection}</p>
              </div>
            )}
          </>
        )}

        {view === "day" && !activeSlug && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontFamily: MONO, fontSize: 13, color: TEXT_DIM }}>{team.length === 0 ? "Add team members in the Team tab." : "Select your name above."}</p>
          </div>
        )}

        {/* ═══ CALENDAR ═══ */}
        {view === "calendar" && activeSlug && (
          <CalendarHeatmap days={activeDays} selectedDate={selectedDate} onSelect={(iso) => { setSelectedDate(iso); setView("day"); }} />
        )}
        {view === "calendar" && !activeSlug && (
          <div style={{ textAlign: "center", padding: 40 }}><p style={{ fontFamily: MONO, fontSize: 13, color: TEXT_DIM }}>Select a user first.</p></div>
        )}

        {/* ═══ TEAM ═══ */}
        {view === "team" && (
          <>
            {teamData.length > 0 && (
              <TeamBoard teamData={teamData} onSelectMember={async (slug) => {
                setViewingMember(slug);
                setSelectedDate(today());
                if (slug !== currentUser) {
                  try { const d = await api(`/days/${slug}`); setViewingDays(d); } catch { setViewingDays({}); }
                }
                setView("day");
              }} />
            )}
            <TeamManage team={team} onAdd={addMember} onRemove={removeMember} />
          </>
        )}

        <footer style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
          <p style={{ fontFamily: MONO, fontSize: 9, color: "#332e25", letterSpacing: "0.06em", margin: 0 }}>TEN31 TASKS · Investing in Freedom Tech</p>
        </footer>
      </div>
    </div>
  );
}
