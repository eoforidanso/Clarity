/**
 * PatientPortalInbox — Secure patient-provider messaging
 * Threaded inbox with unread badges, reply, and chart-sidebar integration.
 */
import React, { useState, useRef, useEffect } from 'react';

const BG    = '#1a1f2e';
const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';
const ACCENT = '#6366f1';

// Mock thread data generator
function generateMockThreads(patient) {
  if (!patient) return [];
  const name = patient.firstName || 'Patient';
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };
  return [
    {
      id: 'thread-001',
      subject: 'Question about my medication',
      category: 'Medication',
      unread: 2,
      lastMessageAt: daysAgo(0),
      messages: [
        { id:'m1', from:'patient', senderName: name, body:`Hi Dr., I've been taking the sertraline for 2 weeks now. I'm noticing some nausea in the mornings. Is this normal and should I be concerned?`, sentAt: daysAgo(3), read: true },
        { id:'m2', from:'provider', senderName:'Your Care Team', body:`Hello ${name},\n\nNausea is a common side effect during the first 2–4 weeks of sertraline, and it usually resolves on its own. A few things that can help:\n\n• Take the medication with food\n• Take it in the evening instead of the morning\n• Start with a small snack before taking it\n\nIf nausea is severe or persists past 4 weeks, please call our office. Otherwise keep taking it as prescribed — your body just needs time to adjust.\n\nBest,\nYour Care Team`, sentAt: daysAgo(2), read: true },
        { id:'m3', from:'patient', senderName: name, body:`Thank you! I'll try taking it with dinner. One more question — I read online it can take 4–6 weeks to work. Should I expect to feel better before that?`, sentAt: daysAgo(0), read: false },
        { id:'m4', from:'patient', senderName: name, body:`Also wanted to mention — I'm sleeping a lot better this week. Not sure if that's the medication or just coincidence?`, sentAt: daysAgo(0), read: false },
      ],
    },
    {
      id: 'thread-002',
      subject: 'Lab results inquiry',
      category: 'Labs',
      unread: 0,
      lastMessageAt: daysAgo(5),
      messages: [
        { id:'m5', from:'patient', senderName: name, body:`I completed my blood draw last Thursday at Quest. Any updates on my results?`, sentAt: daysAgo(7), read: true },
        { id:'m6', from:'provider', senderName:'Your Care Team', body:`Hi ${name},\n\nYour lab results are in and everything looks good! Your lithium level was 0.8 mEq/L (therapeutic range: 0.6–1.2), TSH is normal at 1.8, and your BMP is unremarkable.\n\nNo changes needed. See you at your next appointment!\n\nBest,\nYour Care Team`, sentAt: daysAgo(5), read: true },
      ],
    },
    {
      id: 'thread-003',
      subject: 'Appointment request',
      category: 'Appointment',
      unread: 1,
      lastMessageAt: daysAgo(1),
      messages: [
        { id:'m7', from:'patient', senderName: name, body:`Hi, I'd like to schedule a follow-up appointment. I'm available Monday or Wednesday afternoons. Do you have anything open in the next 2 weeks?`, sentAt: daysAgo(1), read: false },
      ],
    },
    {
      id: 'thread-004',
      subject: 'Refill request — Lamictal',
      category: 'Refill',
      unread: 0,
      lastMessageAt: daysAgo(10),
      messages: [
        { id:'m8', from:'patient', senderName: name, body:`Hi, I only have about 5 days left of my Lamictal. Can you send a refill to my CVS on Kirchoff Rd in Rolling Meadows?`, sentAt: daysAgo(12), read: true },
        { id:'m9', from:'provider', senderName:'Your Care Team', body:`Hi ${name},\n\nYour Lamictal 100mg refill has been sent electronically to CVS Pharmacy #16839 at 3409 Kirchoff Rd. It should be ready within a few hours.\n\nPlease remember to take your dose consistently — missing doses can lower your seizure threshold.\n\nBest,\nYour Care Team`, sentAt: daysAgo(10), read: true },
      ],
    },
  ];
}

const CATEGORY_COLOR = {
  Medication: '#6366f1',
  Labs:       '#0891b2',
  Appointment:'#16a34a',
  Refill:     '#d97706',
  General:    '#6b7280',
};

