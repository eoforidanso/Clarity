import React, { useState, useEffect, useRef, useMemo } from 'react';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG          = '#1a1f2e';
const BG2         = '#232838';
const COL_BORDER  = 'rgba(255,255,255,0.08)';
const ITEM_DEF    = 'rgba(255,255,255,0.03)';
const ITEM_HOV    = 'rgba(255,255,255,0.08)';
const ITEM_SEL    = 'rgba(255,255,255,0.13)';
const T_PRI       = 'rgba(255,255,255,0.95)';
const T_SEC       = 'rgba(255,255,255,0.60)';
const T_MUT       = 'rgba(255,255,255,0.40)';
const ACCENT      = '#6366f1';
const ACCENT_HOV  = '#4f46e5';

const TODAY_IDX = new Date().getDay(); // 0=Sun
const DAY_KEYS  = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_LABEL = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };
const TODAY     = DAY_KEYS[TODAY_IDX];

// ─── Badge Component ──────────────────────────────────────────────────────────
const BADGE_MAP = {
  erx:  { bg: '#3b82f6', label: 'eRx'  },
  epcs: { bg: '#8b5cf6', label: 'EPCS' },
  h24:  { bg: '#10b981', label: '24/7' },
  mail: { bg: '#06b6d4', label: 'Mail' },
};
function Badge({ type }) {
  const b = BADGE_MAP[type];
  if (!b) return null;
  return (
    <span style={{ background: b.bg, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
      {b.label}
    </span>
  );
}

// ─── Pharmacy Master Data ─────────────────────────────────────────────────────
const ALL_PHARMACIES = [
  // ── Recently used / Favorites ──────────────────────────────────────────────
  {
    id: 'wag-09878', name: 'Walgreens #09878',
    address1: '2380 Hicks Rd', address2: '', city: 'Rolling Meadows', state: 'IL', zip: '60008',
    phone: '(847) 392-3880', fax: '(847) 392-3884', npi: '1174561234', ncpdp: '5647823',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–10pm', tue:'8am–10pm', wed:'8am–10pm', thu:'8am–10pm', fri:'8am–10pm', sat:'9am–6pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: 0.3, isFavorite: true, lastUsedAt: Date.now() - 86400000 * 2, category: 'nearby',
  },
  {
    id: 'cvs-16839', name: 'CVS Pharmacy #16839',
    address1: '3409 Kirchoff Rd', address2: '', city: 'Rolling Meadows', state: 'IL', zip: '60008',
    phone: '(847) 818-5580', fax: '(847) 818-5584', npi: '1234567890', ncpdp: '6172834',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–9pm', tue:'8am–9pm', wed:'8am–9pm', thu:'8am–9pm', fri:'8am–9pm', sat:'9am–6pm', sun:'10am–5pm' },
    open24h: false, distanceMiles: 0.8, isFavorite: false, lastUsedAt: Date.now() - 86400000 * 10, category: 'nearby',
  },
  // ── Nearby ─────────────────────────────────────────────────────────────────
  {
    id: 'jwl-3456', name: 'Jewel-Osco Pharmacy #3456',
    address1: '2323 Hicks Rd', address2: '', city: 'Rolling Meadows', state: 'IL', zip: '60008',
    phone: '(847) 577-3440', fax: '(847) 577-3444', npi: '1345678901', ncpdp: '7283945',
    capabilities: { erx: true,  epcs: false, mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–9pm', tue:'9am–9pm', wed:'9am–9pm', thu:'9am–9pm', fri:'9am–9pm', sat:'9am–6pm', sun:'10am–5pm' },
    open24h: false, distanceMiles: 1.1, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'wmt-chi', name: 'Walmart Pharmacy #1234',
    address1: '2551 E 79th St', address2: '', city: 'Chicago', state: 'IL', zip: '60649',
    phone: '(773) 221-5000', fax: '(773) 221-5001', npi: '1456789012', ncpdp: '8394056',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–9pm', tue:'9am–9pm', wed:'9am–9pm', thu:'9am–9pm', fri:'9am–9pm', sat:'9am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: 18.2, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'wag-24h-chi', name: 'Walgreens #02561 (24hr)',
    address1: '757 N Michigan Ave', address2: '', city: 'Chicago', state: 'IL', zip: '60611',
    phone: '(312) 664-8686', fax: '(312) 664-8687', npi: '1567890123', ncpdp: '9405167',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'Open 24 hours', tue:'Open 24 hours', wed:'Open 24 hours', thu:'Open 24 hours', fri:'Open 24 hours', sat:'Open 24 hours', sun:'Open 24 hours' },
    open24h: true, distanceMiles: 19.0, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'cvs-chi', name: 'CVS Pharmacy #01234',
    address1: '1234 N Michigan Ave', address2: '', city: 'Chicago', state: 'IL', zip: '60610',
    phone: '(312) 266-8500', fax: '(312) 266-8501', npi: '1678901234', ncpdp: '0516278',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–10pm', tue:'8am–10pm', wed:'8am–10pm', thu:'8am–10pm', fri:'8am–10pm', sat:'9am–8pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: 19.5, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'wag-ny', name: 'Walgreens #06712',
    address1: '136 E 57th St', address2: '', city: 'New York', state: 'NY', zip: '10022',
    phone: '(212) 755-0197', fax: '(212) 755-0198', npi: '1789012345', ncpdp: '1627389',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'7am–11pm', tue:'7am–11pm', wed:'7am–11pm', thu:'7am–11pm', fri:'7am–11pm', sat:'8am–10pm', sun:'9am–9pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'cvs-ny', name: 'CVS Pharmacy #05678',
    address1: '200 W 57th St', address2: '', city: 'New York', state: 'NY', zip: '10019',
    phone: '(212) 541-9200', fax: '(212) 541-9201', npi: '1890123456', ncpdp: '2738490',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–10pm', tue:'8am–10pm', wed:'8am–10pm', thu:'8am–10pm', fri:'8am–10pm', sat:'9am–8pm', sun:'10am–7pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'wag-la', name: 'Walgreens #09241',
    address1: '250 N Alvarado St', address2: '', city: 'Los Angeles', state: 'CA', zip: '90026',
    phone: '(213) 484-5700', fax: '(213) 484-5701', npi: '1901234567', ncpdp: '3849501',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–10pm', tue:'8am–10pm', wed:'8am–10pm', thu:'8am–10pm', fri:'8am–10pm', sat:'9am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'cvs-la', name: 'CVS Pharmacy #09012',
    address1: '8001 Sunset Blvd', address2: '', city: 'Los Angeles', state: 'CA', zip: '90046',
    phone: '(323) 654-7100', fax: '(323) 654-7101', npi: '1012345678', ncpdp: '4950612',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–10pm', tue:'8am–10pm', wed:'8am–10pm', thu:'8am–10pm', fri:'8am–10pm', sat:'9am–8pm', sun:'10am–7pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'cvs-hou', name: 'CVS Pharmacy #03456',
    address1: '2000 Westheimer Rd', address2: '', city: 'Houston', state: 'TX', zip: '77098',
    phone: '(713) 529-3900', fax: '(713) 529-3901', npi: '1123456789', ncpdp: '5061723',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–9pm', tue:'8am–9pm', wed:'8am–9pm', thu:'8am–9pm', fri:'8am–9pm', sat:'9am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'cvs-atl', name: 'CVS Pharmacy #07890',
    address1: '50 Peachtree St NW', address2: '', city: 'Atlanta', state: 'GA', zip: '30303',
    phone: '(404) 589-7900', fax: '(404) 589-7901', npi: '1234567892', ncpdp: '6172835',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–9pm', tue:'8am–9pm', wed:'8am–9pm', thu:'8am–9pm', fri:'8am–9pm', sat:'9am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'publix-mia', name: 'Publix Pharmacy #0456',
    address1: '1440 NE Miami Gardens Dr', address2: '', city: 'Miami', state: 'FL', zip: '33179',
    phone: '(305) 947-1200', fax: '(305) 947-1201', npi: '1345678903', ncpdp: '7283947',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–9pm', tue:'9am–9pm', wed:'9am–9pm', thu:'9am–9pm', fri:'9am–9pm', sat:'9am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'heb-aus', name: 'H-E-B Pharmacy #789',
    address1: '2101 S Lamar Blvd', address2: '', city: 'Austin', state: 'TX', zip: '78704',
    phone: '(512) 440-3800', fax: '(512) 440-3801', npi: '1456789014', ncpdp: '8394058',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–9pm', tue:'8am–9pm', wed:'8am–9pm', thu:'8am–9pm', fri:'8am–9pm', sat:'8am–7pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'rite-chi', name: 'Rite Aid #05678',
    address1: '303 W Erie St', address2: '', city: 'Chicago', state: 'IL', zip: '60654',
    phone: '(312) 335-1960', fax: '(312) 335-1961', npi: '1567890125', ncpdp: '9405169',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–9pm', tue:'8am–9pm', wed:'8am–9pm', thu:'8am–9pm', fri:'8am–9pm', sat:'9am–6pm', sun:'10am–5pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'costco-536', name: 'Costco Pharmacy #536',
    address1: '1375 N Meacham Rd', address2: '', city: 'Schaumburg', state: 'IL', zip: '60173',
    phone: '(847) 240-2540', fax: '(847) 240-2544', npi: '1678901236', ncpdp: '0516280',
    capabilities: { erx: true,  epcs: false, mailOrder: false, controlledSubstances: true  },
    hours: { mon:'10am–8:30pm', tue:'10am–8:30pm', wed:'10am–8:30pm', thu:'10am–8:30pm', fri:'10am–8:30pm', sat:'9:30am–6pm', sun:'10am–6pm' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  // ── Specialty / Behavioral Health ──────────────────────────────────────────
  {
    id: 'genoa-chi', name: 'Genoa Healthcare — Chicago',
    address1: '1700 W Van Buren St', address2: 'Ste 100', city: 'Chicago', state: 'IL', zip: '60612',
    phone: '(312) 996-7100', fax: '(312) 996-7101', npi: '1789012347', ncpdp: '1627391',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–5pm', tue:'9am–5pm', wed:'9am–5pm', thu:'9am–5pm', fri:'9am–5pm', sat:'Closed', sun:'Closed' },
    open24h: false, distanceMiles: 15.0, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'genoa-ny', name: 'Genoa Healthcare — New York',
    address1: '722 W 168th St', address2: '', city: 'New York', state: 'NY', zip: '10032',
    phone: '(212) 305-6001', fax: '(212) 305-6002', npi: '1890123458', ncpdp: '2738492',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–5pm', tue:'9am–5pm', wed:'9am–5pm', thu:'9am–5pm', fri:'9am–5pm', sat:'Closed', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'genoa-la', name: 'Genoa Healthcare — Los Angeles',
    address1: '4070 Cesar Chavez Ave', address2: '', city: 'Los Angeles', state: 'CA', zip: '90063',
    phone: '(323) 263-1028', fax: '(323) 263-1029', npi: '1901234569', ncpdp: '3849503',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–5pm', tue:'9am–5pm', wed:'9am–5pm', thu:'9am–5pm', fri:'9am–5pm', sat:'Closed', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'genoa-hou', name: 'Genoa Healthcare — Houston',
    address1: '3000 Essex Ln', address2: '', city: 'Houston', state: 'TX', zip: '77027',
    phone: '(713) 523-0700', fax: '(713) 523-0701', npi: '1012345680', ncpdp: '4950614',
    capabilities: { erx: true,  epcs: true,  mailOrder: false, controlledSubstances: true  },
    hours: { mon:'9am–5pm', tue:'9am–5pm', wed:'9am–5pm', thu:'9am–5pm', fri:'9am–5pm', sat:'Closed', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'wag-spec', name: 'Walgreens Specialty Pharmacy',
    address1: '3200 Highland Ave', address2: '', city: 'Downers Grove', state: 'IL', zip: '60515',
    phone: '(855) 922-0512', fax: '(855) 922-0513', npi: '1123456790', ncpdp: '5061724',
    capabilities: { erx: true,  epcs: false, mailOrder: true,  controlledSubstances: false },
    hours: { mon:'8am–8pm', tue:'8am–8pm', wed:'8am–8pm', thu:'8am–8pm', fri:'8am–8pm', sat:'9am–5pm', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  // ── Hospital / VA ──────────────────────────────────────────────────────────
  {
    id: 'hosp-outpt', name: 'Hospital Outpatient Pharmacy',
    address1: 'On-site', address2: '', city: 'See facility directory', state: '', zip: '',
    phone: '', fax: '', npi: '', ncpdp: '',
    capabilities: { erx: true,  epcs: false, mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–8pm', tue:'8am–8pm', wed:'8am–8pm', thu:'8am–8pm', fri:'8am–8pm', sat:'9am–5pm', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  {
    id: 'va-chi', name: 'VA Outpatient Pharmacy — Chicago',
    address1: '820 S Damen Ave', address2: '', city: 'Chicago', state: 'IL', zip: '60612',
    phone: '(312) 569-8387', fax: '(312) 569-8390', npi: '1234567893', ncpdp: '6172836',
    capabilities: { erx: true,  epcs: false, mailOrder: false, controlledSubstances: true  },
    hours: { mon:'8am–4:30pm', tue:'8am–4:30pm', wed:'8am–4:30pm', thu:'8am–4:30pm', fri:'8am–4:30pm', sat:'Closed', sun:'Closed' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'nearby',
  },
  // ── Mail Order ─────────────────────────────────────────────────────────────
  {
    id: 'cvs-caremark', name: 'CVS Caremark Mail Service Pharmacy',
    address1: '1 CVS Dr', address2: '', city: 'Woonsocket', state: 'RI', zip: '02895',
    phone: '(800) 552-8159', fax: '(800) 378-0323', npi: '1345678904', ncpdp: '7283948',
    capabilities: { erx: true,  epcs: false, mailOrder: true,  controlledSubstances: false },
    hours: { mon:'24/7 service', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'mail',
  },
  {
    id: 'esi-mail', name: 'Express Scripts (Evernorth) Mail Order',
    address1: '4000 Express Scripts Blvd', address2: '', city: 'St. Louis', state: 'MO', zip: '63121',
    phone: '(800) 282-2881', fax: '(800) 758-1488', npi: '1456789015', ncpdp: '8394059',
    capabilities: { erx: true,  epcs: false, mailOrder: true,  controlledSubstances: false },
    hours: { mon:'24/7 service', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'mail',
  },
  {
    id: 'optumrx', name: 'OptumRx Mail Order Pharmacy',
    address1: '2300 Main St', address2: '', city: 'Irvine', state: 'CA', zip: '92614',
    phone: '(855) 427-4682', fax: '(855) 427-4683', npi: '1567890126', ncpdp: '9405170',
    capabilities: { erx: true,  epcs: false, mailOrder: true,  controlledSubstances: false },
    hours: { mon:'24/7 service', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'mail',
  },
  {
    id: 'amazon-rx', name: 'Amazon Pharmacy',
    address1: '440 Terry Ave N', address2: '', city: 'Seattle', state: 'WA', zip: '98109',
    phone: '(855) 745-5725', fax: '(855) 745-5726', npi: '1678901237', ncpdp: '0516281',
    capabilities: { erx: true,  epcs: true,  mailOrder: true,  controlledSubstances: true  },
    hours: { mon:'24/7 service', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'mail',
  },
  {
    id: 'accredo', name: 'Accredo Specialty Pharmacy (Express Scripts)',
    address1: '1640 Century Center Pkwy', address2: '', city: 'Memphis', state: 'TN', zip: '38134',
    phone: '(800) 803-2523', fax: '(800) 462-5327', npi: '1789012348', ncpdp: '1627392',
    capabilities: { erx: true,  epcs: false, mailOrder: true,  controlledSubstances: false },
    hours: { mon:'24/7 service', tue:'', wed:'', thu:'', fri:'', sat:'', sun:'' },
    open24h: false, distanceMiles: null, isFavorite: false, lastUsedAt: null, category: 'mail',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div style={{ padding: '14px 16px 5px', fontSize: 11, fontWeight: 700, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
      {label}
    </div>
  );
}

function PharmItem({ ph, focused, selected, onClick }) {
  const [hov, setHov] = useState(false);
  const bg = selected ? ITEM_SEL : (hov || focused) ? ITEM_HOV : ITEM_DEF;
  const addrLine = ph.address1 !== 'On-site'
    ? `${ph.city}${ph.state ? `, ${ph.state}` : ''} ${ph.zip}`
    : 'On-site facility';
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '10px 14px', margin: '1px 8px', borderRadius: 8, cursor: 'pointer',
        background: bg, transition: 'background 0.1s',
        borderLeft: selected ? `3px solid ${ACCENT}` : '3px solid transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T_PRI, fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ph.name}
          </div>
          <div style={{ color: T_SEC, fontSize: 11.5, marginTop: 2 }}>{addrLine}</div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 96 }}>
          {ph.capabilities.erx  && <Badge type="erx"  />}
          {ph.capabilities.epcs && <Badge type="epcs" />}
          {ph.open24h           && <Badge type="h24"  />}
          {ph.capabilities.mailOrder && <Badge type="mail" />}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: T_MUT, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ContactRow({ icon, label, value, onCopy, isCopied }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 14, width: 18 }}>{icon}</span>
      <span style={{ color: T_SEC, fontSize: 12, minWidth: 38 }}>{label}</span>
      <span style={{ color: T_PRI, fontSize: 13, flex: 1 }}>{value}</span>
      <button
        onClick={onCopy}
        style={{
          background: 'none', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 5,
          color: isCopied ? '#4ade80' : T_MUT, fontSize: 10.5, padding: '2px 7px', cursor: 'pointer',
          transition: 'color 0.2s',
        }}
      >
        {isCopied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function CapRow({ label, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span style={{ color: active ? '#4ade80' : 'rgba(255,255,255,0.18)', fontSize: 15, lineHeight: 1 }}>
        {active ? '✓' : '✕'}
      </span>
      <span style={{ color: active ? T_PRI : T_SEC, fontSize: 12.5 }}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PharmacySelectorDrawer({
  isOpen,
  onClose,
  onSelect,
  onSetDefault,
  selectedId   = null,
  defaultId    = null,
  recentlyUsedIds = [],
}) {
  const [searchInput,   setSearchInput]   = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [detail,        setDetail]        = useState(null);   // selected pharmacy object
  const [focusedIdx,    setFocusedIdx]    = useState(0);
  const [showHours,     setShowHours]     = useState(false);
  const [copied,        setCopied]        = useState('');
  const [defaultSet,    setDefaultSet]    = useState(false);
  const debRef  = useRef(null);
  const searchRef = useRef(null);
  const listRef   = useRef(null);

  // Focus search when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSearchInput(''); setSearchQuery('');
      setDetail(null); setFocusedIdx(0); setShowHours(false); setDefaultSet(false);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Debounce
  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setSearchQuery(v); setFocusedIdx(0); }, 250);
  };

  // Filtered list
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return ALL_PHARMACIES.filter(ph =>
      ph.name.toLowerCase().includes(q) ||
      ph.city.toLowerCase().includes(q) ||
      ph.state.toLowerCase().includes(q) ||
      ph.zip.includes(q) ||
      ph.phone.replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
      ph.npi.includes(q)
    );
  }, [searchQuery]);

  // Categorised
  const recentList   = ALL_PHARMACIES.filter(ph => ph.lastUsedAt || recentlyUsedIds.includes(ph.id))
                         .sort((a, b) => (b.lastUsedAt||0) - (a.lastUsedAt||0));
  const favList      = ALL_PHARMACIES.filter(ph => ph.isFavorite && !recentList.includes(ph));
  const nearbyList   = ALL_PHARMACIES.filter(ph => ph.category === 'nearby' && !recentList.includes(ph) && !favList.includes(ph))
                         .sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
  const mailList     = ALL_PHARMACIES.filter(ph => ph.category === 'mail');

  // Flat visible list (for keyboard nav)
  const visibleList = filtered ?? [
    ...recentList, ...favList, ...nearbyList, ...mailList,
  ];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, visibleList.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && visibleList[focusedIdx]) { setDetail(visibleList[focusedIdx]); setShowHours(false); }
    else if (e.key === 'Escape') { onClose(); }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const handleSelect = () => {
    if (!detail) return;
    onSelect(detail);
    onClose();
  };

  const handleSetDefault = () => {
    if (!detail) return;
    onSetDefault?.(detail);
    setDefaultSet(true);
  };

  if (!isOpen) return null;

  const isMail = detail?.hours?.mon === '24/7 service';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1200 }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Select Pharmacy"
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 720,
          background: BG, zIndex: 1201, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.45)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${COL_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: T_PRI, fontWeight: 700, fontSize: 16 }}>💊 Select Pharmacy</div>
            <div style={{ color: T_MUT, fontSize: 12, marginTop: 2 }}>Search and select a pharmacy for this prescription</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T_MUT, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}>✕</button>
        </div>

        {/* ── Body: two columns ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Left Column ── */}
          <div style={{ width: 360, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${COL_BORDER}`, overflow: 'hidden', flexShrink: 0 }}>

            {/* Search */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COL_BORDER}`, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T_MUT, fontSize: 14, pointerEvents: 'none' }}>🔍</span>
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search pharmacies…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: 8, padding: '9px 12px 9px 34px',
                    color: T_PRI, fontSize: 13, outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
            </div>

            {/* List */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
              {filtered !== null ? (
                /* ── Search results ── */
                filtered.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36 }}>🔍</div>
                    <div style={{ color: T_PRI, fontWeight: 600, fontSize: 14, marginTop: 10 }}>No pharmacies found</div>
                    <div style={{ color: T_MUT, fontSize: 12, marginTop: 4 }}>Try searching by name, ZIP code, or city.</div>
                  </div>
                ) : (
                  <>
                    <SectionHeader label={`Results (${filtered.length})`} />
                    {filtered.map((ph, i) => (
                      <PharmItem key={ph.id} ph={ph} focused={focusedIdx === i} selected={detail?.id === ph.id}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }} />
                    ))}
                  </>
                )
              ) : (
                /* ── Categorised ── */
                <>
                  {recentList.length > 0 && (
                    <>
                      <SectionHeader label="Recently Used" />
                      {recentList.map(ph => <PharmItem key={ph.id} ph={ph} focused={false} selected={detail?.id === ph.id}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }} />)}
                    </>
                  )}
                  {favList.length > 0 && (
                    <>
                      <SectionHeader label="Favorites" />
                      {favList.map(ph => <PharmItem key={ph.id} ph={ph} focused={false} selected={detail?.id === ph.id}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }} />)}
                    </>
                  )}
                  {nearbyList.length > 0 && (
                    <>
                      <SectionHeader label="Pharmacies" />
                      {nearbyList.map(ph => <PharmItem key={ph.id} ph={ph} focused={false} selected={detail?.id === ph.id}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }} />)}
                    </>
                  )}
                  {mailList.length > 0 && (
                    <>
                      <SectionHeader label="Mail-Order Pharmacies" />
                      {mailList.map(ph => <PharmItem key={ph.id} ph={ph} focused={false} selected={detail?.id === ph.id}
                        onClick={() => { setDetail(ph); setShowHours(false); setDefaultSet(false); }} />)}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!detail ? (
              /* Empty state */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 36, textAlign: 'center' }}>
                <div style={{ fontSize: 52, opacity: 0.4 }}>💊</div>
                <div style={{ color: T_PRI, fontWeight: 600, fontSize: 15 }}>Select a pharmacy</div>
                <div style={{ color: T_MUT, fontSize: 13, maxWidth: 220, lineHeight: 1.6 }}>
                  Pick a pharmacy from the list to view details and use it for this prescription.
                </div>
              </div>
            ) : (
              <>
                {/* Detail header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${COL_BORDER}`, flexShrink: 0 }}>
                  <div style={{ color: T_PRI, fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>{detail.name}</div>
                  {(detail.npi || detail.ncpdp) && (
                    <div style={{ color: T_MUT, fontSize: 11.5, marginTop: 4, letterSpacing: '0.2px' }}>
                      {detail.npi && `NPI: ${detail.npi}`}
                      {detail.npi && detail.ncpdp && '  ·  '}
                      {detail.ncpdp && `NCPDP: ${detail.ncpdp}`}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {detail.capabilities.erx        && <Badge type="erx"  />}
                    {detail.capabilities.epcs       && <Badge type="epcs" />}
                    {detail.open24h                 && <Badge type="h24"  />}
                    {detail.capabilities.mailOrder  && <Badge type="mail" />}
                  </div>
                </div>

                {/* Detail body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

                  {/* Address */}
                  <Section label="Address">
                    <div style={{ color: T_PRI, fontSize: 13, lineHeight: 1.7 }}>
                      {detail.address1}
                      {detail.address2 && `, ${detail.address2}`}
                      <br />
                      {detail.city}{detail.state ? `, ${detail.state}` : ''} {detail.zip}
                    </div>
                    {detail.address1 !== 'On-site' && detail.zip && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(`${detail.address1}, ${detail.city}, ${detail.state} ${detail.zip}`)}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: 6, color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}
                      >
                        📍 Open in Maps →
                      </a>
                    )}
                  </Section>

                  {/* Contact */}
                  {(detail.phone || detail.fax) && (
                    <Section label="Contact">
                      <ContactRow icon="📞" label="Phone" value={detail.phone}
                        onCopy={() => copy(detail.phone, 'phone')} isCopied={copied === 'phone'} />
                      <ContactRow icon="📠" label="Fax"   value={detail.fax}
                        onCopy={() => copy(detail.fax, 'fax')} isCopied={copied === 'fax'} />
                    </Section>
                  )}

                  {/* Capabilities */}
                  <Section label="Capabilities">
                    <CapRow label="eRx (Electronic Prescribing)"             active={detail.capabilities.erx} />
                    <CapRow label="EPCS (Controlled Substance e-Prescribing)" active={detail.capabilities.epcs} />
                    <CapRow label="Accepts Controlled Substances"             active={detail.capabilities.controlledSubstances} />
                    <CapRow label="Mail-Order Service"                        active={detail.capabilities.mailOrder} />
                  </Section>

                  {/* Hours */}
                  <Section label="Hours">
                    {isMail ? (
                      <div style={{ color: T_SEC, fontSize: 13 }}>Mail-order — orders processed 24 / 7</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: T_PRI, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600 }}>Today ({DAY_LABEL[TODAY]}): </span>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>{detail.hours[TODAY] || 'Closed'}</span>
                        </div>
                        <button
                          onClick={() => setShowHours(v => !v)}
                          style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 6 }}
                        >
                          {showHours ? '▲ Hide full schedule' : '▼ Show full schedule'}
                        </button>
                        {showHours && (
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 12px', marginTop: 4 }}>
                            {DAY_ORDER.map((d, i) => (
                              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 6 ? `1px solid ${COL_BORDER}` : 'none' }}>
                                <span style={{ color: d === TODAY ? T_PRI : T_SEC, fontSize: 12, fontWeight: d === TODAY ? 700 : 400 }}>{DAY_LABEL[d]}</span>
                                <span style={{ color: d === TODAY ? '#4ade80' : T_SEC, fontSize: 12, fontWeight: d === TODAY ? 700 : 400 }}>{detail.hours[d] || 'Closed'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </Section>
                </div>

                {/* Action buttons */}
                <div style={{ padding: '14px 20px', borderTop: `1px solid ${COL_BORDER}`, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={handleSelect}
                    style={{ width: '100%', height: 44, background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.background = ACCENT_HOV; }}
                    onMouseOut={e => { e.currentTarget.style.background = ACCENT; }}
                  >
                    Use This Pharmacy
                  </button>
                  <button
                    onClick={handleSetDefault}
                    style={{ width: '100%', height: 40, background: 'transparent', color: defaultSet ? '#4ade80' : T_PRI, border: `1px solid ${defaultSet ? '#4ade80' : 'rgba(255,255,255,0.20)'}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseOver={e => { if (!defaultSet) e.currentTarget.style.background = ITEM_HOV; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {defaultSet ? '✓ Set as Default' : '⭐ Set as Default Pharmacy'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
