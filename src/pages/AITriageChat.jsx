import React, { useState, useRef, useEffect } from 'react';

/* ── AI Triage Rules Engine ─────────────────────────────── */
const TRIAGE_RULES = [
  { keywords: ['suicide','suicidal','kill myself','want to die','end my life','self-harm','cutting'], severity: 'CRISIS', response: '🚨 **CRISIS DETECTED** — This sounds like a mental health emergency.\n\n📞 **Call 988 Suicide & Crisis Lifeline** immediately.\n📱 Text HOME to 741741 (Crisis Text Line)\n🏥 Go to your nearest Emergency Room.\n\nA staff member has been alerted and will reach out within 15 minutes.', route: 'crisis_team', autoAlert: true },
  { keywords: ['overdose','took too many','pills','poisoning'], severity: 'CRISIS', response: '🚨 **MEDICAL EMERGENCY** — If you or someone else has overdosed:\n\n📞 **Call 911 immediately**\n💊 If available, administer Narcan/naloxone.\n🏥 Do not wait for symptoms — go to the ER now.\n\nA crisis counselor has been notified.', route: 'crisis_team', autoAlert: true },
  { keywords: ['panic attack','can\'t breathe','heart racing','feel like dying','chest tight'], severity: 'URGENT', response: '🟠 It sounds like you may be experiencing a **panic attack** or acute anxiety episode.\n\nTry this grounding technique:\n1. **5-4-3-2-1**: Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste\n2. Breathe in for 4 counts, hold for 4, out for 6\n3. Remind yourself: "This will pass"\n\nWould you like to:\n• Schedule an **urgent same-day appointment**?\n• Speak to the **on-call nurse**?\n• Access **guided breathing exercises**?', route: 'nurse_triage' },
  { keywords: ['medication refill','refill','ran out of','need more','prescription'], severity: 'ROUTINE', response: '💊 I can help with your **medication refill** request.\n\nPlease confirm:\n• Which medication needs refilling?\n• Your pharmacy name/location?\n• How many days of medication remain?\n\nI\'ll route this to your prescriber for review within **24 hours**. If this is urgent (you\'ve been without medication for 2+ days), please call our office.', route: 'prescriber' },
  { keywords: ['appointment','schedule','reschedule','cancel appointment','book','when is my next'], severity: 'ROUTINE', response: '📅 I can help with **scheduling**!\n\n• **New appointment**: I\'ll check availability with your provider\n• **Reschedule**: Please provide the date of your current appointment\n• **Cancel**: I can process that immediately\n\nWhat would you like to do?', route: 'scheduling' },
  { keywords: ['side effect','reaction','nausea','dizzy','headache','insomnia','weight gain','can\'t sleep'], severity: 'MODERATE', response: '⚠️ I\'m sorry you\'re experiencing **side effects**. Let me gather some information:\n\n• Which medication are you taking?\n• When did the side effects start?\n• How severe on a scale of 1-10?\n• Are you still taking the medication?\n\n**Important**: If you\'re having a severe allergic reaction (swelling, difficulty breathing, rash), call 911 immediately.\n\nI\'ll send this to your provider for review within **4 hours**.', route: 'prescriber' },
  { keywords: ['worse','getting worse','not working','not helping','symptoms worse','feel worse'], severity: 'MODERATE', response: '📋 I\'m sorry to hear your symptoms are worsening. Let me help:\n\n• What symptoms have changed?\n• On a scale of 1-10, how severe?\n• Are you having any safety concerns?\n• When was your last appointment?\n\nBased on your responses, I may recommend:\n• An **expedited follow-up** appointment\n• A **nurse call-back** within 2 hours\n• Adjustments to your current treatment plan', route: 'nurse_triage' },
  { keywords: ['test results','lab results','bloodwork','labs'], severity: 'ROUTINE', response: '🔬 To check your **test/lab results**:\n\n1. Log into the **Patient Portal** → Lab Results tab\n2. Results are typically posted within 2-5 business days\n3. Your provider will message you if any action is needed\n\nIf you need help interpreting results, I can schedule a brief call with your care team.', route: 'lab_team' },
  { keywords: ['insurance','billing','copay','payment','statement','balance'], severity: 'ROUTINE', response: '💳 For **billing and insurance** questions:\n\n• **View statements**: Patient Portal → Billing tab\n• **Make a payment**: Online portal or call our billing dept\n• **Insurance questions**: Our eligibility team can help\n• **Financial assistance**: Ask about our sliding scale\n\nWould you like me to connect you with our billing department?', route: 'billing' },
  { keywords: ['anxious','anxiety','worried','nervous','stressed','overwhelmed'], severity: 'MODERATE', response: '💙 I understand you\'re feeling **anxious/stressed**. Here are some immediate resources:\n\n🧘 **Quick coping tools**:\n• Box breathing: In 4s → Hold 4s → Out 4s → Hold 4s\n• Progressive muscle relaxation\n• Mindfulness grounding exercise\n\nWould you like to:\n• Schedule a **therapy session**?\n• Talk to the **on-call clinician**?\n• Access our **self-help library**?', route: 'scheduling' },
  { keywords: ['depressed','depression','hopeless','sad','no motivation','can\'t get out of bed'], severity: 'MODERATE', response: '💜 I hear that you\'re going through a difficult time. You\'re not alone.\n\nSome things that may help right now:\n• Try to do one small activity today, even a 5-minute walk\n• Reach out to someone you trust\n• Practice self-compassion\n\n**If you\'re having thoughts of self-harm, please text 988 or call the crisis line.**\n\nWould you like to:\n• Schedule an **appointment** with your provider?\n• Speak with a **crisis counselor**?\n• Access **mood tracking tools**?', route: 'scheduling' },
];

