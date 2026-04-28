import React, { useState } from 'react';

const APP_CATEGORIES = ['All', 'Clinical', 'Billing', 'Patient Engagement', 'Telehealth', 'Analytics', 'Interoperability', 'Specialty'];

const MARKETPLACE_APPS = [
  // Clinical
  { id: 'app1', name: 'DrFirst e-Prescribing', vendor: 'DrFirst', category: 'Clinical', icon: '💊', rating: 4.8, installs: '12,400+', price: 'Included', status: 'installed', desc: 'EPCS-certified electronic prescribing with real-time eligibility and formulary checks.' },
  { id: 'app2', name: 'Nuance Dragon Medical', vendor: 'Microsoft Nuance', category: 'Clinical', icon: '🎙️', rating: 4.7, installs: '8,200+', price: '$99/mo', status: 'available', desc: 'AI-powered clinical speech recognition for hands-free documentation.' },
  { id: 'app3', name: 'Isabel Healthcare DDx', vendor: 'Isabel Healthcare', category: 'Clinical', icon: '🩺', rating: 4.5, installs: '3,100+', price: '$49/mo', status: 'available', desc: 'Differential diagnosis tool powered by clinical NLP and evidence databases.' },
  { id: 'app4', name: 'UpToDate Clinical Decision', vendor: 'Wolters Kluwer', category: 'Clinical', icon: '📖', rating: 4.9, installs: '15,600+', price: '$399/yr', status: 'installed', desc: 'Evidence-based clinical decision support integrated into the chart workflow.' },
  // Billing
  { id: 'app5', name: 'Waystar Revenue Cycle', vendor: 'Waystar', category: 'Billing', icon: '💰', rating: 4.6, installs: '5,800+', price: 'Custom', status: 'installed', desc: 'End-to-end revenue cycle automation with AI-powered denial prevention.' },
  { id: 'app6', name: 'Availity Essentials', vendor: 'Availity', category: 'Billing', icon: '💳', rating: 4.4, installs: '9,300+', price: 'Free', status: 'installed', desc: 'Real-time eligibility, claim status, and prior auth from 600+ payers.' },
  { id: 'app7', name: 'Phreesia Patient Intake', vendor: 'Phreesia', category: 'Billing', icon: '📱', rating: 4.3, installs: '4,700+', price: '$199/mo', status: 'available', desc: 'Digital patient intake with insurance capture and payment collection.' },
  // Patient Engagement
  { id: 'app8', name: 'Luma Health', vendor: 'Luma Health', category: 'Patient Engagement', icon: '📲', rating: 4.5, installs: '6,200+', price: '$149/mo', status: 'available', desc: 'Patient communication platform with smart reminders and waitlist management.' },
  { id: 'app9', name: 'Klara Messaging', vendor: 'Klara', category: 'Patient Engagement', icon: '💬', rating: 4.6, installs: '7,100+', price: '$99/mo', status: 'available', desc: 'HIPAA-compliant two-way patient messaging with auto-routing and forms.' },
  { id: 'app10', name: 'Solutionreach', vendor: 'Solutionreach', category: 'Patient Engagement', icon: '📧', rating: 4.2, installs: '5,400+', price: '$179/mo', status: 'available', desc: 'Automated patient outreach, recall campaigns, and satisfaction surveys.' },
  // Telehealth
  { id: 'app11', name: 'Doxy.me Pro', vendor: 'Doxy.me', category: 'Telehealth', icon: '📹', rating: 4.7, installs: '11,300+', price: 'Included', status: 'installed', desc: 'HIPAA-compliant telehealth with virtual waiting room and screen sharing.' },
  { id: 'app12', name: 'Zoom for Healthcare', vendor: 'Zoom', category: 'Telehealth', icon: '🎥', rating: 4.5, installs: '8,900+', price: '$200/yr', status: 'available', desc: 'Enterprise telehealth with EHR integration, recording, and BAA compliance.' },
  // Analytics
  { id: 'app13', name: 'Arcadia Analytics', vendor: 'Arcadia.io', category: 'Analytics', icon: '📊', rating: 4.4, installs: '2,800+', price: 'Custom', status: 'available', desc: 'Population health analytics and value-based care performance dashboards.' },
  { id: 'app14', name: 'Tableau Healthcare', vendor: 'Salesforce', category: 'Analytics', icon: '📈', rating: 4.6, installs: '4,200+', price: '$70/user/mo', status: 'available', desc: 'Visual analytics for clinical, operational, and financial healthcare data.' },
  // Interoperability
  { id: 'app15', name: 'Redox Engine', vendor: 'Redox', category: 'Interoperability', icon: '🔗', rating: 4.7, installs: '3,500+', price: 'Custom', status: 'installed', desc: 'Universal healthcare API platform for EHR integration and data exchange.' },
  { id: 'app16', name: 'Health Gorilla', vendor: 'Health Gorilla', category: 'Interoperability', icon: '🌐', rating: 4.5, installs: '2,100+', price: 'Custom', status: 'available', desc: 'Clinical data network for labs, imaging, and medical records exchange.' },
  // Specialty
  { id: 'app17', name: 'Measure Stack (MIPS)', vendor: 'Measure Stack', category: 'Specialty', icon: '🏛️', rating: 4.3, installs: '1,900+', price: '$79/mo', status: 'available', desc: 'Automated MIPS/QPP reporting with real-time performance tracking.' },
  { id: 'app18', name: 'Collective Medical', vendor: 'PointClickCare', category: 'Specialty', icon: '🏥', rating: 4.4, installs: '2,600+', price: 'Custom', status: 'available', desc: 'Care coordination for high-risk patients with real-time ADT notifications.' },
];

