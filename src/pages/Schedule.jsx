import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePatient } from "../contexts/PatientContext";
import { useSite, appointmentSiteId } from "../contexts/SiteContext";
import { users as allUsers } from "../data/mockData";

const PROVIDERS = allUsers.filter(u => u.role === "prescriber" || u.role === "nurse" || u.role === "therapist");

/* ── helpers ── */
const TODAY = new Date();
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
  "In Progress":   { bg: "#fef3c7", color: "#92400e",  dot: "#f59e0b" },
  "Checked Out":   { bg: "#ccfbf1", color: "#0f766e",  dot: "#14b8a6" },
  "Completed":     { bg: "#f0f4ff", color: "#3730a3",  dot: "#4f46e5" },
  "Cancelled":     { bg: "#fee2e2", color: "#991b1b",  dot: "#ef4444" },
  "No Show":       { bg: "#fef3c7", color: "#92400e",  dot: "#f59e0b" },
};
const getStatusStyle = s => STATUS_STYLE[s] || STATUS_STYLE["Scheduled"];
const PROV_COLORS = ["#4f46e5","#0891b2","#059669","#7c3aed","#dc2626","#d97706"];
const provColor = id => PROV_COLORS[PROVIDERS.findIndex(p => p.id === id) % PROV_COLORS.length] || "#4f46e5";

const card = (extra = {}) => ({
  background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...extra,
});
const LBL = ({ c }) => (
  <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: 4 }}>{c}</label>
);
const Pill = ({ label, color, dot }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:20,
    background: STATUS_STYLE[label]?.bg || "#f1f5f9", color: STATUS_STYLE[label]?.color || "#475569",
    fontSize:10.5, fontWeight:700 }}>
    <span style={{ width:5, height:5, borderRadius:"50%", background: STATUS_STYLE[label]?.dot || "#94a3b8" }} />
    {label}
  </span>
);