const SEVERITY_STYLES = {
  CRISIS: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '🚨', label: 'Crisis' },
  URGENT: { bg: '#fff7ed', border: '#fdba74', color: '#9a3412', icon: '🟠', label: 'Urgent' },
  MODERATE: { bg: '#fefce8', border: '#fde047', color: '#854d0e', icon: '🟡', label: 'Moderate' },
  ROUTINE: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '🟢', label: 'Routine' },
};

const QUICK_ACTIONS = [
  { label: '💊 Medication Refill', text: 'I need a medication refill' },
  { label: '📅 Schedule Appointment', text: 'I want to schedule an appointment' },
  { label: '🔬 Check Lab Results', text: 'I want to check my lab results' },
  { label: '⚠️ Report Side Effects', text: 'I\'m experiencing medication side effects' },
  { label: '😰 Feeling Anxious', text: 'I\'m feeling very anxious right now' },
  { label: '💳 Billing Question', text: 'I have a billing question' },
];

function triageMessage(text) {
  const lower = text.toLowerCase();
  for (const rule of TRIAGE_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { severity: rule.severity, response: rule.response, route: rule.route, autoAlert: rule.autoAlert };
    }
  }
  return {
    severity: 'ROUTINE',
    response: `Thank you for your message. I've noted your concern.\n\nHere's what happens next:\n1. Your message has been added to your care team's queue\n2. A staff member will respond within **4 business hours**\n3. For urgent matters, please call our office directly at **(555) 123-4567**\n\nIs there anything else I can help with?`,
    route: 'general_inbox',
    autoAlert: false,
  };
}

