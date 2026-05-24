import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { users as usersApi, messaging as messagingApi } from '../services/api';

const CHANNELS = [
  { id: 'ch-general', name: 'General', icon: '💬', description: 'General announcements & updates' },
  { id: 'ch-clinical', name: 'Clinical', icon: '🩺', description: 'Clinical discussions & consults' },
  { id: 'ch-urgent', name: 'Urgent', icon: '🚨', description: 'Urgent matters requiring immediate attention' },
  { id: 'ch-frontdesk', name: 'Front Desk', icon: '🏥', description: 'Front desk communications' },
  { id: 'ch-teaching', name: 'Teaching', icon: '🎓', description: 'Academic & training discussions' },
  { id: 'ch-pharmacy', name: 'Pharmacy', icon: '💊', description: 'Pharmacy coordination & prior auths' },
];

// Convert API message format to local format
function mapApiMsg(m) {
  return { id: m.id, from: m.userId, text: m.content, time: m.timestamp, reactions: m.reactions || {} };
}

// Convert DM API message format to local format
function mapDmApiMsg(m) {
  return { id: m.id, from: m.senderId, text: m.content, time: m.timestamp, reactions: m.reactions || {} };
}

function getStaffName(userId, staff) {
  const u = staff.find(s => s.id === userId);
  if (!u) return 'Staff Member';
  return `${u.firstName} ${u.lastName}`.trim();
}

function getStaffInitials(userId, staff) {
  const u = staff.find(s => s.id === userId);
  if (!u) return '?';
  const first = u.firstName?.[0] || '?';
  const last = (u.lastName || u.firstName)?.[0] || first;
  return `${first}${last}`.toUpperCase();
}

function getStaffRole(userId, staff) {
  const u = staff.find(s => s.id === userId);
  if (!u) return '';
  const labels = { prescriber: u.credentials || 'Provider', nurse: 'RN', front_desk: 'Front Desk', therapist: 'Therapist' };
  return labels[u.role] || u.role;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
];