export default function AppMarketplace() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState(MARKETPLACE_APPS);

  const filtered = apps.filter(a => {
    if (filter !== 'All' && a.category !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.vendor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const installedCount = apps.filter(a => a.status === 'installed').length;

  const toggleInstall = (appId) => {
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: a.status === 'installed' ? 'available' : 'installed' } : a));
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>🏪 App Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Extend Clarity with certified third-party integrations and partner applications
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-success" style={{ fontSize: 11 }}>
            {installedCount} Apps Installed
          </span>
          <button className="btn btn-secondary btn-sm">📋 Manage Installed</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">🏪</div><div className="stat-info"><h3>{apps.length}</h3><p>Total Apps</p></div></div>
        <div className="stat-card row green fade-in"><div className="stat-icon green">✅</div><div className="stat-info"><h3>{installedCount}</h3><p>Installed</p></div></div>
        <div className="stat-card row teal fade-in"><div className="stat-icon teal">⭐</div><div className="stat-info"><h3>4.5</h3><p>Avg Rating</p></div></div>
        <div className="stat-card row yellow fade-in"><div className="stat-icon yellow">🔌</div><div className="stat-info"><h3>{APP_CATEGORIES.length - 1}</h3><p>Categories</p></div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {APP_CATEGORIES.map(c => (
          <button key={c} className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(c)}>{c}</button>
        ))}
        <div style={{ flex: 1 }} />
        <input className="form-input" placeholder="Search apps..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 240, fontSize: 12 }} />
      </div>

      {/* App Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
        {filtered.map(app => (
          <div key={app.id} className="card" style={{ overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}>
            <div style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 50, height: 50, borderRadius: 12,
                background: app.status === 'installed' ? '#f0fdf4' : '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                border: `1.5px solid ${app.status === 'installed' ? '#bbf7d0' : '#bfdbfe'}`,
                flexShrink: 0,
              }}>
                {app.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{app.name}</span>
                  {app.status === 'installed' && (
                    <span className="badge badge-success" style={{ fontSize: 9 }}>✓ Installed</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  by {app.vendor} · {app.category}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {app.desc}
                </p>
              </div>
            </div>
            <div style={{
              padding: '10px 18px', background: 'var(--bg)', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>⭐ {app.rating}</span>
                <span>📥 {app.installs}</span>
                <span style={{ fontWeight: 700, color: app.price === 'Free' || app.price === 'Included' ? '#16a34a' : 'var(--text-primary)' }}>
                  {app.price}
                </span>
              </div>
              <button
                className={`btn btn-sm ${app.status === 'installed' ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => toggleInstall(app.id)}
                style={{ fontSize: 11 }}
              >
                {app.status === 'installed' ? '⚙️ Configure' : '📥 Install'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>No apps found matching your search.</p>
        </div>
      )}

      {/* Certification Notice */}
      <div className="card" style={{ marginTop: 24, padding: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          🔒 All marketplace apps are reviewed for <strong>HIPAA compliance</strong>, <strong>security</strong>, and <strong>data handling practices</strong> before listing.
          <br />Apps operate under BAA agreements and follow <strong>SMART on FHIR</strong> authorization standards.
        </div>
      </div>
    </div>
  );
}
