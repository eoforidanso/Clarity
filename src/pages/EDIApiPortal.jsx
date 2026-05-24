import { useState, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────
const BASE_URL = 'https://api.clarity-ehr.com/edi/v1';

const TIERS = [
  { name: 'Demo',       key: 'ceh_demo_sk_...', daily: 100,      badge: '#6b7280', audiences: ['Try it free'],           price: 'Free' },
  { name: 'Starter',   key: 'ceh_live_sk_...', daily: 1000,     badge: '#3b82f6', audiences: ['Small practices'],       price: '$49/mo' },
  { name: 'Pro',       key: 'ceh_pro_sk_...',  daily: 10000,    badge: '#8b5cf6', audiences: ['Billing companies'],     price: '$299/mo' },
  { name: 'Enterprise',key: 'ceh_ent_sk_...', daily: '∞',       badge: '#059669', audiences: ['EHRs · Telehealth'],     price: 'Custom' },
];

const API_KEYS_MOCK = [
  { id: 'k1', label: 'Production — Claims Ingestion', key: 'ceh_live_sk_4f8a2b1c9d0e', tier: 'Pro',       scopes: ['claims:write','eligibility:read','era:read'], created: '2025-01-10', calls: 8421, status: 'active' },
  { id: 'k2', label: 'Telehealth App Integration',    key: 'ceh_live_sk_7e3d6f2a1c5b', tier: 'Starter',   scopes: ['eligibility:read','claims:write'],             created: '2025-02-03', calls: 1203, status: 'active' },
  { id: 'k3', label: 'Dev / Sandbox Testing',         key: 'ceh_demo_sk_0a9c7d5e3b4f', tier: 'Demo',      scopes: ['*:read'],                                      created: '2025-03-15', calls: 57,   status: 'active' },
  { id: 'k4', label: 'Legacy Billing System',         key: 'ceh_live_sk_2d4b6f8a0c9e', tier: 'Starter',   scopes: ['claims:write','era:read'],                     created: '2024-11-22', calls: 0,    status: 'revoked' },
];

const ENDPOINTS = [
  {
    group: 'Claims',
    items: [
      { method: 'POST', path: '/claims', summary: 'Submit 837P / 837I claim', scopes: ['claims:write'],
        body: `{\n  "transaction_type": "837P",\n  "npi": "1234567890",\n  "payer_id": "BCBS001",\n  "patient": { "member_id": "XYZ9876", "dob": "1985-04-12" },\n  "service_lines": [\n    { "cpt": "99213", "date": "2025-06-01", "units": 1, "charge": 150.00 }\n  ]\n}`,
        response: `{\n  "claim_id": "CLM-20250601-00412",\n  "status": "accepted",\n  "clearinghouse_ref": "CLH-88291",\n  "estimated_payment": 118.50\n}` },
      { method: 'GET',  path: '/claims/{id}', summary: 'Get real-time claim status (276/277)', scopes: ['claims:read'],
        body: null,
        response: `{\n  "claim_id": "CLM-20250601-00412",\n  "status": "approved",\n  "payer_status": "finalized",\n  "paid_amount": 118.50,\n  "check_date": "2025-06-10"\n}` },
      { method: 'POST', path: '/claims/batch', summary: 'Submit up to 500 claims in one call', scopes: ['claims:write'],
        body: `{\n  "claims": [ { "transaction_type": "837P", ... }, ... ],\n  "callback_url": "https://your.app/webhook"\n}`,
        response: `{\n  "batch_id": "BAT-20250601-0028",\n  "submitted": 500,\n  "accepted": 498,\n  "rejected": 2\n}` },
      { method: 'POST', path: '/claims/{id}/appeal', summary: 'File an automated denial appeal', scopes: ['claims:write'],
        body: `{\n  "denial_code": "CO-97",\n  "appeal_type": "first_level",\n  "clinical_notes": "Medical necessity supported by ICD-10 code F41.1"\n}`,
        response: `{\n  "appeal_id": "APL-20250601-004",\n  "status": "submitted",\n  "due_date": "2025-07-01"\n}` },
    ]
  },
  {
    group: 'Eligibility',
    items: [
      { method: 'POST', path: '/eligibility', summary: 'Real-time 270 eligibility inquiry → 271 response', scopes: ['eligibility:read'],
        body: `{\n  "payer_id": "AETNA001",\n  "npi": "1234567890",\n  "patient": { "member_id": "AET-445566", "dob": "1990-08-23", "last_name": "Smith" },\n  "service_date": "2025-06-15"\n}`,
        response: `{\n  "eligible": true,\n  "plan_name": "Aetna PPO Gold",\n  "deductible_remaining": 250.00,\n  "copay": 30,\n  "out_of_pocket_max": 1500,\n  "benefits": [ { "type": "office_visit", "covered": true } ]\n}` },
      { method: 'GET',  path: '/eligibility/{id}', summary: 'Retrieve a cached 271 response', scopes: ['eligibility:read'],
        body: null,
        response: `{\n  "inquiry_id": "ELG-20250601-0018",\n  "created_at": "2025-06-01T14:22:00Z",\n  "eligible": true,\n  "payer_id": "AETNA001"\n}` },
    ]
  },
  {
    group: 'Remittance / ERA',
    items: [
      { method: 'GET', path: '/remittance', summary: 'List 835 ERA files (paginated)', scopes: ['era:read'],
        body: null,
        response: `{\n  "eras": [\n    { "era_id": "ERA-2025-06-001", "payer": "Blue Cross", "amount": 12400.00, "received_at": "2025-06-09" }\n  ],\n  "page": 1,\n  "total": 84\n}` },
      { method: 'GET', path: '/remittance/{id}', summary: 'Get full 835 ERA with CAS/PLB detail', scopes: ['era:read'],
        body: null,
        response: `{\n  "era_id": "ERA-2025-06-001",\n  "check_number": "CK-889910",\n  "payment_date": "2025-06-09",\n  "service_lines": [ { "claim_id": "CLM-...", "paid": 118.50, "adjustments": [...] } ]\n}` },
    ]
  },
  {
    group: 'Acknowledgments',
    items: [
      { method: 'GET', path: '/acknowledgments', summary: 'List 999 / 277CA acknowledgments', scopes: ['ack:read'],
        body: null,
        response: `{\n  "acks": [\n    { "ack_id": "ACK-20250601-001", "type": "999", "status": "accepted", "claim_count": 12 }\n  ]\n}` },
    ]
  },
  {
    group: 'Routing',
    items: [
      { method: 'POST', path: '/routing/evaluate', summary: 'Evaluate routing rules for a transaction', scopes: ['routing:read'],
        body: `{\n  "transaction_type": "837P",\n  "payer_id": "BCBS001",\n  "npi": "1234567890"\n}`,
        response: `{\n  "matched_rule": "BCBS-Default-Route",\n  "destination": "as2://bcbs.clearinghouse.net:4080",\n  "protocol": "AS2",\n  "encryption": "AES-256"\n}` },
    ]
  },
  {
    group: 'Status',
    items: [
      { method: 'GET', path: '/status', summary: 'Clearinghouse health check', scopes: [],
        body: null,
        response: `{\n  "status": "operational",\n  "uptime_30d": "99.97%",\n  "avg_latency_ms": 142,\n  "trading_partners": 1200,\n  "last_incident": null\n}` },
      { method: 'GET', path: '/payers', summary: 'List supported payers with IDs', scopes: ['payers:read'],
        body: null,
        response: `{\n  "payers": [\n    { "id": "BCBS001", "name": "Blue Cross Blue Shield", "supports": ["837P","837I","270","835"] }\n  ],\n  "total": 1200\n}` },
    ]
  },
];

const WEBHOOK_EVENTS = [
  { event: 'claim.submitted',     description: 'Fires when a claim is successfully received by the clearinghouse',     tier: 'Starter' },
  { event: 'claim.acknowledged',  description: '999/277CA acknowledgment returned from payer',                         tier: 'Starter' },
  { event: 'claim.approved',      description: 'Claim approved — payment amount and check date available',             tier: 'Pro' },
  { event: 'claim.denied',        description: 'Claim denied — includes denial code and payer reason',                 tier: 'Pro' },
  { event: 'era.received',        description: '835 ERA downloaded from payer and parsed',                             tier: 'Starter' },
  { event: 'era.auto_posted',     description: 'ERA auto-posted with zero variance',                                   tier: 'Pro' },
  { event: 'eligibility.response','description': '271 response available for an eligibility inquiry',                  tier: 'Starter' },
  { event: 'appeal.submitted',    description: 'Denial appeal submitted to payer',                                     tier: 'Pro' },
];

const WEBHOOKS_MOCK = [
  { id: 'wh1', url: 'https://billing.acme.com/webhooks/clarity', events: ['claim.submitted','era.received','claim.denied'], status: 'active', last_delivery: '2025-06-09T11:42:00Z', success_rate: '99.2%' },
  { id: 'wh2', url: 'https://teleapp.example.com/edi-events',    events: ['eligibility.response','claim.submitted'],        status: 'active', last_delivery: '2025-06-09T09:15:00Z', success_rate: '100%' },
];

const CODE_EXAMPLES = {
  curl: (ep) => `curl -X ${ep.method} '${BASE_URL}${ep.path.replace('{id}','CLM-20250601-00412')}' \\
  -H 'X-API-Key: ceh_live_sk_YOUR_KEY' \\
  -H 'Content-Type: application/json'${ep.body ? ` \\
  -d '${ep.body}'` : ''}`,

  javascript: (ep) => `const response = await fetch('${BASE_URL}${ep.path.replace('{id}','CLM-20250601-00412')}', {
  method: '${ep.method}',
  headers: {
    'X-API-Key': 'ceh_live_sk_YOUR_KEY',
    'Content-Type': 'application/json',
  },${ep.body ? `\n  body: JSON.stringify(${ep.body}),` : ''}
});
const data = await response.json();
console.log(data);`,

  python: (ep) => `import requests

url = "${BASE_URL}${ep.path.replace('{id}','CLM-20250601-00412')}"
headers = {
    "X-API-Key": "ceh_live_sk_YOUR_KEY",
    "Content-Type": "application/json",
}
${ep.body ? `payload = ${ep.body}\nresponse = requests.${ep.method.toLowerCase()}(url, headers=headers, json=payload)` : `response = requests.${ep.method.toLowerCase()}(url, headers=headers)`}
print(response.json())`,
};

const AUDIENCE_CARDS = [
  {
    icon: '🏥',
    title: 'Other EHRs',
    color: '#3b82f6',
    points: [
      'Cross-EHR claim submission via unified API',
      'Shared patient eligibility cache',
      'Standardized FHIR + EDI interop layer',
      'Real-time claim status federation',
    ],
  },
  {
    icon: '🧾',
    title: 'Billing Companies',
    color: '#8b5cf6',
    points: [
      'Batch 837P/I submission (up to 500/call)',
      'Automated 835 ERA retrieval & GL posting',
      'Denial management + auto-appeal API',
      'Multi-practice NPI management',
    ],
  },
  {
    icon: '📱',
    title: 'Telehealth Apps',
    color: '#06b6d4',
    points: [
      'Pre-visit eligibility check in < 2s',
      'Auto-generate claim after video session',
      'Webhook on ERA receipt → instant revenue',
      'HIPAA BAA + encrypted transport',
    ],
  },
  {
    icon: '🤖',
    title: 'AI Coding Tools',
    color: '#f59e0b',
    points: [
      'Submit AI-coded claims for clearinghouse scrub',
      'Receive denial codes to retrain models',
      'Routing evaluation per payer in real time',
      'Bulk historical ERA data for ML pipelines',
    ],
  },
];

const METHOD_COLORS = {
  GET:    { bg: '#dcfce7', color: '#166534' },
  POST:   { bg: '#dbeafe', color: '#1e40af' },
  PUT:    { bg: '#fef9c3', color: '#854d0e' },
  DELETE: { bg: '#fee2e2', color: '#991b1b' },
  PATCH:  { bg: '#f3e8ff', color: '#6b21a8' },
};

const TIER_COLORS = {
  Demo:       { bg: '#f1f5f9', color: '#475569' },
  Starter:    { bg: '#dbeafe', color: '#1e40af' },
  Pro:        { bg: '#ede9fe', color: '#5b21b6' },
  Enterprise: { bg: '#dcfce7', color: '#14532d' },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function EDIApiPortal() {
  const [tab, setTab]                   = useState('overview');
  const [expandedGroup, setExpandedGroup] = useState('Claims');
  const [selectedEp, setSelectedEp]     = useState(null);
  const [codeLang, setCodeLang]         = useState('curl');
  const [keys, setKeys]                 = useState(API_KEYS_MOCK);
  const [webhooks, setWebhooks]         = useState(WEBHOOKS_MOCK);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWHModal, setShowWHModal]   = useState(false);
  const [newKeyLabel, setNewKeyLabel]   = useState('');
  const [newKeyTier, setNewKeyTier]     = useState('Starter');
  const [newKeyScopes, setNewKeyScopes] = useState(['claims:write','eligibility:read']);
  const [newWHUrl, setNewWHUrl]         = useState('');
  const [newWHEvents, setNewWHEvents]   = useState(['claim.submitted','era.received']);
  const [revealedKey, setRevealedKey]   = useState(null);
  const [searchEp, setSearchEp]         = useState('');
  // playground
  const [pgEndpoint, setPgEndpoint]     = useState(ENDPOINTS[0].items[0]);
  const [pgKey, setPgKey]               = useState('ceh_demo_sk_0a9c7d5e3b4f');
  const [pgBody, setPgBody]             = useState(ENDPOINTS[0].items[0].body || '');
  const [pgResult, setPgResult]         = useState(null);
  const [pgLoading, setPgLoading]       = useState(false);

  const allEndpoints = ENDPOINTS.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));

  const filteredEndpoints = searchEp
    ? ENDPOINTS.map(g => ({
        ...g,
        items: g.items.filter(e =>
          e.path.toLowerCase().includes(searchEp.toLowerCase()) ||
          e.summary.toLowerCase().includes(searchEp.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : ENDPOINTS;

  function generateKey() {
    const rand = () => Math.random().toString(36).slice(2, 10);
    const prefix = newKeyTier === 'Demo' ? 'ceh_demo_sk_' : newKeyTier === 'Enterprise' ? 'ceh_ent_sk_' : newKeyTier === 'Pro' ? 'ceh_pro_sk_' : 'ceh_live_sk_';
    const newK = {
      id: 'k' + Date.now(),
      label: newKeyLabel || 'New API Key',
      key: prefix + rand() + rand(),
      tier: newKeyTier,
      scopes: newKeyScopes,
      created: new Date().toISOString().slice(0, 10),
      calls: 0,
      status: 'active',
    };
    setKeys(prev => [newK, ...prev]);
    setRevealedKey(newK.id);
    setShowKeyModal(false);
    setNewKeyLabel('');
  }

  function revokeKey(id) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
  }

  function addWebhook() {
    const newWH = {
      id: 'wh' + Date.now(),
      url: newWHUrl,
      events: newWHEvents,
      status: 'active',
      last_delivery: null,
      success_rate: 'n/a',
    };
    setWebhooks(prev => [newWH, ...prev]);
    setShowWHModal(false);
    setNewWHUrl('');
  }

  const runPlayground = useCallback(() => {
    setPgLoading(true);
    setPgResult(null);
    setTimeout(() => {
      setPgResult({
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'req_' + Math.random().toString(36).slice(2, 10) },
        body: pgEndpoint.response,
      });
      setPgLoading(false);
    }, 800);
  }, [pgEndpoint]);

  // ── Billing Engine state ──────────────────────────────────────────────────
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [usageAlerts, setUsageAlerts] = useState(true);
  const BILLING_USAGE = [
    { category: 'Claims Submit',   calls: 6840, limit: 10000, color: '#3b82f6' },
    { category: 'Eligibility',     calls: 3210, limit: 10000, color: '#8b5cf6' },
    { category: 'ERA / Remittance',calls: 1440, limit: 10000, color: '#06b6d4' },
    { category: 'Routing',         calls:  320, limit: 10000, color: '#f59e0b' },
    { category: 'Acknowledgments', calls:  280, limit: 10000, color: '#10b981' },
    { category: 'Status / Payers', calls:  180, limit: 10000, color: '#6b7280' },
  ];
  const totalCalls = BILLING_USAGE.reduce((s, u) => s + u.calls, 0);
  const INVOICES = [
    { id: 'INV-2026-05', period: 'May 2026',   amount: 299, status: 'current',  calls: 12270 },
    { id: 'INV-2026-04', period: 'Apr 2026',   amount: 299, status: 'paid',     calls: 11840 },
    { id: 'INV-2026-03', period: 'Mar 2026',   amount: 299, status: 'paid',     calls: 10912 },
    { id: 'INV-2026-02', period: 'Feb 2026',   amount: 299, status: 'paid',     calls:  9440 },
    { id: 'INV-2026-01', period: 'Jan 2026',   amount: 149, status: 'paid',     calls:  4210 },
  ];

  // ── Partner Onboarding state ──────────────────────────────────────────────
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardDone, setOnboardDone] = useState(false);
  const [onboardData, setOnboardData] = useState({
    orgName: '', npi: '', taxId: '', contactName: '', contactEmail: '',
    integrationType: '', transactions: [], webhookUrl: '',
    baaAccepted: false, testPassed: false,
  });
  const [onboardTestRunning, setOnboardTestRunning] = useState(false);
  const [onboardTestResult, setOnboardTestResult] = useState(null);
  const [generatedOnboardKey, setGeneratedOnboardKey] = useState('');

  function runOnboardTest() {
    setOnboardTestRunning(true);
    setOnboardTestResult(null);
    setTimeout(() => {
      setOnboardTestResult('pass');
      setOnboardData(d => ({ ...d, testPassed: true }));
      setOnboardTestRunning(false);
    }, 2200);
  }

  function startOnboarding() {
    setOnboardStep(1);
    setOnboardDone(false);
    setOnboardTestResult(null);
    const rand = () => Math.random().toString(36).slice(2, 10);
    setGeneratedOnboardKey('ceh_live_sk_' + rand() + rand());
  }

  const ONBOARD_STEPS = [
    { n: 1, label: 'Organization' },
    { n: 2, label: 'Use Case' },
    { n: 3, label: 'Transactions' },
    { n: 4, label: 'API Setup' },
    { n: 5, label: 'BAA / Legal' },
    { n: 6, label: 'Test Connection' },
    { n: 7, label: 'Go Live' },
  ];

  // ── Payer Simulator state ─────────────────────────────────────────────────
  const SIM_PAYERS = [
    { id: 'BCBS001', name: 'Blue Cross Blue Shield', color: '#1e40af' },
    { id: 'AETNA001', name: 'Aetna',                 color: '#c2410c' },
    { id: 'UHC001',  name: 'UnitedHealthcare',       color: '#15803d' },
    { id: 'CIGNA001',name: 'Cigna',                  color: '#0e7490' },
    { id: 'ANTHEM01',name: 'Anthem',                 color: '#6d28d9' },
    { id: 'MEDICARE',name: 'Medicare Part B',        color: '#b91c1c' },
  ];
  const SIM_TRANSACTIONS = [
    { id: '837P', label: '837P — Professional Claim',    icon: '📋' },
    { id: '270',  label: '270/271 — Eligibility Check',  icon: '🔍' },
    { id: '835',  label: '835 — ERA Remittance',         icon: '💰' },
    { id: '999',  label: '999 — Acknowledgment',         icon: '✅' },
  ];
  const SIM_SCENARIOS = {
    '837P': [
      { id: 'approved',    label: 'Approved — Full payment',       color: '#059669' },
      { id: 'partial',     label: 'Partial pay — CO-45 adj',       color: '#d97706' },
      { id: 'denied_97',   label: 'Denied — CO-97 (auth required)',color: '#dc2626' },
      { id: 'denied_4',    label: 'Denied — CO-4 (invalid code)',  color: '#dc2626' },
      { id: 'denied_16',   label: 'Denied — CO-16 (missing info)', color: '#dc2626' },
      { id: 'pended',      label: 'Pended — additional review',    color: '#6b7280' },
    ],
    '270': [
      { id: 'active',       label: 'Active — full benefits',        color: '#059669' },
      { id: 'active_ded',   label: 'Active — deductible not met',   color: '#d97706' },
      { id: 'terminated',   label: 'Terminated — coverage ended',   color: '#dc2626' },
      { id: 'not_found',    label: 'Member not found',              color: '#dc2626' },
      { id: 'medicaid',     label: 'Medicaid — coord. of benefits', color: '#8b5cf6' },
    ],
    '835': [
      { id: 'era_full',     label: 'ERA — full payment batch',      color: '#059669' },
      { id: 'era_partial',  label: 'ERA — mixed paid / denied',     color: '#d97706' },
      { id: 'era_void',     label: 'ERA — voided payment',          color: '#dc2626' },
    ],
    '999': [
      { id: 'accepted',     label: 'Accepted — TA1 + 999 A',        color: '#059669' },
      { id: 'rejected',     label: 'Rejected — 999 R (syntax err)', color: '#dc2626' },
    ],
  };
  const SIM_RESPONSES = {
    'approved':   `ISA*00*          *00*          *ZZ*CLARITY        *ZZ*BCBS           *260601*1142*^*00501*000000001*0*P*:\nGS*HP*CLARITY*BCBS001*20260601*1142*1*X*005010X221A1\n\n// Parsed 835 ERA:\n{\n  "claim_id": "CLM-20260601-00412",\n  "status": "approved",\n  "payer_status": "finalized",\n  "allowed_amount": 148.00,\n  "paid_amount": 118.40,\n  "patient_responsibility": 29.60,\n  "check_number": "CK-991200",\n  "check_date": "2026-06-10",\n  "adjustments": [\n    { "group": "CO", "reason": "45", "amount": 29.60 }\n  ]\n}`,
    'partial':    `// 835 ERA — Partial Payment (CO-45 contractual adjustment):\n{\n  "claim_id": "CLM-20260601-00412",\n  "status": "partial",\n  "billed": 185.00,\n  "allowed": 148.00,\n  "paid_amount": 89.00,\n  "patient_responsibility": 59.00,\n  "adjustments": [\n    { "group": "CO", "reason": "45", "amount": 37.00, "desc": "Contractual obligation" },\n    { "group": "PR", "reason": "1",  "amount": 22.00, "desc": "Deductible" }\n  ]\n}`,
    'denied_97':  `// 835 ERA — Denial CO-97 (Authorization required):\n{\n  "claim_id": "CLM-20260601-00412",\n  "status": "denied",\n  "paid_amount": 0,\n  "denial_codes": [\n    {\n      "group": "CO", "reason": "97",\n      "desc": "Payment adjusted because proposed coverage is not a covered benefit",\n      "action": "Submit prior authorization PA-2026-00881 before resubmission"\n    }\n  ],\n  "appeal_deadline": "2026-09-01"\n}`,
    'denied_4':   `// 835 ERA — Denial CO-4 (Service/procedure code invalid):\n{\n  "claim_id": "CLM-20260601-00413",\n  "status": "denied",\n  "paid_amount": 0,\n  "denial_codes": [\n    {\n      "group": "CO", "reason": "4",\n      "desc": "Service/procedure code not covered or invalid for the date of service",\n      "action": "Verify CPT code validity with payer fee schedule"\n    }\n  ]\n}`,
    'denied_16':  `// 835 ERA — Denial CO-16 (Missing/invalid information):\n{\n  "claim_id": "CLM-20260601-00414",\n  "status": "denied",\n  "paid_amount": 0,\n  "denial_codes": [\n    {\n      "group": "CO", "reason": "16",\n      "desc": "Claim/service lacks information which is needed for adjudication",\n      "missing_fields": ["rendering_npi", "place_of_service_code"],\n      "action": "Correct and resubmit with all required fields"\n    }\n  ]\n}`,
    'pended':     `// 277CA — Claim Status: Pended\n{\n  "claim_id": "CLM-20260601-00415",\n  "status": "pended",\n  "payer_status_code": "4",\n  "payer_status_desc": "Pending — additional review required",\n  "expected_adjudication": "2026-06-25",\n  "contact": "BCBS Provider Services: 1-800-676-2583"\n}`,
    'active':     `// 271 — Eligibility Response: Active Coverage\n{\n  "inquiry_id": "ELG-20260601-0018",\n  "eligible": true,\n  "plan_name": "BCBS PPO Gold",\n  "effective_date": "2026-01-01",\n  "termination_date": "2026-12-31",\n  "group_number": "GRP-441200",\n  "deductible": { "individual": 1500, "met": 1250, "remaining": 250 },\n  "out_of_pocket_max": { "individual": 4000, "met": 1800, "remaining": 2200 },\n  "copay": 30,\n  "coinsurance": 0.20,\n  "benefits": [\n    { "type": "mental_health_outpatient", "covered": true, "auth_required": false },\n    { "type": "teletherapy", "covered": true, "modifier_required": "95" }\n  ]\n}`,
    'active_ded': `// 271 — Active but deductible not yet met:\n{\n  "eligible": true,\n  "plan_name": "BCBS Bronze HSA",\n  "deductible": { "individual": 3000, "met": 420, "remaining": 2580 },\n  "patient_owes_today": 148.00,\n  "note": "Patient must pay full allowed amount until deductible is met"\n}`,
    'terminated': `// 271 — Coverage Terminated:\n{\n  "eligible": false,\n  "termination_date": "2026-04-30",\n  "reason": "Coverage ended — employer plan change",\n  "recommendation": "Verify patient has obtained new coverage before rendering services"\n}`,
    'not_found':  `// 271 — Member Not Found:\n{\n  "eligible": false,\n  "error": "AAA_72",\n  "desc": "Subscriber/insured not found",\n  "recommendation": "Verify member ID, DOB, and last name with patient insurance card"\n}`,
    'medicaid':   `// 271 — Medicaid coordination:\n{\n  "eligible": true,\n  "plan_type": "Medicaid",\n  "coordination": { "order": 2, "primary_payer": "BCBS001" },\n  "copay": 0,\n  "note": "Bill primary payer first; Medicaid is payer of last resort"\n}`,
    'era_full':   `// 835 ERA — Full payment batch (6 claims):\n{\n  "era_id": "ERA-2026-06-001",\n  "check_number": "CK-889910",\n  "payment_date": "2026-06-09",\n  "total_paid": 12400.00,\n  "claim_count": 6,\n  "all_paid": true,\n  "claims": [\n    { "claim_id": "CLM-001", "paid": 118.40 },\n    { "claim_id": "CLM-002", "paid": 210.00 },\n    { "claim_id": "CLM-003", "paid": 140.00 }\n  ]\n}`,
    'era_partial': `// 835 ERA — Mixed batch (4 paid, 2 denied):\n{\n  "era_id": "ERA-2026-06-002",\n  "total_paid": 6840.00,\n  "paid_count": 4,\n  "denied_count": 2,\n  "variance_claims": [\n    { "claim_id": "CLM-008", "status": "denied", "code": "CO-97" }\n  ]\n}`,
    'era_void':   `// 835 ERA — Voided payment:\n{\n  "era_id": "ERA-2026-06-003",\n  "type": "void",\n  "original_check": "CK-889100",\n  "reason": "Check issued in error — re-issued as CK-889215",\n  "action": "Reverse GL posting and await replacement ERA"\n}`,
    'accepted':   `// 999 Functional Acknowledgment — Accepted:\n{\n  "ack_id": "ACK-20260601-001",\n  "type": "999",\n  "interchange_control": "000000001",\n  "status": "A",\n  "desc": "Accepted — all transaction sets valid",\n  "accepted_count": 12,\n  "rejected_count": 0\n}`,
    'rejected':   `// 999 Functional Acknowledgment — Rejected:\n{\n  "ack_id": "ACK-20260601-002",\n  "type": "999",\n  "status": "R",\n  "desc": "Rejected — syntax error in transaction set",\n  "error_segments": [\n    { "segment": "CLM", "position": 14, "error": "I6", "desc": "Invalid value in CLM05-2" }\n  ],\n  "action": "Correct syntax error and resubmit full interchange"\n}`,
  };
  const [simPayer, setSimPayer] = useState('BCBS001');
  const [simTransaction, setSimTransaction] = useState('837P');
  const [simScenario, setSimScenario] = useState('approved');
  const [simNpi, setSimNpi] = useState('1234567890');
  const [simMemberId, setSimMemberId] = useState('BCB-XYZ-9876');
  const [simCpt, setSimCpt] = useState('99214');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simLog, setSimLog] = useState([]);

  function runSimulation() {
    setSimLoading(true);
    setSimResult(null);
    const steps = [
      '→ Connecting to payer sandbox endpoint…',
      `→ Sending ${simTransaction} transaction…`,
      '→ Payer processing…',
      '→ Receiving adjudication response…',
      '→ Parsing EDI response…',
    ];
    let i = 0;
    setSimLog([]);
    const iv = setInterval(() => {
      if (i < steps.length) {
        setSimLog(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(iv);
        setSimResult(SIM_RESPONSES[simScenario] || '// No response defined for this scenario');
        setSimLoading(false);
      }
    }, 400);
  }

  const TABS = [
    { id: 'overview',   label: '🌐 Overview' },
    { id: 'endpoints',  label: '📋 API Reference' },
    { id: 'keys',       label: '🔑 API Keys' },
    { id: 'webhooks',   label: '🪝 Webhooks' },
    { id: 'playground', label: '🧪 Playground' },
    { id: 'sdks',       label: '📦 SDKs & Code' },
    { id: 'billing',    label: '💰 Billing Engine' },
    { id: 'onboarding', label: '🤝 Partner Onboarding' },
    { id: 'simulator',  label: '🔬 Payer Simulator' },
  ];

  return (
    <div className="fade-in">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🌐 Clarity EDI API
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, margin: 0 }}>
            Expose your clearinghouse to external EHRs, billing companies, telehealth apps & AI tools
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534' }}>EDI API v1</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>HIPAA Compliant</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#5b21b6' }}>REST + Webhooks</span>
        </div>
      </div>

      {/* ── Stat Row ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card row blue fade-in"><div className="stat-icon blue">🔌</div><div className="stat-info"><h3>{allEndpoints.length}</h3><p>EDI Endpoints</p></div></div>
        <div className="stat-card row green fade-in"><div className="stat-icon green">🤝</div><div className="stat-info"><h3>1,200</h3><p>Trading Partners</p></div></div>
        <div className="stat-card row teal fade-in"><div className="stat-icon teal">⚡</div><div className="stat-info"><h3>&lt; 2s</h3><p>Eligibility SLA</p></div></div>
        <div className="stat-card row yellow fade-in"><div className="stat-icon yellow">📈</div><div className="stat-info"><h3>99.97%</h3><p>Uptime 30d</p></div></div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border-light)', marginBottom: 20, overflowX: 'auto', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '9px 18px', border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
              fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ OVERVIEW ═══════════════════════ */}
      {tab === 'overview' && (
        <div>
          {/* Hero */}
          <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ padding: 28, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Build on the Clarity clearinghouse</h2>
              <p style={{ margin: '0 0 18px', color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                The Clarity EDI API gives you programmatic access to the full clearinghouse stack —
                claim submission, real-time eligibility, ERA retrieval, routing resolution, and automated appeal filing.
                Integrations ship in hours, not months.
              </p>
              <div style={{ fontFamily: 'monospace', background: '#0f172a', padding: '12px 16px', borderRadius: 8, fontSize: 13, color: '#4ade80', display: 'inline-block' }}>
                Base URL: <span style={{ color: '#f8fafc' }}>{BASE_URL}</span>
              </div>
            </div>
          </div>

          {/* Audience Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {AUDIENCE_CARDS.map(ac => (
              <div key={ac.title} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{ac.icon}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, color: ac.color }}>{ac.title}</h3>
                <ul style={{ margin: 0, padding: '0 0 0 14px', listStyle: 'disc' }}>
                  {ac.points.map(p => (
                    <li key={p} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.5 }}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Pricing tiers */}
          <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>💳 API Tiers</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
              {TIERS.map((t, i) => (
                <div key={t.name} style={{ padding: 20, borderRight: i < TIERS.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>{t.price}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {typeof t.daily === 'number' ? t.daily.toLocaleString() : t.daily} req/day
                  </div>
                  {t.audiences.map(a => (
                    <span key={a} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${t.badge}20`, color: t.badge, marginRight: 4, marginBottom: 4 }}>{a}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Quick-start */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>⚡ Quick Start</h3>
            </div>
            <div style={{ padding: 20, background: '#1e293b', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
              <div style={{ color: '#94a3b8' }}># 1. Generate an API key in the Keys tab above</div>
              <div style={{ color: '#94a3b8', marginTop: 8 }}># 2. Check clearinghouse health</div>
              <div>curl -H <span style={{ color: '#fbbf24' }}>'X-API-Key: ceh_live_sk_YOUR_KEY'</span> {BASE_URL}/status</div>
              <div style={{ color: '#94a3b8', marginTop: 8 }}># 3. Check patient eligibility</div>
              <div>{`curl -X POST ${BASE_URL}/eligibility \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -H 'X-API-Key: ceh_live_sk_YOUR_KEY' \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -H 'Content-Type: application/json' \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -d '{"payer_id":"BCBS001","patient":{"member_id":"XYZ9876"}}'`}</div>
              <div style={{ color: '#94a3b8', marginTop: 8 }}># 4. Submit a claim</div>
              <div>{`curl -X POST ${BASE_URL}/claims \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -H 'X-API-Key: ceh_live_sk_YOUR_KEY' \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -H 'Content-Type: application/json' \\`}</div>
              <div style={{ paddingLeft: 16 }}>{`  -d @claim_payload.json`}</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ API REFERENCE ═══════════════════════ */}
      {tab === 'endpoints' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input className="form-input" placeholder="Search endpoints — path, description…"
              value={searchEp} onChange={e => setSearchEp(e.target.value)}
              style={{ width: '100%', fontSize: 13 }} />
          </div>

          {filteredEndpoints.map(group => (
            <div key={group.group} className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
              <button onClick={() => setExpandedGroup(expandedGroup === group.group ? null : group.group)}
                style={{
                  width: '100%', padding: '13px 20px', border: 'none', cursor: 'pointer',
                  background: expandedGroup === group.group ? 'var(--primary-light)' : 'var(--bg-white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontWeight: 700, fontSize: 14, color: 'var(--text-primary)',
                }}>
                <span>{group.group} ({group.items.length})</span>
                <span style={{ fontSize: 11 }}>{expandedGroup === group.group ? '▲' : '▼'}</span>
              </button>

              {expandedGroup === group.group && group.items.map((ep, idx) => {
                const epKey = `${group.group}-${idx}`;
                const isOpen = selectedEp === epKey;
                return (
                  <div key={epKey} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ padding: '12px 20px', cursor: 'pointer', background: isOpen ? '#f8fafc' : 'transparent' }}
                      onClick={() => { setSelectedEp(isOpen ? null : epKey); setCodeLang('curl'); }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, fontFamily: 'monospace',
                          background: METHOD_COLORS[ep.method]?.bg, color: METHOD_COLORS[ep.method]?.color }}>
                          {ep.method}
                        </span>
                        <code style={{ fontSize: 13, fontWeight: 700 }}>{BASE_URL}{ep.path}</code>
                        {ep.scopes.map(s => (
                          <span key={s} style={{ padding: '1px 7px', borderRadius: 10, fontSize: 10, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }}>{s}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 58 }}>{ep.summary}</div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                        {/* Lang tabs */}
                        <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', paddingLeft: 40 }}>
                          {['curl','javascript','python'].map(l => (
                            <button key={l} onClick={() => setCodeLang(l)}
                              style={{ padding: '4px 12px', border: '1px solid var(--border-light)', borderRadius: 4, cursor: 'pointer',
                                fontWeight: 700, fontSize: 11,
                                background: codeLang === l ? '#1e293b' : '#fff',
                                color: codeLang === l ? '#fff' : 'var(--text-secondary)' }}>
                              {l}
                            </button>
                          ))}
                          <button onClick={() => { setPgEndpoint(ep); setPgBody(ep.body || ''); setTab('playground'); }}
                            style={{ marginLeft: 'auto', padding: '4px 12px', border: 'none', borderRadius: 4, cursor: 'pointer',
                              fontWeight: 700, fontSize: 11, background: 'var(--primary)', color: '#fff' }}>
                            ▶ Try in Playground
                          </button>
                        </div>

                        {/* Code block */}
                        <div style={{ padding: 14, background: '#1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.7, marginLeft: 40 }}>
                          {CODE_EXAMPLES[codeLang](ep)}
                        </div>

                        {/* Response */}
                        <div style={{ marginTop: 10, marginLeft: 40 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>EXAMPLE RESPONSE</div>
                          <div style={{ padding: 12, background: '#1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#4ade80', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.7 }}>
                            {ep.response}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════ API KEYS ═══════════════════════ */}
      {tab === 'keys' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              API keys authenticate machine-to-machine requests. Keep them secret.
            </div>
            <button className="btn btn-primary" onClick={() => setShowKeyModal(true)}>+ Generate Key</button>
          </div>

          {/* Key cards */}
          {keys.map(k => (
            <div key={k.id} className="card" style={{ marginBottom: 12, padding: 18, opacity: k.status === 'revoked' ? 0.55 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{k.label}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                      background: TIER_COLORS[k.tier]?.bg, color: TIER_COLORS[k.tier]?.color }}>{k.tier}</span>
                    {k.status === 'revoked' && (
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>Revoked</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {revealedKey === k.id ? k.key : k.key.slice(0, 18) + '••••••••••••'}
                    <button onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)}
                      style={{ marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>
                      {revealedKey === k.id ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {k.scopes.map(s => (
                      <span key={s} style={{ padding: '1px 7px', borderRadius: 10, fontSize: 10, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)' }}>{k.calls.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>total calls</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>created {k.created}</div>
                  {k.status === 'active' && (
                    <button onClick={() => revokeKey(k.id)}
                      style={{ marginTop: 8, padding: '4px 10px', border: '1px solid #ef4444', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#ef4444', background: '#fff', fontWeight: 700 }}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Auth info */}
          <div className="card" style={{ overflow: 'hidden', marginTop: 8 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>🔐 Authentication Header</h3>
            </div>
            <div style={{ padding: 16, fontFamily: 'monospace', background: '#1e293b', color: '#e2e8f0', fontSize: 12, lineHeight: 2 }}>
              <div><span style={{ color: '#94a3b8' }}># API Key auth (all endpoints)</span></div>
              <div>X-API-Key: <span style={{ color: '#fbbf24' }}>ceh_live_sk_YOUR_KEY</span></div>
              <div style={{ marginTop: 12 }}><span style={{ color: '#94a3b8' }}># OAuth 2.0 client credentials (machine-to-machine)</span></div>
              <div>{`POST ${BASE_URL.replace('/edi/v1','')} /oauth2/token`}</div>
              <div>{'{'} "grant_type": "client_credentials", "client_id": "...", "client_secret": "..." {'}'}</div>
              <div style={{ color: '#94a3b8', marginTop: 4 }}># Response → access_token (Bearer) valid 1h</div>
            </div>
          </div>

          {/* Generate Key Modal */}
          {showKeyModal && (
            <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
                <div className="modal-header">
                  <h3>Generate API Key</h3>
                  <button onClick={() => setShowKeyModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
                </div>
                <div className="modal-body">
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Key Label</label>
                    <input className="form-input" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="e.g. Production — Billing App" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Tier</label>
                    <select className="form-input" value={newKeyTier} onChange={e => setNewKeyTier(e.target.value)}>
                      {TIERS.map(t => <option key={t.name} value={t.name}>{t.name} — {t.price} ({typeof t.daily === 'number' ? t.daily.toLocaleString() : t.daily} req/day)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Scopes</label>
                    {['claims:write','claims:read','eligibility:read','era:read','ack:read','routing:read','payers:read'].map(s => (
                      <label key={s} style={{ display: 'block', fontSize: 12, marginBottom: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newKeyScopes.includes(s)}
                          onChange={e => setNewKeyScopes(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}
                          style={{ marginRight: 8 }} />
                        <code>{s}</code>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={generateKey} disabled={!newKeyLabel}>Generate Key</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════ WEBHOOKS ═══════════════════════ */}
      {tab === 'webhooks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Receive real-time event notifications to your HTTPS endpoint. We retry failed deliveries up to 5× with exponential backoff.
            </div>
            <button className="btn btn-primary" onClick={() => setShowWHModal(true)}>+ Add Webhook</button>
          </div>

          {/* Active webhooks */}
          {webhooks.map(wh => (
            <div key={wh.id} className="card" style={{ marginBottom: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 8 }}>{wh.url}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {wh.events.map(ev => (
                      <span key={ev} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#166534', fontFamily: 'monospace' }}>{ev}</span>
                    ))}
                  </div>
                  {wh.last_delivery && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Last delivery: {new Date(wh.last_delivery).toLocaleString()}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534' }}>● active</span>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Success: {wh.success_rate}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Event catalogue */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>📋 Webhook Event Catalogue</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Event</th>
                  <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Description</th>
                  <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Min Tier</th>
                </tr>
              </thead>
              <tbody>
                {WEBHOOK_EVENTS.map((ev, i) => (
                  <tr key={ev.event} style={{ borderTop: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : 'var(--bg)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{ev.event}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{ev.description}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: TIER_COLORS[ev.tier]?.bg, color: TIER_COLORS[ev.tier]?.color }}>{ev.tier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Webhook Payload example */}
          <div className="card" style={{ marginTop: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>📨 Example Webhook Payload</h3>
            </div>
            <div style={{ padding: 16, background: '#1e293b', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre' }}>
{`POST https://your.app/webhook/clarity
Content-Type: application/json
X-Clarity-Signature: sha256=abc123...

{
  "event": "era.received",
  "api_version": "v1",
  "timestamp": "2025-06-09T11:42:00Z",
  "data": {
    "era_id": "ERA-2025-06-001",
    "payer": "Blue Cross Blue Shield",
    "check_number": "CK-889910",
    "payment_date": "2025-06-09",
    "total_amount": 12400.00,
    "claim_count": 48
  }
}`}
            </div>
          </div>

          {/* Add Webhook Modal */}
          {showWHModal && (
            <div className="modal-backdrop" onClick={() => setShowWHModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
                <div className="modal-header">
                  <h3>Add Webhook Endpoint</h3>
                  <button onClick={() => setShowWHModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
                </div>
                <div className="modal-body">
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">HTTPS Endpoint URL</label>
                    <input className="form-input" value={newWHUrl} onChange={e => setNewWHUrl(e.target.value)} placeholder="https://your.app/webhooks/clarity" />
                  </div>
                  <div>
                    <label className="form-label">Subscribe to Events</label>
                    {WEBHOOK_EVENTS.map(ev => (
                      <label key={ev.event} style={{ display: 'block', fontSize: 12, marginBottom: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={newWHEvents.includes(ev.event)}
                          onChange={e => setNewWHEvents(prev => e.target.checked ? [...prev, ev.event] : prev.filter(x => x !== ev.event))}
                          style={{ marginRight: 8 }} />
                        <code style={{ color: 'var(--primary)' }}>{ev.event}</code>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{ev.description.slice(0, 50)}…</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowWHModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addWebhook} disabled={!newWHUrl.startsWith('https://')}>Add Webhook</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════ PLAYGROUND ═══════════════════════ */}
      {tab === 'playground' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
          {/* Left panel */}
          <div>
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Select Endpoint</h4>
              {ENDPOINTS.map(g => (
                <div key={g.group} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{g.group}</div>
                  {g.items.map((ep, idx) => (
                    <button key={idx} onClick={() => { setPgEndpoint(ep); setPgBody(ep.body || ''); setPgResult(null); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 3,
                        border: '1px solid var(--border-light)', borderRadius: 5, cursor: 'pointer',
                        background: pgEndpoint === ep ? 'var(--primary-light)' : '#fff',
                        borderColor: pgEndpoint === ep ? 'var(--primary)' : 'var(--border-light)',
                      }}>
                      <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: 'monospace', marginRight: 6,
                        background: METHOD_COLORS[ep.method]?.bg, color: METHOD_COLORS[ep.method]?.color }}>{ep.method}</span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{ep.path}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div>
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 800, fontFamily: 'monospace', marginRight: 8,
                  background: METHOD_COLORS[pgEndpoint.method]?.bg, color: METHOD_COLORS[pgEndpoint.method]?.color }}>
                  {pgEndpoint.method}
                </span>
                <code style={{ fontSize: 13 }}>{BASE_URL}{pgEndpoint.path}</code>
              </h4>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">API Key</label>
                <input className="form-input" value={pgKey} onChange={e => setPgKey(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </div>

              {pgEndpoint.body && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Request Body (JSON)</label>
                  <textarea className="form-input" value={pgBody} onChange={e => setPgBody(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 11, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
              )}

              <button className="btn btn-primary" onClick={runPlayground} disabled={pgLoading}
                style={{ width: '100%', padding: '10px 0', fontWeight: 800 }}>
                {pgLoading ? '⏳ Sending…' : '▶ Send Request'}
              </button>
            </div>

            {pgResult && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 800, background: '#dcfce7', color: '#166534' }}>
                    {pgResult.status} OK
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    X-Request-ID: {pgResult.headers['X-Request-ID']}
                  </span>
                </div>
                <div style={{ padding: 16, background: '#1e293b', fontFamily: 'monospace', fontSize: 12, color: '#4ade80', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.8 }}>
                  {pgResult.body}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ SDKs ═══════════════════════ */}
      {tab === 'sdks' && (
        <div>
          {/* SDK tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { lang: 'JavaScript / Node', icon: '🟨', install: 'npm install @clarity-ehr/edi-sdk', badge: 'npm v1.2.0' },
              { lang: 'Python',            icon: '🐍', install: 'pip install clarity-edi',          badge: 'PyPI v1.2.0' },
              { lang: '.NET / C#',         icon: '🔷', install: 'dotnet add package ClarityEdi',   badge: 'NuGet v1.1.0' },
              { lang: 'cURL / REST',       icon: '🌐', install: 'No install required',              badge: 'Any HTTP client' },
            ].map(s => (
              <div key={s.lang} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{s.lang}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#1e293b', color: '#4ade80', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                  {s.install}
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>{s.badge}</span>
              </div>
            ))}
          </div>

          {/* Full code examples */}
          {[
            {
              title: '🟨 JavaScript — Submit a claim & listen for webhook',
              code: `import { ClarityEDI } from '@clarity-ehr/edi-sdk';

const client = new ClarityEDI({ apiKey: 'ceh_live_sk_YOUR_KEY' });

// Submit a 837P claim
const claim = await client.claims.submit({
  transaction_type: '837P',
  npi: '1234567890',
  payer_id: 'BCBS001',
  patient: { member_id: 'XYZ9876', dob: '1985-04-12' },
  service_lines: [{ cpt: '99213', date: '2025-06-01', units: 1, charge: 150.00 }],
});
console.log('Claim ID:', claim.claim_id);

// Poll for status
const status = await client.claims.status(claim.claim_id);
console.log('Status:', status.status, '| Paid:', status.paid_amount);`,
            },
            {
              title: '🐍 Python — Eligibility check before a telehealth visit',
              code: `from clarity_edi import ClarityEDI

client = ClarityEDI(api_key="ceh_live_sk_YOUR_KEY")

# Real-time eligibility check
elig = client.eligibility.check({
    "payer_id": "AETNA001",
    "npi": "1234567890",
    "patient": {
        "member_id": "AET-445566",
        "dob": "1990-08-23",
        "last_name": "Smith",
    },
    "service_date": "2025-06-15",
})

if elig["eligible"]:
    print(f"Covered · Copay: ${elig['copay']} · Deductible left: ${elig['deductible_remaining']}")
    # Auto-submit claim after telehealth session
    claim = client.claims.submit({ "transaction_type": "837P", ... })`,
            },
            {
              title: '🔷 .NET — Retrieve and auto-post 835 ERA',
              code: `using ClarityEdi;

var client = new ClarityEdiClient("ceh_live_sk_YOUR_KEY");

// List new ERAs
var eras = await client.Remittance.ListAsync(new { status = "new" });

foreach (var era in eras.Items)
{
    var detail = await client.Remittance.GetAsync(era.EraId);
    foreach (var line in detail.ServiceLines)
    {
        // Post to your GL / PM system
        await PostToGeneralLedger(line.ClaimId, line.Paid, line.Adjustments);
    }
    await client.Remittance.MarkPostedAsync(era.EraId);
}`,
            },
            {
              title: '🌐 cURL — Batch claim submission',
              code: `# Submit up to 500 claims in a single request
curl -X POST '${BASE_URL}/claims/batch' \\
  -H 'X-API-Key: ceh_live_sk_YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "claims": [
      { "transaction_type": "837P", "npi": "1234567890", "payer_id": "BCBS001",
        "patient": { "member_id": "XYZ9876" },
        "service_lines": [{ "cpt": "99213", "date": "2025-06-01", "charge": 150.00 }] },
      ...
    ],
    "callback_url": "https://your.app/webhooks/clarity"
  }'

# Response
# { "batch_id": "BAT-20250601-0028", "submitted": 500, "accepted": 498, "rejected": 2 }`,
            },
          ].map(ex => (
            <div key={ex.title} className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', fontWeight: 700, fontSize: 13 }}>{ex.title}</div>
              <div style={{ padding: 16, background: '#1e293b', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.7 }}>
                {ex.code}
              </div>
            </div>
          ))}

          {/* Rate limit info */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>🚦 Rate Limits & Error Codes</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: 16, borderRight: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>HTTP Response Codes</h4>
                {[
                  ['200', 'OK — request succeeded'],
                  ['201', 'Created — claim / key created'],
                  ['400', 'Bad Request — validation error in payload'],
                  ['401', 'Unauthorized — missing or invalid API key'],
                  ['403', 'Forbidden — scope not granted for this key'],
                  ['429', 'Too Many Requests — daily quota exceeded'],
                  ['503', 'Service Unavailable — clearinghouse degraded'],
                ].map(([code, desc]) => (
                  <div key={code} style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 6 }}>
                    <code style={{ fontWeight: 800, color: code.startsWith('2') ? '#166534' : code.startsWith('4') || code.startsWith('5') ? '#991b1b' : '#1e40af', minWidth: 32 }}>{code}</code>
                    <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: 16 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Rate Limit Headers</h4>
                <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 8, lineHeight: 2 }}>
                  <div>X-RateLimit-Limit: <span style={{ color: '#fbbf24' }}>10000</span></div>
                  <div>X-RateLimit-Remaining: <span style={{ color: '#4ade80' }}>9712</span></div>
                  <div>X-RateLimit-Reset: <span style={{ color: '#94a3b8' }}>2025-06-09T00:00:00Z</span></div>
                  <div>Retry-After: <span style={{ color: '#f87171' }}>3600</span> <span style={{ color: '#64748b' }}># on 429</span></div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Limits reset daily at <strong>00:00 UTC</strong>. Enterprise keys have per-minute burst limits configurable by request.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ BILLING ENGINE ═══════════════════════ */}
      {tab === 'billing' && (
        <div>
          {/* Current Plan Banner */}
          <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>CURRENT PLAN</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Pro — $299/mo</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>10,000 API calls/day · Full access · Webhooks included</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button style={{ padding: '8px 18px', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 8, background: 'transparent', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', marginBottom: 8, display: 'block' }}>⬆ Upgrade to Enterprise</button>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setBillingCycle('monthly')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: billingCycle === 'monthly' ? '#fff' : 'rgba(255,255,255,0.2)', color: billingCycle === 'monthly' ? '#4f46e5' : '#fff' }}>Monthly</button>
                  <button onClick={() => setBillingCycle('annual')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: billingCycle === 'annual' ? '#fff' : 'rgba(255,255,255,0.2)', color: billingCycle === 'annual' ? '#4f46e5' : '#fff' }}>Annual (−20%)</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
            {/* Usage Meter */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>📊 May 2026 Usage</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--primary)', fontSize: 18 }}>{totalCalls.toLocaleString()}</strong> / 310,000 calls
                </div>
              </div>
              {/* Overall progress */}
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${Math.min((totalCalls / 310000) * 100, 100)}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 99 }} />
              </div>
              {/* Per-category breakdown */}
              {BILLING_USAGE.map(u => (
                <div key={u.category} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{u.category}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{u.calls.toLocaleString()} calls</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(u.calls / u.limit) * 100}%`, background: u.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12 }}>
                <strong style={{ color: '#166534' }}>✅ 35.8% of daily quota used</strong>
                <span style={{ color: '#4ade80', marginLeft: 8 }}>Well within Pro limits</span>
              </div>
            </div>

            {/* Pricing tiers */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>💳 Plans</h3>
              {TIERS.map(t => (
                <div key={t.name} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, border: `2px solid ${t.name === 'Pro' ? '#8b5cf6' : 'var(--border-light)'}`, background: t.name === 'Pro' ? '#faf5ff' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{t.name}</span>
                      {t.name === 'Pro' && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: '#8b5cf6', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>CURRENT</span>}
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 15, color: '#4f46e5' }}>{billingCycle === 'annual' && t.price !== 'Free' && t.price !== 'Custom' ? '$' + Math.round(parseInt(t.price.replace('$','').replace('/mo','')) * 0.8) + '/mo' : t.price}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{typeof t.daily === 'number' ? t.daily.toLocaleString() : t.daily} req/day</div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)', fontSize: 11 }}>
                <strong>Overage pricing:</strong><br />
                <span style={{ color: 'var(--text-secondary)' }}>Claims: $0.004/call · Eligibility: $0.003/call · ERA: $0.002/call</span>
              </div>
            </div>
          </div>

          {/* Invoice History */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>🧾 Invoice History</h3>
              <button style={{ fontSize: 11, padding: '4px 12px', border: '1px solid var(--border-light)', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>Export CSV</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                  {['Invoice', 'Period', 'API Calls', 'Amount', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv, i) => (
                  <tr key={inv.id} style={{ borderTop: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fff' : 'var(--bg)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{inv.id}</td>
                    <td style={{ padding: '10px 16px' }}>{inv.period}</td>
                    <td style={{ padding: '10px 16px' }}>{inv.calls.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>${inv.amount}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: inv.status === 'paid' ? '#dcfce7' : '#dbeafe', color: inv.status === 'paid' ? '#166534' : '#1e40af' }}>
                        {inv.status === 'current' ? '● In Progress' : '✓ Paid'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button style={{ fontSize: 11, padding: '3px 10px', border: '1px solid var(--border-light)', borderRadius: 5, cursor: 'pointer', background: '#fff', color: 'var(--text-secondary)' }}>PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Projector */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>🔮 Cost Projector</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { scenario: 'Current pace', claims: 6840, elig: 3210, era: 1440, monthly: 299 },
                { scenario: '2× growth', claims: 13680, elig: 6420, era: 2880, monthly: 299 },
                { scenario: 'Enterprise scale', claims: 50000, elig: 25000, era: 10000, monthly: 'Custom' },
              ].map(s => (
                <div key={s.scenario} style={{ padding: 16, borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>{s.scenario}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Claims/mo: <strong>{s.claims.toLocaleString()}</strong></div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Eligibility/mo: <strong>{s.elig.toLocaleString()}</strong></div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>ERA/mo: <strong>{s.era.toLocaleString()}</strong></div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{typeof s.monthly === 'number' ? `$${s.monthly}/mo` : s.monthly}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ PARTNER ONBOARDING ═══════════════════════ */}
      {tab === 'onboarding' && (
        <div>
          {!onboardDone ? (
            <div>
              {/* Progress bar */}
              <div className="card" style={{ padding: '20px 24px', marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {ONBOARD_STEPS.map((s, i) => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < ONBOARD_STEPS.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 13,
                          background: onboardStep > s.n ? '#059669' : onboardStep === s.n ? 'var(--primary)' : '#e2e8f0',
                          color: onboardStep >= s.n ? '#fff' : '#94a3b8',
                          border: onboardStep === s.n ? '3px solid var(--primary)' : 'none',
                          boxShadow: onboardStep === s.n ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none',
                        }}>
                          {onboardStep > s.n ? '✓' : s.n}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: onboardStep === s.n ? 'var(--primary)' : 'var(--text-secondary)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>{s.label}</div>
                      </div>
                      {i < ONBOARD_STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 3, background: onboardStep > s.n ? '#059669' : '#e2e8f0', margin: '0 4px', marginBottom: 16 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 28 }}>
                {/* Step 1 */}
                {onboardStep === 1 && (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🏢 Organization Details</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>Tell us about your organization so we can configure the right EDI setup.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div><label className="form-label">Organization Name *</label><input className="form-input" value={onboardData.orgName} onChange={e => setOnboardData(d => ({ ...d, orgName: e.target.value }))} placeholder="Acme Billing Inc." /></div>
                      <div><label className="form-label">NPI</label><input className="form-input" value={onboardData.npi} onChange={e => setOnboardData(d => ({ ...d, npi: e.target.value }))} placeholder="1234567890" /></div>
                      <div><label className="form-label">Tax ID / EIN</label><input className="form-input" value={onboardData.taxId} onChange={e => setOnboardData(d => ({ ...d, taxId: e.target.value }))} placeholder="12-3456789" /></div>
                      <div><label className="form-label">Primary Contact Name *</label><input className="form-input" value={onboardData.contactName} onChange={e => setOnboardData(d => ({ ...d, contactName: e.target.value }))} placeholder="Jane Smith" /></div>
                      <div style={{ gridColumn: '1/-1' }}><label className="form-label">Contact Email *</label><input className="form-input" type="email" value={onboardData.contactEmail} onChange={e => setOnboardData(d => ({ ...d, contactEmail: e.target.value }))} placeholder="jane@acmebilling.com" /></div>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {onboardStep === 2 && (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🎯 Integration Type</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>How will you use the Clarity EDI API? We'll customize your setup accordingly.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[['ehr', '🏥', 'EHR Integration', 'Submit claims directly from your EHR system'],
                        ['billing', '🧾', 'Billing Company', 'Process claims for multiple practices at scale'],
                        ['telehealth', '📱', 'Telehealth App', 'Eligibility checks + auto-claim after sessions'],
                        ['ai', '🤖', 'AI / Coding Tool', 'Submit AI-coded claims + receive denial feedback'],
                      ].map(([id, icon, title, desc]) => (
                        <div key={id} onClick={() => setOnboardData(d => ({ ...d, integrationType: id }))}
                          style={{ padding: 16, borderRadius: 10, border: `2px solid ${onboardData.integrationType === id ? 'var(--primary)' : 'var(--border-light)'}`, cursor: 'pointer', background: onboardData.integrationType === id ? 'var(--primary-light)' : '#fff' }}>
                          <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {onboardStep === 3 && (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>📋 Transaction Sets</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>Select the EDI transaction types your integration needs.</p>
                    {[['837P', 'Professional Claims (837P)', 'Submit CMS-1500 / office-based claims'],
                      ['837I', 'Institutional Claims (837I)', 'Submit UB-04 / facility-based claims'],
                      ['270', 'Eligibility (270/271)', 'Real-time insurance verification before visit'],
                      ['835', 'Remittance (835 ERA)', 'Download and parse electronic remittance advice'],
                      ['999', 'Acknowledgments (999/277CA)', 'Receive claim status acknowledgments'],
                      ['routing', 'Routing API', 'Resolve trading partner routing in real time'],
                    ].map(([id, title, desc]) => (
                      <label key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={onboardData.transactions.includes(id)}
                          onChange={e => setOnboardData(d => ({ ...d, transactions: e.target.checked ? [...d.transactions, id] : d.transactions.filter(x => x !== id) }))}
                          style={{ marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Step 4 */}
                {onboardStep === 4 && (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🔑 API Setup</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>Your production API key has been generated. Keep it secret — never expose it in client-side code.</p>
                    <div style={{ padding: 16, borderRadius: 8, background: '#1e293b', fontFamily: 'monospace', fontSize: 12, color: '#4ade80', marginBottom: 16 }}>
                      <div style={{ color: '#94a3b8', marginBottom: 4 }}># Your API Key</div>
                      <div style={{ color: '#f8fafc', wordBreak: 'break-all' }}>{generatedOnboardKey || 'ceh_live_sk_generating...'}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label className="form-label">Webhook Endpoint (optional)</label>
                      <input className="form-input" value={onboardData.webhookUrl} onChange={e => setOnboardData(d => ({ ...d, webhookUrl: e.target.value }))} placeholder="https://your.app/webhooks/clarity" />
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>We'll send real-time events to this URL (claim status, ERA receipt, etc.)</div>
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fef9c3', border: '1px solid #fde047', fontSize: 12 }}>
                      ⚠️ <strong>Store this key securely.</strong> You won't be able to view it again after this step. Rotate keys from the API Keys tab at any time.
                    </div>
                  </div>
                )}

                {/* Step 5 */}
                {onboardStep === 5 && (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>📜 HIPAA Business Associate Agreement</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>HIPAA requires a BAA between Clarity and any business associate that accesses PHI via the EDI API.</p>
                    <div style={{ height: 200, overflowY: 'auto', padding: 14, border: '1px solid var(--border-light)', borderRadius: 8, background: '#f8fafc', fontSize: 11, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 14, fontFamily: 'monospace' }}>
                      BUSINESS ASSOCIATE AGREEMENT{`\n`}Effective Date: {new Date().toLocaleDateString()}{`\n\n`}This Business Associate Agreement ("BAA") is entered into between Clarity Health Systems, Inc. ("Covered Entity") and {onboardData.orgName || 'Partner Organization'} ("Business Associate").{`\n\n`}1. DEFINITIONS. Terms used but not otherwise defined in this BAA shall have the same meaning as those terms in the Privacy Rule and Security Rule.{`\n\n`}2. OBLIGATIONS OF BUSINESS ASSOCIATE. Business Associate agrees to: (a) not use or disclose Protected Health Information ("PHI") other than as permitted or required by this BAA; (b) use appropriate safeguards to prevent use or disclosure of PHI; (c) report to Covered Entity any use or disclosure of PHI not provided for by this BAA.{`\n\n`}3. PERMITTED USES AND DISCLOSURES. Business Associate may use or disclose PHI only as necessary to perform EDI processing services on behalf of Covered Entity, including claim submission, eligibility verification, and remittance processing.{`\n\n`}4. TERM AND TERMINATION. This BAA shall be effective as of the date first signed and shall terminate when all PHI is returned or destroyed.
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', padding: '12px 14px', borderRadius: 8, background: onboardData.baaAccepted ? '#f0fdf4' : '#f8fafc', border: `1px solid ${onboardData.baaAccepted ? '#86efac' : 'var(--border-light)'}` }}>
                      <input type="checkbox" checked={onboardData.baaAccepted} onChange={e => setOnboardData(d => ({ ...d, baaAccepted: e.target.checked }))} />
                      <span>I agree to the Business Associate Agreement on behalf of <strong>{onboardData.orgName || 'my organization'}</strong></span>
                    </label>
                  </div>
                )}

                {/* Step 6 */}
                {onboardStep === 6 && (
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🔌 Test Connection</h3>
                    <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-secondary)' }}>Run a health-check to confirm your API key and network connectivity.</p>
                    {!onboardTestRunning && !onboardTestResult && (
                      <button className="btn btn-primary" onClick={runOnboardTest} style={{ padding: '12px 32px', fontSize: 14, fontWeight: 800 }}>▶ Run Connection Test</button>
                    )}
                    {onboardTestRunning && (
                      <div style={{ padding: 24 }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Testing connection to Clarity EDI clearinghouse…</div>
                        {['TCP handshake', 'TLS 1.3 verification', 'API key auth', 'Health endpoint', 'Payer list fetch'].map((step, i) => (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, opacity: i < 3 ? 1 : 0.4 }}>
                            <span style={{ color: i < 3 ? '#059669' : '#94a3b8' }}>{i < 3 ? '✓' : '○'}</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {onboardTestResult === 'pass' && (
                      <div style={{ padding: 24 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginBottom: 8 }}>Connection Successful!</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All 5 checks passed. Your integration is ready for go-live.</div>
                        {['TCP handshake ✓', 'TLS 1.3 verified ✓', 'API key valid ✓', 'Health endpoint 200 OK ✓', '1,200 payers reachable ✓'].map(step => (
                          <div key={step} style={{ fontSize: 12, color: '#059669', padding: '4px 0' }}>{step}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 7 */}
                {onboardStep === 7 && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>You're Live!</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                      <strong>{onboardData.orgName || 'Your organization'}</strong> is now connected to the Clarity EDI clearinghouse.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24, textAlign: 'left' }}>
                      {[['Transactions', onboardData.transactions.join(', ') || 'None selected'], ['API Key', generatedOnboardKey.slice(0, 20) + '…'], ['Webhook', onboardData.webhookUrl || 'Not configured'], ['BAA Status', 'Signed ✓'], ['Support', 'partners@clarity-ehr.com'], ['Docs', 'Navigate to API Reference tab']].map(([k, v]) => (
                        <div key={k} style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, wordBreak: 'break-all' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-secondary" onClick={() => setOnboardDone(true)} style={{ padding: '10px 24px' }}>View Summary</button>
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
                  <button className="btn btn-secondary" onClick={() => setOnboardStep(s => Math.max(1, s - 1))} disabled={onboardStep === 1}>← Back</button>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Step {onboardStep} of 7</span>
                  {onboardStep < 7 ? (
                    <button className="btn btn-primary"
                      onClick={() => { if (onboardStep === 4 && !generatedOnboardKey) startOnboarding(); setOnboardStep(s => Math.min(7, s + 1)); }}
                      disabled={(onboardStep === 1 && (!onboardData.orgName || !onboardData.contactEmail)) || (onboardStep === 2 && !onboardData.integrationType) || (onboardStep === 3 && onboardData.transactions.length === 0) || (onboardStep === 5 && !onboardData.baaAccepted) || (onboardStep === 6 && !onboardData.testPassed)}>
                      Next →
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setOnboardDone(true)}>Finish ✓</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Done summary */
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ margin: '0 0 8px' }}>Onboarding Complete</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{onboardData.orgName} is live on the Clarity EDI clearinghouse.</p>
              <button className="btn btn-secondary" onClick={() => { setOnboardDone(false); setOnboardStep(1); setOnboardData({ orgName: '', npi: '', taxId: '', contactName: '', contactEmail: '', integrationType: '', transactions: [], webhookUrl: '', baaAccepted: false, testPassed: false }); }} style={{ marginTop: 16 }}>+ Onboard Another Partner</button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════ PAYER SIMULATOR ═══════════════════════ */}
      {tab === 'simulator' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
            {/* Config panel */}
            <div>
              <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 13 }}>⚙️ Simulation Config</h4>

                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Payer</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {SIM_PAYERS.map(p => (
                      <button key={p.id} onClick={() => setSimPayer(p.id)}
                        style={{ textAlign: 'left', padding: '6px 10px', border: `1px solid ${simPayer === p.id ? p.color : 'var(--border-light)'}`, borderRadius: 6, cursor: 'pointer', background: simPayer === p.id ? `${p.color}15` : '#fff', fontSize: 12, fontWeight: simPayer === p.id ? 700 : 500, color: simPayer === p.id ? p.color : 'var(--text-primary)' }}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Transaction Type</label>
                  {SIM_TRANSACTIONS.map(t => (
                    <button key={t.id} onClick={() => { setSimTransaction(t.id); setSimScenario(SIM_SCENARIOS[t.id]?.[0]?.id || ''); setSimResult(null); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 4, border: `1px solid ${simTransaction === t.id ? 'var(--primary)' : 'var(--border-light)'}`, borderRadius: 6, cursor: 'pointer', background: simTransaction === t.id ? 'var(--primary-light)' : '#fff', fontSize: 12, fontWeight: simTransaction === t.id ? 700 : 500 }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Response Scenario</label>
                  {(SIM_SCENARIOS[simTransaction] || []).map(sc => (
                    <button key={sc.id} onClick={() => { setSimScenario(sc.id); setSimResult(null); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 4, border: `1px solid ${simScenario === sc.id ? sc.color : 'var(--border-light)'}`, borderRadius: 6, cursor: 'pointer', background: simScenario === sc.id ? `${sc.color}12` : '#fff', fontSize: 11, fontWeight: simScenario === sc.id ? 700 : 500, color: simScenario === sc.id ? sc.color : 'var(--text-primary)' }}>
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>🧾 Parameters</h4>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">NPI</label>
                  <input className="form-input" value={simNpi} onChange={e => setSimNpi(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label className="form-label">Member ID</label>
                  <input className="form-input" value={simMemberId} onChange={e => setSimMemberId(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </div>
                {simTransaction === '837P' && (
                  <div style={{ marginBottom: 10 }}>
                    <label className="form-label">CPT Code</label>
                    <input className="form-input" value={simCpt} onChange={e => setSimCpt(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  </div>
                )}
                <button className="btn btn-primary" onClick={runSimulation} disabled={simLoading} style={{ width: '100%', padding: '10px 0', fontWeight: 800, marginTop: 4 }}>
                  {simLoading ? '⏳ Simulating…' : '▶ Run Simulation'}
                </button>
              </div>
            </div>

            {/* Results panel */}
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ margin: 0, fontSize: 13 }}>📡 Simulation Log</h4>
                  {simResult && (
                    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: (SIM_SCENARIOS[simTransaction] || []).find(s => s.id === simScenario)?.color === '#059669' ? '#dcfce7' : '#fee2e2',
                      color: (SIM_SCENARIOS[simTransaction] || []).find(s => s.id === simScenario)?.color === '#059669' ? '#166534' : '#991b1b' }}>
                      {(SIM_SCENARIOS[simTransaction] || []).find(s => s.id === simScenario)?.label}
                    </span>
                  )}
                </div>
                {simLog.length === 0 && !simResult && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                    Configure a scenario and click ▶ Run Simulation
                  </div>
                )}
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#4ade80', lineHeight: 2 }}>
                  {simLog.map((line, i) => (
                    <div key={i} style={{ padding: '3px 0', color: i === simLog.length - 1 && !simResult ? '#fbbf24' : '#94a3b8' }}>{line}</div>
                  ))}
                  {simResult && <div style={{ color: '#4ade80' }}>✓ Response received in 142ms</div>}
                </div>
              </div>

              {simResult && (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: 13 }}>📨 Payer Response</h4>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontFamily: 'monospace' }}>{simTransaction}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontFamily: 'monospace' }}>{SIM_PAYERS.find(p => p.id === simPayer)?.name}</span>
                    </div>
                  </div>
                  <div style={{ padding: 20, background: '#1e293b', fontFamily: 'monospace', fontSize: 11.5, color: '#e2e8f0', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.8, maxHeight: 420, overflowY: 'auto' }}>
                    {simResult}
                  </div>
                  {/* Actionable guidance */}
                  {simScenario.startsWith('denied') && (
                    <div style={{ padding: '14px 20px', background: '#fff7ed', borderTop: '1px solid #fed7aa' }}>
                      <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 12, marginBottom: 6 }}>⚡ Recommended Actions</div>
                      <div style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.7 }}>
                        {simScenario === 'denied_97' && '1. Submit prior auth request to payer before resubmission. 2. Use EDI API POST /claims/{id}/appeal to file automated appeal.'}
                        {simScenario === 'denied_4' && '1. Review CPT code against payer fee schedule. 2. Check service date validity. 3. Correct and resubmit via POST /claims.'}
                        {simScenario === 'denied_16' && '1. Check for missing rendering NPI and Place of Service code. 2. Re-run claim scrubber. 3. Resubmit corrected claim.'}
                      </div>
                    </div>
                  )}
                  {simScenario === 'terminated' && (
                    <div style={{ padding: '14px 20px', background: '#fff7ed', borderTop: '1px solid #fed7aa' }}>
                      <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 12, marginBottom: 4 }}>⚡ Coverage Terminated — Action Required</div>
                      <div style={{ fontSize: 12, color: '#9a3412' }}>Collect self-pay or verify new coverage before rendering services. Do not submit claim to this payer.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Scenario catalog */}
              {!simResult && (
                <div className="card" style={{ padding: 18 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>📚 Available Scenarios for {simTransaction}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(SIM_SCENARIOS[simTransaction] || []).map(sc => (
                      <div key={sc.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: sc.color, marginBottom: 4 }}>{sc.label}</div>
                        <button onClick={() => { setSimScenario(sc.id); }} style={{ fontSize: 10, padding: '2px 8px', border: `1px solid ${sc.color}`, borderRadius: 4, cursor: 'pointer', color: sc.color, background: `${sc.color}10` }}>Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
