import React, { useState } from 'react';

/* ─── Practice Marketing & Reputation Management ────────── */
const MOCK_REVIEWS = [
  { id: 'r1', platform: 'Google', author: 'Sarah M.', rating: 5, date: '2026-04-12', text: 'Dr. Chris is amazing! He listens carefully and explains everything. The telehealth option is so convenient. Highly recommend for anyone looking for quality psychiatric care.', replied: true, reply: 'Thank you, Sarah! We appreciate your kind words and are glad our telehealth services work well for you. — Clarity Health Team', sentiment: 'positive' },
  { id: 'r2', platform: 'Google', author: 'Mike T.', rating: 4, date: '2026-04-10', text: 'Good experience overall. The online scheduling is easy and the staff is friendly. Wait times could be a bit shorter but the care quality makes up for it.', replied: false, reply: '', sentiment: 'positive' },
  { id: 'r3', platform: 'Healthgrades', author: 'Anonymous', rating: 5, date: '2026-04-08', text: 'April Torres is an exceptional therapist. She uses evidence-based approaches and really helps you develop practical coping skills. The DBT group is excellent.', replied: true, reply: 'Thank you for your wonderful review! April is a valued member of our team. We\'re glad the DBT group has been helpful.', sentiment: 'positive' },
  { id: 'r4', platform: 'Google', author: 'Jennifer L.', rating: 2, date: '2026-04-05', text: 'Had trouble getting my prescription refill on time. The office was hard to reach by phone. Eventually resolved but was stressful.', replied: false, reply: '', sentiment: 'negative' },
  { id: 'r5', platform: 'Yelp', author: 'David K.', rating: 5, date: '2026-04-03', text: 'Life-changing care. After years of struggling with anxiety, I finally found a provider who truly understands. The combination of therapy and medication management is exactly what I needed.', replied: true, reply: 'David, thank you so much for sharing. We\'re honored to be part of your mental health journey. — Clarity Health', sentiment: 'positive' },
  { id: 'r6', platform: 'Google', author: 'Lisa R.', rating: 3, date: '2026-04-01', text: 'The patient portal is nice but I wish there were more appointment slots available. Sometimes I have to wait 2-3 weeks for a follow-up.', replied: false, reply: '', sentiment: 'neutral' },
  { id: 'r7', platform: 'Zocdoc', author: 'Ryan P.', rating: 5, date: '2026-03-28', text: 'Excellent first visit. Very thorough evaluation. Dr. Chris took time to understand my history and concerns. The office is modern and comfortable.', replied: true, reply: 'Welcome to Clarity Health, Ryan! We\'re glad your first visit was a positive experience.', sentiment: 'positive' },
  { id: 'r8', platform: 'Healthgrades', author: 'Maria S.', rating: 4, date: '2026-03-25', text: 'Great psychiatric care. The medication management is thorough and they always check in on side effects. Only wish they had Saturday hours.', replied: false, reply: '', sentiment: 'positive' },
];

const MOCK_DIRECTORY_LISTINGS = [
  { id: 'd1', platform: 'Google Business', status: 'verified', accuracy: 100, lastUpdated: '2026-04-01', url: 'google.com/maps', views: 2840, clicks: 342 },
  { id: 'd2', platform: 'Healthgrades', status: 'verified', accuracy: 100, lastUpdated: '2026-03-15', url: 'healthgrades.com', views: 1200, clicks: 156 },
  { id: 'd3', platform: 'Zocdoc', status: 'verified', accuracy: 95, lastUpdated: '2026-03-20', url: 'zocdoc.com', views: 890, clicks: 234 },
  { id: 'd4', platform: 'Psychology Today', status: 'verified', accuracy: 100, lastUpdated: '2026-04-05', url: 'psychologytoday.com', views: 2100, clicks: 445 },
  { id: 'd5', platform: 'Yelp', status: 'claimed', accuracy: 90, lastUpdated: '2026-02-28', url: 'yelp.com', views: 450, clicks: 67 },
  { id: 'd6', platform: 'Vitals', status: 'unclaimed', accuracy: 70, lastUpdated: 'N/A', url: 'vitals.com', views: 120, clicks: 12 },
  { id: 'd7', platform: 'WebMD', status: 'verified', accuracy: 85, lastUpdated: '2026-03-01', url: 'webmd.com', views: 340, clicks: 28 },
  { id: 'd8', platform: 'Facebook', status: 'verified', accuracy: 100, lastUpdated: '2026-04-10', url: 'facebook.com', views: 1680, clicks: 198 },
];