/* ══════════════════════════════════════════════
   MINI CALENDAR
══════════════════════════════════════════════ */
function MiniCalendar({ selectedDate, onSelect, aptsByDate, blockedByDate }) {
  const [base, setBase] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const weeks = useMemo(() => getCalendarWeeks(base.getFullYear(), base.getMonth()), [base]);
  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <button onClick={() => setBase(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 6px", fontSize:16, color:"var(--text-secondary)", borderRadius:4 }}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>
          {MONTH_NAMES[base.getMonth()].slice(0,3)} {base.getFullYear()}
        </span>
        <button onClick={() => setBase(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 6px", fontSize:16, color:"var(--text-secondary)", borderRadius:4 }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:3 }}>
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, marginBottom:1 }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} style={{ height:26 }} />;
            const key = toKey(day);
            const hasApts = (aptsByDate[key] || []).length > 0;
            const blocked = (blockedByDate[key] || []).length > 0;
            const isToday = isSame(day, TODAY);
            const isSel = selectedDate === key;
            const isWknd = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div key={di} onClick={() => onSelect(isSel ? null : key)}
                style={{ height:26, display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", cursor:"pointer", borderRadius:6,
                  background: isSel ? "#4f46e5" : isToday ? "#eff6ff" : "transparent",
                  border: isToday && !isSel ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                  transition:"all 0.1s" }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#f5f3ff"; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? "#eff6ff" : "transparent"; }}>
                <span style={{ fontSize:10.5, fontWeight: isSel||isToday ? 800:600, lineHeight:1,
                  color: isSel ? "#fff" : isToday ? "#1e40af" : isWknd ? "#94a3b8" : "var(--text-primary)" }}>
                  {day.getDate()}
                </span>
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
   APPOINTMENT CARD (Schedule tab)
══════════════════════════════════════════════ */
function AptCard({ apt, todayKey, onOpenChart, onCheckIn, onGoToSession, onToggleVisitType }) {
  const c = getTypeColor(apt);
  const ss = getStatusStyle(apt.status);
  const initials = apt.patientName?.split(" ").map(n => n[0]).join("").slice(0,2) || "?";
  const pc = provColor(apt.provider);
  return (
    <div style={{ display:"flex", gap:0, borderRadius:10, overflow:"hidden", cursor:"default",
      border:"1px solid #e2e8f0", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      marginBottom:8, transition:"all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="none"; }}>
      <div style={{ width:5, background:c.border, flexShrink:0 }} />
      <div style={{ flex:1, padding:"12px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:800, color:c.text, fontVariantNumeric:"tabular-nums", minWidth:75 }}>{fmtTime12(apt.time)}</span>
          <span style={{ fontSize:10.5, fontWeight:700, padding:"2px 9px", borderRadius:20, background:ss.bg, color:ss.color, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:ss.dot, display:"inline-block" }} />{apt.status}
          </span>
          <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, background:c.light, color:c.text, fontWeight:600 }}>
            {apt.visitType==="Telehealth" ? "📹 Telehealth" : "🏥 "+(apt.type||"Visit")}
          </span>
          <span style={{ marginLeft:"auto", fontSize:10.5, color:"var(--text-muted)", fontWeight:500 }}>
            {apt.duration||30} min{apt.room ? " · "+apt.room : ""}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
            background:`linear-gradient(135deg,${c.border},${c.dot})`, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)", marginBottom:2 }}>{apt.patientName}</div>
            <div style={{ fontSize:11.5, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {apt.reason||"No reason listed"}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, background:"#f8fafc",
            border:`1px solid ${pc}25`, borderRadius:8, padding:"5px 10px", flexShrink:0 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:pc, color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800 }}>
              {apt.providerName?.split(" ").map(n=>n[0]).join("").slice(0,2)||"?"}
            </div>
            <span style={{ fontSize:11, fontWeight:600, color:pc, maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{apt.providerName}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
          {apt.patientId && <button className="btn btn-sm btn-ghost" onClick={() => onOpenChart(apt)} style={{ fontSize:11 }}>📋 Open Chart</button>}
          {(apt.status==="Scheduled"||apt.status==="Confirmed") && apt.date===todayKey && (
            <button className="btn btn-sm btn-success" onClick={() => onCheckIn(apt)} style={{ fontSize:11 }}>✓ Check In</button>
          )}
          {(apt.status==="Checked In"||apt.status==="In Progress") && (
            <button className="btn btn-sm btn-success" onClick={() => onGoToSession(apt)} style={{ fontSize:11 }}>🩺 Go to Session</button>
          )}
          {apt.visitType==="Telehealth" && apt.status!=="Completed" && (
            <button className="btn btn-sm" style={{ background:"#7c3aed", color:"#fff", fontSize:11, border:"none", borderRadius:6, padding:"4px 12px", cursor:"pointer" }}>📹 Join Call</button>
          )}
          {apt.status!=="Completed" && apt.status!=="Cancelled" && apt.status!=="No Show" && (
            <button className="btn btn-sm" onClick={() => onToggleVisitType(apt)}
              style={{ fontSize:11, border:`1px solid ${apt.visitType==="Telehealth"?"#3b82f6":"#8b5cf6"}`,
                background:apt.visitType==="Telehealth"?"#eff6ff":"#f5f3ff",
                color:apt.visitType==="Telehealth"?"#1d4ed8":"#6d28d9",
                borderRadius:6, padding:"4px 12px", cursor:"pointer" }}>
              {apt.visitType==="Telehealth" ? "🏥 Switch to In-Person" : "📹 Switch to Telehealth"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SCHEDULE MODAL
══════════════════════════════════════════════ */
function ScheduleModal({ show, onClose, initialDate, patients, onSave }) {
  const EMPTY = { isNewPatient:false, patientId:"", newPatientName:"", provider:PROVIDERS[0]?.id||"",
    date:"", time:"09:00", duration:30, type:"Follow-Up", visitType:"In-Person", reason:"", room:"" };
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (show) { setForm({ ...EMPTY, date:initialDate||"" }); setSaved(false); } }, [show, initialDate]);
  const upd = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const canSubmit = form.date && form.time && form.provider && (form.isNewPatient ? form.newPatientName.trim() : form.patientId);
  const handleSubmit = () => {
    if (!canSubmit) return;
    const prov = PROVIDERS.find(p => p.id===form.provider);
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
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:580, boxShadow:"0 24px 64px rgba(0,0,0,0.22)", overflow:"hidden" }}>
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
              {PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.credentials?" — "+p.credentials:""}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div><LBL c="Date" /><input type="date" className="form-input" value={form.date} onChange={e=>upd("date",e.target.value)} /></div>
            <div><LBL c="Time" /><input type="time" className="form-input" value={form.time} onChange={e=>upd("time",e.target.value)} /></div>
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
              <select className="form-input" value={form.type} onChange={e=>upd("type",e.target.value)}>
                <option>Follow-Up</option><option>New Patient</option><option>Urgent</option><option>Medication Review</option><option>Telehealth</option>
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
              style={{ opacity:canSubmit&&!saved?1:0.45 }}>📅 Confirm Appointment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   FRONT DESK – WAITING ROOM ROW
══════════════════════════════════════════════ */
function WaitingRow({ apt, onCheckIn, onNoShow, onCancel, onGoToSession, onCheckout, onReschedule, onToggleVisitType, todayKey, patients }) {
  const ss = getStatusStyle(apt.status);
  const c = getTypeColor(apt);
  const pc = provColor(apt.provider);
  const waitMins = apt.status === "Checked In" && apt.checkInTime
    ? Math.floor((Date.now() - apt.checkInTime) / 60000) : null;
  const pat = patients?.find(p => p.id === apt.patientId);
  const copay = pat?.insurance?.primary?.copay;

  const [eligState, setEligState] = useState(null); // null | 'checking' | 'eligible' | 'ineligible' | 'unknown'
  const checkEligibility = (e) => {
    e.stopPropagation();
    setEligState('checking');
    setTimeout(() => {
      const hasIns = !!(pat?.insurance?.primary?.name && pat?.insurance?.primary?.memberId);
      setEligState(hasIns ? 'eligible' : 'unknown');
    }, 1400);
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, borderRadius:10, overflow:"hidden",
      border:"1px solid #e2e8f0", background:"#fff", marginBottom:8,
      boxShadow:"0 1px 3px rgba(0,0,0,0.05)", transition:"box-shadow 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)"}>
      <div style={{ width:5, background:c.border, flexShrink:0, alignSelf:"stretch" }} />
      <div style={{ flex:1, padding:"11px 14px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        {/* time */}
        <div style={{ minWidth:58, textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:800, color:c.text }}>{fmtTime12(apt.time)}</div>
          <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600 }}>{apt.duration||30}m</div>
        </div>
        {/* patient */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:140 }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${c.border},${c.dot})`,
            color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>
            {apt.patientName?.split(" ").map(n=>n[0]).join("").slice(0,2)||"?"}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)" }}>{apt.patientName}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)" }}>
              {pat?.mrn ? pat.mrn+" · " : ""}{apt.type||"Visit"}{apt.room?" · "+apt.room:""}
            </div>
          </div>
        </div>
        {/* provider */}
        <div style={{ display:"flex", alignItems:"center", gap:5, background:"#f8fafc",
          border:`1px solid ${pc}30`, borderRadius:7, padding:"4px 8px", flexShrink:0 }}>
          <div style={{ width:20, height:20, borderRadius:"50%", background:pc, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800 }}>
            {apt.providerName?.split(" ").map(n=>n[0]).join("").slice(0,2)||"?"}
          </div>
          <span style={{ fontSize:10.5, fontWeight:600, color:pc, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {apt.providerName}
          </span>
        </div>
        {/* insurance / copay */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:70, flexShrink:0 }}>
          <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" }}>Copay</div>
          <div style={{ fontSize:13, fontWeight:800, color: copay===0?"#166534":"#1e40af" }}>
            {copay===undefined||copay===null ? "—" : copay===0 ? "None" : `$${copay}`}
          </div>
          {pat?.insurance?.primary?.name && (
            <div style={{ fontSize:9, color:"var(--text-muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:80 }}>
              {pat.insurance.primary.name}
            </div>
          )}
          {/* Eligibility check */}
          <button onClick={checkEligibility} disabled={eligState === 'checking'}
            style={{ marginTop:4, padding:"2px 8px", borderRadius:6, fontSize:9, fontWeight:700, border:"none", cursor: eligState==='checking'?'default':'pointer',
              background: eligState==='eligible'?"#dcfce7": eligState==='ineligible'?"#fee2e2": eligState==='unknown'?"#fef3c7":"#eff6ff",
              color: eligState==='eligible'?"#166534": eligState==='ineligible'?"#991b1b": eligState==='unknown'?"#92400e":"#1d4ed8" }}>
            {eligState==='checking' ? '⏳' : eligState==='eligible' ? '✅ Elig.' : eligState==='ineligible' ? '❌ Inelig.' : eligState==='unknown' ? '⚠️ Verify' : '🔍 Eligibility'}
          </button>
        </div>
        {/* wait time */}
        {waitMins !== null && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:50, flexShrink:0 }}>
            <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase" }}>Wait</div>
            <div style={{ fontSize:13, fontWeight:800, color: waitMins>20?"#dc2626":waitMins>10?"#d97706":"#166534" }}>{waitMins}m</div>
          </div>
        )}
        {/* status badge */}
        <div style={{ flexShrink:0 }}><Pill label={apt.status} /></div>
        {/* actions */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginLeft:"auto" }} onClick={e=>e.stopPropagation()}>
          {(apt.status==="Scheduled"||apt.status==="Confirmed") && apt.date===todayKey && (
            <button onClick={() => onCheckIn(apt)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, border:"none",
                background:"#22c55e", color:"#fff", cursor:"pointer" }}>✓ Check In</button>
          )}
          {(apt.status==="Checked In") && (
            <button onClick={() => onGoToSession(apt)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, border:"none",
                background:"#4f46e5", color:"#fff", cursor:"pointer" }}>🩺 Start Visit</button>
          )}
          {apt.status==="In Progress" && (
            <button onClick={() => onCheckout(apt)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, border:"none",
                background:"#0891b2", color:"#fff", cursor:"pointer" }}>✔ Checkout</button>
          )}
          {(apt.status==="Scheduled"||apt.status==="Confirmed"||apt.status==="Checked In") && (
            <>
              <button onClick={() => onNoShow(apt)}
                style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700,
                  border:"1px solid #f59e0b", background:"#fef3c7", color:"#92400e", cursor:"pointer" }}>No Show</button>
              <button onClick={() => onCancel(apt)}
                style={{ padding:"5px 10px", borderRadius:7, fontSize:11, fontWeight:700,
                  border:"1px solid #fca5a5", background:"#fee2e2", color:"#991b1b", cursor:"pointer" }}>Cancel</button>
            </>
          )}
          {(apt.status==="No Show"||apt.status==="Cancelled") && (
            <button onClick={() => onReschedule(apt)}
              style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700,
                border:"1px solid #4f46e5", background:"#ede9fe", color:"#4f46e5", cursor:"pointer" }}>Reschedule</button>
          )}
          {apt.status!=="Completed" && apt.status!=="Cancelled" && apt.status!=="No Show" && (
            <button onClick={() => onToggleVisitType(apt)}
              style={{ padding:"5px 10px", borderRadius:7, fontSize:10, fontWeight:700, cursor:"pointer",
                border:`1px solid ${apt.visitType==="Telehealth"?"#3b82f6":"#8b5cf6"}`,
                background:apt.visitType==="Telehealth"?"#eff6ff":"#f5f3ff",
                color:apt.visitType==="Telehealth"?"#1d4ed8":"#6d28d9" }}>
              {apt.visitType==="Telehealth" ? "🏥 In-Person" : "📹 Telehealth"}
            </button>
          )}
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
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, boxShadow:"0 24px 64px rgba(0,0,0,0.22)", overflow:"hidden" }}>
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
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:420, boxShadow:"0 20px 50px rgba(0,0,0,0.2)", overflow:"hidden" }}>
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
function WalkInModal({ show, onClose, patients, onSave }) {
  const EMPTY = { isNewPatient:false, patientId:"", newPatientName:"", provider:PROVIDERS[0]?.id||"",
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
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:500, boxShadow:"0 20px 50px rgba(0,0,0,0.2)", overflow:"hidden" }}>
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
                {PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
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
              const prov = PROVIDERS.find(p=>p.id===form.provider);
              const pat = form.isNewPatient ? null : (patients||[]).find(p=>p.id===form.patientId);
              const now = new Date();
              const hh = String(now.getHours()).padStart(2,"0");
              const mm = String(now.getMinutes()).padStart(2,"0");
              onSave({ patientId:form.isNewPatient?null:form.patientId||null,
                patientName:form.isNewPatient?`New Patient - ${form.newPatientName.trim()}`:pat?`${pat.firstName} ${pat.lastName}`:"",
                provider:form.provider, providerName:prov?`${prov.firstName} ${prov.lastName}`.trim():"",
                date:toKey(TODAY), time:`${hh}:${mm}`, duration:30, type:form.type,
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
function FrontDeskTab({ allAppts, patients, todayKey, updateAppointmentStatus, addAppointment, selectPatient, navigate }) {
  const [fdFilter, setFdFilter] = useState("All");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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
    { key:"In Progress",  label:"In Session",   color:"#f59e0b" },
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
    const prov = PROVIDERS.find(p => p.id === apt.provider);
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
    inSession:  todayApts.filter(a=>a.status==="In Progress").length,
    checkedOut: todayApts.filter(a=>a.status==="Checked Out").length,
    completed:  todayApts.filter(a=>a.status==="Completed").length,
    noShow:     todayApts.filter(a=>a.status==="No Show").length,
    cancelled:  todayApts.filter(a=>a.status==="Cancelled").length,
    walkIns:    todayApts.filter(a=>a.isWalkIn).length,
  }), [todayApts]);

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
        <div style={{ marginLeft:"auto" }}>
          <button onClick={() => setShowWalkIn(true)}
            style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700, border:"none",
              background:"#dc2626", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            🚶 Walk-In
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:16 }}>
        {[
          { label:"Total",       val:stats.total,      bg:"#f8fafc", color:"#475569", icon:"📋" },
          { label:"Waiting",     val:stats.waiting,    bg:"#eff6ff", color:"#1e40af", icon:"⏳" },
          { label:"Checked In",  val:stats.checkedIn,  bg:"#f0fdf4", color:"#166534", icon:"✅" },
          { label:"In Session",  val:stats.inSession,  bg:"#fefce8", color:"#854d0e", icon:"🩺" },
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
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>
              {fdFilter==="All" ? "No appointments today" : `No ${fdFilter.toLowerCase()} appointments`}
            </div>
            {fdFilter==="All" && (
              <button onClick={() => setShowWalkIn(true)}
                style={{ marginTop:10, padding:"7px 18px", borderRadius:8, fontSize:12, fontWeight:700,
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
              onReschedule={handleReschedule} onToggleVisitType={handleToggleVisitType} />
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
            const d = new Date(TODAY); d.setDate(d.getDate()+offset);
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
      <WalkInModal show={showWalkIn} onClose={() => setShowWalkIn(false)} patients={patients} onSave={handleWalkInSave} />
      <CheckoutModal show={!!checkoutApt} apt={checkoutApt} patients={patients} onClose={() => setCheckoutApt(null)} onConfirm={handleCheckoutConfirm} />
      <RescheduleModal show={!!rescheduleApt} apt={rescheduleApt} onClose={() => setRescheduleApt(null)} onConfirm={handleRescheduleConfirm} />
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
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:540, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
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

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

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

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

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
   MAIN PAGE EXPORT
══════════════════════════════════════════════ */
export default function Schedule() {
  const { currentUser } = useAuth();
  const { appointments, updateAppointmentStatus, addAppointment, selectPatient, patients, blockedDays, addBlockedDay, removeBlockedDay } = usePatient();
  const { activeSiteId, isFiltered } = useSite();
  const navigate = useNavigate();
  const isFrontDesk = currentUser?.role === "front_desk";
  const isProvider  = currentUser?.role === "prescriber" || currentUser?.role === "therapist";

  // Restrict which providers a user can block days for:
  // - front_desk → all providers
  // - prescriber / therapist → only themselves
  // - all other roles (nurse, patient, etc.) → none
  const authorizedProviders = useMemo(() => {
    if (isFrontDesk) return PROVIDERS;
    if (isProvider) return PROVIDERS.filter(p => p.id === currentUser?.id);
    return [];
  }, [isFrontDesk, isProvider, currentUser]);

  const canBlockDays = authorizedProviders.length > 0;

  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(() => toKey(TODAY));
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [showBlockPanel, setShowBlockPanel] = useState(false);
  const [blockProvider, setBlockProvider] = useState(() =>
    // Pre-select the current user if they are a provider, otherwise the first in the list
    (PROVIDERS.find(p => p.id === currentUser?.id)?.id) || PROVIDERS[0]?.id || ""
  );
  const [blockDateFrom, setBlockDateFrom] = useState("");
  const [blockDateTo, setBlockDateTo] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("full");
  const [blockSaved, setBlockSaved] = useState(false);

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
    const byRole = appointments.filter(a => a.provider===currentUser?.id || isFrontDesk);
    if (!isFiltered) return byRole;
    return byRole.filter(a => appointmentSiteId(a) === activeSiteId);
  }, [appointments, currentUser, isFrontDesk, activeSiteId, isFiltered]);
  const todayKey = toKey(TODAY);

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
    return PROVIDERS.map(p=>({...p, apts:base.filter(a=>a.provider===p.id)})).filter(p=>p.apts.length>0);
  }, [allAppts, activeDate]);

  const handleOpenChart  = useCallback(apt => { if(apt.patientId){selectPatient(apt.patientId);navigate(`/chart/${apt.patientId}/summary`);} }, [selectPatient,navigate]);
  const handleCheckIn    = useCallback(apt => { updateAppointmentStatus(apt.id,"Checked In");if(apt.patientId)selectPatient(apt.patientId);navigate(`/session/${apt.id}`); }, [updateAppointmentStatus,selectPatient,navigate]);
  const handleGoToSession= useCallback(apt => { if(apt.patientId)selectPatient(apt.patientId);navigate(`/session/${apt.id}`); }, [selectPatient,navigate]);

  const handleToggleVisitType = useCallback(apt => {
    const isCurrentlyTelehealth = apt.visitType === "Telehealth";
    const newVisitType = isCurrentlyTelehealth ? "In-Person" : "Telehealth";
    const newRoom = isCurrentlyTelehealth ? "" : "Virtual";
    updateAppointmentStatus(apt.id, apt.status, { visitType: newVisitType, room: newRoom });
  }, [updateAppointmentStatus]);

  const handleAddBlock = () => {
    if (!blockDateFrom||!blockDateTo||!blockProvider||blockDateTo<blockDateFrom) return;
    const prov = PROVIDERS.find(p=>p.id===blockProvider);
    addBlockedDay({ providerId:blockProvider, providerName:prov?`${prov.firstName} ${prov.lastName}`.trim():blockProvider,
      dateFrom:blockDateFrom, dateTo:blockDateTo, type:blockType, reason:blockReason.trim() });
    setBlockDateFrom(""); setBlockDateTo(""); setBlockReason(""); setBlockType("full");
    setBlockSaved(true); setTimeout(()=>setBlockSaved(false),3000);
  };

  const selDateObj   = new Date(activeDate+"T00:00:00");
  const selDateLabel = selDateObj.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const isSelToday   = activeDate===todayKey;
  const dayBlocks    = blockedByDate[activeDate]||[];
  const shiftDay = delta => { const d=new Date(activeDate+"T00:00:00"); d.setDate(d.getDate()+delta); setSelectedDate(toKey(d)); };

  const TABS = [
    { key:"schedule",        label:"📅 Schedule" },
    ...(isFrontDesk ? [{ key:"frontdesk",      label:"🏥 Front Desk" }]     : []),
    ...(isFrontDesk ? [{ key:"checkout",        label:"🧾 Check Out" }]      : []),
    ...(isProvider  ? [{ key:"close-encounter", label:"🔒 Close Encounter" }] : []),
  ];

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
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(toKey(TODAY))}>Today</button>
              {canBlockDays && (
                <button onClick={() => setShowBlockPanel(v=>!v)}
                  style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                    border:`1.5px solid ${showBlockPanel?"#c92b2b":"var(--border)"}`,
                    background:showBlockPanel?"#c92b2b":"#fff",
                    color:showBlockPanel?"#fff":"var(--text-secondary)" }}>⛔ Block Days</button>
              )}
              {isFrontDesk && (
                <button className="btn btn-primary btn-sm" onClick={() => { setModalDate(activeDate); setShowModal(true); }}
                  style={{ fontSize:12, fontWeight:700 }}>＋ New Appointment</button>
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
                boxShadow: activeTab===t.key?"0 1px 4px rgba(0,0,0,0.12)":"none" }}>
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
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            {/* LEFT SIDEBAR */}
            <div style={{ width:218, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ ...card({ padding:"14px 12px" }) }}>
                <MiniCalendar selectedDate={activeDate} onSelect={k=>setSelectedDate(k||toKey(TODAY))} aptsByDate={aptsByDate} blockedByDate={blockedByDate} />
                <button onClick={() => setSelectedDate(toKey(TODAY))}
                  style={{ width:"100%", marginTop:10, padding:"7px 0", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer",
                    border:"1.5px solid #4f46e5", background:isSelToday?"#4f46e5":"#fff",
                    color:isSelToday?"#fff":"#4f46e5", transition:"all 0.12s" }}>
                  {isSelToday?"● Today":"Go to Today"}
                </button>
              </div>
              <div style={{ ...card({ padding:"12px" }) }}>
                <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.5px", color:"var(--text-muted)", marginBottom:8 }}>Filter by Provider</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {[{id:"all",firstName:"All",lastName:"Providers",credentials:""},...PROVIDERS].map(p => {
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

            {/* RIGHT PANEL */}
            <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:14 }}>
              {/* Date Header */}
              <div style={{ ...card({ padding:"16px 20px" }) }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                  <button onClick={() => shiftDay(-1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 12px", cursor:"pointer", fontSize:14, fontWeight:700, color:"var(--text-secondary)" }}>◀</button>
                  <div>
                    <div style={{ fontWeight:800, fontSize:17, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:8 }}>
                      {selDateLabel}
                      {isSelToday && <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:"#dbeafe", color:"#1e40af", fontWeight:700 }}>Today</span>}
                    </div>
                    {dayBlocks.length>0 && (
                      <div style={{ fontSize:11, color:"#c92b2b", fontWeight:600, marginTop:2 }}>
                        ⛔ {dayBlocks.map(b=>`${b.providerName}: ${b.type==="full"?"Full Day":b.type==="am"?"AM":"PM"} blocked`).join(" · ")}
                      </div>
                    )}
                  </div>
                  <button onClick={() => shiftDay(1)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 12px", cursor:"pointer", fontSize:14, fontWeight:700, color:"var(--text-secondary)" }}>▶</button>
                  {isFrontDesk && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setModalDate(activeDate); setShowModal(true); }}
                      style={{ marginLeft:"auto", fontSize:12, fontWeight:700 }}>＋ Schedule Patient</button>
                  )}
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[
                    {label:"Total",      count:counts.total,       key:"All",        bg:"#f1f5f9", color:"#475569", dot:"#94a3b8"},
                    {label:"Waiting",    count:counts.scheduled,   key:"Waiting",    bg:"#dbeafe", color:"#1e40af", dot:"#3b82f6"},
                    {label:"Checked In", count:counts.checkedIn,   key:"Checked In", bg:"#dcfce7", color:"#166534", dot:"#22c55e"},
                    {label:"In Session", count:counts.inProgress,  key:"In Session", bg:"#fef3c7", color:"#92400e", dot:"#f59e0b"},
                    {label:"Completed",  count:counts.completed,   key:"Completed",  bg:"#e5e7eb", color:"#6b7280", dot:"#9ca3af"},
                  ].map(s=>(
                    <button key={s.key} onClick={() => setStatusFilter(statusFilter===s.key?"All":s.key)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20,
                        border:"none", cursor:"pointer", background:s.bg,
                        outline:statusFilter===s.key?`2.5px solid ${s.dot}`:"none", transition:"all 0.1s" }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.count}</span>
                      <span style={{ fontSize:11, color:s.color, opacity:0.8 }}>{s.label}</span>
                    </button>
                  ))}
                  {statusFilter!=="All" && (
                    <button onClick={() => setStatusFilter("All")} style={{ padding:"5px 12px", borderRadius:20, border:"1px solid var(--border)", background:"#fff", fontSize:11, cursor:"pointer", color:"var(--text-secondary)" }}>Clear ×</button>
                  )}
                </div>
              </div>

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
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Appointment List */}
              <div style={{ ...card({ overflow:"hidden" }) }}>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", background:"#f8fafc",
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>
                    Appointments
                    {providerFilter!=="all" && (()=>{ const pv=PROVIDERS.find(p=>p.id===providerFilter); return pv?<span style={{ marginLeft:8, fontSize:11, color:"var(--text-muted)", fontWeight:500 }}>· {pv.firstName} {pv.lastName}</span>:null; })()}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:11, color:"var(--text-muted)" }}>{dateAppts.length} appointment{dateAppts.length!==1?"s":""}</span>
                    {providerFilter!=="all" && <button onClick={() => setProviderFilter("all")} style={{ background:"none", border:"1px solid var(--border)", borderRadius:6, padding:"2px 8px", cursor:"pointer", fontSize:10, color:"var(--text-secondary)" }}>All providers ×</button>}
                  </div>
                </div>
                <div style={{ padding:"14px 16px", minHeight:100 }}>
                  {dateAppts.length===0 ? (
                    <div style={{ textAlign:"center", padding:"36px 20px", color:"var(--text-muted)" }}>
                      <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>
                        {statusFilter!=="All"?"No appointments match this filter":"No appointments scheduled for this day"}
                      </div>
                      {isFrontDesk && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={() => { setModalDate(activeDate); setShowModal(true); }}>
                          ＋ Schedule Patient
                        </button>
                      )}
                    </div>
                  ) : (
                    dateAppts.map(apt=>(
                      <AptCard key={apt.id} apt={apt} todayKey={todayKey}
                        onOpenChart={handleOpenChart} onCheckIn={handleCheckIn} onGoToSession={handleGoToSession}
                        onToggleVisitType={handleToggleVisitType} />
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming 7-day strip */}
              <div style={{ ...card({ padding:"14px 16px" }) }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Upcoming Week</div>
                <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                  {Array.from({length:7},(_,i)=>{
                    const d=new Date(TODAY); d.setDate(d.getDate()+i);
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
          </div>
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

      {/* Schedule Modal */}
      <ScheduleModal
        show={showModal}
        onClose={() => setShowModal(false)}
        initialDate={modalDate}
        patients={patients}
        onSave={apt => { addAppointment(apt); setShowModal(false); }}
      />
    </div>
  );
}