function ThreadRow({ thread, selected, onClick }) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const preview = lastMsg?.body?.slice(0, 80)?.replace(/\n/g, ' ') + (lastMsg?.body?.length > 80 ? '…' : '');
  const d = new Date(thread.lastMessageAt);
  const timeStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  const catColor = CATEGORY_COLOR[thread.category] || CATEGORY_COLOR.General;

  return (
    <div
      onClick={onClick}
      style={{
        padding:'12px 16px', cursor:'pointer',
        background: selected ? 'rgba(99,102,241,0.15)' : 'transparent',
        borderLeft: `3px solid ${selected ? ACCENT : 'transparent'}`,
        borderBottom: `1px solid ${BORDER}`,
        transition: 'background 0.12s',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0, flex:1 }}>
          {thread.unread > 0 && (
            <div style={{ width:8, height:8, borderRadius:'50%', background:ACCENT, flexShrink:0 }} />
          )}
          <span style={{
            fontSize: thread.unread > 0 ? 13 : 12.5,
            fontWeight: thread.unread > 0 ? 700 : 500,
            color: T_PRI, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {thread.subject}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {thread.unread > 0 && (
            <span style={{ fontSize:10, background:ACCENT, color:'#fff', borderRadius:'50%', minWidth:17, height:17, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
              {thread.unread}
            </span>
          )}
          <span style={{ fontSize:10.5, color:T_MUT }}>{timeStr}</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}>
        <span style={{ fontSize:9.5, background:`${catColor}20`, color:catColor, padding:'1px 7px', borderRadius:8, fontWeight:700 }}>{thread.category}</span>
        <span style={{ fontSize:11, color:T_MUT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{preview}</span>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isPatient = msg.from === 'patient';
  const d = new Date(msg.sentAt);
  const timeStr = d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems: isPatient ? 'flex-start' : 'flex-end',
      marginBottom:12,
    }}>
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius: isPatient ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isPatient ? BG3 : `${ACCENT}30`,
        border: `1px solid ${isPatient ? BORDER : ACCENT + '50'}`,
      }}>
        <div style={{ fontSize:10.5, color: isPatient ? T_MUT : '#a5b4fc', marginBottom:5, fontWeight:600 }}>
          {msg.senderName}
        </div>
        <div style={{ fontSize:12.5, color:T_PRI, lineHeight:1.55, whiteSpace:'pre-wrap' }}>
          {msg.body}
        </div>
      </div>
      <div style={{ fontSize:10, color:T_MUT, marginTop:3 }}>{timeStr}</div>
    </div>
  );
}