const SOCIAL_POSTS = [
  { id: 'sp1', platform: 'Facebook', content: '🧠 May is Mental Health Awareness Month! Follow us for daily tips on managing anxiety, improving sleep, and building resilience.', date: '2026-04-14', likes: 47, shares: 12, reach: 1240, status: 'published' },
  { id: 'sp2', platform: 'Instagram', content: '💡 Did you know? Regular exercise can reduce symptoms of depression by up to 26%. Even a 15-minute walk makes a difference. #MentalHealthMatters', date: '2026-04-12', likes: 89, shares: 23, reach: 2100, status: 'published' },
  { id: 'sp3', platform: 'Facebook', content: '📹 Now offering Group Telehealth sessions! Join our DBT Skills, Anxiety Support, and Mindfulness groups from the comfort of home. Book through our Patient Portal.', date: '2026-04-10', likes: 34, shares: 8, reach: 890, status: 'published' },
  { id: 'sp4', platform: 'LinkedIn', content: 'Clarity Behavioral Health is hiring! Looking for a PMHNP and Licensed Clinical Social Worker to join our growing team. DM for details.', date: '2026-04-15', likes: 0, shares: 0, reach: 0, status: 'scheduled' },
  { id: 'sp5', platform: 'Instagram', content: '🌿 Self-care Sunday: Try the 5-4-3-2-1 grounding technique when feeling overwhelmed. Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.', date: '2026-04-20', likes: 0, shares: 0, reach: 0, status: 'draft' },
];

const AI_REPLY_TEMPLATES = {
  positive: "Thank you so much for your kind review, {{author}}! We're delighted to hear about your positive experience at Clarity Health. Your feedback means a lot to our team. We look forward to continuing to support your mental health journey. — Clarity Health Team",
  negative: "Thank you for your feedback, {{author}}. We're sorry to hear about your experience and take your concerns seriously. We'd like to make this right — please contact our office at (312) 555-0199 so we can address this directly. Your care is our priority. — Clarity Health Team",
  neutral: "Thank you for sharing your experience, {{author}}. We appreciate your feedback and are always looking for ways to improve. Please don't hesitate to reach out if there's anything we can do to enhance your care. — Clarity Health Team",
};