function getAvatarColor(userId, staff) {
  const idx = staff.findIndex(s => s.id === userId);
  const i = idx < 0 ? 0 : idx;
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export default function StaffMessaging() {
  const { currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [activeChannel, setActiveChannel] = useState('ch-general');
  const [activeDM, setActiveDM] = useState(null);
  const [messages, setMessages] = useState({});
  const [dmMessages, setDmMessages] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('channels'); // 'channels' | 'dms'
  const [unreadCounts, setUnreadCounts] = useState({
    'ch-general': 0,
    'ch-clinical': 2,
    'ch-urgent': 1,
    'ch-front-desk': 0,
    'ch-teaching': 1,
    'ch-pharmacy': 2,
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const otherStaff = staff.filter(s => s.id !== currentUser?.id);

  const currentMessages = useMemo(() => {
    if (activeDM) return dmMessages[activeDM] || [];
    return messages[activeChannel] || [];
  }, [activeDM, activeChannel, messages, dmMessages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return currentMessages;
    const q = searchQuery.toLowerCase();
    return currentMessages.filter(m =>
      m.text.toLowerCase().includes(q) || getStaffName(m.from, staff).toLowerCase().includes(q)
    );
  }, [currentMessages, searchQuery]);

  useEffect(() => {
    usersApi.directory()
      .then(data => setStaff(data))
      .catch(() => {
        if (currentUser) {
          setStaff([{ id: currentUser.id, firstName: currentUser.firstName || '', lastName: currentUser.lastName || '', role: currentUser.role, credentials: currentUser.credentials || '', specialty: currentUser.specialty || '' }]);
        }
      });
  }, [currentUser?.id]);

  // Load channel messages from backend
  useEffect(() => {
    if (activeDM) return;
    setLoadingMsgs(true);
    messagingApi.messages(activeChannel)
      .then(data => setMessages(prev => ({ ...prev, [activeChannel]: data.map(mapApiMsg) })))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeChannel, activeDM]);

  // Load DM messages from backend when activeDM changes
  useEffect(() => {
    if (!activeDM) return;
    setLoadingMsgs(true);
    messagingApi.dm.messages(activeDM)
      .then(data => {
        setDmMessages(prev => ({ ...prev, [activeDM]: data.map(mapDmApiMsg) }));
        // Refresh unread counts after opening DM
        messagingApi.dm.unreadCounts().then(setUnreadCounts).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeDM]);

  // Load unread counts on mount
  useEffect(() => {
    messagingApi.dm.unreadCounts().then(setUnreadCounts).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChannel, activeDM]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    if (activeDM) {
      const tempId = `m-${Date.now()}`;
      const optimistic = { id: tempId, from: currentUser?.id, text, time: new Date().toISOString(), reactions: {} };
      setDmMessages(prev => ({ ...prev, [activeDM]: [...(prev[activeDM] || []), optimistic] }));
      messagingApi.dm.send(activeDM, { content: text })
        .then(saved => {
          setDmMessages(prev => ({
            ...prev,
            [activeDM]: (prev[activeDM] || []).map(m => m.id === tempId ? mapDmApiMsg(saved) : m),
          }));
        })
        .catch(() => {
          setDmMessages(prev => ({ ...prev, [activeDM]: (prev[activeDM] || []).filter(m => m.id !== tempId) }));
        });
    } else {
      // Optimistic update
      const tempId = `m-${Date.now()}`;
      const optimistic = { id: tempId, from: currentUser?.id, text, time: new Date().toISOString(), reactions: {} };
      setMessages(prev => ({ ...prev, [activeChannel]: [...(prev[activeChannel] || []), optimistic] }));
      messagingApi.send(activeChannel, { content: text })
        .then(saved => {
          setMessages(prev => ({
            ...prev,
            [activeChannel]: (prev[activeChannel] || []).map(m => m.id === tempId ? mapApiMsg(saved) : m),
          }));
        })
        .catch(() => {
          // Remove optimistic on failure
          setMessages(prev => ({ ...prev, [activeChannel]: (prev[activeChannel] || []).filter(m => m.id !== tempId) }));
        });
    }
  };

  const switchChannel = (chId) => {
    setActiveChannel(chId);
    setActiveDM(null);
    setUnreadCounts(prev => ({ ...prev, [chId]: 0 }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const addReaction = (msgId, emoji) => {
    const uid = currentUser?.id;
    if (!uid) return;
    const updateReactions = (msgs) => {
      const ch = [...msgs];
      const idx = ch.findIndex(m => m.id === msgId);
      if (idx < 0) return msgs;
      const r = { ...ch[idx].reactions };
      if (!r[emoji]) r[emoji] = [];
      if (r[emoji].includes(uid)) r[emoji] = r[emoji].filter(id => id !== uid);
      else r[emoji] = [...r[emoji], uid];
      if (r[emoji].length === 0) delete r[emoji];
      ch[idx] = { ...ch[idx], reactions: r };
      return ch;
    };

    if (activeDM) {
      setDmMessages(prev => {
        const updated = updateReactions(prev[activeDM] || []);
        const msg = updated.find(m => m.id === msgId);
        if (msg) messagingApi.dm.react(msgId, { reactions: msg.reactions }).catch(() => {});
        return { ...prev, [activeDM]: updated };
      });
    } else {
      setMessages(prev => {
        const updated = updateReactions(prev[activeChannel] || []);
        const msg = updated.find(m => m.id === msgId);
        if (msg) messagingApi.react(msgId, { reactions: msg.reactions }).catch(() => {});
        return { ...prev, [activeChannel]: updated };
      });
    }
    setShowEmojiPicker(null);
  };

  const quickEmojis = ['👍', '❤️', '😂', '🎉', '💡', '✅', '🙏', '👀'];

  const channelInfo = CHANNELS.find(c => c.id === activeChannel);
  const headerTitle = activeDM ? getStaffName(activeDM, staff) : channelInfo?.name;
  const headerDesc = activeDM ? getStaffRole(activeDM, staff) : channelInfo?.description;

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - var(--header-height) - 40px)' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '260px 1fr', height: '100%',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: 'var(--bg-white)', boxShadow: 'var(--shadow)',
      }}>
        {/* Left Panel — Channels & DMs */}
        <div style={{ background: '#0f172a', display: 'flex', flexDirection: 'column', borderRight: '2px solid rgba(255,255,255,0.1)', boxShadow: '3px 0 10px rgba(0,0,0,0.14)' }}>
          {/* Workspace header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
              💬 Staff Chat
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              {staff.length} team members
            </div>
          </div>

          {/* Content — unified sidebar with section headers */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Team Channels ── */}
            <div style={{ padding: '12px 14px 4px', background: 'rgba(59,130,246,0.06)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569' }}>
                Team Channels
              </div>
            </div>
            {CHANNELS.map(ch => {
              const count = (messages[ch.id] || []).length;
              const unread = unreadCounts[ch.id] || 0;
              const isActive = !activeDM && activeChannel === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => { switchChannel(ch.id); setActiveDM(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer',
                    background: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.02)',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(59,130,246,0.22)' : 'none',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <span style={{ fontSize: 16, width: 28, textAlign: 'center', flexShrink: 0, paddingRight: 2 }}>{ch.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isActive ? 13.5 : 12.5, fontWeight: isActive ? 800 : unread > 0 ? 700 : 500, color: isActive ? '#93c5fd' : unread > 0 ? '#f1f5f9' : '#94a3b8' }}>
                      {ch.name}
                    </div>
                  </div>
                  {unread > 0 ? (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: '#ef4444', padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                      {unread}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}

            {/* ── Direct Messages ── */}
            <div style={{ padding: '14px 14px 4px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569' }}>
                Direct Messages
              </div>
            </div>
            {otherStaff.map(s => {
              const unread = unreadCounts[s.id] || 0;
              const isActive = activeDM === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => { setActiveDM(s.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer',
                    background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(59,130,246,0.22)' : 'none',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(s.id, staff),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {getStaffInitials(s.id, staff)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isActive ? 13.5 : 12.5, fontWeight: isActive ? 800 : 500, color: isActive ? '#93c5fd' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getStaffName(s.id, staff)}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{getStaffRole(s.id, staff)}</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ fontSize: 10, color: 'white', background: '#3b82f6', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                      {unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current user */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(currentUser?.id, staff),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 10, fontWeight: 700,
            }}>
              {currentUser ? `${currentUser.firstName[0]}${(currentUser.lastName || currentUser.firstName)[0]}` : '?'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{currentUser?.firstName} {currentUser?.lastName}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginRight: 4 }} />
                Online
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Channel header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8,
            background: 'linear-gradient(180deg, #fafbfc, #f8fafc)',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeDM ? (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(activeDM, staff),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 9, fontWeight: 700,
                  }}>{getStaffInitials(activeDM, staff)}</div>
                ) : (
                  <span>{channelInfo?.icon}</span>
                )}
                {headerTitle}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{headerDesc}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '5px 10px 5px 28px', border: '1px solid var(--border)', borderRadius: 6,
                    background: 'var(--bg)', fontSize: 11.5, width: 180, outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 2px var(--primary-ring)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, opacity: 0.4 }}>🔍</span>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {loadingMsgs && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <div style={{ fontSize: 13 }}>Loading messages…</div>
              </div>
            )}
            {!loadingMsgs && filteredMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {searchQuery ? 'No messages match your search' : 'No messages yet'}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {searchQuery ? 'Try a different search term' : 'Start the conversation!'}
                </div>
              </div>
            )}

            {filteredMessages.map((msg, i) => {
              const isMe = msg.from === currentUser?.id;
              const showAvatar = i === 0 || filteredMessages[i - 1]?.from !== msg.from;
              const showTime = i === 0 || (new Date(msg.time) - new Date(filteredMessages[i-1]?.time)) > 300000;
              return (
                <div key={msg.id}>
                  {showTime && (
                    <div style={{ textAlign: 'center', margin: '16px 0 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {isToday(msg.time) ? `Today at ${formatTime(msg.time)}` : new Date(msg.time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${formatTime(msg.time)}`}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', gap: 10, marginBottom: showAvatar && i < filteredMessages.length - 1 && filteredMessages[i+1]?.from !== msg.from ? 12 : 3,
                    alignItems: 'flex-start',
                  }}>
                    {showAvatar ? (
                      <div title={getStaffName(msg.from, staff)} style={{
                        width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(msg.from, staff),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>{getStaffInitials(msg.from, staff)}</div>
                    ) : (
                      <div style={{ width: 32, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {showAvatar && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: isMe ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {isMe ? 'You' : getStaffName(msg.from, staff)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getStaffRole(msg.from, staff)}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(msg.time)}</span>
                        </div>
                      )}
                      <div style={{
                        fontSize: 13, lineHeight: 1.55, color: 'var(--text-primary)',
                        padding: '6px 10px', borderRadius: 8,
                        background: isMe ? 'var(--primary-light)' : 'var(--bg)',
                        maxWidth: '85%', wordBreak: 'break-word',
                      }}>
                        {msg.text}
                      </div>
                      {/* Reactions */}
                      {Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(msg.id, emoji)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
                                borderRadius: 10, border: users.includes(currentUser?.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: users.includes(currentUser?.id) ? 'var(--primary-light)' : 'var(--bg-white)',
                                cursor: 'pointer', fontSize: 11, transition: 'all 0.1s',
                              }}
                            >
                              <span>{emoji}</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Emoji add button */}
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                          style={{
                            opacity: 0.3, fontSize: 12, padding: '2px 4px', cursor: 'pointer',
                            background: 'none', border: 'none', transition: 'opacity 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.3'}
                        >😀+</button>
                        {showEmojiPicker === msg.id && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: 0, padding: 6,
                            background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 8,
                            boxShadow: 'var(--shadow-md)', display: 'flex', gap: 2, zIndex: 10,
                            animation: 'scaleIn 0.1s ease both',
                          }}>
                            {quickEmojis.map(e => (
                              <button key={e} onClick={() => addReaction(msg.id, e)}
                                style={{ fontSize: 16, padding: '4px 5px', cursor: 'pointer', background: 'none', border: 'none', borderRadius: 4, transition: 'background 0.1s' }}
                                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg)'}
                                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                              >{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#fafbfc' }}>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              background: 'var(--bg-white)', border: '1.5px solid var(--border)', borderRadius: 8,
              padding: '8px 12px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-ring)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <textarea
                ref={inputRef}
                className="messaging-input"
                rows={1}
                placeholder={`Message ${activeDM ? getStaffName(activeDM, staff) : `#${channelInfo?.name || ''}`}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent',
                  fontSize: 13, lineHeight: 1.5, minHeight: 20, maxHeight: 120, fontFamily: 'var(--font)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  background: input.trim() ? 'var(--primary)' : 'var(--bg)',
                  color: input.trim() ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s', flexShrink: 0, fontSize: 15,
                }}
              >
                ➤
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Press Enter to send, Shift+Enter for new line</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