export default function PatientPortalInbox({ patient, provider, isOpen, onClose }) {
  const [threads, setThreads] = useState(() => generateMockThreads(patient));
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [composing, setComposing] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen && threads.length > 0 && !selected) setSelected(threads[0]);
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [selected]);

  if (!isOpen) return null;

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  const handleSelectThread = (thread) => {
    const updated = threads.map(t => t.id === thread.id ? { ...t, unread:0, messages: t.messages.map(m => ({ ...m, read:true })) } : t);
    setThreads(updated);
    setSelected(updated.find(t => t.id === thread.id));
    setReply('');
  };

  const handleSendReply = () => {
    if (!reply.trim() || !selected) return;
    const newMsg = {
      id: `m-${Date.now()}`, from:'provider', senderName: provider || 'Your Care Team',
      body: reply.trim(), sentAt: new Date().toISOString(), read: true,
    };
    const updated = threads.map(t => t.id === selected.id
      ? { ...t, messages: [...t.messages, newMsg], lastMessageAt: new Date().toISOString() }
      : t
    );
    setThreads(updated);
    setSelected(updated.find(t => t.id === selected.id));
    setReply('');
  };

  const handleNewMessage = () => {
    if (!newSubject.trim() || !newBody.trim()) return;
    const thread = {
      id: `thread-${Date.now()}`, subject: newSubject, category:'General', unread:0,
      lastMessageAt: new Date().toISOString(),
      messages: [{ id:`m-${Date.now()}`, from:'provider', senderName: provider || 'Your Care Team', body: newBody.trim(), sentAt: new Date().toISOString(), read:true }],
    };
    const updated = [thread, ...threads];
    setThreads(updated);
    setSelected(thread);
    setComposing(false);
    setNewSubject('');
    setNewBody('');
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1500 }} />
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:780,
        background:BG, zIndex:1501, display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.5)',
        fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding:'14px 20px 12px', borderBottom:`1px solid ${BORDER}`, background:'#141824', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ color:T_PRI, fontWeight:700, fontSize:15 }}>💬 Patient Portal Messages</div>
              {totalUnread > 0 && (
                <span style={{ background:ACCENT, color:'#fff', fontSize:10.5, fontWeight:800, padding:'2px 8px', borderRadius:10 }}>
                  {totalUnread} unread
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setComposing(true)} style={{ background:ACCENT, border:'none', color:'#fff', fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:7, cursor:'pointer' }}>+ New Message</button>
              <button onClick={onClose} style={{ background:'none', border:'none', color:T_MUT, fontSize:22, cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>
          </div>
        </div>

        {composing ? (
          /* Compose panel */
          <div style={{ flex:1, padding:'20px', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <button onClick={() => setComposing(false)} style={{ background:'none', border:'none', color:ACCENT, fontSize:12, cursor:'pointer', padding:0 }}>← Back</button>
              <span style={{ color:T_PRI, fontWeight:700, fontSize:14 }}>New Message to Patient</span>
            </div>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject"
              style={{ width:'100%', boxSizing:'border-box', background:BG3, border:`1px solid ${BORDER}`, borderRadius:8, color:T_PRI, fontSize:13, padding:'9px 12px', outline:'none', marginBottom:10 }} />
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Message to patient…" rows={8}
              style={{ width:'100%', boxSizing:'border-box', background:BG3, border:`1px solid ${BORDER}`, borderRadius:8, color:T_PRI, fontSize:13, padding:'9px 12px', outline:'none', resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }} />
            <button disabled={!newSubject.trim() || !newBody.trim()} onClick={handleNewMessage}
              style={{ marginTop:12, background:ACCENT, border:'none', color:'#fff', fontSize:13, fontWeight:700, padding:'9px 24px', borderRadius:8, cursor:'pointer' }}>
              Send Message →
            </button>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            {/* Thread list */}
            <div style={{ width:280, borderRight:`1px solid ${BORDER}`, overflowY:'auto', flexShrink:0 }}>
              {threads.sort((a,b) => b.lastMessageAt.localeCompare(a.lastMessageAt)).map(t => (
                <ThreadRow key={t.id} thread={t} selected={selected?.id === t.id} onClick={() => handleSelectThread(t)} />
              ))}
            </div>

            {/* Message thread */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {selected ? (
                <>
                  <div style={{ padding:'12px 18px', borderBottom:`1px solid ${BORDER}`, flexShrink:0, background:BG2 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T_PRI }}>{selected.subject}</div>
                    <div style={{ fontSize:11, color:T_MUT, marginTop:2 }}>{selected.messages.length} message{selected.messages.length!==1?'s':''}</div>
                  </div>

                  <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>
                    {selected.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    <div ref={bottomRef} />
                  </div>

                  {/* Reply */}
                  <div style={{ padding:'12px 16px', borderTop:`1px solid ${BORDER}`, flexShrink:0, background:BG2, display:'flex', gap:8 }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply(); }}
                      placeholder="Reply to patient… (Ctrl+Enter to send)"
                      rows={2}
                      style={{ flex:1, background:BG3, border:`1px solid ${BORDER}`, borderRadius:8, color:T_PRI, fontSize:12.5, padding:'8px 12px', resize:'none', outline:'none', lineHeight:1.5, fontFamily:'inherit' }}
                    />
                    <button
                      disabled={!reply.trim()}
                      onClick={handleSendReply}
                      style={{ background: reply.trim() ? ACCENT : BG3, border:'none', color: reply.trim() ? '#fff' : T_MUT, borderRadius:8, padding:'0 16px', fontSize:12, fontWeight:700, cursor: reply.trim() ? 'pointer' : 'default', alignSelf:'stretch' }}
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:T_MUT, fontSize:13 }}>
                  Select a message thread
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