export default function PracticeMarketing() {
  const [tab, setTab] = useState('reputation');
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [replyDraft, setReplyDraft] = useState({});
  const [reviewFilter, setReviewFilter] = useState('all');
  const [socialPosts, setSocialPosts] = useState(SOCIAL_POSTS);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ platform: 'Facebook', content: '', date: '2026-04-16', status: 'draft' });

  const avgRating = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
  const unreplied = reviews.filter(r => !r.replied).length;

  const generateAIReply = (review) => {
    const template = AI_REPLY_TEMPLATES[review.sentiment] || AI_REPLY_TEMPLATES.neutral;
    return template.replace('{{author}}', review.author);
  };

  const submitReply = (reviewId) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replied: true, reply: replyDraft[reviewId] || '' } : r));
    setReplyDraft(prev => { const n = { ...prev }; delete n[reviewId]; return n; });
  };

  const filteredReviews = reviews.filter(r => {
    if (reviewFilter === 'unreplied') return !r.replied;
    if (reviewFilter === 'negative') return r.rating <= 2;
    if (reviewFilter === 'positive') return r.rating >= 4;
    return true;
  });

  const tabs = [
    { id: 'reputation', label: '⭐ Reputation', badge: unreplied },
    { id: 'directories', label: '📍 Directories' },
    { id: 'social', label: '📱 Social Media' },
    { id: 'seo', label: '🔍 SEO & Website' },
    { id: 'analytics', label: '📊 Marketing Analytics' },
  ];

  return (
    <div className="page-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>📢 Practice Marketing & Reputation</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Manage reviews, directories, social media, and online presence</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? '#2563eb' : '#64748b', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer', marginBottom: -2, position: 'relative' }}>
            {t.label}
            {t.badge > 0 && <span style={{ position: 'absolute', top: 2, right: 0, background: '#ef4444', color: '#fff', borderRadius: 99, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ─── Reputation Tab ─── */}
      {tab === 'reputation' && (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#f59e0b' }}>{avgRating}</div>
              <div style={{ fontSize: 16 }}>{'⭐'.repeat(Math.round(avgRating))}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Average Rating</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#3b82f6' }}>{reviews.length}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Reviews</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: unreplied > 0 ? '#ef4444' : '#10b981' }}>{unreplied}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Awaiting Reply</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981' }}>{((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Positive Rate</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['all', 'unreplied', 'positive', 'negative'].map(f => (
              <button key={f} onClick={() => setReviewFilter(f)} className={`btn btn-sm ${reviewFilter === f ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>
                {f === 'all' ? 'All Reviews' : f}
              </button>
            ))}
          </div>

          {/* Reviews */}
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredReviews.map(review => (
              <div key={review.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{review.author}</span>
                      <span style={{ color: '#f59e0b', fontSize: 13 }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      <span style={{ background: '#f1f5f9', padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, color: '#475569' }}>{review.platform}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{review.date}</span>
                      {review.replied && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 700 }}>✅ REPLIED</span>}
                    </div>
                    <p style={{ fontSize: 13, color: '#334155', margin: '6px 0', lineHeight: 1.5 }}>{review.text}</p>

                    {review.replied && review.reply && (
                      <div style={{ background: '#f0fdf4', borderLeft: '3px solid #10b981', padding: '8px 12px', borderRadius: 6, marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Your Reply:</div>
                        <div style={{ fontSize: 12, color: '#334155' }}>{review.reply}</div>
                      </div>
                    )}

                    {!review.replied && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          value={replyDraft[review.id] || ''}
                          onChange={e => setReplyDraft(prev => ({ ...prev, [review.id]: e.target.value }))}
                          placeholder="Write a HIPAA-compliant reply…"
                          className="form-input"
                          rows={2}
                          style={{ fontSize: 12, marginBottom: 6 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setReplyDraft(prev => ({ ...prev, [review.id]: generateAIReply(review) }))} className="btn btn-sm btn-secondary">
                            🤖 AI Generate Reply
                          </button>
                          <button onClick={() => submitReply(review.id)} disabled={!replyDraft[review.id]} className="btn btn-sm btn-primary">
                            ✉️ Post Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Directories Tab ─── */}
      {tab === 'directories' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981' }}>{MOCK_DIRECTORY_LISTINGS.filter(d => d.status === 'verified').length}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Verified Listings</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#3b82f6' }}>{MOCK_DIRECTORY_LISTINGS.reduce((a, d) => a + d.views, 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Profile Views</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#8b5cf6' }}>{MOCK_DIRECTORY_LISTINGS.reduce((a, d) => a + d.clicks, 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Click-Throughs</div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Platform</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Accuracy</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Views</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Clicks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Last Updated</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DIRECTORY_LISTINGS.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{d.platform}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: d.status === 'verified' ? '#dcfce7' : d.status === 'claimed' ? '#fef3c7' : '#fee2e2', color: d.status === 'verified' ? '#16a34a' : d.status === 'claimed' ? '#d97706' : '#dc2626', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{d.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <div style={{ width: 40, height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                          <div style={{ width: `${d.accuracy}%`, height: '100%', background: d.accuracy === 100 ? '#10b981' : d.accuracy >= 90 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{d.accuracy}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{d.views.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{d.clicks.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>{d.lastUpdated}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button className="btn btn-sm btn-secondary">{d.status === 'unclaimed' ? 'Claim' : 'Update'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Social Media Tab ─── */}
      {tab === 'social' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowNewPost(true)} className="btn btn-primary">➕ New Post</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#3b82f6' }}>{socialPosts.reduce((a, p) => a + p.reach, 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Reach</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444' }}>{socialPosts.reduce((a, p) => a + p.likes, 0)}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Likes</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981' }}>{socialPosts.reduce((a, p) => a + p.shares, 0)}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Shares</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {socialPosts.map(post => (
              <div key={post.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#475569' }}>{post.platform}</span>
                  <span style={{ background: post.status === 'published' ? '#dcfce7' : post.status === 'scheduled' ? '#dbeafe' : '#f1f5f9', color: post.status === 'published' ? '#16a34a' : post.status === 'scheduled' ? '#2563eb' : '#64748b', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{post.status}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{post.date}</span>
                </div>
                <p style={{ fontSize: 13, color: '#334155', margin: '0 0 10px', lineHeight: 1.5 }}>{post.content}</p>
                {post.status === 'published' && (
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                    <span>❤️ {post.likes} likes</span>
                    <span>🔄 {post.shares} shares</span>
                    <span>👁️ {post.reach.toLocaleString()} reach</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showNewPost && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewPost(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>📱 New Social Post</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Platform</label>
                    <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className="form-input">
                      {['Facebook', 'Instagram', 'LinkedIn', 'Twitter/X'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Content</label>
                    <textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} className="form-input" rows={4} placeholder="Write your post…" />
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button onClick={() => setNewPost(p => ({ ...p, content: '🧠 Mental health is just as important as physical health. If you or someone you know is struggling, reach out. You\'re not alone. #MentalHealthMatters #ClarityHealth' }))} className="btn btn-sm btn-secondary">🤖 AI Suggest</button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Schedule Date</label>
                    <input type="date" value={newPost.date} onChange={e => setNewPost(p => ({ ...p, date: e.target.value }))} className="form-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setShowNewPost(false)} className="btn btn-secondary">Cancel</button>
                  <button onClick={() => { setSocialPosts(prev => [{ ...newPost, id: `sp${Date.now()}`, likes: 0, shares: 0, reach: 0, status: 'scheduled' }, ...prev]); setShowNewPost(false); setNewPost({ platform: 'Facebook', content: '', date: '2026-04-16', status: 'draft' }); }} className="btn btn-primary" disabled={!newPost.content}>
                    📅 Schedule Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SEO & Website Tab ─── */}
      {tab === 'seo' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Domain Authority', value: '42/100', color: '#3b82f6', desc: 'Good — Above average for healthcare' },
              { label: 'Monthly Organic Traffic', value: '3,240', color: '#10b981', desc: '↑ 18% vs last month' },
              { label: 'Top Keywords Ranking', value: '14', color: '#8b5cf6', desc: 'Page 1 positions' },
              { label: 'Page Load Speed', value: '1.8s', color: '#f59e0b', desc: 'Mobile performance score: 92' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{m.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{m.desc}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>🔍 Top Ranking Keywords</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#475569' }}>Keyword</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>Position</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>Monthly Volume</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { kw: 'psychiatrist near me chicago', pos: 3, vol: 2400, trend: '↑' },
                  { kw: 'anxiety therapist chicago', pos: 5, vol: 1800, trend: '↑' },
                  { kw: 'telehealth psychiatry illinois', pos: 2, vol: 1200, trend: '↑' },
                  { kw: 'DBT therapy chicago', pos: 4, vol: 880, trend: '→' },
                  { kw: 'ADHD evaluation chicago', pos: 7, vol: 1500, trend: '↑' },
                  { kw: 'medication management psychiatrist', pos: 6, vol: 2100, trend: '↓' },
                  { kw: 'depression treatment chicago', pos: 8, vol: 3200, trend: '↑' },
                  { kw: 'online therapy illinois', pos: 4, vol: 900, trend: '↑' },
                ].map((k, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{k.kw}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ background: k.pos <= 3 ? '#dcfce7' : k.pos <= 5 ? '#dbeafe' : '#fef3c7', color: k.pos <= 3 ? '#16a34a' : k.pos <= 5 ? '#2563eb' : '#d97706', padding: '2px 10px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>#{k.pos}</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{k.vol.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 16, color: k.trend === '↑' ? '#10b981' : k.trend === '↓' ? '#ef4444' : '#f59e0b' }}>{k.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>🌐 Website Health</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'SSL Certificate', status: 'Active', ok: true },
                { label: 'Mobile Responsive', status: 'Yes', ok: true },
                { label: 'Schema Markup', status: 'HealthcareBusiness', ok: true },
                { label: 'Meta Descriptions', status: 'All pages', ok: true },
                { label: 'Alt Text Coverage', status: '94%', ok: true },
                { label: 'Broken Links', status: '0 found', ok: true },
                { label: 'Core Web Vitals', status: 'Passing', ok: true },
                { label: 'HIPAA Privacy Page', status: 'Published', ok: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: item.ok ? '#16a34a' : '#ef4444', fontWeight: 700 }}>{item.ok ? '✅' : '❌'} {item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Marketing Analytics Tab ─── */}
      {tab === 'analytics' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'New Patient Inquiries', value: '47', period: 'This Month', color: '#3b82f6', trend: '↑ 23%' },
              { label: 'Portal Registrations', value: '12', period: 'This Week', color: '#10b981', trend: '↑ 4' },
              { label: 'Referral Source: Online', value: '62%', period: 'This Quarter', color: '#8b5cf6', trend: '↑ 8%' },
              { label: 'Cost Per Acquisition', value: '$32', period: 'Avg', color: '#f59e0b', trend: '↓ $5' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{m.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.period}</div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 4 }}>{m.trend}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>📊 Patient Acquisition Sources</h3>
              {[
                { source: 'Google Search', pct: 38, color: '#3b82f6' },
                { source: 'Psychology Today', pct: 22, color: '#8b5cf6' },
                { source: 'Physician Referral', pct: 18, color: '#10b981' },
                { source: 'Insurance Directory', pct: 10, color: '#f59e0b' },
                { source: 'Social Media', pct: 7, color: '#ef4444' },
                { source: 'Word of Mouth', pct: 5, color: '#06b6d4' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    <span>{s.source}</span>
                    <span style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>📈 Monthly New Patients</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
                {[
                  { month: 'Nov', value: 28 }, { month: 'Dec', value: 22 }, { month: 'Jan', value: 31 },
                  { month: 'Feb', value: 35 }, { month: 'Mar', value: 41 }, { month: 'Apr', value: 47 },
                ].map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>{m.value}</div>
                    <div style={{ width: '100%', height: `${(m.value / 50) * 140}px`, background: `linear-gradient(180deg, #3b82f6, #8b5cf6)`, borderRadius: '6px 6px 0 0', transition: 'height 0.5s' }} />
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{m.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
