import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import PatientHoverCard from "../components/PatientHoverCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePatient } from "../contexts/PatientContext";
import { useSite, appointmentSiteId } from "../contexts/SiteContext";
import { users as usersApi } from '../services/api';

/* ── helpers ── */
const getToday = () => new Date();
const toKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isSame = (a, b) => toKey(a) === toKey(b);
const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtTime12 = t => {
  if (!t) return "";
  const [hh, mm] = t.split(":").map(Number);
  const ap = hh < 12 ? "AM" : "PM";
  const h = hh % 12 === 0 ? 12 : hh % 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ap}`;
};
function getWeekRange(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  const yr  = sun.getFullYear();
  return `${fmt(mon)} – ${fmt(sun)}, ${yr}`;
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getCalendarWeeks(year, month) {
  const startDay = new Date(year, month, 1).getDay();
  const total = getDaysInMonth(year, month);
  const weeks = [];
  let week = new Array(startDay).fill(null);
  for (let d = 1; d <= total; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}
const TYPE_COLORS = {
  "Follow-Up":         { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", dot: "#3b82f6", light: "#dbeafe" },
  "New Patient":       { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", dot: "#f59e0b", light: "#fde68a" },
  "Telehealth":        { bg: "#f5f3ff", border: "#8b5cf6", text: "#5b21b6", dot: "#8b5cf6", light: "#ede9fe" },
  "Urgent":            { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", dot: "#ef4444", light: "#fee2e2" },
  "Medication Review": { bg: "#f0fdf4", border: "#22c55e", text: "#166534", dot: "#22c55e", light: "#dcfce7" },
  default:             { bg: "#f0fdf4", border: "#22c55e", text: "#166534", dot: "#22c55e", light: "#dcfce7" },
};
const getTypeColor = apt => {
  if (apt.visitType === "Telehealth") return TYPE_COLORS["Telehealth"];
  return TYPE_COLORS[apt.type] || TYPE_COLORS.default;
};
const STATUS_STYLE = {
  "Scheduled":     { bg: "#f1f5f9", color: "#475569",  dot: "#94a3b8" },
  "Confirmed":     { bg: "#dbeafe", color: "#1e40af",  dot: "#3b82f6" },
  "Checked In":    { bg: "#dcfce7", color: "#166534",  dot: "#22c55e" },
  "Arrived":       { bg: "#fff7ed", color: "#9a3412",  dot: "#f97316" },
  "In Progress":   { bg: "#f3f0ff", color: "#5b21b6",  dot: "#7c3aed" },
  "Checked Out":   { bg: "#ccfbf1", color: "#0f766e",  dot: "#14b8a6" },
  "Completed":     { bg: "#f0f4ff", color: "#3730a3",  dot: "#4f46e5" },
  "Cancelled":     { bg: "#fee2e2", color: "#991b1b",  dot: "#ef4444" },
  "No Show":       { bg: "#fef3c7", color: "#92400e",  dot: "#f59e0b" },
};
const getStatusStyle = s => STATUS_STYLE[s] || STATUS_STYLE["Scheduled"];
const PROV_COLORS = ["#4f46e5","#0891b2","#059669","#7c3aed","#dc2626","#d97706"];
const provColor = (id, provs) => PROV_COLORS[(provs || []).findIndex(p => p.id === id) % PROV_COLORS.length] || "#4f46e5";

const card = (extra = {}) => ({
  background: "#fff", border: "1px solid var(--border)", borderRadius: 10,
  boxShadow: "var(--shadow-sm)", ...extra,
});
const LBL = ({ c }) => (
  <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: 4 }}>{c}</label>
);
const Pill = ({ label, color, dot }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:6,
    background: STATUS_STYLE[label]?.bg || "#f1f5f9", color: STATUS_STYLE[label]?.color || "#475569",
    fontSize:10.5, fontWeight:700 }}>
    <span style={{ width:5, height:5, borderRadius:"50%", background: STATUS_STYLE[label]?.dot || "#94a3b8",
      animation: (label==="Checked In"||label==="Arrived"||label==="In Progress") ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
    {label}
  </span>
);

/* ══════════════════════════════════════════════
   TODAY'S WORKFLOW RIBBON
══════════════════════════════════════════════ */
function TodayRibbon({ dateAppts, todayKey, activeDate }) {
  const [clockStr, setClockStr] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setClockStr(new Date().toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true }))
    , 30_000);
    return () => clearInterval(id);
  }, []);
  if (activeDate !== todayKey) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nextApt = [...dateAppts]
    .filter(a => {
      const [h,m] = (a.time||"0:0").split(":").map(Number);
      return (h*60+m) >= nowMins && a.status!=="Completed" && a.status!=="Cancelled" && a.status!=="No Show";
    })
    .sort((a,b)=>a.time.localeCompare(b.time))[0];
  const inSession = dateAppts.filter(a=>a.status==="In Progress"||a.status==="Checked In");
  const teleToday = dateAppts.filter(a=>a.visitType==="Telehealth"&&a.status!=="Completed"&&a.status!=="Cancelled"&&a.status!=="No Show").length;
  const activeProv = new Set(inSession.map(a=>a.provider)).size;
  const SEP = <div style={{width:1,height:32,background:"rgba(255,255,255,0.15)",flexShrink:0}} />;
  return (
    <div style={{
      background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%)",
      borderRadius:12, padding:"12px 20px", marginBottom:16,
      display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
      boxShadow:"var(--shadow-md)", position:"relative", overflow:"hidden"
    }}>
      <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 12px)",pointerEvents:"none"}} />
      {/* Clock */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,lineHeight:1}}>⏰</span>
        <div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:1,marginBottom:2}}>Today</div>
          <div style={{fontSize:17,fontWeight:800,color:"#fff",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{clockStr}</div>
        </div>
      </div>
      {SEP}
      {/* Next up */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,lineHeight:1}}>👤</span>
        <div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:1,marginBottom:2}}>Next Up</div>
          {nextApt ? (
            <div style={{fontSize:12,fontWeight:700,color:"#fff",lineHeight:1}}>
              {nextApt.patientName?.split(" ")[0]} <span style={{color:"#a5b4fc"}}>@ {fmtTime12(nextApt.time)}</span>
            </div>
          ) : (
            <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.45)",lineHeight:1}}>No more today</div>
          )}
        </div>
      </div>
      {SEP}
      {/* In Session */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,lineHeight:1}}>🩺</span>
        <div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:1,marginBottom:2}}>In Session</div>
          <div style={{fontSize:12,fontWeight:700,color:inSession.length>0?"#34d399":"rgba(255,255,255,0.45)",lineHeight:1}}>
            {inSession.length>0?`${inSession.length} active visit${inSession.length>1?"s":""}`:`None active`}
          </div>
        </div>
      </div>
      {teleToday>0 && (<>
        {SEP}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,lineHeight:1}}>📹</span>
          <div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:1,marginBottom:2}}>Telehealth</div>
            <div style={{fontSize:12,fontWeight:700,color:"#a78bfa",lineHeight:1}}>{teleToday} session{teleToday>1?"s":""} today</div>
          </div>
        </div>
      </>)}
      <div style={{flex:1}} />
      {activeProv>0 && (
        <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.35)",borderRadius:8,padding:"6px 12px",flexShrink:0}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",flexShrink:0,animation:"pulse-dot 2s ease-in-out infinite"}} />
          <span style={{fontSize:11,color:"#34d399",fontWeight:700}}>{activeProv} provider{activeProv>1?"s":""} active</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   DAY SUMMARY BAR
══════════════════════════════════════════════ */
function DaySummaryBar({ appts }) {
  if (!appts.length) return null;
  const telehealth = appts.filter(a => a.visitType === "Telehealth").length;
  const inPerson   = appts.length - telehealth;
  const newPts     = appts.filter(a => a.type === "New Patient").length;
  const returning  = appts.length - newPts;
  const completed  = appts.filter(a => a.status === "Completed").length;
  const cancelled  = appts.filter(a => a.status === "Cancelled").length;
  const noShows    = appts.filter(a => a.status === "No Show").length;

  const items = [
    { icon:"📋", label:"Total",        val: appts.length, color:"#4f46e5", always: true },
    { icon:"📹", label:"Telehealth",   val: telehealth,   color:"#7c3aed", sub:`${inPerson} in-person`, always: true },
    { icon:"👤", label:"New Patients", val: newPts,        color:"#f59e0b", sub:`${returning} returning`, always: true },
    { icon:"✅", label:"Completed",    val: completed,    color:"#16a34a", always: true },
    { icon:"❌", label:"Cancelled",    val: cancelled,    color:"#ef4444", always: false },
    { icon:"⚠️", label:"No Shows",     val: noShows,      color:"#f97316", always: false },
  ].filter(i => i.always || i.val > 0);

  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10, padding:"12px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:0, flexWrap:"wrap", boxShadow:"var(--shadow-sm)" }}>
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <div style={{ width:1, height:36, background:"#e2e8f0", margin:"0 14px", flexShrink:0 }} />}
          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"2px 0" }}>
            <span style={{ fontSize:16 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:item.color, lineHeight:1 }}>{item.val}</div>
              <div style={{ fontSize:9.5, color:"var(--text-muted)", fontWeight:600, lineHeight:1.2, marginTop:1 }}>{item.label}{item.sub ? <span style={{ color:"#94a3b8" }}> · {item.sub}</span> : null}</div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MINI CALENDAR
══════════════════════════════════════════════ */
function MiniCalendar({ selectedDate, onSelect, aptsByDate, blockedByDate }) {
  const [base, setBase] = useState(() => new Date(getToday().getFullYear(), getToday().getMonth(), 1));
  const weeks = useMemo(() => getCalendarWeeks(base.getFullYear(), base.getMonth()), [base]);
  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <button onClick={() => setBase(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 8px", fontSize:16, color:"var(--text-secondary)", borderRadius:6, transition:"all 0.12s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="#f5f3ff";e.currentTarget.style.color="#4f46e5";}}
          onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="var(--text-secondary)";}}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>
          {MONTH_NAMES[base.getMonth()].slice(0,3)} {base.getFullYear()}
        </span>
        <button onClick={() => setBase(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 8px", fontSize:16, color:"var(--text-secondary)", borderRadius:6, transition:"all 0.12s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="#f5f3ff";e.currentTarget.style.color="#4f46e5";}}
          onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="var(--text-secondary)";}}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:3 }}>
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:1 }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} style={{ height:26 }} />;
            const key = toKey(day);
            const hasApts = (aptsByDate[key] || []).length > 0;
            const blocked = (blockedByDate[key] || []).length > 0;
            const isToday = isSame(day, getToday());
            const isSel = selectedDate === key;
            const isWknd = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div key={di} onClick={() => onSelect(isSel ? null : key)}
                style={{ height:28, display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", cursor:"pointer", borderRadius:6,
                  background: isSel ? "#4f46e5" : isToday ? "#eff6ff" : "transparent",
                  border: isToday && !isSel ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                  transition:"all 0.1s" }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#f5f3ff"; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? "#eff6ff" : "transparent"; }}>
                <span style={{ fontSize:10.5, fontWeight: isSel||isToday ? 800:600, lineHeight:1,
                  color: isSel ? "#fff" : isToday ? "#1e40af" : isWknd ? "var(--text-dim)" : "var(--text-primary)" }}>
                  {day.getDate()}
                </span>
                {isToday && !isSel && (
                  <span style={{ fontSize:7, fontWeight:800, color:'#3b82f6', letterSpacing:'0.5px', lineHeight:1, marginTop:1 }}>TODAY</span>
                )}
                {(hasApts || blocked) && (
                  <div style={{ display:"flex", gap:2, marginTop:1 }}>
                    {hasApts && <span style={{ width:4, height:4, borderRadius:"50%", background: isSel?"#c7d2fe":"#3b82f6" }} />}
                    {blocked && <span style={{ width:4, height:4, borderRadius:"50%", background: isSel?"#fca5a5":"#ef4444" }} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   URGENCY HELPERS
══════════════════════════════════════════════ */
const isControlledSubstance = apt =>
  /\b(adderall|ritalin|xanax|valium|klonopin|ativan|oxycodone|hydrocodone|opioid|benzo|stimulant|controlled)\b/i.test(apt.reason || "");

const isInsuranceFailure = apt =>
  /\b(insurance fail|denied|eligib|auth fail|not covered|reject)\b/i.test(apt.reason || "");

function urgencyStyle(apt) {
  if (isInsuranceFailure(apt))   return { border: "2px solid #ef4444", bg: "#fff5f5", badge: { text: "Insurance Issue", bg: "#fee2e2", color: "#991b1b" } };
  if (isControlledSubstance(apt)) return { border: "2px solid #f59e0b", bg: "#fffbeb", badge: { text: "Controlled Rx", bg: "#fef3c7", color: "#92400e" } };
  if (apt.visitType === "Telehealth") return { border: "2px solid #6366f1", bg: "#f5f3ff", badge: null };
  return null;
}

/* ══════════════════════════════════════════════
   TIMELINE APPOINTMENT CARD (Schedule tab)
══════════════════════════════════════════════ */
const qaBtn = (accent) => ({
  padding:"3px 10px", borderRadius:6, fontSize:10.5, fontWeight:600, cursor:"pointer",
  border:`1px solid ${accent||"#e2e8f0"}`, background:"transparent", color: accent||"var(--text-secondary)",
});

function AptCard({ apt, todayKey, onOpenChart, onCheckIn, onGoToSession, onToggleVisitType, onUpdateStatus, onReschedule, isCurrent, patientPhoto, patientObj, allAppointments, isMobile }) {
  const c = getTypeColor(apt);
  const ss = getStatusStyle(apt.status);
  const initials = apt.patientName?.split(" ").map(n => n[0]).join("").slice(0,2) || "?";
  const pc = provColor(apt.provider);
  const urg = urgencyStyle(apt);
  const isDone = apt.status === "Completed" || apt.status === "Cancelled" || apt.status === "No Show";

  // Primary CTA
  let primaryCTA = null;
  if (apt.visitType === "Telehealth" && !isDone) {
    primaryCTA = <button onClick={() => onGoToSession(apt)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:800, border:"none", background:"#6366f1", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>📹 Join Session</button>;
  } else if (apt.status === "Checked In" || apt.status === "In Progress") {
    primaryCTA = <button onClick={() => onGoToSession(apt)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:800, border:"none", background:"#16a34a", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>🩺 Open Chart</button>;
  } else if ((apt.status === "Scheduled" || apt.status === "Confirmed") && apt.date === todayKey) {
    primaryCTA = <button onClick={() => onCheckIn(apt)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:800, border:"none", background:"#22c55e", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>✓ Check In</button>;
  } else if (apt.patientId) {
    primaryCTA = <button onClick={() => onOpenChart(apt)} style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:700, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>📋 Open Chart</button>;
  }

  return (
    <div style={{
      display: "flex", gap: 0,
      borderRadius: 10, overflow: "hidden",
      border: isCurrent
        ? "2px solid #6366f1"
        : urg ? urg.border : "1px solid #e2e8f0",
      background: isCurrent ? "#f5f3ff" : urg ? urg.bg : "#fff",
      boxShadow: isCurrent
        ? "0 0 0 3px rgba(99,102,241,0.15), var(--shadow-sm)"
        : "var(--shadow-sm)",
      transition: "all 0.15s",
      opacity: isDone ? 0.6 : 1,
    }}
      onMouseEnter={e => { if (!isDone) { e.currentTarget.style.boxShadow = isCurrent ? "0 0 0 3px rgba(99,102,241,0.2), var(--shadow-md)" : "var(--shadow-md)"; e.currentTarget.style.transform = "translateX(2px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isCurrent ? "0 0 0 3px rgba(99,102,241,0.15), var(--shadow-sm)" : "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}>
      {/* Color stripe */}
      <div style={{ width: 5, background: isCurrent ? "#6366f1" : c.border, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "12px 14px" }}>

        {/* Row 1: status chips + urgency badge + duration */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ss.bg, color: ss.color, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.dot, display: "inline-block", animation: apt.status === "Checked In" ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
            {apt.status}
          </span>
          {apt.visitType === "Telehealth" && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ede9fe", color: "#5b21b6" }}>📹 Telehealth</span>
          )}
          {apt.type && apt.visitType !== "Telehealth" && (
            <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: c.light, color: c.text, fontWeight: 600 }}>{apt.type}</span>
          )}
          {urg?.badge && (
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 9px", borderRadius: 20, background: urg.badge.bg, color: urg.badge.color }}>⚠ {urg.badge.text}</span>
          )}
          {isCurrent && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20, background: "#6366f1", color: "#fff", marginLeft: "auto" }}>▶ Now</span>
          )}
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: isCurrent ? 0 : "auto" }}>{apt.duration || 30} min{apt.room ? " · " + apt.room : ""}</span>
        </div>

        {/* Row 2: avatar + patient info + provider + primary CTA */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          {/* Patient avatar */}
          <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, overflow: "hidden", boxShadow: isCurrent ? "0 0 0 3px rgba(99,102,241,0.3)" : "none" }}>
            {patientPhoto
              ? <img src={patientPhoto} alt={apt.patientName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${c.border},${c.dot})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>{initials}</div>
            }
          </div>
          {/* Patient info — takes full first line on mobile */}
          <div style={{ flex: 1, minWidth: isMobile ? "calc(100% - 54px)" : 0 }}>
            <div className="patient-row" style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", marginBottom: 1 }}>
              <PatientHoverCard patient={patientObj} appointments={allAppointments || []}>
                {apt.patientName}
              </PatientHoverCard>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.reason || "No reason listed"}</div>
          </div>
          {/* Provider chip + CTA — second line on mobile, indented to align under patient name */}
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", paddingLeft: 50 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f8fafc", border: `1px solid ${pc}25`, borderRadius: 8, padding: "4px 8px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: pc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>
                  {apt.providerName?.split(" ").map(n => n[0]).join("").slice(0,2) || "?"}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: pc, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.providerName}</span>
              </div>
              <div style={{ marginLeft: "auto" }} onClick={e => e.stopPropagation()}>{primaryCTA}</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f8fafc", border: `1px solid ${pc}25`, borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: pc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>
                  {apt.providerName?.split(" ").map(n => n[0]).join("").slice(0,2) || "?"}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: pc, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apt.providerName}</span>
              </div>
              <div onClick={e => e.stopPropagation()}>{primaryCTA}</div>
            </>
          )}
        </div>

        {/* Insurance & Flags row */}
        <div style={{ display:"flex", gap:5, marginTop:7, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:10, padding:"2px 9px", borderRadius:20, fontWeight:600,
            background: patientObj?.insurance?.primary?.name ? "#eff6ff" : "#f8fafc",
            color: patientObj?.insurance?.primary?.name ? "#1e40af" : "#94a3b8",
            border: `1px solid ${patientObj?.insurance?.primary?.name ? "#bfdbfe" : "#e2e8f0"}` }}>
            🛡 {patientObj?.insurance?.primary?.name || "No Insurance on File"}
          </span>
          {(patientObj?.allergies?.length > 0) && (
            <span style={{ fontSize:10, padding:"2px 9px", borderRadius:20, fontWeight:700, background:"#fef3c7", color:"#92400e", border:"1px solid #fcd34d" }}>⚠ Allergies</span>
          )}
          {apt.checkInTime && (
            <span style={{ fontSize:10, padding:"2px 9px", borderRadius:20, fontWeight:600, background:"#dcfce7", color:"#166534", border:"1px solid #86efac" }}>
              🟢 Checked in {Math.floor((Date.now()-apt.checkInTime)/60000)}m ago
            </span>
          )}
        </div>

        {/* Smart Alerts */}
        {(() => {
          const alerts = [];
          if ((patientObj?.balanceDue||0) > 0)
            alerts.push({ icon:"💰", text:`$${patientObj.balanceDue} balance due`, color:"#dc2626" });
          if (!patientObj?.insurance?.primary?.name)
            alerts.push({ icon:"🛡", text:"No insurance on file", color:"#f59e0b" });
          if (apt.visitType==="Telehealth" && (apt.status==="Scheduled"||apt.status==="Confirmed"))
            alerts.push({ icon:"📹", text:"Telehealth link not sent", color:"#7c3aed" });
          if ((patientObj?.allergies?.length||0) > 2)
            alerts.push({ icon:"⚠", text:`${patientObj.allergies.length} known allergies`, color:"#dc2626" });
          if (apt.type==="New Patient" && (apt.status==="Scheduled"||apt.status==="Confirmed"))
            alerts.push({ icon:"📋", text:"Intake forms pending", color:"#0891b2" });
          if (!alerts.length) return null;
          return (
            <div style={{ display:"flex", gap:4, marginTop:5, flexWrap:"wrap" }}>
              {alerts.slice(0,3).map((a,i) => (
                <span key={i} style={{ fontSize:9.5, padding:"1px 7px", borderRadius:20,
                  background:`${a.color}15`, color:a.color, fontWeight:700, border:`1px solid ${a.color}30` }}>
                  {a.icon} {a.text}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Row 3: quick-action toolbar */}
        <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
          {(apt.status==="Scheduled"||apt.status==="Confirmed") && apt.date===todayKey && (
            <button onClick={() => onCheckIn(apt)} style={qaBtn("#16a34a")}>✓ Check In</button>
          )}
          {apt.status==="Scheduled" && (
            <button onClick={() => onUpdateStatus?.(apt.id,"Confirmed")} style={qaBtn("#0891b2")}>🟢 Arrived</button>
          )}
          {(apt.status==="Checked In"||apt.status==="Confirmed") && (
            <button onClick={() => onGoToSession(apt)} style={qaBtn("#7c3aed")}>🩺 Start Visit</button>
          )}
          {apt.patientId && (
            <button onClick={() => onOpenChart(apt)} style={qaBtn()}>📋 Chart</button>
          )}
          {apt.patientId && (
            <button onClick={() => onOpenChart(apt)} style={qaBtn()}>📝 Note</button>
          )}
          {apt.status!=="Completed"&&apt.status!=="Cancelled"&&apt.status!=="No Show" && onReschedule && (
            <button onClick={() => onReschedule(apt)} style={qaBtn("#f59e0b")}>🔁 Reschedule</button>
          )}
          {apt.status!=="Completed"&&apt.status!=="Cancelled"&&apt.status!=="No Show" && onUpdateStatus && (
            <button onClick={() => onUpdateStatus(apt.id,"Cancelled")} style={{ ...qaBtn("#ef4444"), color:"#ef4444", background:"transparent" }}>✕ Cancel</button>
          )}
          {apt.status!=="Completed"&&apt.status!=="Cancelled"&&apt.status!=="No Show" && (
            <button onClick={() => onToggleVisitType(apt)}
              style={{ ...qaBtn(), color: apt.visitType==="Telehealth"?"#1d4ed8":"#6d28d9", borderColor: apt.visitType==="Telehealth"?"#93c5fd":"#c4b5fd" }}>
              {apt.visitType==="Telehealth"?"🏥 In-Person":"📹 Telehealth"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   VERTICAL TIMELINE WRAPPER
══════════════════════════════════════════════ */
// ── Capacity thresholds ────────────────────────────────────────────────────────
const WARNING_THRESHOLD = 0.7; // 70%
const FULL_THRESHOLD    = 0.9; // 90%
const DEFAULT_CAPACITY  = 3;   // max slots per hour (used when provider capacity unknown)

const getSlotStatus = (count, capacity = DEFAULT_CAPACITY) => {
  const ratio = count / capacity;
  if (ratio >= FULL_THRESHOLD)    return "full";
  if (ratio >= WARNING_THRESHOLD) return "warning";
  return "";
};

function ScheduleTimeline({ appts, todayKey, isToday, patients, allAppointments, onOpenChart, onCheckIn, onGoToSession, onToggleVisitType, onUpdateStatus, onReschedule, isMobile }) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Find the current (next upcoming non-completed) appointment
  const currentAptId = useMemo(() => {
    const upcoming = appts
      .filter(a => a.status !== "Completed" && a.status !== "Cancelled" && a.status !== "No Show")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    // Prefer "In Progress" / "Checked In", else next future
    const active = upcoming.find(a => a.status === "In Progress" || a.status === "Checked In");
    if (active) return active.id;
    const next = upcoming.find(a => {
      const [h, m] = (a.time || "0:0").split(":").map(Number);
      return (h * 60 + m) >= nowMins;
    });
    return next?.id || null;
  }, [appts, nowMins]);

  // Build bySlot map in 30-minute increments from 7:00 to 20:30
  const bySlot = useMemo(() => {
    const map = new Map();
    for (let h = 7; h <= 20; h++) {
      map.set(`${String(h).padStart(2,"0")}:00`, []);
      map.set(`${String(h).padStart(2,"0")}:30`, []);
    }
    appts.forEach(apt => {
      if (!apt.time) return;
      const [h, m] = apt.time.split(":").map(Number);
      if (h < 7 || h > 20) return;
      const half = m >= 30 ? "30" : "00";
      const key  = `${String(h).padStart(2,"0")}:${half}`;
      if (map.has(key)) map.get(key).push(apt);
    });
    return map;
  }, [appts]);

  const nowSlotKey = (() => {
    const h = now.getHours(), m = now.getMinutes();
    return `${String(h).padStart(2,"0")}:${m >= 30 ? "30" : "00"}`;
  })();

  return (
    <div style={{ position: "relative", paddingLeft: 72 }}>
      {/* Vertical line */}
      <div style={{ position: "absolute", left: 44, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #e2e8f0 0%, #e2e8f0 100%)", borderRadius: 1 }} />

      {Array.from(bySlot.entries()).map(([slotKey, slotAppts]) => {
        const [slotH, slotM]  = slotKey.split(":").map(Number);
        const slotStartMins   = slotH * 60 + slotM;
        const isHalfHour      = slotM === 30;
        const slotCount       = slotAppts.length;
        const slotCapacity    = 1; // one appointment per 30-min slot
        const capacityClass   = getSlotStatus(slotCount, slotCapacity);
        const dotColor  = capacityClass === "full" ? "#dc3545" : capacityClass === "warning" ? "#ffc107" : isHalfHour ? "#f1f5f9" : "#e2e8f0";
        const dotBorder = capacityClass === "full" ? "#dc3545" : capacityClass === "warning" ? "#ffc107" : isHalfHour ? "#e2e8f0" : "#cbd5e1";
        const isCurrentSlot   = isToday && nowSlotKey === slotKey;
        const posWithinSlot   = `${(((nowMins - slotStartMins) / 30) * 100).toFixed(0)}%`;
        // Half-hour rows are smaller and lighter to visually de-emphasise them
        const rowStyle = isHalfHour
          ? { marginBottom: 2, borderRadius: 6, position: "relative", opacity: 0.85 }
          : { marginBottom: 2, borderRadius: 8, position: "relative" };

        return (
          <div key={slotKey} className={`calendar-slot ${capacityClass}`} style={rowStyle}>
            {/* Current-time bar */}
            {isCurrentSlot && (
              <div style={{ position: "absolute", left: 44, right: 0, height: 2, background: "#ef4444", zIndex: 5, top: posWithinSlot }}>
                <div style={{ position: "absolute", left: -5, top: -4, width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              </div>
            )}

            {/* Slot label */}
            <div style={{ position: "relative", marginBottom: slotCount > 0 ? 6 : 0, display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: -72, width: 72, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", paddingRight: 14 }}>
                <span style={{ fontSize: isHalfHour ? 10 : 11, fontWeight: isHalfHour ? 500 : 700, color: isHalfHour ? "#94a3b8" : "#64748b", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {isHalfHour ? fmtTime12(slotKey) : fmtTime12(slotKey).replace(":00", "")}
                </span>
                <div style={{ width: isHalfHour ? 6 : 10, height: isHalfHour ? 6 : 10, borderRadius: "50%", background: dotColor, border: `2px solid ${dotBorder}`, flexShrink: 0, zIndex: 1, transition: "background 0.25s ease" }} />
              </div>
              {/* capacity badge */}
              {slotCount > 0 && (
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                  {capacityClass && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                      background: capacityClass === "full" ? "rgba(220,53,69,0.12)" : "rgba(255,193,7,0.15)",
                      color: capacityClass === "full" ? "#dc3545" : "#b45309",
                      border: `1px solid ${capacityClass === "full" ? "rgba(220,53,69,0.3)" : "rgba(255,193,7,0.4)"}`,
                      textTransform: "uppercase", letterSpacing: "0.4px",
                    }}>
                      {capacityClass === "full" ? "● Full" : "● Busy"}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Appointment cards or empty row */}
            {slotCount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {slotAppts.map(apt => (
                  <AptCard key={apt.id} apt={apt} todayKey={todayKey}
                    isCurrent={isToday && apt.id === currentAptId}
                    patientPhoto={patients?.find(p => p.id === apt.patientId)?.photo}
                    patientObj={patients?.find(p => p.id === apt.patientId)}
                    allAppointments={allAppointments}
                    isMobile={isMobile}
                    onOpenChart={onOpenChart} onCheckIn={onCheckIn}
                    onGoToSession={onGoToSession} onToggleVisitType={onToggleVisitType}
                    onUpdateStatus={onUpdateStatus} onReschedule={onReschedule} />
                ))}
              </div>
            ) : (
              <div style={{ padding: isHalfHour ? "4px 0" : "6px 0", color: "var(--text-dim)", fontSize: 10, fontStyle: "italic", borderBottom: `1px dashed ${isHalfHour ? "#f8fafc" : "#f1f5f9"}` }}>
                — open —
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MULTI-PROVIDER GRID  (AthenaOne-style)
   Rows = 30-min time slots · Columns = providers
══════════════════════════════════════════════ */
const VISIT_COLORS = {
  'New Patient':      '#f59e0b',
  'Follow-Up':        '#3b82f6',
  'Urgent':           '#ef4444',
  'Telehealth':       '#8b5cf6',
  'Medication Review':'#22c55e',
  'Office Visit':     '#06b6d4',
  'Phone Consult':    '#6b7280',
  'Procedure':        '#ec4899',
};

function MultiProviderGrid({ activeDate, siteProviders, allAppts, patients, todayKey, isToday, onCellClick, onAptClick }) {
  const DAY_START_MIN = 7 * 60;   // 7:00 AM
  const DAY_END_MIN   = 20 * 60;  // 8:00 PM
  const PX_PER_MIN    = 1.8;      // 30 min = 54px, 60 min = 108px, 15 min = 27px
  const TOTAL_H       = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;
  const COL    = 190;
  const TIME_W = 64;

  // Time marks for gutter labels + grid lines (every 30 min)
  const timeMarks = [];
  for (let mins = DAY_START_MIN; mins <= DAY_END_MIN; mins += 30) {
    const top    = (mins - DAY_START_MIN) * PX_PER_MIN;
    const h      = Math.floor(mins / 60);
    const m      = mins % 60;
    const key    = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    timeMarks.push({ top, key, isHalf: m === 30, mins });
  }

  // Group appointments by provider for this date
  const dayAppts = useMemo(() => {
    const map = {};
    siteProviders.forEach(p => { map[p.id] = []; });
    allAppts.filter(a => a.date === activeDate && a.provider && a.time).forEach(apt => {
      if (map[apt.provider]) map[apt.provider].push(apt);
    });
    return map;
  }, [siteProviders, allAppts, activeDate]); // eslint-disable-line

  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop  = isToday && nowMins >= DAY_START_MIN && nowMins <= DAY_END_MIN
    ? (nowMins - DAY_START_MIN) * PX_PER_MIN : null;

  const aptTop    = apt => { const [h,m] = apt.time.split(':').map(Number); return Math.max(0, (h*60+m - DAY_START_MIN) * PX_PER_MIN); };
  const aptHeight = apt => Math.max(22, (apt.duration || 30) * PX_PER_MIN);

  const handleColClick = (e, providerId) => {
    const rect  = e.currentTarget.getBoundingClientRect();
    const relY  = e.clientY - rect.top;
    const snap  = Math.floor(relY / PX_PER_MIN / 30) * 30;
    const mins  = DAY_START_MIN + snap;
    const h     = Math.floor(mins / 60);
    const m     = mins % 60;
    onCellClick?.(providerId, activeDate, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  if (siteProviders.length === 0) {
    return (
      <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
        No providers to display. Adjust the site filter or provider list.
      </div>
    );
  }

  return (
    <div style={{ overflowX:'auto', background:'#fff', border:'1px solid var(--border)', borderRadius:12 }}>
      <div style={{ minWidth: TIME_W + siteProviders.length * COL }}>

        {/* ── Sticky provider header ── */}
        <div style={{
          display:'grid',
          gridTemplateColumns:`${TIME_W}px repeat(${siteProviders.length}, ${COL}px)`,
          position:'sticky', top:0, zIndex:20,
          background:'#fff', borderBottom:'2px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ borderRight:'2px solid #e2e8f0' }} />
          {siteProviders.map(p => {
            const pc = provColor(p.id);
            const aptCount = (dayAppts[p.id] || []).length;
            return (
              <div key={p.id} style={{ padding:'10px 8px', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:pc, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0, marginBottom:2 }}>
                  {p.firstName?.[0]}{p.lastName?.[0]||''}
                </div>
                <div style={{ fontWeight:700, fontSize:11.5, textAlign:'center', color:'var(--text-primary)', lineHeight:1.2 }}>
                  {p.firstName} {p.lastName}
                </div>
                {(p.credentials || p.specialty) && (
                  <div style={{ fontSize:9.5, color:'var(--text-muted)', textAlign:'center' }}>{p.credentials || p.specialty}</div>
                )}
                <div style={{ fontSize:10, color: aptCount > 0 ? '#10b981' : '#94a3b8', fontWeight:600 }}>
                  {aptCount} appt{aptCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Grid body: time gutter + provider columns ── */}
        <div style={{ display:'flex' }}>
          {/* Time gutter */}
          <div style={{ width:TIME_W, flexShrink:0, position:'relative', height:TOTAL_H, borderRight:'2px solid #e2e8f0' }}>
            {timeMarks.map(({ top, key, isHalf }) => (
              <div key={key} style={{ position:'absolute', top: top - 7, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8, pointerEvents:'none' }}>
                <span style={{ fontSize:isHalf?10:12, fontWeight:isHalf?500:700, color:isHalf?'#94a3b8':'#475569', lineHeight:1, userSelect:'none' }}>
                  {isHalf ? fmtTime12(key) : fmtTime12(key).replace(':00','')}
                </span>
              </div>
            ))}
          </div>

          {/* Provider columns — absolute-positioned so block height = duration */}
          {siteProviders.map(p => (
            <div key={p.id}
              style={{ width:COL, flexShrink:0, position:'relative', height:TOTAL_H, borderLeft:'1px solid #f1f5f9', cursor:'cell' }}
              onClick={e => handleColClick(e, p.id)}
              title={`Click a time slot to book ${p.firstName}`}
            >
              {/* 30-min grid lines */}
              {timeMarks.map(({ top, key, isHalf }) => (
                <div key={key} style={{ position:'absolute', top, left:0, right:0, height:0,
                  borderTop:`1px ${isHalf?'dashed':'solid'} ${isHalf?'#e2e8f0':'#cbd5e1'}`, pointerEvents:'none' }} />
              ))}

              {/* Current time indicator */}
              {nowTop !== null && (
                <div style={{ position:'absolute', top:nowTop, left:0, right:0, height:2, background:'#ef4444', zIndex:5, pointerEvents:'none' }}>
                  <div style={{ position:'absolute', left:-4, top:-4, width:8, height:8, borderRadius:'50%', background:'#ef4444' }} />
                </div>
              )}

              {/* Appointment blocks — height reflects actual duration */}
              {(dayAppts[p.id] || []).map(apt => {
                const color    = VISIT_COLORS[apt.type] || '#6366f1';
                const top      = aptTop(apt);
                const height   = aptHeight(apt);
                const duration = apt.duration || 30;
                const isActive = apt.status === 'In Progress' || apt.status === 'Checked In';
                return (
                  <div key={apt.id}
                    onClick={e => { e.stopPropagation(); onAptClick?.(apt); }}
                    title={`${apt.patientName} · ${apt.type} · ${duration}m · ${apt.status}`}
                    style={{
                      position:'absolute', top: top + 1, left:3, right:3, height: height - 2,
                      background:`${color}15`, border:`1.5px solid ${color}60`,
                      borderLeft:`4px solid ${color}`, borderRadius:5,
                      padding:'3px 6px', overflow:'hidden', cursor:'pointer', zIndex:2,
                      boxShadow: isActive ? `0 0 0 2px ${color}40` : 'none',
                      transition:'box-shadow 0.15s',
                    }}
                  >
                    <div style={{ fontSize:9.5, fontWeight:800, color, lineHeight:1 }}>
                      {fmtTime12(apt.time || '')} {apt.visitType==='Telehealth'?'📹':''} · {duration}m
                    </div>
                    {height >= 42 && (
                      <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        {apt.patientName || 'Patient'}
                      </div>
                    )}
                    {height >= 58 && (
                      <div style={{ fontSize:9.5, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {apt.type}
                      </div>
                    )}
                    {apt.status !== 'Scheduled' && apt.status !== 'Confirmed' && height >= 70 && (
                      <div style={{ fontSize:8.5, fontWeight:700, color, marginTop:1, textTransform:'uppercase', letterSpacing:'0.3px' }}>{apt.status}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SCHEDULE MODAL
══════════════════════════════════════════════ */
function ScheduleModal({ show, onClose, initialDate, initialTime, initialVisitType, patients, onSave, defaultProvider, providers = [], existingAppts = [] }) {
  const defaultProviderId = defaultProvider || providers[0]?.id || "";
  const DURATION_BY_TYPE = { 'New Patient':60, 'Follow-Up':30, 'Urgent':30, 'Medication Review':30, 'Telehealth':30, 'Office Visit':30, 'Phone Consult':15, 'Procedure':60 };
  const EMPTY = { isNewPatient:false, patientId:"", newPatientName:"", provider:defaultProviderId,
    date:"", time:"09:00", duration:30, type:"Follow-Up", visitType:"In-Person", reason:"", room:"" };
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (show) { const initType = initialVisitType==="Telehealth" ? "Telehealth" : "Follow-Up"; const initDur = DURATION_BY_TYPE[initType]??30; const initProvider = defaultProvider||providers[0]?.id||""; const initDate = initialDate||""; setForm({ ...EMPTY, provider:initProvider, date:initDate, time:initialTime||computeFirstAvailable(initProvider, initDate, initDur), type:initType, duration:initDur, ...(initialVisitType==="Telehealth" ? { visitType:"Telehealth", room:"Virtual" } : {}) }); setSaved(false); } }, [show, initialDate, initialTime, initialVisitType, defaultProvider]); // eslint-disable-line
  // If providers load after the modal opens, auto-fill the provider field if it's still empty
  useEffect(() => { if (show && !form.provider && providers[0]?.id) setForm(f => ({ ...f, provider: defaultProvider || providers[0].id })); }, [show, providers]); // eslint-disable-line

  // When provider or date changes mid-form, jump to that provider's first open slot
  useEffect(() => { if (show && form.provider && form.date) upd('time', computeFirstAvailable(form.provider, form.date, form.duration)); }, [form.provider, form.date]); // eslint-disable-line
  const upd = (k, v) => setForm(f => ({ ...f, [k]:v }));

  // Convert HH:MM to total minutes
  const toMins = t => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };

  // First open slot for the given provider/date (walks 7am-8pm in 15-min steps)
  const computeFirstAvailable = (provider, date, dur) => {
    if (!provider || !date) return '07:00';
    const needed = Number(dur || 30);
    const provAppts = existingAppts.filter(
      a => a.provider === provider && a.date === date && a.status !== 'Cancelled' && a.status !== 'No Show' && a.time
    );
    for (let mins = 7 * 60; mins <= 20 * 60 - needed; mins += 15) {
      const slotEnd = mins + needed;
      const blocked = provAppts.some(a => {
        const s = toMins(a.time); const e = s + Number(a.duration || 30);
        return s < slotEnd && e > mins;
      });
      if (!blocked) return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
    }
    return '07:00';
  };

  const addMinutes = (time24, minsToAdd) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const total = h * 60 + m + Number(minsToAdd);
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
  };

  const [endTime, setEndTime] = useState('');
  useEffect(() => {
    setEndTime(addMinutes(form.time, form.duration || 30));
  }, [form.time, form.duration]); // eslint-disable-line

  // Provider double-booking check: does any existing (non-cancelled) appt for this provider overlap?
  const providerConflict = useMemo(() => {
    if (!form.provider || !form.date || !form.time) return null;
    const newStart = toMins(form.time);
    const newEnd   = newStart + Number(form.duration || 30);
    return existingAppts.find(a => {
      if (a.provider !== form.provider || a.date !== form.date) return false;
      if (a.status === 'Cancelled' || a.status === 'No Show') return false;
      if (!a.time) return false;
      const s = toMins(a.time); const e = s + Number(a.duration || 30);
      if (isNaN(s) || isNaN(e)) return false;
      return s < newEnd && e > newStart;
    }) || null;
  }, [form.provider, form.date, form.time, form.duration, existingAppts]); // eslint-disable-line

  // Patient same-day check: patient already has a non-cancelled appt this day
  // Match by ID first; fall back to name to catch appointments saved without patientId
  const patientConflict = useMemo(() => {
    if (form.isNewPatient || !form.patientId || !form.date) return null;
    const pat = (patients || []).find(p => p.id === form.patientId);
    const fullName = pat ? `${pat.firstName} ${pat.lastName}`.trim().toLowerCase() : null;
    return existingAppts.find(a => {
      if (a.date !== form.date) return false;
      if (a.status === 'Cancelled' || a.status === 'No Show') return false;
      if (a.patientId && a.patientId === form.patientId) return true;
      if (fullName && a.patientName?.trim().toLowerCase() === fullName) return true;
      return false;
    }) || null;
  }, [form.isNewPatient, form.patientId, form.date, existingAppts, patients]); // eslint-disable-line

  const canSubmit = form.date && form.time && form.provider &&
    (form.isNewPatient ? form.newPatientName.trim() : form.patientId) &&
    !providerConflict && !patientConflict;

  // Find the first open slot for the selected provider on the selected date
  const nextAvailableTime = useMemo(() => {
    if (!providerConflict || !form.provider || !form.date) return null;
    const provAppts = existingAppts
      .filter(a => a.provider === form.provider && a.date === form.date && a.status !== 'Cancelled' && a.status !== 'No Show' && a.time)
      .sort((a, b) => toMins(a.time) - toMins(b.time));
    const needed = Number(form.duration || 30);
    for (let mins = 7 * 60; mins <= 20 * 60 - needed; mins += 15) {
      const slotEnd = mins + needed;
      const blocked = provAppts.some(a => {
        const s = toMins(a.time); const e = s + Number(a.duration || 30);
        return s < slotEnd && e > mins;
      });
      if (!blocked) {
        const h = Math.floor(mins / 60); const m = mins % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      }
    }
    return null;
  }, [providerConflict, form.provider, form.date, form.duration, existingAppts]); // eslint-disable-line

  const handleSubmit = () => {
    if (!canSubmit) return;
    const prov = providers.find(p => p.id===form.provider);
    const pat = form.isNewPatient ? null : (patients||[]).find(p => p.id===form.patientId);
    const patientName = form.isNewPatient ? `New Patient - ${form.newPatientName.trim()}` : pat ? `${pat.firstName} ${pat.lastName}` : "";
    onSave({ patientId: form.isNewPatient?null:form.patientId||null, patientName,
      provider:form.provider, providerName:prov?`${prov.firstName} ${prov.lastName}`.trim():"",
      date:form.date, time:form.time, duration:Number(form.duration), type:form.type,
      status:"Scheduled", reason:form.reason.trim(), visitType:form.visitType,
      room:form.room.trim()||(form.visitType==="Telehealth"?"Virtual":"") });
    setSaved(true); setTimeout(() => onClose(), 1200);
  };
  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:580, boxShadow:"var(--shadow-overlay)", overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>📅 Schedule Appointment</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Create a new patient appointment</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8,
            color:"#fff", fontWeight:800, fontSize:20, width:32, height:32, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        {/* Conflict banners — pinned above the scrollable form so they're always visible */}
        {(providerConflict || patientConflict) && (
          <div style={{ padding:"0 22px 0", display:"flex", flexDirection:"column", gap:6, borderBottom:"1px solid #fee2e2" }}>
            {providerConflict && (
              <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#991b1b", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginTop:12, marginBottom: patientConflict ? 0 : 12 }}>
                <span>⛔ Time taken — provider booked at {fmtTime12(providerConflict.time)} ({providerConflict.duration||30} min). Change the time or provider.</span>
                {nextAvailableTime && (
                  <button type="button" onClick={() => upd('time', nextAvailableTime)}
                    style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Use {fmtTime12(nextAvailableTime)}
                  </button>
                )}
              </div>
            )}
            {patientConflict && (
              <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#991b1b", fontWeight:600, marginBottom:12 }}>
                ⛔ Patient already scheduled today at {fmtTime12(patientConflict.time)}. One appointment per patient per day.
              </div>
            )}
          </div>
        )}
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, maxHeight:"72vh", overflowY:"auto" }}>
          <div>
            <LBL c="Patient Type" />
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {[{val:false,label:"Existing Patient"},{val:true,label:"New Patient"}].map(o => (
                <button key={String(o.val)} type="button" onClick={() => { upd("isNewPatient",o.val); upd("patientId",""); upd("newPatientName",""); }}
                  style={{ flex:1, padding:"8px 0", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                    border:`2px solid ${form.isNewPatient===o.val?"#4f46e5":"#e2e8f0"}`,
                    background:form.isNewPatient===o.val?"#ede9fe":"#f8fafc",
                    color:form.isNewPatient===o.val?"#4f46e5":"#64748b" }}>{o.label}</button>
              ))}
            </div>
            {form.isNewPatient
              ? <input type="text" className="form-input" placeholder="Full name of new patient" value={form.newPatientName} onChange={e=>upd("newPatientName",e.target.value)} />
              : <select className="form-input" value={form.patientId} onChange={e=>upd("patientId",e.target.value)}>
                  <option value="">— Select patient —</option>
                  {(patients||[]).filter(p=>p.isActive!==false).map(p=>(
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.mrn}</option>
                  ))}
                </select>}
          </div>
          <div>
            <LBL c="Provider" />
            <select className="form-input" value={form.provider} onChange={e=>upd("provider",e.target.value)}>
              {providers.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.credentials?" — "+p.credentials:""}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            <div><LBL c="Date" /><input type="date" className="form-input" value={form.date} onChange={e=>upd("date",e.target.value)} /></div>
            <div><LBL c="Start Time" /><input type="time" className="form-input" value={form.time} onChange={e=>upd("time",e.target.value)} /></div>
            <div>
              <LBL c="End Time" />
              <div style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc",
                fontSize:13, color:"#475569", fontWeight:700, display:"flex", alignItems:"center", height:38, gap:6 }}>
                <span style={{ fontSize:10, color:"#94a3b8" }}>→</span>
                {endTime ? fmtTime12(endTime) : '—'}
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <LBL c="Visit Type" />
              <select className="form-input" value={form.visitType} onChange={e=>{ upd("visitType",e.target.value); if(e.target.value==="Telehealth") upd("room","Virtual"); }}>
                <option>In-Person</option><option>Telehealth</option>
              </select>
            </div>
            <div>
              <LBL c="Appointment Type" />
              <select className="form-input" value={form.type} onChange={e=>{ upd("type",e.target.value); upd("duration", DURATION_BY_TYPE[e.target.value]??30); }}>
                <option>Follow-Up</option><option>New Patient</option><option>Urgent</option><option>Medication Review</option><option>Telehealth</option><option>Office Visit</option><option>Phone Consult</option><option>Procedure</option>
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <LBL c="Duration" />
              <select className="form-input" value={form.duration} onChange={e=>upd("duration",Number(e.target.value))}>
                {[15,20,30,45,60,90].map(d=><option key={d} value={d}>{d} minutes</option>)}
              </select>
            </div>
            <div>
              <LBL c="Room / Location" />
              <input type="text" className="form-input" placeholder={form.visitType==="Telehealth"?"Virtual":"e.g., Room 1"} value={form.room} onChange={e=>upd("room",e.target.value)} />
            </div>
          </div>
          <div>
            <LBL c="Reason for Visit" />
            <input type="text" className="form-input" placeholder="Chief complaint or reason..." value={form.reason} onChange={e=>upd("reason",e.target.value)} />
          </div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {saved ? <span style={{ fontSize:13, color:"#166534", fontWeight:700 }}>✅ Appointment scheduled!</span> : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!canSubmit||saved} onClick={handleSubmit}
              title={providerConflict?"Provider already booked at this time":patientConflict?"Patient already scheduled today":!form.provider?"Select a provider":!form.date||!form.time?"Fill in date and time":!(form.isNewPatient?form.newPatientName.trim():form.patientId)?"Select a patient":""}
              style={{ opacity:canSubmit&&!saved?1:0.5, cursor:canSubmit&&!saved?"pointer":"not-allowed" }}>📅 Confirm Appointment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   FRONT DESK – WAITING ROOM ROW
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   PRE-VISIT VERIFICATION MODAL
══════════════════════════════════════════════ */
function PreVisitModal({ apt, patient, show, onClose, onCheckIn }) {
  const [checks, setChecks] = useState({ identity:false, insurance:false, copay:false, eligibility:false, balance:false, reason:false, meds:false, tech:false });
  const [eligState, setEligState] = useState(null);
  useEffect(() => { if (show) { setChecks({ identity:false, insurance:false, copay:false, eligibility:false, balance:false, reason:false, meds:false, tech:false }); setEligState(null); } }, [show]);
  if (!show || !apt) return null;
  const pat = patient;
  const copay = pat?.insurance?.primary?.copay;
  const hasCopay = copay !== undefined && copay !== null && copay > 0;
  const isTelehealth = apt.visitType === 'Telehealth';
  const checkElig = () => {
    setEligState('checking');
    setTimeout(() => {
      const ok = !!(pat?.insurance?.primary?.name && pat?.insurance?.primary?.memberId);
      setEligState(ok ? 'eligible' : 'unknown');
      if (ok) setChecks(c => ({...c, eligibility:true}));
    }, 1400);
  };
  const checkItems = [
    { key:'identity',    icon:'🪪', label:'Identity verified (name, DOB, photo ID)' },
    { key:'insurance',   icon:'🏥', label:`Insurance confirmed (${pat?.insurance?.primary?.name||'no plan on file'})` },
    { key:'copay',       icon:'💰', label: hasCopay ? `Copay of $${copay} discussed` : 'Copay reviewed — none due' },
    { key:'eligibility', icon:'✅', label:'Eligibility verified' },
    { key:'balance',     icon:'💳', label: (pat?.balanceDue||0)>0 ? `Balance of $${pat.balanceDue} reviewed` : 'Balance reviewed — none due' },
    { key:'reason',      icon:'📋', label:'Appointment reason confirmed' },
    { key:'meds',        icon:'💊', label:'Medications & allergies reviewed' },
    ...(isTelehealth ? [{ key:'tech', icon:'📹', label:'Tech check passed (camera & audio)' }] : []),
  ];
  const sectionBox = (bg, border) => ({ background:bg, borderRadius:10, padding:'12px 14px', border:`1px solid ${border}`, marginBottom:0 });
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:3500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#1e3a8a,#2563eb)', color:'#fff', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>🔍 Pre-Visit Verification</div>
            <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>{apt.patientName} · {fmtTime12(apt.time)} · {apt.type} · {apt.providerName}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:6, width:28, height:28, fontSize:18, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          {/* Identity */}
          <div style={sectionBox('#f8fafc','#e2e8f0')}>
            <div style={{ fontWeight:700, fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>🪪 Patient Identity</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 16px', fontSize:12 }}>
              <div><span style={{ color:'#64748b' }}>Name: </span><strong>{pat ? `${pat.firstName} ${pat.lastName}` : apt.patientName}</strong></div>
              <div><span style={{ color:'#64748b' }}>DOB: </span><strong>{pat?.dob||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>MRN: </span><strong>{pat?.mrn||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Visit type: </span><strong>{apt.visitType||'In-Person'}</strong></div>
            </div>
          </div>
          {/* Insurance */}
          <div style={sectionBox('#eff6ff','#bfdbfe')}>
            <div style={{ fontWeight:700, fontSize:10, color:'#1e40af', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>🏥 Insurance & Eligibility</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 16px', fontSize:12, marginBottom:10 }}>
              <div><span style={{ color:'#64748b' }}>Insurer: </span><strong>{pat?.insurance?.primary?.name||'None on file'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Member ID: </span><strong>{pat?.insurance?.primary?.memberId||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Group #: </span><strong>{pat?.insurance?.primary?.groupNumber||'—'}</strong></div>
              <div><span style={{ color:'#64748b' }}>Copay: </span><strong style={{ color:hasCopay?'#1e40af':'#166534' }}>{hasCopay?`$${copay}`:'None'}</strong></div>
            </div>
            {(pat?.balanceDue||0)>0 && (
              <div style={{ background:'#fee2e2', borderRadius:6, padding:'6px 10px', fontSize:11, fontWeight:700, color:'#991b1b', marginBottom:8 }}>⚠️ Balance due: ${pat.balanceDue} — collect or note</div>
            )}
            <button onClick={checkElig} disabled={eligState==='checking'}
              style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', cursor:eligState==='checking'?'default':'pointer',
                background:eligState==='eligible'?'#dcfce7':eligState==='unknown'?'#fef3c7':'#dbeafe',
                color:eligState==='eligible'?'#166534':eligState==='unknown'?'#92400e':'#1d4ed8' }}>
              {eligState==='checking'?'⏳ Checking…':eligState==='eligible'?'✅ Eligible':eligState==='unknown'?'⚠️ Unknown — verify manually':'🔍 Check Eligibility'}
            </button>
          </div>
          {/* Visit + Clinical */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={sectionBox('#f8fafc','#e2e8f0')}>
              <div style={{ fontWeight:700, fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>📋 Visit</div>
              <div style={{ fontSize:12 }}>
                <div><span style={{ color:'#64748b' }}>Type: </span><strong>{apt.type}</strong></div>
                <div style={{ marginTop:4 }}><span style={{ color:'#64748b' }}>Reason: </span><strong>{apt.reason||'—'}</strong></div>
              </div>
            </div>
            <div style={sectionBox('#fdf4ff','#e9d5ff')}>
              <div style={{ fontWeight:700, fontSize:10, color:'#7e22ce', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>💊 Clinical</div>
              <div style={{ fontSize:12 }}>
                <div><strong>{(pat?.meds||[]).filter(m=>m.active!==false).length}</strong> <span style={{ color:'#64748b' }}>active meds</span></div>
                <div style={{ marginTop:4, color:(pat?.allergies||[]).length>0?'#991b1b':'#166534', fontWeight:700, fontSize:11 }}>
                  {(pat?.allergies||[]).length>0 ? (pat.allergies).slice(0,2).map(a=>a.allergen||a.name||a).join(', ')+((pat.allergies.length>2)?'…':'') : '✓ NKDA'}
                </div>
              </div>
            </div>
          </div>
          {/* Tech check */}
          {isTelehealth && (
            <div style={sectionBox('#ecfdf5','#a7f3d0')}>
              <div style={{ fontWeight:700, fontSize:10, color:'#065f46', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>📹 Telehealth Tech Check</div>
              <div style={{ fontSize:12, color:'#064e3b', display:'flex', flexDirection:'column', gap:3 }}>
                <span>• Confirm platform link sent to patient</span>
                <span>• Test camera &amp; audio before session</span>
                <span>• Room: <strong>{apt.room||'Virtual'}</strong></span>
              </div>
            </div>
          )}
          {/* Checklist */}
          <div style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1.5px solid #e2e8f0' }}>
            <div style={{ fontWeight:700, fontSize:10, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>✅ Verification Checklist</div>
            {checkItems.map((item,i) => (
              <label key={item.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', cursor:'pointer', fontSize:13,
                borderBottom: i<checkItems.length-1?'1px solid #f1f5f9':'none' }}>
                <input type="checkbox" checked={checks[item.key]} onChange={() => setChecks(c=>({...c,[item.key]:!c[item.key]}))}
                  style={{ width:16, height:16, flexShrink:0, cursor:'pointer', accentColor:'#22c55e' }} />
                <span style={{ opacity:checks[item.key]?1:0.6, textDecoration:checks[item.key]?'line-through':'none', transition:'all 0.15s' }}>{item.icon} {item.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafafa', borderRadius:'0 0 16px 16px' }}>
          <button onClick={onClose}
            style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid #d1d5db', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' }}>
            Skip for now
          </button>
          <button onClick={() => { onCheckIn(apt); onClose(); }}
            style={{ padding:'9px 22px', borderRadius:8, border:'none', background:'#22c55e', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            ✓ Check In Patient
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   WAITING ROOM ROW  —  state-machine driven
══════════════════════════════════════════════ */
function WaitingRow({ apt, onCheckIn, onNoShow, onCancel, onGoToSession, onCheckout, onReschedule, onArrived, onToggleVisitType, onPreVerify, todayKey, patients, isMobile }) {
  const c = getTypeColor(apt);
  const pc = provColor(apt.provider);
  const pat = patients?.find(p => p.id === apt.patientId);
  const copay = pat?.insurance?.primary?.copay;
  const balanceDue = pat?.balanceDue;
  const isToday = apt.date === todayKey;
  const ss = getStatusStyle(apt.status);

  // Live tick — re-renders every 30 s while patient is waiting/roomed
  const [, setTick] = useState(0);
  useEffect(() => {
    if (apt.status !== 'Checked In' && apt.status !== 'Arrived') return;
    const id = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [apt.status]);

  const waitMins = (() => {
    if (apt.status === 'Checked In' && apt.checkInTime)  return Math.floor((Date.now() - apt.checkInTime)  / 60000);
    if (apt.status === 'Arrived'    && apt.arrivedTime)  return Math.floor((Date.now() - apt.arrivedTime)  / 60000);
    return null;
  })();

  const rowBorder = apt.status==='Arrived'?'#f97316':apt.status==='In Progress'?'#7c3aed':'#e2e8f0';
  const rowBg     = apt.status==='Arrived'?'#fffbf5':apt.status==='In Progress'?'#faf8ff':'#fff';

  return (
    <div style={{ display:'flex', alignItems:'stretch', borderRadius:10, overflow:'hidden',
      border:`1.5px solid ${rowBorder}`, background:rowBg, marginBottom:8,
      boxShadow:'var(--shadow-sm)', transition:'box-shadow 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow-sm)'}>
      <div style={{ width:5, background:ss.dot, flexShrink:0 }} />
      <div style={{ flex:1, padding:'11px 14px', display:'flex', flexDirection:'column', gap:0 }}>

        {/* Row 1: time · avatar · name · balance alert · status pill */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ minWidth:52, textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:800, color:c.text }}>{fmtTime12(apt.time)}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>{apt.duration||30}m</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, overflow:'hidden' }}>
              {pat?.photo
                ? <img src={pat.photo} alt={apt.patientName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,${c.border},${c.dot})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12 }}>
                    {apt.patientName?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}
                  </div>
              }
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{apt.patientName}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {pat?.mrn?pat.mrn+' · ':''}{apt.type||'Visit'}{apt.reason?' · '+apt.reason:''}{apt.room?' · '+apt.room:''}
              </div>
            </div>
          </div>
          {(balanceDue||0)>0 && (
            <div title={`Balance due: $${balanceDue}`}
              style={{ flexShrink:0, background:'#fee2e2', color:'#991b1b', borderRadius:5, padding:'2px 6px', fontSize:9, fontWeight:800 }}>
              ${balanceDue}
            </div>
          )}
          <div style={{ flexShrink:0 }}><Pill label={apt.status} /></div>
        </div>

        {/* Row 2: provider · copay · wait timer · actions */}
        <div style={{ display:'flex', alignItems:'center', gap:isMobile?6:12, flexWrap:'wrap', paddingLeft:isMobile?60:0, marginTop:8 }}>
          {/* Provider chip */}
          <div style={{ display:'flex', alignItems:'center', gap:5, background:'#f8fafc', border:`1px solid ${pc}30`, borderRadius:7, padding:'4px 8px', flexShrink:0 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:pc, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800 }}>
              {apt.providerName?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}
            </div>
            <span style={{ fontSize:10.5, fontWeight:600, color:pc, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{apt.providerName}</span>
          </div>

          {/* Copay */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
            <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>Copay</div>
            <div style={{ fontSize:12, fontWeight:800, color:copay===0?'#166534':'#1e40af' }}>
              {copay===undefined||copay===null?'—':copay===0?'None':`$${copay}`}
            </div>
          </div>

          {/* Live wait timer */}
          {waitMins !== null && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>
                {apt.status==='Arrived'?'Prov Wait':'Wait'}
              </div>
              <div style={{ fontSize:12, fontWeight:800, color:waitMins>20?'#dc2626':waitMins>10?'#d97706':'#166534' }}>{waitMins}m</div>
            </div>
          )}

          {/* ── STATE-MACHINE ACTIONS ── */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginLeft:'auto' }} onClick={e=>e.stopPropagation()}>
            {/* Scheduled / Confirmed → Verify + Check In */}
            {(apt.status==='Scheduled'||apt.status==='Confirmed') && isToday && (
              <>
                {onPreVerify && (
                  <button onClick={() => onPreVerify(apt)}
                    style={{ padding:'5px 9px', borderRadius:7, fontSize:11, fontWeight:700,
                      border:'1px solid #3b82f6', background:'#eff6ff', color:'#1d4ed8', cursor:'pointer' }}>🔍 Verify</button>
                )}
                <button onClick={() => onCheckIn(apt)}
                  style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', background:'#22c55e', color:'#fff', cursor:'pointer' }}>✓ Check In</button>
              </>
            )}
            {/* Checked In → Arrived (patient roomed, freeze wait timer, start provider wait) */}
            {apt.status==='Checked In' && (
              <button onClick={() => onArrived?.(apt)}
                style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', background:'#f97316', color:'#fff', cursor:'pointer' }}>🚪 Arrived</button>
            )}
            {/* Arrived → Go to Session (provider enters) */}
            {apt.status==='Arrived' && (
              <button onClick={() => onGoToSession(apt)}
                style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', background:'#7c3aed', color:'#fff', cursor:'pointer' }}>🩺 Go to Session</button>
            )}
            {/* In Session → Checkout */}
            {apt.status==='In Progress' && (
              <button onClick={() => onCheckout(apt)}
                style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'none', background:'#0891b2', color:'#fff', cursor:'pointer' }}>✔ Checkout</button>
            )}
            {/* Completed → Reschedule */}
            {apt.status==='Completed' && (
              <button onClick={() => onReschedule(apt)}
                style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid #4f46e5', background:'#ede9fe', color:'#4f46e5', cursor:'pointer' }}>↺ Reschedule</button>
            )}
            {/* No Show / Cancel for pre-session states */}
            {(apt.status==='Scheduled'||apt.status==='Confirmed'||apt.status==='Checked In'||apt.status==='Arrived') && (
              <>
                <button onClick={() => onNoShow(apt)}
                  style={{ padding:'5px 8px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid #f59e0b', background:'#fef3c7', color:'#92400e', cursor:'pointer' }}>No Show</button>
                <button onClick={() => onCancel(apt)}
                  style={{ padding:'5px 8px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b', cursor:'pointer' }}>Cancel</button>
              </>
            )}
            {(apt.status==='No Show'||apt.status==='Cancelled') && (
              <button onClick={() => onReschedule(apt)}
                style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid #4f46e5', background:'#ede9fe', color:'#4f46e5', cursor:'pointer' }}>↺ Reschedule</button>
            )}
            {/* Visit type toggle */}
            {apt.status!=='Completed'&&apt.status!=='Cancelled'&&apt.status!=='No Show'&&apt.status!=='Checked Out' && (
              <button onClick={() => onToggleVisitType(apt)} title={apt.visitType==='Telehealth'?'Switch to In-Person':'Switch to Telehealth'}
                style={{ padding:'5px 8px', borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer',
                  border:`1px solid ${apt.visitType==='Telehealth'?'#3b82f6':'#8b5cf6'}`,
                  background:apt.visitType==='Telehealth'?'#eff6ff':'#f5f3ff',
                  color:apt.visitType==='Telehealth'?'#1d4ed8':'#6d28d9' }}>
                {apt.visitType==='Telehealth'?'🏥':'📹'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CHECKOUT MODAL
══════════════════════════════════════════════ */
function CheckoutModal({ apt, patients, show, onClose, onConfirm }) {
  const [copayCollected, setCopayCollected] = useState(false);
  const [payMethod, setPayMethod] = useState("Credit Card");
  const [followUp, setFollowUp] = useState("4 weeks");
  const [followUpType, setFollowUpType] = useState("Follow-Up");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => { if (show) { setCopayCollected(false); setPayMethod("Credit Card"); setFollowUp("4 weeks"); setFollowUpType("Follow-Up"); setNotes(""); setDone(false); } }, [show]);
  if (!show || !apt) return null;
  const pat = patients?.find(p => p.id === apt.patientId);
  const copay = pat?.insurance?.primary?.copay;
  const hasCopay = copay !== undefined && copay !== null && copay > 0;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, boxShadow:"var(--shadow-overlay)", overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", background:"linear-gradient(135deg,#0891b2,#0e7490)", color:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>✔ Visit Checkout</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{apt.patientName} — {fmtTime12(apt.time)}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8,
            color:"#fff", fontWeight:800, fontSize:20, width:32, height:32, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          {/* Insurance / Copay */}
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#166534", marginBottom:8 }}>💳 Copay & Insurance</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:12 }}>
              <div><span style={{ color:"var(--text-muted)" }}>Insurance: </span><strong>{pat?.insurance?.primary?.name||"None on file"}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Member ID: </span><strong>{pat?.insurance?.primary?.memberId||"—"}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Group #: </span><strong>{pat?.insurance?.primary?.groupNumber||"—"}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Copay: </span>
                <strong style={{ color:hasCopay?"#1e40af":"#166534" }}>{hasCopay?`$${copay}`:"None"}</strong></div>
            </div>
            {hasCopay && (
              <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                  <input type="checkbox" checked={copayCollected} onChange={e=>setCopayCollected(e.target.checked)}
                    style={{ width:16, height:16 }} />
                  Copay collected (${copay})
                </label>
                {copayCollected && (
                  <select className="form-input" value={payMethod} onChange={e=>setPayMethod(e.target.value)}
                    style={{ fontSize:12, padding:"4px 8px", height:"auto" }}>
                    <option>Credit Card</option><option>Debit Card</option><option>Cash</option><option>Check</option><option>HSA/FSA</option>
                  </select>
                )}
              </div>
            )}
          </div>
          {/* Follow-up */}
          <div>
            <LBL c="Schedule Follow-Up" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <select className="form-input" value={followUp} onChange={e=>setFollowUp(e.target.value)}>
                <option>1 week</option><option>2 weeks</option><option>4 weeks</option><option>6 weeks</option>
                <option>2 months</option><option>3 months</option><option>6 months</option><option>As needed</option><option>None</option>
              </select>
              <select className="form-input" value={followUpType} onChange={e=>setFollowUpType(e.target.value)}>
                <option>Follow-Up</option><option>Medication Review</option><option>Telehealth</option><option>Urgent</option>
              </select>
            </div>
          </div>
          {/* Notes */}
          <div>
            <LBL c="Checkout Notes" />
            <textarea className="form-input" rows={2} placeholder="After-visit instructions, referrals, lab orders sent..." value={notes} onChange={e=>setNotes(e.target.value)}
              style={{ resize:"vertical", fontFamily:"inherit", fontSize:12 }} />
          </div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {done ? <span style={{ fontSize:13, color:"#166534", fontWeight:700 }}>✅ Checkout complete!</span> : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={done}
              style={{ background:"#0891b2", borderColor:"#0891b2" }}
              onClick={() => {
                onConfirm({ ...apt, copayCollected, payMethod: hasCopay ? payMethod : null, followUp, followUpType, checkoutNotes: notes.trim() });
                setDone(true); setTimeout(() => onClose(), 1400);
              }}>✔ Complete Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   RESCHEDULE MODAL
══════════════════════════════════════════════ */
function RescheduleModal({ apt, show, onClose, onConfirm }) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => { if (show) { setNewDate(""); setNewTime("09:00"); setReason(""); setDone(false); } }, [show]);
  if (!show || !apt) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:420, boxShadow:"var(--shadow-overlay)", overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800, fontSize:15 }}>🔄 Reschedule</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8,
            color:"#fff", fontWeight:800, fontSize:18, width:28, height:28, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:12, color:"var(--text-muted)" }}>
            Rescheduling: <strong style={{ color:"var(--text-primary)" }}>{apt.patientName}</strong> — originally {apt.date} at {fmtTime12(apt.time)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><LBL c="New Date" /><input type="date" className="form-input" value={newDate} onChange={e=>setNewDate(e.target.value)} /></div>
            <div><LBL c="New Time" /><input type="time" className="form-input" value={newTime} onChange={e=>setNewTime(e.target.value)} /></div>
          </div>
          <div>
            <LBL c="Reason for Rescheduling" />
            <input type="text" className="form-input" placeholder="Patient request, provider unavailable..." value={reason} onChange={e=>setReason(e.target.value)} />
          </div>
        </div>
        <div style={{ padding:"12px 20px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {done ? <span style={{ fontSize:12, color:"#166534", fontWeight:700 }}>✅ Rescheduled!</span> : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!newDate||done}
              style={{ opacity:newDate&&!done?1:0.45 }}
              onClick={() => { if(!newDate) return; onConfirm(apt, newDate, newTime, reason); setDone(true); setTimeout(()=>onClose(),1200); }}>
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   WALK-IN MODAL
══════════════════════════════════════════════ */
function WalkInModal({ show, onClose, patients, onSave, providers = [] }) {
  const EMPTY = { isNewPatient:false, patientId:"", newPatientName:"", provider:providers[0]?.id||"",
    type:"Urgent", reason:"", room:"", insurance:"", copay:"" };
  const [form, setForm] = useState(EMPTY);
  const [done, setDone] = useState(false);
  useEffect(() => { if (show) { setForm(EMPTY); setDone(false); } }, [show]);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const canSubmit = form.provider && (form.isNewPatient ? form.newPatientName.trim() : form.patientId);
  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2100,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:500, boxShadow:"var(--shadow-overlay)", overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>🚶 Walk-In Patient</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Register unscheduled arrival</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8,
            color:"#fff", fontWeight:800, fontSize:20, width:32, height:32, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <LBL c="Patient Type" />
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {[{val:false,label:"Existing Patient"},{val:true,label:"New Patient"}].map(o=>(
                <button key={String(o.val)} type="button" onClick={() => { upd("isNewPatient",o.val); upd("patientId",""); upd("newPatientName",""); }}
                  style={{ flex:1, padding:"7px 0", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                    border:`2px solid ${form.isNewPatient===o.val?"#dc2626":"#e2e8f0"}`,
                    background:form.isNewPatient===o.val?"#fee2e2":"#f8fafc",
                    color:form.isNewPatient===o.val?"#dc2626":"#64748b" }}>{o.label}</button>
              ))}
            </div>
            {form.isNewPatient
              ? <input type="text" className="form-input" placeholder="Full name" value={form.newPatientName} onChange={e=>upd("newPatientName",e.target.value)} />
              : <select className="form-input" value={form.patientId} onChange={e=>upd("patientId",e.target.value)}>
                  <option value="">— Select patient —</option>
                  {(patients||[]).filter(p=>p.isActive!==false).map(p=>(
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.mrn}</option>
                  ))}
                </select>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <LBL c="Provider" />
              <select className="form-input" value={form.provider} onChange={e=>upd("provider",e.target.value)}>
                {providers.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div>
              <LBL c="Visit Reason" />
              <select className="form-input" value={form.type} onChange={e=>upd("type",e.target.value)}>
                <option>Urgent</option><option>Follow-Up</option><option>Medication Review</option><option>New Patient</option>
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <LBL c="Room" />
              <input type="text" className="form-input" placeholder="e.g., Room 2" value={form.room} onChange={e=>upd("room",e.target.value)} />
            </div>
            <div>
              <LBL c="Insurance (if known)" />
              <input type="text" className="form-input" placeholder="Carrier name" value={form.insurance} onChange={e=>upd("insurance",e.target.value)} />
            </div>
          </div>
          <div>
            <LBL c="Chief Complaint" />
            <input type="text" className="form-input" placeholder="Reason for today's visit..." value={form.reason} onChange={e=>upd("reason",e.target.value)} />
          </div>
        </div>
        <div style={{ padding:"12px 20px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {done ? <span style={{ fontSize:12, color:"#166534", fontWeight:700 }}>✅ Walk-in checked in!</span> : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button disabled={!canSubmit||done} onClick={() => {
              if (!canSubmit) return;
              const prov = providers.find(p=>p.id===form.provider);
              const pat = form.isNewPatient ? null : (patients||[]).find(p=>p.id===form.patientId);
              const now = new Date();
              const hh = String(now.getHours()).padStart(2,"0");
              const mm = String(now.getMinutes()).padStart(2,"0");
              onSave({ patientId:form.isNewPatient?null:form.patientId||null,
                patientName:form.isNewPatient?`New Patient - ${form.newPatientName.trim()}`:pat?`${pat.firstName} ${pat.lastName}`:"",
                provider:form.provider, providerName:prov?`${prov.firstName} ${prov.lastName}`.trim():"",
                date:toKey(getToday()), time:`${hh}:${mm}`, duration:30, type:form.type,
                status:"Checked In", reason:form.reason.trim(), visitType:"In-Person",
                room:form.room.trim(), isWalkIn:true, checkInTime:Date.now() });
              setDone(true); setTimeout(()=>onClose(),1200);
            }} style={{ padding:"6px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none",
              background: canSubmit&&!done?"#dc2626":"#f87171", color:"#fff", cursor: canSubmit&&!done?"pointer":"not-allowed" }}>
              🚶 Check In Walk-In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   FRONT DESK TAB COMPONENT
══════════════════════════════════════════════ */
function FrontDeskTab({ allAppts, patients, todayKey, updateAppointmentStatus, addAppointment, selectPatient, navigate, isMobile }) {
  const [fdFilter, setFdFilter] = useState("All");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [preVerifyApt, setPreVerifyApt] = useState(null);
  const [toast, setToast] = useState(null);
  const [alertThresholds, setAlertThresholds] = useState({ wait: 20, provWait: 10 });
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const toastTimerFD = useRef(null);
  const alertIntervalRef = useRef(null);
  useEffect(() => { return () => { if (toastTimerFD.current) clearTimeout(toastTimerFD.current); }; }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (toastTimerFD.current) clearTimeout(toastTimerFD.current);
    toastTimerFD.current = setTimeout(() => setToast(null), 3500);
  };

  const todayApts = useMemo(() =>
    allAppts.filter(a => a.date === todayKey).sort((a,b) => a.time.localeCompare(b.time)),
    [allAppts, todayKey]
  );

  const FD_FILTERS = [
    { key:"All",          label:"All Today",    color:"#475569" },
    { key:"Scheduled",    label:"Scheduled",    color:"#3b82f6" },
    { key:"Confirmed",    label:"Confirmed",    color:"#1e40af" },
    { key:"Checked In",   label:"Checked In",   color:"#22c55e" },
    { key:"Arrived",      label:"Arrived",      color:"#f97316" },
    { key:"In Progress",  label:"In Session",   color:"#7c3aed" },
    { key:"Checked Out",  label:"Checked Out",  color:"#0f766e" },
    { key:"Completed",    label:"Enc. Closed",  color:"#3730a3" },
    { key:"No Show",      label:"No Show",      color:"#d97706" },
    { key:"Cancelled",    label:"Cancelled",    color:"#ef4444" },
  ];

  const filtered = useMemo(() => {
    if (fdFilter === "All") return todayApts;
    return todayApts.filter(a => a.status === fdFilter);
  }, [todayApts, fdFilter]);

  const counts = useMemo(() => {
    const c = {};
    FD_FILTERS.forEach(f => {
      c[f.key] = f.key === "All" ? todayApts.length : todayApts.filter(a => a.status === f.key).length;
    });
    return c;
  }, [todayApts]);

  const handleCheckIn = useCallback(apt => {
    updateAppointmentStatus(apt.id, "Checked In", { checkInTime: Date.now() });
    showToast(`${apt.patientName} checked in`);
  }, [updateAppointmentStatus]);

  const handleGoToSession = useCallback(apt => {
    if (apt.patientId) selectPatient(apt.patientId);
    navigate(`/session/${apt.id}`);
  }, [selectPatient, navigate]);

  const handleNoShow = useCallback(apt => {
    updateAppointmentStatus(apt.id, "No Show");
    showToast(`Marked as no show: ${apt.patientName}`, "warning");
  }, [updateAppointmentStatus]);

  const handleCancel = useCallback(apt => {
    updateAppointmentStatus(apt.id, "Cancelled");
    showToast(`Cancelled: ${apt.patientName}`, "error");
  }, [updateAppointmentStatus]);

  const handleArrived = useCallback(apt => {
    updateAppointmentStatus(apt.id, "Arrived", { arrivedTime: Date.now() });
    showToast(`${apt.patientName} roomed — provider notified`);
  }, [updateAppointmentStatus]);

  const handlePreVerify = useCallback(apt => {
    setPreVerifyApt(apt);
  }, []);

  const handleCheckout = useCallback(apt => {
    setCheckoutApt(apt);
  }, []);

  const handleCheckoutConfirm = useCallback(data => {
    updateAppointmentStatus(data.id, "Checked Out");
    showToast(`Checkout complete: ${data.patientName}`);
  }, [updateAppointmentStatus]);

  const handleReschedule = useCallback(apt => {
    setRescheduleApt(apt);
  }, []);

  const handleRescheduleConfirm = useCallback((apt, newDate, newTime, reason) => {
    updateAppointmentStatus(apt.id, "Rescheduled");
    addAppointment({
      patientId: apt.patientId, patientName: apt.patientName,
      provider: apt.provider, providerName: apt.providerName,
      date: newDate, time: newTime, duration: apt.duration||30,
      type: apt.type, status: "Scheduled", reason: apt.reason||"",
      visitType: apt.visitType||"In-Person", room: apt.room||"",
    });
    showToast(`Rescheduled: ${apt.patientName} → ${newDate}`);
  }, [updateAppointmentStatus, addAppointment]);

  const handleWalkInSave = useCallback(data => {
    addAppointment(data);
    showToast(`Walk-in checked in: ${data.patientName}`);
  }, [addAppointment]);

  const handleToggleVisitType = useCallback(apt => {
    const isCurrentlyTelehealth = apt.visitType === "Telehealth";
    const newVisitType = isCurrentlyTelehealth ? "In-Person" : "Telehealth";
    const newRoom = isCurrentlyTelehealth ? "" : "Virtual";
    updateAppointmentStatus(apt.id, apt.status, { visitType: newVisitType, room: newRoom });
    showToast(`${apt.patientName} switched to ${newVisitType}`);
  }, [updateAppointmentStatus]);

  /* daily stats */
  const stats = useMemo(() => ({
    total:      todayApts.length,
    waiting:    todayApts.filter(a=>a.status==="Scheduled"||a.status==="Confirmed").length,
    checkedIn:  todayApts.filter(a=>a.status==="Checked In").length,
    arrived:    todayApts.filter(a=>a.status==="Arrived").length,
    inSession:  todayApts.filter(a=>a.status==="In Progress").length,
    checkedOut: todayApts.filter(a=>a.status==="Checked Out").length,
    completed:  todayApts.filter(a=>a.status==="Completed").length,
    noShow:     todayApts.filter(a=>a.status==="No Show").length,
    cancelled:  todayApts.filter(a=>a.status==="Cancelled").length,
    walkIns:    todayApts.filter(a=>a.isWalkIn).length,
  }), [todayApts]);

  /* alert engine — re-runs whenever appointments or thresholds change, then every 60 s */
  useEffect(() => {
    const check = () => {
      const alerts = [];
      todayApts.forEach(apt => {
        if (apt.status === 'Checked In' && apt.checkInTime) {
          const mins = Math.floor((Date.now() - apt.checkInTime) / 60000);
          if (mins >= alertThresholds.wait) alerts.push({ apt, type:'wait', mins });
        }
        if (apt.status === 'Arrived' && apt.arrivedTime) {
          const mins = Math.floor((Date.now() - apt.arrivedTime) / 60000);
          if (mins >= alertThresholds.provWait) alerts.push({ apt, type:'provWait', mins });
        }
      });
      setOverdueAlerts(alerts);
    };
    check();
    clearInterval(alertIntervalRef.current);
    alertIntervalRef.current = setInterval(check, 60000);
    return () => clearInterval(alertIntervalRef.current);
  }, [todayApts, alertThresholds]); // eslint-disable-line

  /* summary stats */
  const summaryStats = useMemo(() => {
    const total = todayApts.length;
    if (!total) return null;
    const waitSamples = todayApts.filter(a => a.checkInTime && a.arrivedTime)
      .map(a => Math.floor((a.arrivedTime - a.checkInTime) / 60000));
    const avgWait = waitSamples.length
      ? Math.round(waitSamples.reduce((s,v)=>s+v,0) / waitSamples.length) : null;
    const completionRate = Math.round(
      todayApts.filter(a=>a.status==='Checked Out'||a.status==='Completed').length / total * 100
    );
    const noShowRate = Math.round(todayApts.filter(a=>a.status==='No Show').length / total * 100);
    const byHour = {};
    todayApts.forEach(a => {
      if (!a.time) return;
      const h = parseInt(a.time.split(':')[0]);
      byHour[h] = (byHour[h]||0) + 1;
    });
    const hours = Object.keys(byHour).map(Number).sort((a,b)=>a-b);
    const peakHour = hours.length ? hours.reduce((a,b) => byHour[a]>=byHour[b]?a:b) : null;
    return { avgWait, completionRate, noShowRate, peakHour, byHour, hours };
  }, [todayApts]);

  /* CSV export */
  const exportCSV = useCallback(() => {
    const hdrs = ['Time','Patient','MRN','Provider','Type','Visit Type','Status','Copay ($)','Check-In','Arrived','Wait (min)','Prov Wait (min)','Reason'];
    const rows = todayApts.map(apt => {
      const pat = patients?.find(p => p.id === apt.patientId);
      const fmt = ts => ts ? new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '';
      const waitMins = apt.checkInTime && apt.arrivedTime ? Math.floor((apt.arrivedTime - apt.checkInTime) / 60000) : '';
      const provWaitMins = apt.arrivedTime && apt.status==='Arrived' ? Math.floor((Date.now()-apt.arrivedTime)/60000) : '';
      const copay = pat?.insurance?.primary?.copay;
      return [
        fmtTime12(apt.time), apt.patientName||'', pat?.mrn||'', apt.providerName||'',
        apt.type||'', apt.visitType||'', apt.status||'',
        copay!=null?copay:'', fmt(apt.checkInTime), fmt(apt.arrivedTime),
        waitMins, provWaitMins, (apt.reason||'').replace(/,/g,';'),
      ];
    });
    const csv = [hdrs,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'),{
      href: URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),
      download:`front-desk-log-${todayKey}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Front desk log exported ✓');
  }, [todayApts, patients, todayKey]); // eslint-disable-line

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});

  return (
    <div>
      {/* toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:3000, padding:"11px 18px", borderRadius:10,
          background: toast.type==="error"?"#fee2e2":toast.type==="warning"?"#fef3c7":"#dcfce7",
          color: toast.type==="error"?"#991b1b":toast.type==="warning"?"#92400e":"#166534",
          fontWeight:700, fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
          border:`1px solid ${toast.type==="error"?"#fca5a5":toast.type==="warning"?"#fde68a":"#bbf7d0"}`,
          display:"flex", alignItems:"center", gap:8, transition:"all 0.3s" }}>
          {toast.type==="error"?"❌":toast.type==="warning"?"⚠️":"✅"} {toast.msg}
        </div>
      )}

      {/* header bar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)" }}>
            Front Desk — Today's Flow
          </div>
          <div style={{ fontSize:11, color:"var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · Live as of {timeLabel}
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {/* Alert threshold settings */}
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowAlertSettings(v=>!v)}
              style={{ padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                border:`1.5px solid ${overdueAlerts.length>0?"#dc2626":"#e2e8f0"}`,
                background: overdueAlerts.length>0?"#fee2e2":showAlertSettings?"#f1f5f9":"#fff",
                color: overdueAlerts.length>0?"#dc2626":"var(--text-secondary)",
                display:"flex", alignItems:"center", gap:6 }}>
              🔔
              {overdueAlerts.length>0 && (
                <span style={{ background:"#dc2626", color:"#fff", borderRadius:"50%", width:16, height:16,
                  fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {overdueAlerts.length}
                </span>
              )}
              Alerts
            </button>
            {showAlertSettings && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:500, background:"#fff",
                borderRadius:10, border:"1.5px solid #e2e8f0", boxShadow:"0 8px 30px rgba(0,0,0,0.12)", padding:16, width:240 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"var(--text-primary)", marginBottom:12 }}>⚙ Alert Thresholds</div>
                {[
                  { key:'wait',     label:'Patient wait (Check-In → Arrived)', icon:'⏳' },
                  { key:'provWait', label:'Provider wait (Arrived → Session)',  icon:'🚪' },
                ].map(t => (
                  <div key={t.key} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", marginBottom:4 }}>{t.icon} {t.label}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="range" min={5} max={60} step={5} value={alertThresholds[t.key]}
                        onChange={e => setAlertThresholds(prev => ({...prev,[t.key]:Number(e.target.value)}))}
                        style={{ flex:1, accentColor:"#dc2626" }} />
                      <span style={{ fontSize:12, fontWeight:800, color:"#dc2626", minWidth:36 }}>{alertThresholds[t.key]}m</span>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowAlertSettings(false)}
                  style={{ width:"100%", padding:"6px 0", borderRadius:7, border:"none", background:"#f1f5f9",
                    fontSize:12, fontWeight:700, cursor:"pointer", color:"var(--text-secondary)" }}>Done</button>
              </div>
            )}
          </div>

          <button onClick={() => setShowSummary(v=>!v)}
            style={{ padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
              border:"1.5px solid #e2e8f0", background:showSummary?"#4f46e5":"#fff",
              color:showSummary?"#fff":"var(--text-secondary)" }}>
            📊 Summary
          </button>

          <button onClick={exportCSV}
            style={{ padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
              border:"1.5px solid #e2e8f0", background:"#fff", color:"var(--text-secondary)" }}>
            📥 Export
          </button>

          <button onClick={() => setShowWalkIn(true)}
            style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none",
              background:"#dc2626", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            🚶 Walk-In
          </button>
        </div>
      </div>

      {/* KPI cards — state-machine pipeline */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:16 }}>
        {[
          { label:"Total",       val:stats.total,      bg:"#f8fafc", color:"#475569", icon:"📋" },
          { label:"Waiting",     val:stats.waiting,    bg:"#eff6ff", color:"#1e40af", icon:"⏳" },
          { label:"Checked In",  val:stats.checkedIn,  bg:"#f0fdf4", color:"#166534", icon:"✅" },
          { label:"Arrived",     val:stats.arrived,    bg:"#fff7ed", color:"#9a3412", icon:"🚪" },
          { label:"In Session",  val:stats.inSession,  bg:"#f3f0ff", color:"#5b21b6", icon:"🩺" },
          { label:"Checked Out", val:stats.checkedOut, bg:"#ccfbf1", color:"#0f766e", icon:"🧾" },
          { label:"Enc. Closed", val:stats.completed,  bg:"#f0f4ff", color:"#3730a3", icon:"🔒" },
          { label:"No Shows",    val:stats.noShow,     bg:"#fef3c7", color:"#92400e", icon:"🚫" },
          { label:"Cancelled",   val:stats.cancelled,  bg:"#fee2e2", color:"#991b1b", icon:"❌" },
          { label:"Walk-Ins",    val:stats.walkIns,    bg:"#fdf4ff", color:"#7e22ce", icon:"🚶" },
        ].map(s=>(
          <div key={s.label} style={{ ...card({ padding:"12px 14px" }), background:s.bg }}>
            <div style={{ fontSize:18 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1, marginTop:2 }}>{s.val}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── OVERDUE ALERTS BANNER ── */}
      {overdueAlerts.length > 0 && (
        <div style={{ background:"#fee2e2", border:"1.5px solid #fca5a5", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:12, color:"#991b1b", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            🚨 {overdueAlerts.length} patient{overdueAlerts.length!==1?'s':''} waiting too long
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {overdueAlerts.map(({apt,type,mins},i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:12 }}>
                <span style={{ background:"#dc2626", color:"#fff", borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:800, flexShrink:0 }}>
                  {mins}m
                </span>
                <strong>{apt.patientName}</strong>
                <span style={{ color:"#991b1b" }}>
                  {type==='wait'
                    ? `waiting after check-in (threshold: ${alertThresholds.wait}m)`
                    : `provider not yet in session (threshold: ${alertThresholds.provWait}m)`}
                </span>
                <span style={{ marginLeft:"auto", color:"#64748b", fontSize:11 }}>{apt.providerName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DAILY SUMMARY PANEL ── */}
      {showSummary && summaryStats && (
        <div style={{ ...card({ padding:"16px 18px" }), marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"var(--text-primary)", marginBottom:14 }}>📊 Today's Summary</div>
          {/* Top metrics */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:16 }}>
            {[
              { label:"Avg wait (Check-In→Arrived)", val: summaryStats.avgWait!=null ? `${summaryStats.avgWait} min` : "—", icon:"⏱", color:"#1e40af" },
              { label:"Completion rate",              val: `${summaryStats.completionRate}%`,  icon:"✅", color:"#166534" },
              { label:"No-show rate",                 val: `${summaryStats.noShowRate}%`,      icon:"🚫", color:"#92400e" },
              { label:"Peak hour",                    val: summaryStats.peakHour!=null
                ? fmtTime12(`${String(summaryStats.peakHour).padStart(2,'0')}:00`) : "—",     icon:"📈", color:"#7c3aed" },
            ].map(m => (
              <div key={m.label} style={{ background:"#f8fafc", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:18, fontWeight:800, color:m.color, lineHeight:1 }}>{m.val}</div>
                <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, marginTop:4 }}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* Hourly bar chart */}
          {summaryStats.hours.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-secondary)", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Appointments by Hour</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:60 }}>
                {summaryStats.hours.map(h => {
                  const count = summaryStats.byHour[h];
                  const maxCount = Math.max(...Object.values(summaryStats.byHour));
                  const pct = (count / maxCount) * 100;
                  const isPeak = h === summaryStats.peakHour;
                  return (
                    <div key={h} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ fontSize:9, fontWeight:700, color: isPeak?"#7c3aed":"var(--text-muted)" }}>{count}</div>
                      <div style={{ width:"100%", height:`${pct}%`, minHeight:4, borderRadius:"3px 3px 0 0",
                        background: isPeak?"#7c3aed":"#e2e8f0", transition:"height 0.3s" }} />
                      <div style={{ fontSize:8, color:"var(--text-muted)", fontWeight:600 }}>
                        {h>12?`${h-12}p`:h===12?'12p':h===0?'12a':`${h}a`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {showSummary && !summaryStats && (
        <div style={{ ...card({ padding:"20px" }), marginBottom:14, textAlign:"center", color:"var(--text-muted)", fontSize:12 }}>
          No appointments scheduled today yet.
        </div>
      )}

      {/* filter tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
        {FD_FILTERS.map(f => {
          const isActive = fdFilter === f.key;
          return (
            <button key={f.key} onClick={() => setFdFilter(f.key)}
              style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
                border:`1.5px solid ${isActive?f.color:"#e2e8f0"}`,
                background: isActive?f.color:"#fff",
                color: isActive?"#fff":f.color, transition:"all 0.12s" }}>
              {f.label} <span style={{ opacity:0.75 }}>({counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      {/* queue */}
      <div style={{ ...card({ padding:"14px 16px" }) }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>
            {fdFilter==="All" ? "Today's Patient Queue" : fdFilter+" — "+counts[fdFilter]+" patient"+(counts[fdFilter]!==1?"s":"")}
          </div>
          <span style={{ fontSize:11, color:"var(--text-muted)" }}>{filtered.length} record{filtered.length!==1?"s":""}</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>
              {fdFilter==="No Show"?"🚫":fdFilter==="Cancelled"?"❌":fdFilter==="Completed"?"✅":"🗂️"}
            </div>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>
              {fdFilter==="All" ? "No appointments today" : `No ${fdFilter.toLowerCase()} appointments`}
            </div>
            {fdFilter==="All" && (
              <button onClick={() => setShowWalkIn(true)}
                style={{ marginTop:10, padding:"10px 18px", borderRadius:8, fontSize:12, fontWeight:700,
                  border:"none", background:"#dc2626", color:"#fff", cursor:"pointer" }}>
                🚶 Register Walk-In
              </button>
            )}
          </div>
        ) : (
          filtered.map(apt => (
            <WaitingRow key={apt.id} apt={apt} patients={patients} todayKey={todayKey}
              onCheckIn={handleCheckIn} onNoShow={handleNoShow} onCancel={handleCancel}
              onGoToSession={handleGoToSession} onCheckout={handleCheckout}
              onReschedule={handleReschedule} onArrived={handleArrived}
              onPreVerify={handlePreVerify} onToggleVisitType={handleToggleVisitType}
              isMobile={isMobile} />
          ))
        )}
      </div>

      {/* bottom section: upcoming + no-shows */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:14 }}>
        {/* Upcoming next 3 days */}
        <div style={{ ...card({ padding:"14px 16px" }) }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:10, color:"var(--text-primary)" }}>
            📆 Next 3 Days
          </div>
          {[1,2,3].map(offset => {
            const d = new Date(getToday()); d.setDate(d.getDate()+offset);
            const k = toKey(d);
            const dayApts = allAppts.filter(a=>a.date===k);
            const label = d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
            return (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text-secondary)", marginBottom:4 }}>{label}</div>
                {dayApts.length===0 ? (
                  <div style={{ fontSize:11, color:"var(--text-muted)", fontStyle:"italic" }}>No appointments</div>
                ) : (
                  dayApts.slice(0,4).map(a=>(
                    <div key={a.id} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, marginBottom:3, padding:"4px 8px", borderRadius:6, background:"#f8fafc" }}>
                      <span style={{ fontWeight:700, color:"var(--text-primary)", minWidth:54 }}>{fmtTime12(a.time)}</span>
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.patientName}</span>
                      <span style={{ fontSize:9.5, color:provColor(a.provider), fontWeight:700 }}>{a.providerName?.split(" ")[0]}</span>
                    </div>
                  ))
                )}
                {dayApts.length>4 && <div style={{ fontSize:10, color:"var(--text-muted)", paddingLeft:8 }}>+{dayApts.length-4} more</div>}
              </div>
            );
          })}
        </div>

        {/* Recent no-shows + cancellations */}
        <div style={{ ...card({ padding:"14px 16px" }) }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>⚠️ Needs Follow-Up</div>
          {(() => {
            const flagged = allAppts.filter(a=>a.status==="No Show"||a.status==="Cancelled").slice(-8).reverse();
            if (flagged.length===0) return <div style={{ fontSize:11, color:"var(--text-muted)", fontStyle:"italic" }}>No missed appointments</div>;
            return flagged.map(a=>(
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, marginBottom:6,
                padding:"7px 10px", borderRadius:8, background: a.status==="No Show"?"#fef3c7":"#fee2e2",
                border:`1px solid ${a.status==="No Show"?"#fde68a":"#fca5a5"}` }}>
                <span style={{ fontSize:14 }}>{a.status==="No Show"?"🚫":"❌"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.patientName}</div>
                  <div style={{ color:"var(--text-muted)", fontSize:9.5 }}>{a.date} · {a.status}</div>
                </div>
                <button onClick={() => setRescheduleApt(a)}
                  style={{ padding:"3px 9px", borderRadius:6, fontSize:10, fontWeight:700,
                    border:"1px solid #4f46e5", background:"#ede9fe", color:"#4f46e5", cursor:"pointer", flexShrink:0 }}>
                  Reschedule
                </button>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* modals */}
      <WalkInModal show={showWalkIn} onClose={() => setShowWalkIn(false)} patients={patients} onSave={handleWalkInSave} providers={siteProviders} />
      <CheckoutModal show={!!checkoutApt} apt={checkoutApt} patients={patients} onClose={() => setCheckoutApt(null)} onConfirm={handleCheckoutConfirm} />
      <RescheduleModal show={!!rescheduleApt} apt={rescheduleApt} onClose={() => setRescheduleApt(null)} onConfirm={handleRescheduleConfirm} />
      <PreVisitModal
        show={!!preVerifyApt} apt={preVerifyApt}
        patient={preVerifyApt ? patients?.find(p => p.id === preVerifyApt.patientId) : null}
        onClose={() => setPreVerifyApt(null)}
        onCheckIn={apt => { handleCheckIn(apt); setPreVerifyApt(null); }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════
   CLOSE ENCOUNTER MODAL  (provider-only)
══════════════════════════════════════════════ */
function CloseEncounterModal({ apt, show, onClose, onConfirm }) {
  const [billingConfirmed, setBillingConfirmed] = useState(false);
  const [closingNotes, setClosingNotes]         = useState('');
  const [done, setDone]                         = useState(false);
  useEffect(() => { if (show) { setBillingConfirmed(false); setClosingNotes(''); setDone(false); } }, [show]);
  if (!show || !apt) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:2200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:540, boxShadow:"var(--shadow-overlay)", overflow:"hidden" }}>
        {/* header */}
        <div style={{ padding:"16px 22px", background:"linear-gradient(135deg,#312e81,#4f46e5)", color:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>🔒 Close Encounter</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{apt.patientName} — {fmtTime12(apt.time)}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8,
            color:"#fff", fontWeight:800, fontSize:20, width:32, height:32, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        {/* body */}
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          {/* encounter summary */}
          <div style={{ background:"#f0f4ff", border:"1px solid #c7d2fe", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontWeight:700, fontSize:12, color:"#3730a3", marginBottom:10 }}>📋 Encounter Summary</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
              <div><span style={{ color:"var(--text-muted)" }}>Patient: </span><strong>{apt.patientName}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Date: </span><strong>{apt.date}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Time: </span><strong>{fmtTime12(apt.time)}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Visit Type: </span><strong>{apt.type || "Visit"}</strong></div>
              <div style={{ gridColumn:"span 2" }}><span style={{ color:"var(--text-muted)" }}>Reason: </span><strong>{apt.reason || "Not recorded"}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Provider: </span><strong>{apt.providerName}</strong></div>
              <div><span style={{ color:"var(--text-muted)" }}>Room: </span><strong>{apt.room || "—"}</strong></div>
            </div>
          </div>
          {/* billing confirmed */}
          <div>
            <LBL c="Billing Confirmation" />
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:13, fontWeight:600,
              padding:"12px 14px", borderRadius:8, border:`1.5px solid ${billingConfirmed?"#a5b4fc":"#e2e8f0"}`,
              background:billingConfirmed?"#ede9fe":"#f8fafc", transition:"all 0.15s" }}>
              <input type="checkbox" checked={billingConfirmed} onChange={e => setBillingConfirmed(e.target.checked)}
                style={{ width:16, height:16, accentColor:"#4f46e5" }} />
              I confirm all billing / CPT codes have been submitted for this encounter
            </label>
          </div>
          {/* closing notes */}
          <div>
            <LBL c="Provider Closing Notes (optional)" />
            <textarea className="form-input" rows={3} value={closingNotes} onChange={e => setClosingNotes(e.target.value)}
              placeholder="Final assessment, follow-up plan, patient instructions..."
              style={{ resize:"vertical", fontFamily:"inherit", fontSize:12 }} />
          </div>
          {/* warning */}
          <div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#92400e" }}>
            ⚠️ <strong>This action is irreversible.</strong> Once closed, the chart will be locked. Amendments require a formal addendum.
          </div>
        </div>
        {/* footer */}
        <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {done
            ? <span style={{ fontSize:13, color:"#166534", fontWeight:700 }}>🔒 Encounter closed &amp; locked!</span>
            : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button disabled={!billingConfirmed || done}
              onClick={() => { onConfirm(apt, closingNotes.trim()); setDone(true); setTimeout(() => onClose(), 1400); }}
              style={{ padding:"6px 18px", borderRadius:8, fontSize:12, fontWeight:700, border:"none", cursor:"pointer",
                background: billingConfirmed && !done ? "#312e81" : "#c7d2fe",
                color: billingConfirmed && !done ? "#fff" : "#6366f1" }}>
              🔒 Lock &amp; Close Encounter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CHECKOUT TAB  (front desk / admin)
══════════════════════════════════════════════ */
function CheckoutTab({ allAppts, patients, todayKey, updateAppointmentStatus }) {
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [toast, setToast]             = useState(null);
  const toastTimerCO = useRef(null);
  useEffect(() => { return () => { if (toastTimerCO.current) clearTimeout(toastTimerCO.current); }; }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (toastTimerCO.current) clearTimeout(toastTimerCO.current);
    toastTimerCO.current = setTimeout(() => setToast(null), 3000);
  };

  const todayApts    = useMemo(() => allAppts.filter(a => a.date === todayKey).sort((a,b) => a.time.localeCompare(b.time)), [allAppts, todayKey]);
  const inProgress   = useMemo(() => todayApts.filter(a => a.status === "In Progress"),  [todayApts]);
  const checkedOut   = useMemo(() => todayApts.filter(a => a.status === "Checked Out"),  [todayApts]);
  const encClosed    = useMemo(() => todayApts.filter(a => a.status === "Completed"),    [todayApts]);

  const handleCheckoutConfirm = data => {
    updateAppointmentStatus(data.id, "Checked Out");
    showToast(`Checkout complete: ${data.patientName}`);
  };

  const Row = ({ apt, actions }) => {
    const c  = getTypeColor(apt);
    const pc = provColor(apt.provider);
    const pat = patients?.find(p => p.id === apt.patientId);
    const copay = pat?.insurance?.primary?.copay;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
        borderBottom:"1px solid var(--border)", background:"#fff", flexWrap:"wrap" }}>
        <div style={{ width:5, height:40, borderRadius:3, background:c.border, flexShrink:0 }} />
        <div style={{ minWidth:58 }}>
          <div style={{ fontSize:13, fontWeight:800, color:c.text }}>{fmtTime12(apt.time)}</div>
          <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600 }}>{apt.duration||30}m</div>
        </div>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{apt.patientName}</div>
          <div style={{ fontSize:10, color:"var(--text-muted)" }}>{apt.type} · {apt.reason||"—"}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, background:"#f8fafc",
          border:`1px solid ${pc}30`, borderRadius:7, padding:"4px 8px", flexShrink:0 }}>
          <div style={{ width:20, height:20, borderRadius:"50%", background:pc, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800 }}>
            {apt.providerName?.split(" ").map(n=>n[0]).join("").slice(0,2)||"?"}
          </div>
          <span style={{ fontSize:10.5, fontWeight:600, color:pc }}>{apt.providerName}</span>
        </div>
        {copay !== undefined && copay !== null && (
          <div style={{ textAlign:"center", minWidth:50, flexShrink:0 }}>
            <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase" }}>Copay</div>
            <div style={{ fontSize:13, fontWeight:800, color:copay===0?"#166534":"#1e40af" }}>
              {copay===0?"None":`$${copay}`}
            </div>
          </div>
        )}
        <div style={{ flexShrink:0 }}><Pill label={apt.status} /></div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
          {actions}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:3000, padding:"11px 18px", borderRadius:10,
          background: toast.type==="error"?"#fee2e2":"#dcfce7",
          color: toast.type==="error"?"#991b1b":"#166534",
          fontWeight:700, fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.type==="error"?"❌":"✅"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)" }}>🧾 Patient Checkout Queue</div>
        <div style={{ fontSize:11, color:"var(--text-muted)" }}>
          Post-visit checkout — collect copay, schedule follow-ups, and hand off to provider for encounter closure.
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Ready for Checkout", count:inProgress.length,  bg:"#fef3c7", color:"#92400e", icon:"🩺" },
          { label:"Checked Out",        count:checkedOut.length,  bg:"#ccfbf1", color:"#0f766e", icon:"🧾" },
          { label:"Encounter Closed",   count:encClosed.length,   bg:"#f0f4ff", color:"#3730a3", icon:"🔒" },
        ].map(s => (
          <div key={s.label} style={{ flex:"1 1 150px", background:s.bg, borderRadius:12, padding:"14px 16px",
            border:`1px solid ${s.color}20` }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1, marginTop:4 }}>{s.count}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ready for checkout */}
      <div style={{ ...card({ overflow:"hidden", marginBottom:16 }) }}>
        <div style={{ padding:"12px 16px", background:"#fef9c3", borderBottom:"1px solid #fde68a",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#92400e" }}>🩺 Ready for Checkout — Visit In Progress</div>
          <span style={{ fontSize:11, color:"#92400e", fontWeight:600 }}>{inProgress.length} patient{inProgress.length!==1?"s":""}</span>
        </div>
        {inProgress.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
            <div style={{ fontWeight:600, fontSize:13 }}>No patients currently in session</div>
          </div>
        ) : (
          inProgress.map(apt => (
            <Row key={apt.id} apt={apt} actions={
              <button onClick={() => setCheckoutApt(apt)}
                style={{ padding:"6px 14px", borderRadius:7, fontSize:11, fontWeight:700, border:"none",
                  background:"#0891b2", color:"#fff", cursor:"pointer" }}>
                🧾 Check Out
              </button>
            } />
          ))
        )}
      </div>

      {/* Checked out — awaiting encounter close */}
      <div style={{ ...card({ overflow:"hidden", marginBottom:16 }) }}>
        <div style={{ padding:"12px 16px", background:"#f0fdfa", borderBottom:"1px solid #99f6e4",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#0f766e" }}>🧾 Checked Out — Awaiting Provider Encounter Closure</div>
          <span style={{ fontSize:11, color:"#0f766e", fontWeight:600 }}>{checkedOut.length} patient{checkedOut.length!==1?"s":""}</span>
        </div>
        {checkedOut.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
            <div style={{ fontWeight:600, fontSize:13 }}>No patients awaiting encounter closure</div>
          </div>
        ) : (
          checkedOut.map(apt => (
            <Row key={apt.id} apt={apt} actions={
              <span style={{ fontSize:11, color:"#0f766e", fontWeight:600 }}>Pending provider close</span>
            } />
          ))
        )}
      </div>

      {/* Closed today */}
      {encClosed.length > 0 && (
        <div style={{ ...card({ overflow:"hidden" }) }}>
          <div style={{ padding:"12px 16px", background:"#f0f4ff", borderBottom:"1px solid #c7d2fe",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#3730a3" }}>🔒 Encounter Closed Today</div>
            <span style={{ fontSize:11, color:"#3730a3", fontWeight:600 }}>{encClosed.length} completed</span>
          </div>
          {encClosed.map(apt => (
            <Row key={apt.id} apt={apt} actions={
              <span style={{ fontSize:11, color:"#4f46e5", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                🔒 Closed
              </span>
            } />
          ))}
        </div>
      )}

      <CheckoutModal show={!!checkoutApt} apt={checkoutApt} patients={patients}
        onClose={() => setCheckoutApt(null)} onConfirm={handleCheckoutConfirm} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   CLOSE ENCOUNTER TAB  (providers only)
══════════════════════════════════════════════ */
function CloseEncounterTab({ allAppts, patients, currentUser, todayKey, updateAppointmentStatus }) {
  const [closeApt, setCloseApt] = useState(null);
  const [toast, setToast]       = useState(null);
  const toastTimerCE = useRef(null);
  useEffect(() => { return () => { if (toastTimerCE.current) clearTimeout(toastTimerCE.current); }; }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    if (toastTimerCE.current) clearTimeout(toastTimerCE.current);
    toastTimerCE.current = setTimeout(() => setToast(null), 3000);
  };

  // Provider only sees their own patients
  const myApts    = useMemo(() => allAppts.filter(a => a.date === todayKey && a.provider === currentUser?.id)
    .sort((a,b) => a.time.localeCompare(b.time)), [allAppts, todayKey, currentUser]);
  const pending   = useMemo(() => myApts.filter(a => a.status === "Checked Out"),  [myApts]);
  const closed    = useMemo(() => myApts.filter(a => a.status === "Completed"),    [myApts]);
  const inSession = useMemo(() => myApts.filter(a => a.status === "In Progress"),  [myApts]);

  const handleClose = (apt, closingNotes) => {
    updateAppointmentStatus(apt.id, "Completed", {
      closedBy: currentUser?.id,
      closedAt: new Date().toISOString(),
      closingNotes,
    });
    showToast(`Encounter locked: ${apt.patientName}`);
  };

  const EncRow = ({ apt, actions }) => {
    const c  = getTypeColor(apt);
    const pat = patients?.find(p => p.id === apt.patientId);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px",
        borderBottom:"1px solid var(--border)", flexWrap:"wrap" }}>
        <div style={{ width:5, height:44, borderRadius:3, background:c.border, flexShrink:0 }} />
        <div style={{ minWidth:58 }}>
          <div style={{ fontSize:13, fontWeight:800, color:c.text }}>{fmtTime12(apt.time)}</div>
          <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600 }}>{apt.type}</div>
        </div>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{apt.patientName}</div>
          <div style={{ fontSize:11, color:"var(--text-muted)" }}>{apt.reason || "No reason listed"}</div>
          {pat?.mrn && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>MRN: {pat.mrn}</div>}
        </div>
        <div style={{ flexShrink:0 }}><Pill label={apt.status} /></div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
          {actions}
        </div>
      </div>
    );
  };

  return (
    <div>
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:3000, padding:"11px 18px", borderRadius:10,
          background:"#f0f4ff", color:"#3730a3", fontWeight:700, fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
          border:"1px solid #c7d2fe" }}>
          🔒 {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)" }}>🔒 Close Encounter</div>
        <div style={{ fontSize:11, color:"var(--text-muted)" }}>
          Review and lock today's completed patient encounters. Only you can close your charts.
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"In Session",    count:inSession.length, bg:"#fef3c7", color:"#92400e", icon:"🩺" },
          { label:"Ready to Close",count:pending.length,   bg:"#ccfbf1", color:"#0f766e", icon:"🧾" },
          { label:"Closed Today",  count:closed.length,    bg:"#f0f4ff", color:"#3730a3", icon:"🔒" },
        ].map(s => (
          <div key={s.label} style={{ flex:"1 1 140px", background:s.bg, borderRadius:12, padding:"14px 16px",
            border:`1px solid ${s.color}20` }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1, marginTop:4 }}>{s.count}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ready to close */}
      <div style={{ ...card({ overflow:"hidden", marginBottom:16 }) }}>
        <div style={{ padding:"12px 18px", background:"#f0fdfa", borderBottom:"1px solid #99f6e4",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#0f766e" }}>🧾 Checked Out — Ready for Encounter Closure</div>
          <span style={{ fontSize:11, color:"#0f766e", fontWeight:600 }}>{pending.length} pending</span>
        </div>
        {pending.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>No encounters ready to close</div>
            <div style={{ fontSize:12 }}>Patients must be checked out by front desk before you can close the encounter.</div>
          </div>
        ) : (
          pending.map(apt => (
            <EncRow key={apt.id} apt={apt} actions={
              <button onClick={() => setCloseApt(apt)}
                style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none",
                  background:"#312e81", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                🔒 Close Encounter
              </button>
            } />
          ))
        )}
      </div>

      {/* Still in session */}
      {inSession.length > 0 && (
        <div style={{ ...card({ overflow:"hidden", marginBottom:16 }) }}>
          <div style={{ padding:"12px 18px", background:"#fef9c3", borderBottom:"1px solid #fde68a",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#92400e" }}>🩺 Currently in Session</div>
            <span style={{ fontSize:11, color:"#92400e", fontWeight:600 }}>{inSession.length} in visit</span>
          </div>
          {inSession.map(apt => (
            <EncRow key={apt.id} apt={apt} actions={
              <span style={{ fontSize:11, color:"#92400e", fontWeight:600 }}>Visit ongoing</span>
            } />
          ))}
        </div>
      )}

      {/* Closed today */}
      {closed.length > 0 && (
        <div style={{ ...card({ overflow:"hidden" }) }}>
          <div style={{ padding:"12px 18px", background:"#f0f4ff", borderBottom:"1px solid #c7d2fe",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#3730a3" }}>🔒 Encounters Closed Today</div>
            <span style={{ fontSize:11, color:"#3730a3", fontWeight:600 }}>{closed.length} locked</span>
          </div>
          {closed.map(apt => (
            <EncRow key={apt.id} apt={apt} actions={
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:18 }}>🔒</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#3730a3" }}>Encounter Locked</div>
                  {apt.closedAt && (
                    <div style={{ fontSize:10, color:"var(--text-muted)" }}>
                      {new Date(apt.closedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                    </div>
                  )}
                </div>
              </div>
            } />
          ))}
        </div>
      )}

      <CloseEncounterModal show={!!closeApt} apt={closeApt}
        onClose={() => setCloseApt(null)} onConfirm={handleClose} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   PATIENT FLOW MAP
══════════════════════════════════════════════ */
function PatientFlowMap({ appts }) {
  const stages = [
    { label:"Waiting",    icon:"🪑", statuses:["Scheduled","Confirmed"],   color:"#3b82f6", bg:"#eff6ff" },
    { label:"Checked In", icon:"✅", statuses:["Checked In"],              color:"#22c55e", bg:"#f0fdf4" },
    { label:"In Session", icon:"🩺", statuses:["In Progress"],             color:"#f59e0b", bg:"#fefce8" },
    { label:"Completed",  icon:"🏁", statuses:["Completed","Checked Out"], color:"#6366f1", bg:"#f5f3ff" },
  ];
  const total = appts.length || 1;
  const waiting   = appts.filter(a => a.status==="Scheduled"||a.status==="Confirmed").length;
  const inSession = appts.filter(a => a.status==="In Progress").length;
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10, padding:"14px 18px", boxShadow:"var(--shadow-sm)" }}>
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:"0.5px", marginBottom:12 }}>Patient Flow</div>
      <div style={{ display:"flex", alignItems:"stretch", gap:0 }}>
        {stages.map((stage, idx) => {
          const count = appts.filter(a => stage.statuses.includes(a.status)).length;
          const pct   = Math.round((count / total) * 100);
          return (
            <React.Fragment key={stage.label}>
              <div style={{ flex:1, background:stage.bg, borderRadius:8, padding:"10px 6px", textAlign:"center", position:"relative" }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{stage.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:stage.color, lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:9.5, color:"var(--text-muted)", fontWeight:600, marginTop:2 }}>{stage.label}</div>
                {count > 0 && <div style={{ fontSize:9, color:stage.color, fontWeight:700, marginTop:1 }}>{pct}%</div>}
                {stage.label==="In Session" && count > 0 && (
                  <div style={{ position:"absolute", top:6, right:6, width:6, height:6, borderRadius:"50%", background:stage.color, animation:"pulse-dot 2s ease-in-out infinite" }} />
                )}
              </div>
              {idx < stages.length - 1 && (
                <div style={{ display:"flex", alignItems:"center", padding:"0 4px", color:"#cbd5e1", fontSize:18, flexShrink:0 }}>→</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {waiting > 4 && inSession < 2 && (
        <div style={{ marginTop:8, padding:"5px 10px", borderRadius:7, background:"#fef3c7", border:"1px solid #fcd34d", fontSize:10.5, color:"#92400e", fontWeight:600 }}>
          ⚡ Bottleneck: {waiting} patients waiting, only {inSession} in session
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOM UTILIZATION PANEL
══════════════════════════════════════════════ */
function RoomUtilizationPanel({ appts }) {
  const rooms = useMemo(() => {
    const map = new Map();
    appts.forEach(a => {
      const r = a.room;
      if (!r || r === "Virtual" || r === "") return;
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(a);
    });
    return Array.from(map.entries()).map(([room, ra]) => ({
      room, count: ra.length,
      status: ra.some(a => a.status==="In Progress") ? "in-use"
            : ra.some(a => a.status==="Checked In")  ? "ready"
            : ra.some(a => a.status==="Scheduled"||a.status==="Confirmed") ? "booked"
            : "free",
    }));
  }, [appts]);
  if (!rooms.length) return null;
  const RS = {
    "in-use": { label:"In Use",  dot:"#f59e0b", bg:"#fef3c7", border:"#fcd34d", color:"#92400e", pulse:true  },
    "ready":  { label:"Ready",   dot:"#22c55e", bg:"#f0fdf4", border:"#86efac", color:"#166534", pulse:false },
    "booked": { label:"Booked",  dot:"#3b82f6", bg:"#eff6ff", border:"#93c5fd", color:"#1e40af", pulse:false },
    "free":   { label:"Free",    dot:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", color:"#64748b", pulse:false },
  };
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10, padding:"14px 18px", boxShadow:"var(--shadow-sm)" }}>
      <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:"0.5px", marginBottom:10 }}>Room Utilization</div>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
        {rooms.map(r => {
          const s = RS[r.status];
          return (
            <div key={r.room} style={{ padding:"8px 12px", borderRadius:8, background:s.bg, border:`1.5px solid ${s.border}`, minWidth:72, textAlign:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginBottom:2 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0, animation:s.pulse?"pulse-dot 2s ease-in-out infinite":"none" }} />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--text-primary)" }}>{r.room}</span>
              </div>
              <div style={{ fontSize:9.5, color:s.color, fontWeight:700 }}>{s.label}</div>
              <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:1 }}>{r.count} appt{r.count!==1?"s":""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TOMORROW PREVIEW
══════════════════════════════════════════════ */
function TomorrowPreview({ allAppts, activeDate }) {
  const tomorrowKey = useMemo(() => {
    const d = new Date(activeDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return toKey(d);
  }, [activeDate]);
  const tmrAppts = useMemo(() => allAppts.filter(a => a.date === tomorrowKey), [allAppts, tomorrowKey]);
  if (!tmrAppts.length) return null;
  const telehealth = tmrAppts.filter(a => a.visitType==="Telehealth").length;
  const newPts     = tmrAppts.filter(a => a.type==="New Patient").length;
  const firstTime  = [...tmrAppts].sort((a,b)=>(a.time||"").localeCompare(b.time||""))[0]?.time;
  const d          = new Date(tomorrowKey + "T00:00:00");
  const dayLabel   = d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  return (
    <div style={{ background:"linear-gradient(135deg,#f0f9ff,#e0f2fe)", border:"1px solid #bae6fd", borderRadius:10, padding:"12px 16px", boxShadow:"var(--shadow-sm)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", color:"#0369a1", letterSpacing:"0.5px" }}>Tomorrow Preview</div>
        <span style={{ fontSize:10, color:"#0284c7", fontWeight:600, background:"#e0f2fe", padding:"2px 8px", borderRadius:10 }}>{dayLabel}</span>
      </div>
      <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:24, fontWeight:800, color:"#0369a1", lineHeight:1 }}>{tmrAppts.length}</div>
          <div style={{ fontSize:9.5, color:"#0284c7", fontWeight:600, marginTop:1 }}>Appointments</div>
        </div>
        {telehealth > 0 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#7c3aed", lineHeight:1 }}>{telehealth}</div>
            <div style={{ fontSize:9.5, color:"#7c3aed", fontWeight:600, marginTop:1 }}>Telehealth</div>
          </div>
        )}
        {newPts > 0 && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#f59e0b", lineHeight:1 }}>{newPts}</div>
            <div style={{ fontSize:9.5, color:"#f59e0b", fontWeight:600, marginTop:1 }}>New Pts</div>
          </div>
        )}
        {firstTime && (
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#0369a1" }}>{fmtTime12(firstTime)}</div>
            <div style={{ fontSize:9.5, color:"#0284c7", fontWeight:600 }}>First Appt</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ACTIVITY FEED
══════════════════════════════════════════════ */
function ActivityFeed({ feed, onClear }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!feed.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
      <div style={{ padding:"10px 14px", background:"#f8fafc", borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontWeight:700, fontSize:12, display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e",
            animation:"pulse-dot 2s ease-in-out infinite", display:"inline-block", flexShrink:0 }} />
          Activity Feed
          <span style={{ fontSize:10, color:"var(--text-muted)", fontWeight:500, background:"#f1f5f9", borderRadius:10, padding:"1px 7px" }}>{feed.length}</span>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={() => setCollapsed(v=>!v)}
            style={{ background:"none", border:"1px solid var(--border)", borderRadius:5, padding:"2px 9px", cursor:"pointer", fontSize:10, color:"var(--text-secondary)" }}>
            {collapsed?"Show":"Hide"}
          </button>
          <button onClick={onClear}
            style={{ background:"none", border:"1px solid #fecaca", borderRadius:5, padding:"2px 9px", cursor:"pointer", fontSize:10, color:"#dc2626" }}>Clear</button>
        </div>
      </div>
      {!collapsed && (
        <div style={{ maxHeight:180, overflowY:"auto" }}>
          {[...feed].reverse().map((ev, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 14px",
              borderBottom:"1px solid #f8fafc", fontSize:11 }}>
              <span style={{ fontSize:15, flexShrink:0, lineHeight:1.3 }}>{ev.icon}</span>
              <span style={{ flex:1, color:"var(--text-primary)", fontWeight:600 }}>{ev.text}</span>
              <span style={{ fontSize:9.5, color:"var(--text-muted)", flexShrink:0, whiteSpace:"nowrap" }}>{ev.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MINI ANALYTICS PANEL
══════════════════════════════════════════════ */
function MiniAnalytics({ allAppts, todayKey }) {
  const [open, setOpen] = useState(false);
  const s = useMemo(() => {
    const today     = allAppts.filter(a => a.date === todayKey);
    const completed = today.filter(a => a.status === "Completed").length;
    const noShows   = today.filter(a => a.status === "No Show").length;
    const cancelled = today.filter(a => a.status === "Cancelled").length;
    const telehealth= today.filter(a => a.visitType === "Telehealth").length;
    const durs      = today.filter(a => a.status === "Completed").map(a => a.duration||30);
    const avgDur    = durs.length ? Math.round(durs.reduce((a,b)=>a+b,0)/durs.length) : 0;
    const noShowRate= today.length ? Math.round((noShows/today.length)*100) : 0;
    const teleRatio = today.length ? Math.round((telehealth/today.length)*100) : 0;
    return { total:today.length, completed, noShows, cancelled, avgDur, noShowRate, teleRatio };
  }, [allAppts, todayKey]);
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:"100%", padding:"10px 14px", background:"#f8fafc", border:"none",
          display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer",
          borderBottom: open ? "1px solid var(--border)" : "none" }}>
        <span style={{ fontWeight:700, fontSize:12, color:"var(--text-primary)" }}>📊 Day Analytics</span>
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Avg Duration", val: s.avgDur ? `${s.avgDur}m` : "—",   color:"#4f46e5" },
            { label:"No-Show Rate", val: `${s.noShowRate}%`,                  color: s.noShowRate>15?"#dc2626":"#16a34a" },
            { label:"Telehealth",   val: `${s.teleRatio}%`,                   color:"#7c3aed" },
            { label:"Completed",    val: s.completed,                         color:"#16a34a" },
            { label:"Cancelled",    val: s.cancelled,                         color:"#ef4444" },
            { label:"Total",        val: s.total,                             color:"#475569" },
          ].map(r => (
            <div key={r.label} style={{ textAlign:"center", background:"#f8fafc", borderRadius:8, padding:"8px 4px" }}>
              <div style={{ fontSize:18, fontWeight:800, color:r.color, lineHeight:1 }}>{r.val}</div>
              <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600, marginTop:2 }}>{r.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   BATCH SELECT PANEL
══════════════════════════════════════════════ */
function BatchSelectPanel({ appts, selected, onToggle, onSelectAll, onClearAll, onBulkAction, patients }) {
  const allSelected = selected.length === appts.length && appts.length > 0;
  return (
    <div style={{ background:"#fff", border:"1.5px solid #4f46e5", borderRadius:10, overflow:"hidden", boxShadow:"0 0 0 3px rgba(79,70,229,0.08)" }}>
      <div style={{ padding:"10px 14px", background:"linear-gradient(135deg,#f5f3ff,#ede9fe)",
        borderBottom:"1px solid #c4b5fd", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <input type="checkbox" checked={allSelected} onChange={allSelected ? onClearAll : onSelectAll}
          style={{ width:15, height:15, cursor:"pointer", accentColor:"#4f46e5" }} />
        <span style={{ fontSize:12, fontWeight:700, color:"#4f46e5" }}>
          {selected.length > 0 ? `${selected.length} selected` : "Select appointments"}
        </span>
        {selected.length > 0 && (
          <div style={{ display:"flex", gap:6, marginLeft:"auto", flexWrap:"wrap" }}>
            {[
              { label:"✓ Check In",    color:"#16a34a", action:"check-in" },
              { label:"✅ Arrived",    color:"#4f46e5", action:"mark-arrived" },
              { label:"🔁 Reschedule", color:"#f59e0b", action:"reschedule" },
              { label:"✕ Cancel",      color:"#dc2626", action:"cancel" },
            ].map(a => (
              <button key={a.action} onClick={() => onBulkAction(a.action, selected)}
                style={{ padding:"4px 12px", borderRadius:6, fontSize:11, fontWeight:700,
                  border:`1px solid ${a.color}40`, background:`${a.color}10`, color:a.color, cursor:"pointer" }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ maxHeight:320, overflowY:"auto" }}>
        {appts.map(apt => {
          const isSel = selected.includes(apt.id);
          return (
            <div key={apt.id} onClick={() => onToggle(apt.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                borderBottom:"1px solid #f1f5f9", cursor:"pointer",
                background: isSel ? "#f5f3ff" : "transparent", transition:"background 0.1s" }}>
              <input type="checkbox" checked={isSel} onChange={() => onToggle(apt.id)}
                onClick={e => e.stopPropagation()}
                style={{ width:15, height:15, cursor:"pointer", accentColor:"#4f46e5", flexShrink:0 }} />
              <div style={{ fontSize:12, fontWeight:700, color:isSel?"#4f46e5":"var(--text-primary)", minWidth:70 }}>
                {fmtTime12(apt.time)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{apt.patientName}</div>
                <div style={{ fontSize:10, color:"var(--text-muted)" }}>{apt.type} · {apt.providerName}</div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, flexShrink:0,
                background:getStatusStyle(apt.status).bg, color:getStatusStyle(apt.status).color }}>
                {apt.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE EXPORT
══════════════════════════════════════════════ */
export default function Schedule() {
  const { currentUser } = useAuth();
  const { appointments, updateAppointmentStatus, addAppointment, selectPatient, patients, blockedDays, addBlockedDay, removeBlockedDay } = usePatient();
  const { activeSiteId, isFiltered } = useSite();
  const navigate = useNavigate();
  const isFrontDesk = currentUser?.role === "front_desk" || currentUser?.role === "admin";
  const isProvider  = currentUser?.role === "prescriber" || currentUser?.role === "therapist";

  const [providers, setProviders] = useState([]);
  useEffect(() => {
    usersApi.directory().then(data => {
      if (Array.isArray(data)) setProviders(data.filter(u => ['prescriber', 'nurse', 'therapist'].includes(u.role)));
    }).catch(() => {});
  }, []);

  // Restrict which providers a user can block days for:
  // - front_desk → all providers
  // - prescriber / therapist → only themselves
  // - all other roles (nurse, patient, etc.) → none
  const authorizedProviders = useMemo(() => {
    const userLocationId = currentUser?.locationId || currentUser?.location_id;
    const isAdmin = currentUser?.role === 'admin';
    if (isAdmin) return providers;
    if (isFrontDesk) return userLocationId
      ? providers.filter(p => p.locationId === userLocationId)
      : providers;
    if (isProvider) return providers.filter(p => p.id === currentUser?.id);
    return [];
  }, [isFrontDesk, isProvider, currentUser, providers]);

  const canBlockDays = authorizedProviders.length > 0;

  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(() => toKey(getToday()));
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  // Reset provider filter when site changes so a provider from another location isn't stuck
  useEffect(() => { setProviderFilter("all"); }, [activeSiteId]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  useEffect(() => {
    const handle = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('day');
    };
    window.addEventListener('resize', handle);
    handle();
    return () => window.removeEventListener('resize', handle);
  }, []);
  const [modalVisitType, setModalVisitType] = useState('In-Person');
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");
  const [modalProvider, setModalProvider] = useState("");
  const [rescheduleAptSchedule, setRescheduleAptSchedule] = useState(null);
  const [batchMode, setBatchMode]       = useState(false);
  const [batchSelected, setBatchSelected] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const pushFeedEvent = useCallback((icon, text) => {
    const time = new Date().toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true });
    setActivityFeed(f => [...f.slice(-49), { icon, text, time }]);
  }, []);
  const [showBlockPanel, setShowBlockPanel] = useState(false);
  const [blockProvider, setBlockProvider] = useState("");
  useEffect(() => {
    if (blockProvider === "" && providers.length > 0) {
      setBlockProvider((providers.find(p => p.id === currentUser?.id)?.id) || providers[0]?.id || "");
    }
  }, [providers, currentUser?.id]);
  const [blockDateFrom, setBlockDateFrom] = useState("");
  const [blockDateTo, setBlockDateTo] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("full");
  const [blockSaved, setBlockSaved] = useState(false);
  const blockSavedTimerRef = useRef(null);
  useEffect(() => { return () => { if (blockSavedTimerRef.current) clearTimeout(blockSavedTimerRef.current); }; }, []);

  const blockedByDate = useMemo(() => {
    const map = {};
    blockedDays.forEach(b => {
      const from = new Date(b.dateFrom+"T00:00:00");
      const to   = new Date(b.dateTo+"T00:00:00");
      for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) {
        const k = toKey(d); (map[k] = map[k] || []).push(b);
      }
    });
    return map;
  }, [blockedDays]);

  const allAppts = useMemo(() => {
    // Backend already scopes to the user's facility — no need to filter by provider here.
    // The providerFilter dropdown (below) handles per-provider narrowing for the day view.
    const base = appointments || [];
    if (!isFiltered) return base;
    return base.filter(a => appointmentSiteId(a) === activeSiteId);
  }, [appointments, activeSiteId, isFiltered]);
  const todayKey = toKey(getToday());

  const aptsByDate = useMemo(() => {
    const map = {};
    allAppts.forEach(a => { (map[a.date] = map[a.date] || []).push(a); });
    return map;
  }, [allAppts]);

  const activeDate = selectedDate || todayKey;

  const dateAppts = useMemo(() => {
    let base = allAppts.filter(a => a.date===activeDate);
    if (providerFilter!=="all") base = base.filter(a=>a.provider===providerFilter);
    if (statusFilter!=="All") base = base.filter(a => {
      if (statusFilter==="Waiting") return a.status==="Scheduled"||a.status==="Confirmed";
      if (statusFilter==="In Session") return a.status==="In Progress";
      return a.status===statusFilter;
    });
    return base.sort((a,b)=>a.time.localeCompare(b.time));
  }, [allAppts, activeDate, providerFilter, statusFilter]);

  const counts = useMemo(() => {
    const base = allAppts.filter(a=>a.date===activeDate);
    return {
      total:     base.length,
      scheduled: base.filter(a=>a.status==="Scheduled"||a.status==="Confirmed").length,
      checkedIn: base.filter(a=>a.status==="Checked In").length,
      inProgress:base.filter(a=>a.status==="In Progress").length,
      completed: base.filter(a=>a.status==="Completed").length,
    };
  }, [allAppts, activeDate]);

  const providerBreakdown = useMemo(() => {
    const base = allAppts.filter(a=>a.date===activeDate);
    return providers.map(p => {
      const apts = base.filter(a => a.provider === p.id);
      const telehealth = apts.filter(a => a.visitType === "Telehealth").length;
      const inPerson   = apts.length - telehealth;
      const avgDuration = apts.length ? Math.round(apts.reduce((s,a) => s + (a.duration||30), 0) / apts.length) : 0;

      // gaps: consecutive pairs with ≥60 min gap
      const sorted = [...apts].sort((a,b) => (a.time||"").localeCompare(b.time||""));
      let gaps = 0;
      for (let i = 1; i < sorted.length; i++) {
        const [h1,m1] = (sorted[i-1].time||"0:0").split(":").map(Number);
        const [h2,m2] = (sorted[i].time||"0:0").split(":").map(Number);
        const prevEnd   = h1*60 + m1 + (sorted[i-1].duration||30);
        const nextStart = h2*60 + m2;
        if (nextStart - prevEnd >= 60) gaps++;
      }

      // overlaps: next apt starts before previous ends
      let overlaps = 0;
      for (let i = 1; i < sorted.length; i++) {
        const [h1,m1] = (sorted[i-1].time||"0:0").split(":").map(Number);
        const [h2,m2] = (sorted[i].time||"0:0").split(":").map(Number);
        const prevEnd   = h1*60 + m1 + (sorted[i-1].duration||30);
        const nextStart = h2*60 + m2;
        if (nextStart < prevEnd) overlaps++;
      }

      return { ...p, apts, telehealth, inPerson, avgDuration, gaps, overlaps };
    }).filter(p => p.apts.length > 0);
  }, [allAppts, activeDate, providers]);

  const providerStatuses = useMemo(() => {
    const map = {};
    providerBreakdown.forEach(p => {
      const blocked = (blockedByDate[activeDate]||[]).some(b => b.providerId === p.id);
      if (blocked) { map[p.id] = "ooo"; return; }
      if (p.overlaps > 0)                                { map[p.id] = "overbooked";     return; }
      if (p.apts.length > 0 && p.telehealth === p.apts.length) { map[p.id] = "telehealth-only"; return; }
      if (p.gaps > 0)                                     { map[p.id] = "behind";         return; }
      map[p.id] = "on-time";
    });
    return map;
  }, [providerBreakdown, blockedByDate, activeDate]);

  const PROV_STATUS_ICON = { "on-time":"🟢", "behind":"🟡", "overbooked":"🔴", "telehealth-only":"📹", "ooo":"🛑" };

  // Providers visible in the filter sidebar:
  // - admin/front_desk with no site filter → all providers
  // - site filter active → providers at that site
  // - non-admin (prescriber/therapist/nurse) → always scoped to their own location
  const siteProviders = useMemo(() => {
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'front_desk';
    const userLocationId = currentUser?.locationId || currentUser?.location_id;

    // Non-admin: always filter to their own location
    // Include providers without a locationId (e.g. directory response before server restart)
    if (!isAdmin && userLocationId) {
      return providers.filter(p => !p.locationId || p.locationId === userLocationId || p.id === currentUser?.id);
    }
    // Non-admin with no location assigned: only themselves
    if (!isAdmin) {
      return providers.filter(p => p.id === currentUser?.id);
    }

    // Admin with no site filter → all providers
    if (!isFiltered) return providers;

    // Admin with site selected → providers at that site or with appointments there
    // Providers without locationId are included as a fallback (directory endpoint before server restart)
    const provIdsWithAppts = new Set(allAppts.map(a => a.provider));
    return providers.filter(p =>
      provIdsWithAppts.has(p.id) || !p.locationId || p.locationId === activeSiteId
    );
  }, [isFiltered, allAppts, activeSiteId, currentUser, providers]);

  const handleOpenChart  = useCallback(apt => { if(apt.patientId){selectPatient(apt.patientId);navigate(`/chart/${apt.patientId}/summary`);} }, [selectPatient,navigate]);
  const handleCheckIn    = useCallback(apt => {
    updateAppointmentStatus(apt.id,"Checked In");
    pushFeedEvent("✅", `${apt.patientName} checked in`);
    if(apt.patientId)selectPatient(apt.patientId);
    navigate(`/session/${apt.id}`);
  }, [updateAppointmentStatus,selectPatient,navigate,pushFeedEvent]);
  const handleGoToSession= useCallback(apt => { if(apt.patientId)selectPatient(apt.patientId);navigate(`/session/${apt.id}`); }, [selectPatient,navigate]);
  const handleUpdateStatusWithFeed = useCallback((id, status, extra) => {
    const apt = (appointments||[]).find(a => a.id === id);
    if (apt) {
      const icons = { "Completed":"🏁", "Cancelled":"❌", "No Show":"⚠️", "Confirmed":"🟢", "In Progress":"🩺" };
      pushFeedEvent(icons[status]||"📋", `${apt.patientName} → ${status}`);
    }
    updateAppointmentStatus(id, status, extra);
  }, [appointments, updateAppointmentStatus, pushFeedEvent]);

  const handleToggleVisitType = useCallback(apt => {
    const isCurrentlyTelehealth = apt.visitType === "Telehealth";
    const newVisitType = isCurrentlyTelehealth ? "In-Person" : "Telehealth";
    const newRoom = isCurrentlyTelehealth ? "" : "Virtual";
    updateAppointmentStatus(apt.id, apt.status, { visitType: newVisitType, room: newRoom });
  }, [updateAppointmentStatus]);

  const handleRescheduleSchedule = useCallback((apt, newDate, newTime) => {
    updateAppointmentStatus(apt.id, "Rescheduled");
    addAppointment({
      patientId: apt.patientId, patientName: apt.patientName,
      provider: apt.provider, providerName: apt.providerName,
      date: newDate, time: newTime, duration: apt.duration||30,
      type: apt.type, status:"Scheduled", reason: apt.reason||"",
      visitType: apt.visitType||"In-Person", room: apt.room||"",
    });
    setRescheduleAptSchedule(null);
  }, [updateAppointmentStatus, addAppointment]);

  const handleAddBlock = () => {
    if (!blockDateFrom||!blockDateTo||!blockProvider||blockDateTo<blockDateFrom) return;
    const prov = providers.find(p=>p.id===blockProvider);
    addBlockedDay({ providerId:blockProvider, providerName:prov?`${prov.firstName} ${prov.lastName}`.trim():blockProvider,
      dateFrom:blockDateFrom, dateTo:blockDateTo, type:blockType, reason:blockReason.trim() });
    setBlockDateFrom(""); setBlockDateTo(""); setBlockReason(""); setBlockType("full");
    setBlockSaved(true);
    if (blockSavedTimerRef.current) clearTimeout(blockSavedTimerRef.current);
    blockSavedTimerRef.current = setTimeout(()=>setBlockSaved(false),3000);
  };

  const selDateObj   = new Date(activeDate+"T00:00:00");
  const selDateLabel = selDateObj.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const isSelToday   = activeDate===todayKey;
  const dayBlocks    = blockedByDate[activeDate]||[];
  const shiftDay  = delta => { const d=new Date(activeDate+"T00:00:00"); d.setDate(d.getDate()+delta);   setSelectedDate(toKey(d)); };
  const shiftWeek = delta => { const d=new Date(activeDate+"T00:00:00"); d.setDate(d.getDate()+delta*7); setSelectedDate(toKey(d)); };
  const weekRange = getWeekRange(activeDate);

  const TABS = [
    { key:"schedule",        label:"📅 Schedule" },
    ...(isFrontDesk ? [{ key:"frontdesk",      label:"🏥 Front Desk" }]     : []),
    ...(isFrontDesk ? [{ key:"checkout",        label:"🧾 Check Out" }]      : []),
    ...(isProvider  ? [{ key:"close-encounter", label:"🔒 Close Encounter" }] : []),
  ];

  const canCreateAppointment = isFrontDesk || isProvider;

  return (
    <div className="fade-in">
      {/* PAGE HEADER */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--text-primary)" }}>📅 Schedule</h1>
          <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--text-muted)" }}>Appointment overview &amp; management</p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {activeTab==="schedule" && (
            <>
              {/* View mode toggle — hidden on mobile (day-only) */}
              {!isMobile && (
              <div style={{ display:"flex", gap:0, background:"#f8fafc", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
                {['day','week','month'].map(v => (
                  <button key={v} type="button" onClick={() => setViewMode(v)}
                    style={{ padding:"5px 14px", border:"none", fontSize:11, fontWeight:700, cursor:"pointer",
                      background: viewMode===v?"#4f46e5":"transparent",
                      color: viewMode===v?"#fff":"var(--text-muted)",
                      transition:"all 0.12s" }}>
                    {v==='day'?'Day':v==='week'?'Week':'Month'}
                  </button>
                ))}
              </div>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(toKey(getToday()))}>Today</button>
              {canBlockDays && (
                <button onClick={() => setShowBlockPanel(v=>!v)}
                  style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                    border:`1.5px solid ${showBlockPanel?"#c92b2b":"var(--border)"}`,
                    background:showBlockPanel?"#c92b2b":"#fff",
                    color:showBlockPanel?"#fff":"var(--text-secondary)" }}>⛔ Block Days</button>
              )}
              {(isFrontDesk || isProvider) && (
                <button onClick={() => { setBatchMode(v=>!v); setBatchSelected([]); }}
                  style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                    border:`1.5px solid ${batchMode?"#4f46e5":"var(--border)"}`,
                    background:batchMode?"#4f46e5":"#fff",
                    color:batchMode?"#fff":"var(--text-secondary)" }}>
                  {batchMode ? "✕ Exit Select" : "☑ Select"}
                </button>
              )}
              {canCreateAppointment && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => { setModalDate(activeDate); setModalVisitType('In-Person'); setShowModal(true); }}
                    style={{ fontSize:12, fontWeight:700 }}>＋ New Appointment</button>
                  <button onClick={() => { setModalDate(activeDate); setModalVisitType('Telehealth'); setShowModal(true); }}
                    style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                      border:"1.5px solid #8b5cf6", background:"#8b5cf6", color:"#fff", transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background="#7c3aed";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#8b5cf6";}}>📹 New Telehealth</button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* TABS */}
      {TABS.length > 1 && (
        <div style={{ display:"flex", gap:0, marginBottom:16, background:"#f8fafc",
          border:"1px solid var(--border)", borderRadius:10, padding:4, width:"fit-content" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:"7px 20px", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer",
                border:"none", transition:"all 0.15s",
                background: activeTab===t.key?"#fff":"transparent",
                color: activeTab===t.key?"var(--text-primary)":"var(--text-secondary)",
                boxShadow: activeTab===t.key?"var(--shadow-sm)":"none" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {activeTab==="schedule" && (
        <>
          {/* BLOCK PANEL */}
          {showBlockPanel && (
            <div style={{ background:"#fff", border:"1.5px solid #f87171", borderRadius:12, padding:"16px 18px", marginBottom:16, boxShadow:"var(--shadow-sm)" }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#c92b2b", marginBottom:12 }}>⛔ Block Provider Days</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-secondary)", marginBottom:4 }}>Provider</label>
                  <select className="form-input" value={blockProvider} onChange={e=>setBlockProvider(e.target.value)}
                    disabled={authorizedProviders.length <= 1}>
                    {authorizedProviders.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-secondary)", marginBottom:4 }}>From</label>
                  <input type="date" className="form-input" value={blockDateFrom} onChange={e=>{ setBlockDateFrom(e.target.value); if(!blockDateTo||e.target.value>blockDateTo) setBlockDateTo(e.target.value); }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-secondary)", marginBottom:4 }}>To</label>
                  <input type="date" className="form-input" value={blockDateTo} min={blockDateFrom} onChange={e=>setBlockDateTo(e.target.value)} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-secondary)", marginBottom:4 }}>Type</label>
                  <div style={{ display:"flex", gap:4 }}>
                    {[{val:"full",label:"Full"},{val:"am",label:"AM"},{val:"pm",label:"PM"}].map(t=>(
                      <button key={t.val} type="button" onClick={() => setBlockType(t.val)}
                        style={{ flex:1, padding:"6px 0", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
                          border:`1.5px solid ${blockType===t.val?"#c92b2b":"var(--border)"}`,
                          background:blockType===t.val?"#c92b2b":"#fff",
                          color:blockType===t.val?"#fff":"var(--text-secondary)" }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"var(--text-secondary)", marginBottom:4 }}>Reason</label>
                  <input type="text" className="form-input" placeholder="PTO, Conference, Holiday..." value={blockReason} onChange={e=>setBlockReason(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                {blockSaved ? <span style={{ fontSize:12, color:"#166534", fontWeight:700 }}>✅ Block saved!</span> : <span />}
                <button onClick={handleAddBlock} disabled={!blockDateFrom||!blockDateTo}
                  style={{ padding:"6px 16px", borderRadius:7, fontSize:12, fontWeight:700, border:"none",
                    background:"#c92b2b", color:"#fff", cursor:"pointer",
                    opacity:(!blockDateFrom||!blockDateTo)?0.5:1 }}>⛔ Add Block</button>
              </div>
              {blockedDays.length>0 && (
                <div style={{ marginTop:12, borderTop:"1px solid #fecaca", paddingTop:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#c92b2b", marginBottom:6 }}>Active Blocks</div>
                  {[...blockedDays].sort((a,b)=>a.dateFrom.localeCompare(b.dateFrom)).map(b=>(
                    <div key={b.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"var(--text-secondary)", marginBottom:4 }}>
                      <span style={{ fontWeight:700, color:"var(--text-primary)" }}>{b.providerName}</span>
                      <span>{b.dateFrom===b.dateTo?b.dateFrom:`${b.dateFrom} → ${b.dateTo}`}</span>
                      <span style={{ padding:"1px 7px", borderRadius:10, background:"rgba(201,43,43,0.1)", color:"#c92b2b", fontWeight:600 }}>{b.type}</span>
                      {b.reason && <span style={{ fontStyle:"italic" }}>— {b.reason}</span>}
                      <button onClick={() => removeBlockedDay(b.id)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16, fontWeight:700, lineHeight:1, padding:"0 2px" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MAIN 2-COLUMN LAYOUT */}
          {viewMode !== 'day' && (
            <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:14, padding:"40px 32px", textAlign:"center", color:"var(--text-muted)" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>{viewMode==='week'?'🗓':'📆'}</div>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:6, color:"var(--text-primary)" }}>
                {viewMode==='week'?'Week':'Month'} View
              </div>
              <p style={{ fontSize:13, maxWidth:320, margin:"0 auto" }}>
                {viewMode==='week'?'Week':'Month'} view is in development. Switch to <strong>Day</strong> view to manage individual appointments.
              </p>
              <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={() => setViewMode('day')}>Switch to Day View</button>
            </div>
          )}
          {viewMode === 'day' && (
          <>
          <TodayRibbon dateAppts={dateAppts} todayKey={todayKey} activeDate={activeDate} />
          <DaySummaryBar appts={allAppts.filter(a => a.date === activeDate)} />
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <div style={{ marginBottom:10 }}>
              <button onClick={() => setShowSidebarMobile(v=>!v)}
                style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                  border:"1.5px solid var(--border)", background:"#f8fafc", color:"var(--text-secondary)" }}>
                {showSidebarMobile ? '▲ Hide Calendar & Filters' : '▼ Show Calendar & Filters'}
              </button>
            </div>
          )}
          <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexDirection: isMobile ? 'column' : 'row' }}>
            {/* LEFT SIDEBAR */}
            {(!isMobile || showSidebarMobile) && (
            <div style={{ width: isMobile ? '100%' : 218, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ ...card({ padding:"14px 12px" }) }}>
                <MiniCalendar selectedDate={activeDate} onSelect={k=>setSelectedDate(k||toKey(getToday()))} aptsByDate={aptsByDate} blockedByDate={blockedByDate} />
                <button onClick={() => setSelectedDate(toKey(getToday()))}
                  style={{ width:"100%", marginTop:10, padding:"7px 0", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer",
                    border:"1.5px solid #4f46e5", background:isSelToday?"#4f46e5":"#fff",
                    color:isSelToday?"#fff":"#4f46e5", transition:"all 0.12s" }}>
                  {isSelToday?"● Today":"Go to Today"}
                </button>
              </div>
              <div style={{ ...card({ padding:"12px" }) }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Filter by Provider</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {[{id:"all",firstName:"All",lastName:"Providers",credentials:""},...siteProviders].map(p => {
                    const cnt = p.id==="all" ? allAppts.filter(a=>a.date===activeDate).length : allAppts.filter(a=>a.date===activeDate&&a.provider===p.id).length;
                    const pc = p.id==="all"?"#6366f1":provColor(p.id);
                    const isSel = providerFilter===p.id;
                    return (
                      <button key={p.id} onClick={() => setProviderFilter(p.id)}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7,
                          border:"none", cursor:"pointer", background:isSel?`${pc}18`:"transparent",
                          transition:"background 0.1s", textAlign:"left" }}>
                        <div style={{ width:24, height:24, borderRadius:"50%", background:pc, color:"#fff",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:p.id==="all"?8:9, fontWeight:800, flexShrink:0 }}>
                          {p.id==="all"?"All":`${p.firstName[0]}${p.lastName?.[0]||""}`}
                        </div>
                        <span style={{ fontSize:11.5, color:isSel?pc:"var(--text-primary)", fontWeight:isSel?700:500,
                          flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {p.firstName} {p.id!=="all"?p.lastName:""}
                        </span>
                        {p.id !== "all" && providerStatuses[p.id] && (
                          <span style={{ fontSize:11, flexShrink:0 }} title={providerStatuses[p.id]}>
                            {PROV_STATUS_ICON[providerStatuses[p.id]]||"🟢"}
                          </span>
                        )}
                        <span style={{ fontSize:10, background:"#f1f5f9", color:"var(--text-muted)", borderRadius:10, padding:"1px 6px", flexShrink:0, fontWeight:600 }}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ ...card({ padding:"12px" }) }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Visit Types</div>
                {[{label:"Follow-Up",color:"#3b82f6"},{label:"New Patient",color:"#f59e0b"},
                  {label:"Telehealth",color:"#8b5cf6"},{label:"Urgent",color:"#ef4444"},
                  {label:"Med Review",color:"#22c55e"},{label:"Blocked Day",color:"#c92b2b"}].map(l=>(
                  <div key={l.label} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, marginBottom:4 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:l.color, display:"inline-block", flexShrink:0 }} />
                    <span style={{ color:"var(--text-secondary)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            )} {/* end mobile-conditional sidebar */}

            {/* RIGHT PANEL */}
            <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:14 }}>
              {/* Date Header + Week Range */}
              <div style={{ ...card({ padding:"14px 20px" }) }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  {/* Week navigation */}
                  <button onClick={() => shiftWeek(-1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:13, fontWeight:700, color:"var(--text-secondary)" }} title="Previous week">«</button>
                  <button onClick={() => shiftDay(-1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:13, fontWeight:700, color:"var(--text-secondary)" }} title="Previous day">‹</button>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:16, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      {selDateLabel}
                      {isSelToday && <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:"#dbeafe", color:"#1e40af", fontWeight:700 }}>Today</span>}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>
                      Week of {weekRange}
                      {dayBlocks.length>0 && <span style={{ color:"#c92b2b", fontWeight:600, marginLeft:10 }}>⛔ {dayBlocks.map(b=>`${b.providerName}: ${b.type==="full"?"Full Day":b.type==="am"?"AM":"PM"} blocked`).join(" · ")}</span>}
                    </div>
                  </div>
                  <button onClick={() => shiftDay(1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:13, fontWeight:700, color:"var(--text-secondary)" }} title="Next day">›</button>
                  <button onClick={() => shiftWeek(1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:13, fontWeight:700, color:"var(--text-secondary)" }} title="Next week">»</button>
                  {canCreateAppointment && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setModalDate(activeDate); setModalTime(""); setModalProvider(""); setModalVisitType('In-Person'); setShowModal(true); }}
                      style={{ fontSize:12, fontWeight:700 }}>＋ Schedule Patient</button>
                  )}
                </div>
                {/* Stat filter chips — grouped */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {/* Overview group */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", paddingTop:2 }}>
                    <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", color:"var(--text-dim)", minWidth:50 }}>Overview</span>
                    {[
                      {label:"Total", count:counts.total, key:"All", bg:"#f1f5f9", color:"#475569", dot:"#94a3b8", accent:"#cbd5e1"},
                    ].map(s=>(
                      <button key={s.key} onClick={() => setStatusFilter(statusFilter===s.key?"All":s.key)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 18px", borderRadius:20,
                          border:`1.5px solid ${statusFilter===s.key?s.dot:s.accent}`,
                          cursor:"pointer", background: statusFilter===s.key ? s.dot : s.bg,
                          boxShadow: statusFilter===s.key ? `0 2px 8px ${s.dot}55` : 'var(--shadow-sm)',
                          transition:"all 0.15s" }}>
                        <span style={{ width:7, height:7, borderRadius:"50%", background: statusFilter===s.key ? "#fff" : s.dot, flexShrink:0 }} />
                        <span style={{ fontSize:20, fontWeight:800, color: statusFilter===s.key ? "#fff" : s.color, lineHeight:1 }}>{s.count}</span>
                        <span style={{ fontSize:11, color: statusFilter===s.key ? "rgba(255,255,255,0.85)" : s.color, opacity: statusFilter===s.key ? 1 : 0.8 }}>{s.label}</span>
                      </button>
                    ))}
                    {statusFilter!=="All" && (
                      <button onClick={() => setStatusFilter("All")} style={{ padding:"5px 12px", borderRadius:20, border:"1px solid var(--border)", background:"#fff", fontSize:11, cursor:"pointer", color:"var(--text-secondary)", boxShadow:"var(--shadow-sm)" }}>Clear ×</button>
                    )}
                  </div>
                  {/* Status group */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", paddingTop:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", color:"var(--text-dim)", minWidth:50 }}>Status</span>
                    {[
                      {label:"Waiting",    count:counts.scheduled,   key:"Waiting",    bg:"#dbeafe", color:"#1e40af", dot:"#3b82f6", accent:"#93c5fd"},
                      {label:"Checked In", count:counts.checkedIn,   key:"Checked In", bg:"#dcfce7", color:"#166534", dot:"#22c55e", accent:"#86efac"},
                      {label:"In Session", count:counts.inProgress,  key:"In Session", bg:"#fef3c7", color:"#92400e", dot:"#f59e0b", accent:"#fcd34d"},
                      {label:"Completed",  count:counts.completed,   key:"Completed",  bg:"#f1f5f9", color:"#64748b", dot:"#94a3b8", accent:"#cbd5e1"},
                    ].map(s=>(
                      <button key={s.key} onClick={() => setStatusFilter(statusFilter===s.key?"All":s.key)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:20,
                          border:`1.5px solid ${statusFilter===s.key?s.dot:s.accent}`,
                          cursor:"pointer", background: statusFilter===s.key ? s.dot : s.bg,
                          boxShadow: statusFilter===s.key ? `0 2px 8px ${s.dot}55` : 'var(--shadow-sm)',
                          transition:"all 0.15s" }}>
                        <span style={{ width:7, height:7, borderRadius:"50%", background: statusFilter===s.key ? "#fff" : s.dot, flexShrink:0 }} />
                        <span style={{ fontSize:14, fontWeight:800, color: statusFilter===s.key ? "#fff" : s.color, lineHeight:1 }}>{s.count}</span>
                        <span style={{ fontSize:11, color: statusFilter===s.key ? "rgba(255,255,255,0.85)" : s.color, opacity: statusFilter===s.key ? 1 : 0.8 }}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Flow Map */}
              {dateAppts.length > 0 && (
                <PatientFlowMap appts={allAppts.filter(a => a.date === activeDate)} />
              )}

              {/* Room Utilization */}
              <RoomUtilizationPanel appts={allAppts.filter(a => a.date === activeDate)} />

              {/* Provider swimlanes */}
              {providerBreakdown.length>0 && providerFilter==="all" && (
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {providerBreakdown.map(p => {
                    const pc = provColor(p.id);
                    const doneCnt = p.apts.filter(a=>a.status==="Completed").length;
                    const activeCnt = p.apts.filter(a=>a.status==="Checked In"||a.status==="In Progress").length;
                    const pct = p.apts.length>0 ? Math.round((doneCnt/p.apts.length)*100) : 0;
                    return (
                      <div key={p.id} onClick={() => setProviderFilter(p.id)}
                        style={{ flex:"1 1 200px", background:"#fff", border:`2px solid ${pc}30`, borderRadius:12,
                          padding:"14px 16px", cursor:"pointer", transition:"all 0.15s", boxShadow:"var(--shadow-sm)" }}
                        onMouseEnter={e=>{e.currentTarget.style.border=`2px solid ${pc}`;e.currentTarget.style.boxShadow=`0 0 0 3px ${pc}18`;}}
                        onMouseLeave={e=>{e.currentTarget.style.border=`2px solid ${pc}30`;e.currentTarget.style.boxShadow="var(--shadow-sm)";}}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                          <div style={{ width:40, height:40, borderRadius:"50%", background:pc, color:"#fff",
                            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {p.firstName[0]}{p.lastName?.[0]||""}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)" }}>{p.firstName} {p.lastName}</div>
                            <div style={{ fontSize:10, color:"var(--text-muted)" }}>{p.credentials||p.specialty||"Provider"}</div>
                          </div>
                          <div style={{ fontSize:22, fontWeight:800, color:pc }}>{p.apts.length}</div>
                        </div>
                        <div style={{ height:5, background:"#f1f5f9", borderRadius:5, overflow:"hidden", marginBottom:4 }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:pc, borderRadius:5, transition:"width 0.4s" }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--text-muted)" }}>
                          <span>{doneCnt} done · {activeCnt} active</span>
                          <span style={{ fontWeight:700, color:pc }}>{pct}% complete</span>
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:6, fontSize:10, color:"var(--text-muted)", flexWrap:"wrap" }}>
                          <span>📹 {p.telehealth} telehealth</span>
                          <span>🏥 {p.inPerson} in-person</span>
                          <span>⏱ {p.avgDuration}m avg</span>
                        </div>
                        {(p.gaps > 0 || p.overlaps > 0) && (
                          <div style={{ display:"flex", gap:8, marginTop:3, fontSize:10, flexWrap:"wrap" }}>
                            {p.gaps > 0 && <span style={{ color:"#b45309", fontWeight:600 }}>⚡ {p.gaps} gap{p.gaps>1?"s":""}</span>}
                            {p.overlaps > 0 && <span style={{ color:"#dc2626", fontWeight:600 }}>⚠ {p.overlaps} overlap{p.overlaps>1?"s":""}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Batch Select Panel */}
              {batchMode && (
                <BatchSelectPanel
                  appts={dateAppts}
                  selected={batchSelected}
                  patients={patients}
                  onToggle={id => setBatchSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])}
                  onSelectAll={() => setBatchSelected(dateAppts.map(a=>a.id))}
                  onClearAll={() => setBatchSelected([])}
                  onBulkAction={(action, ids) => {
                    const targets = dateAppts.filter(a => ids.includes(a.id));
                    if (action === "check-in") targets.forEach(a => handleUpdateStatusWithFeed(a.id,"Checked In"));
                    if (action === "mark-arrived") targets.forEach(a => handleUpdateStatusWithFeed(a.id,"Confirmed"));
                    if (action === "cancel") targets.forEach(a => handleUpdateStatusWithFeed(a.id,"Cancelled"));
                    if (action === "reschedule") targets.forEach(a => handleUpdateStatusWithFeed(a.id,"Rescheduled"));
                    setBatchSelected([]);
                  }}
                />
              )}

              {/* Multi-Provider Grid */}
              <div key={activeDate} style={{ animation:"fade-slide-in 0.18s ease both" }}>
                <MultiProviderGrid
                  activeDate={activeDate}
                  siteProviders={siteProviders}
                  allAppts={allAppts}
                  patients={patients}
                  todayKey={todayKey}
                  isToday={activeDate === todayKey}
                  onCellClick={(providerId, date, time) => {
                    if (!canCreateAppointment) return;
                    setModalDate(date);
                    setModalTime(time);
                    setModalProvider(providerId);
                    setModalVisitType('In-Person');
                    setShowModal(true);
                  }}
                  onAptClick={apt => setRescheduleAptSchedule(apt)}
                />
              </div>

              {/* Activity Feed */}
              <ActivityFeed feed={activityFeed} onClear={() => setActivityFeed([])} />

              {/* Mini Analytics */}
              <MiniAnalytics allAppts={allAppts} todayKey={todayKey} />

              {/* Tomorrow Preview */}
              <TomorrowPreview allAppts={allAppts} activeDate={activeDate} />

              {/* Upcoming 7-day strip */}
              <div style={{ ...card({ padding:"14px 16px" }) }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Upcoming Week</div>
                <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                  {Array.from({length:7},(_,i)=>{
                    const d=new Date(getToday()); d.setDate(d.getDate()+i);
                    const k=toKey(d);
                    const cnt=(aptsByDate[k]||[]).length;
                    const isT=k===todayKey;
                    const isSel=k===activeDate;
                    return (
                      <button key={k} onClick={() => setSelectedDate(k)}
                        style={{ flex:"0 0 78px", borderRadius:10, padding:"8px 6px", textAlign:"center", cursor:"pointer",
                          border:`2px solid ${isSel?"#4f46e5":isT?"#bfdbfe":"transparent"}`,
                          background:isSel?"#4f46e5":isT?"#eff6ff":"#f8fafc",
                          transition:"all 0.12s" }}>
                        <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase",
                          color:isSel?"#c7d2fe":isT?"#1e40af":"var(--text-muted)", marginBottom:2 }}>
                          {d.toLocaleDateString("en-US",{weekday:"short"})}
                        </div>
                        <div style={{ fontSize:16, fontWeight:800, color:isSel?"#fff":isT?"#1e40af":"var(--text-primary)", marginBottom:4 }}>
                          {d.getDate()}
                        </div>
                        {cnt>0 ? (
                          <div style={{ fontSize:10, fontWeight:700, background:isSel?"rgba(255,255,255,0.25)":"#dbeafe", color:isSel?"#fff":"#1e40af", borderRadius:10, padding:"1px 5px", display:"inline-block" }}>{cnt}</div>
                        ) : (
                          <div style={{ fontSize:10, color:isSel?"rgba(255,255,255,0.5)":"var(--text-muted)" }}>—</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MINI TIMELINE — hidden on mobile */}
            {!isMobile && (
            <div style={{ width:54, flexShrink:0, background:"#f8fafc", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", position:"sticky", top:80, alignSelf:"flex-start" }}>
              <div style={{ textAlign:"center", padding:"7px 4px", background:"#eef1f6", borderBottom:"1px solid var(--border)", fontSize:9, fontWeight:800, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:"0.5px" }}>Hours</div>
              {Array.from({length:11}, (_,i) => i+8).map(h => {
                const label = h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`;
                const hasApt = dateAppts.some(a => a.time && parseInt(a.time.split(':')[0],10) === h);
                return (
                  <div key={h} style={{ padding:"7px 4px", borderBottom:"1px solid var(--border)", textAlign:"center" }}>
                    <span style={{ fontSize:9.5, fontWeight:700, color:hasApt?"var(--primary)":"var(--text-muted)", display:"block" }}>{label}</span>
                    {hasApt && <div style={{ width:6, height:6, background:"var(--primary)", borderRadius:"50%", margin:"2px auto 0" }} />}
                  </div>
                );
              })}
            </div>
            )} {/* end !isMobile mini timeline */}
          </div>
          </>
          )}
        </>
      )}

      {/* ── FRONT DESK TAB ── */}
      {activeTab==="frontdesk" && (
        <FrontDeskTab
          allAppts={allAppts}
          patients={patients}
          todayKey={todayKey}
          updateAppointmentStatus={updateAppointmentStatus}
          addAppointment={addAppointment}
          selectPatient={selectPatient}
          navigate={navigate}
          isMobile={isMobile}
        />
      )}

      {/* ── CHECKOUT TAB ── */}
      {activeTab==="checkout" && (
        <CheckoutTab
          allAppts={allAppts}
          patients={patients}
          todayKey={todayKey}
          updateAppointmentStatus={updateAppointmentStatus}
        />
      )}

      {/* ── CLOSE ENCOUNTER TAB ── */}
      {activeTab==="close-encounter" && (
        <CloseEncounterTab
          allAppts={allAppts}
          patients={patients}
          currentUser={currentUser}
          todayKey={todayKey}
          updateAppointmentStatus={updateAppointmentStatus}
        />
      )}

      <RescheduleModal
        show={!!rescheduleAptSchedule}
        apt={rescheduleAptSchedule}
        onClose={() => setRescheduleAptSchedule(null)}
        onConfirm={handleRescheduleSchedule}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        show={showModal}
        onClose={() => { setShowModal(false); setModalVisitType('In-Person'); setModalTime(''); setModalProvider(''); }}
        initialDate={modalDate}
        initialTime={modalTime}
        initialVisitType={modalVisitType}
        patients={patients}
        defaultProvider={modalProvider || (isProvider ? currentUser?.id : undefined)}
        providers={siteProviders}
        existingAppts={allAppts}
        onSave={apt => { addAppointment({ ...apt, locationId: activeSiteId !== 'all' ? activeSiteId : undefined }); setShowModal(false); setModalVisitType('In-Person'); setModalTime(''); setModalProvider(''); }}
      />
    </div>
  );
}