export default function AITriageChat() {
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'ai', text: '👋 **Welcome to Clarity AI Triage Assistant**\n\nI can help you with:\n• 📅 Scheduling & appointment questions\n• 💊 Medication refills & side effects\n• 🔬 Lab result inquiries\n• 💳 Billing & insurance questions\n• 😰 Mental health support & coping tools\n• 🚨 Crisis resources\n\nHow can I help you today?', severity: null, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [conversationStats, setConversationStats] = useState({ total: 0, crisis: 0, urgent: 0, routine: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      const triage = triageMessage(text);
      const aiMsg = {
        id: Date.now() + 1, role: 'ai', text: triage.response, severity: triage.severity,
        route: triage.route, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      // Update stats
      setConversationStats(prev => ({
        total: prev.total + 1,
        crisis: prev.crisis + (triage.severity === 'CRISIS' ? 1 : 0),
        urgent: prev.urgent + (triage.severity === 'URGENT' ? 1 : 0),
        routine: prev.routine + (triage.severity === 'ROUTINE' || triage.severity === 'MODERATE' ? 1 : 0),
      }));

      // Auto-alert for crisis
      if (triage.autoAlert) {
        setAlerts(prev => [...prev, { id: Date.now(), text: `🚨 CRISIS ALERT — Patient message flagged. Routing to ${triage.route}.`, time: new Date().toLocaleTimeString() }]);
      }
    }, 800 + Math.random() * 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>🤖 AI Triage & Patient Chat</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            AI-enabled two-way messaging with automated triage routing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-success" style={{ fontSize: 11 }}>🟢 AI Engine Active</span>
          <span className="badge badge-info" style={{ fontSize: 11 }}>NLP v3.2</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alerts.map(a => (
            <div key={a.id} className="alert alert-danger" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{a.text}</span>
              <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}
                onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}>Acknowledge</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, height: 'calc(100vh - 220px)', minHeight: 500 }}>
        {/* Chat area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header" style={{ flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 14 }}>💬 Patient Conversation</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{messages.length - 1} messages</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(msg => {
              const sev = msg.severity ? SEVERITY_STYLES[msg.severity] : null;
              return (
                <div key={msg.id} style={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: 16,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                    borderBottomLeftRadius: msg.role === 'ai' ? 4 : 16,
                    background: msg.role === 'user' ? 'var(--primary)' : sev ? sev.bg : '#f1f5f9',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    border: sev ? `1.5px solid ${sev.border}` : 'none',
                    fontSize: 13, lineHeight: 1.6, position: 'relative',
                  }}>
                    {sev && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: sev.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {sev.icon} {sev.label} Priority — Routed to {msg.route?.replace('_', ' ')}
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}</div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, textAlign: 'right' }}>{msg.time}</div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div style={{ display: 'flex', gap: 4, padding: '12px 16px', background: '#f1f5f9', borderRadius: 16, width: 'fit-content' }}>
                <span className="voice-listening-dot" />
                <span className="voice-listening-dot" style={{ animationDelay: '0.15s' }} />
                <span className="voice-listening-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', background: '#fafbfc' }}>
            {QUICK_ACTIONS.map((qa, i) => (
              <button key={i} className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => sendMessage(qa.text)}>{qa.label}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: '#fff' }}>
            <input ref={inputRef} className="form-input" style={{ flex: 1, fontSize: 13 }}
              placeholder="Type your message... (Enter to send)"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
            <button className="btn btn-primary btn-sm" onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}>
              Send →
            </button>
          </div>
        </div>

        {/* Sidebar stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0, fontSize: 13 }}>📊 Triage Dashboard</h3></div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '10px', borderRadius: 8, background: '#f1f5f9', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{conversationStats.total}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Triaged</div>
              </div>
              <div style={{ padding: '10px', borderRadius: 8, background: '#fef2f2', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#991b1b' }}>{conversationStats.crisis}</div>
                <div style={{ fontSize: 10, color: '#991b1b' }}>Crisis Alerts</div>
              </div>
              <div style={{ padding: '10px', borderRadius: 8, background: '#fff7ed', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#9a3412' }}>{conversationStats.urgent}</div>
                <div style={{ fontSize: 10, color: '#9a3412' }}>Urgent</div>
              </div>
              <div style={{ padding: '10px', borderRadius: 8, background: '#f0fdf4', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>{conversationStats.routine}</div>
                <div style={{ fontSize: 10, color: '#166534' }}>Routine</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0, fontSize: 13 }}>🔀 Routing Queue</h3></div>
            <div className="card-body no-pad">
              {['Crisis Team', 'Nurse Triage', 'Prescriber', 'Scheduling', 'Billing', 'Lab Team'].map(q => {
                const count = messages.filter(m => m.route === q.toLowerCase().replace(/ /g, '_')).length;
                return (
                  <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                    <span>{q}</span>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 style={{ margin: 0, fontSize: 13 }}>⚡ AI Capabilities</h3></div>
            <div className="card-body" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              ✅ Keyword-based triage<br/>
              ✅ Crisis detection & auto-alert<br/>
              ✅ Smart routing to care teams<br/>
              ✅ Two-way patient messaging<br/>
              ✅ Quick action shortcuts<br/>
              ✅ Severity classification<br/>
              ✅ Coping tool recommendations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
