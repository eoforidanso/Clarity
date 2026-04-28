import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

/* ─── Pre-built Order Set Templates (athenaOne-style) ─────────────────────── */
const ORDER_SET_TEMPLATES = [
  {
    id: 'os1',
    name: 'Depression Initial Workup',
    category: 'Psychiatric',
    description: 'Standard order set for new depression diagnosis — labs, assessments, and medication consideration',
    icon: '😞',
    color: '#4f46e5',
    tags: ['MDD', 'Depression', 'New Patient'],
    orders: [
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline labs prior to medication initiation' },
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Routine', notes: 'Baseline metabolic panel' },
      { type: 'Lab', description: 'Thyroid Panel (TSH, Free T4)', priority: 'Routine', notes: 'Rule out thyroid etiology' },
      { type: 'Lab', description: 'Vitamin B12 & Folate', priority: 'Routine', notes: 'Nutritional deficiency screen' },
      { type: 'Lab', description: 'Vitamin D, 25-Hydroxy', priority: 'Routine', notes: 'Low vitamin D associated with depressive symptoms' },
      { type: 'Assessment', description: 'PHQ-9 Depression Screening', priority: 'Routine', notes: 'Baseline severity assessment' },
      { type: 'Assessment', description: 'GAD-7 Anxiety Screening', priority: 'Routine', notes: 'Comorbid anxiety evaluation' },
      { type: 'Assessment', description: 'C-SSRS Suicide Risk Screen', priority: 'Urgent', notes: 'Safety screening — mandatory' },
      { type: 'Referral', description: 'Therapy Referral — CBT Individual', priority: 'Routine', notes: 'Refer for cognitive behavioral therapy' },
    ],
  },
  {
    id: 'os2',
    name: 'ADHD Evaluation',
    category: 'Psychiatric',
    description: 'Comprehensive ADHD diagnostic workup for adults — includes rating scales, cognitive testing referral',
    icon: '🧠',
    color: '#0891b2',
    tags: ['ADHD', 'Attention', 'Adult'],
    orders: [
      { type: 'Assessment', description: 'ASRS v1.1 (Adult ADHD Self-Report Scale)', priority: 'Routine', notes: 'Adult ADHD screening' },
      { type: 'Assessment', description: 'WURS (Wender Utah Rating Scale)', priority: 'Routine', notes: 'Childhood symptom retrospective' },
      { type: 'Lab', description: 'Thyroid Panel (TSH, Free T4)', priority: 'Routine', notes: 'Rule out thyroid cause of inattention' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline prior to stimulant consideration' },
      { type: 'Lab', description: 'Urine Drug Screen (UDS)', priority: 'Routine', notes: 'Baseline prior to controlled substance prescribing' },
      { type: 'Vital Signs', description: 'Blood Pressure & Heart Rate', priority: 'Routine', notes: 'Cardiovascular baseline for stimulant safety' },
      { type: 'Vital Signs', description: 'BMI & Weight', priority: 'Routine', notes: 'Baseline weight — stimulant monitoring' },
      { type: 'Referral', description: 'Neuropsychological Testing Referral', priority: 'Routine', notes: 'Formal cognitive/attention testing if diagnostic clarity needed' },
    ],
  },
  {
    id: 'os3',
    name: 'Bipolar Disorder Monitoring',
    category: 'Psychiatric',
    description: 'Ongoing monitoring for patients on mood stabilizers — lithium, valproate, or atypical antipsychotics',
    icon: '🔄',
    color: '#d97706',
    tags: ['Bipolar', 'Mood Stabilizer', 'Monitoring'],
    orders: [
      { type: 'Lab', description: 'Lithium Level (Serum)', priority: 'Routine', notes: 'Therapeutic range: 0.6-1.2 mEq/L' },
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Routine', notes: 'Renal function monitoring for lithium' },
      { type: 'Lab', description: 'TSH (Thyroid)', priority: 'Routine', notes: 'Lithium-associated thyroid suppression monitoring' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Valproate — monitor for blood dyscrasias' },
      { type: 'Lab', description: 'Valproic Acid Level (Serum)', priority: 'Routine', notes: 'Therapeutic range: 50-100 mcg/mL' },
      { type: 'Lab', description: 'Fasting Lipid Panel', priority: 'Routine', notes: 'Metabolic monitoring for atypical antipsychotics' },
      { type: 'Lab', description: 'Hemoglobin A1c', priority: 'Routine', notes: 'Diabetes screening — atypical antipsychotic metabolic risk' },
      { type: 'Vital Signs', description: 'Weight & BMI', priority: 'Routine', notes: 'Monitor for antipsychotic-associated weight gain' },
      { type: 'Assessment', description: 'MDQ (Mood Disorder Questionnaire)', priority: 'Routine', notes: 'Track mood stability over time' },
    ],
  },
  {
    id: 'os4',
    name: 'Anxiety Disorder Workup',
    category: 'Psychiatric',
    description: 'Initial evaluation for generalized anxiety, panic disorder, or social anxiety',
    icon: '😰',
    color: '#dc2626',
    tags: ['GAD', 'Panic', 'Anxiety', 'New Patient'],
    orders: [
      { type: 'Lab', description: 'Thyroid Panel (TSH, Free T4)', priority: 'Routine', notes: 'Rule out hyperthyroidism' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline labs' },
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Routine', notes: 'Baseline metabolic' },
      { type: 'Lab', description: 'Urine Drug Screen (UDS)', priority: 'Routine', notes: 'Rule out substance-induced anxiety' },
      { type: 'Assessment', description: 'GAD-7 Anxiety Screening', priority: 'Routine', notes: 'Baseline severity' },
      { type: 'Assessment', description: 'PHQ-9 Depression Screening', priority: 'Routine', notes: 'Comorbid depression screen' },
      { type: 'Assessment', description: 'C-SSRS Suicide Risk Screen', priority: 'Urgent', notes: 'Safety screen — mandatory' },
      { type: 'Referral', description: 'Therapy Referral — CBT for Anxiety', priority: 'Routine', notes: 'Evidence-based therapy for anxiety disorders' },
    ],
  },
  {
    id: 'os5',
    name: 'PTSD Initial Assessment',
    category: 'Psychiatric',
    description: 'Post-traumatic stress disorder screening and initial workup',
    icon: '🛡️',
    color: '#7c3aed',
    tags: ['PTSD', 'Trauma', 'PCL-5'],
    orders: [
      { type: 'Assessment', description: 'PCL-5 (PTSD Checklist)', priority: 'Routine', notes: 'Baseline PTSD severity' },
      { type: 'Assessment', description: 'PHQ-9 Depression Screening', priority: 'Routine', notes: 'Comorbid depression screen' },
      { type: 'Assessment', description: 'C-SSRS Suicide Risk Screen', priority: 'Urgent', notes: 'Safety screening' },
      { type: 'Assessment', description: 'AUDIT-C Alcohol Use Screen', priority: 'Routine', notes: 'Substance use comorbidity' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline labs' },
      { type: 'Lab', description: 'Thyroid Panel (TSH)', priority: 'Routine', notes: 'Rule out thyroid etiology' },
      { type: 'Referral', description: 'Therapy Referral — EMDR or CPT', priority: 'Routine', notes: 'Evidence-based trauma therapy' },
      { type: 'Referral', description: 'Safety Planning Consultation', priority: 'Urgent', notes: 'If elevated risk identified' },
    ],
  },
  {
    id: 'os6',
    name: 'Substance Use Disorder Intake',
    category: 'Psychiatric',
    description: 'New patient with substance use concerns — labs, screening tools, and referral to treatment',
    icon: '🚫',
    color: '#ea580c',
    tags: ['SUD', 'Substance', 'Alcohol', 'Drug'],
    orders: [
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Routine', notes: 'Liver function — hepatic panel' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline' },
      { type: 'Lab', description: 'Urine Drug Screen (UDS) — 12 Panel', priority: 'Routine', notes: 'Baseline substance confirmation' },
      { type: 'Lab', description: 'Hepatitis B & C Panel', priority: 'Routine', notes: 'IV drug use risk screening' },
      { type: 'Lab', description: 'HIV Screening', priority: 'Routine', notes: 'Risk factor screening' },
      { type: 'Assessment', description: 'AUDIT-C (Alcohol Use)', priority: 'Routine', notes: 'Alcohol severity screen' },
      { type: 'Assessment', description: 'DAST-10 (Drug Abuse Screening Test)', priority: 'Routine', notes: 'Drug use severity' },
      { type: 'Assessment', description: 'PHQ-9 Depression Screening', priority: 'Routine', notes: 'Comorbid depression' },
      { type: 'Assessment', description: 'C-SSRS Suicide Risk Screen', priority: 'Urgent', notes: 'Safety screen' },
      { type: 'Referral', description: 'Substance Use Treatment Program Referral', priority: 'Routine', notes: 'IOP/PHP/residential based on severity' },
    ],
  },
  {
    id: 'os7',
    name: 'Clozapine Monitoring',
    category: 'Medication Monitoring',
    description: 'REMS-mandated monitoring for patients on clozapine — ANC, metabolic, and cardiac labs',
    icon: '💊',
    color: '#be123c',
    tags: ['Clozapine', 'ANC', 'REMS', 'Schizophrenia'],
    orders: [
      { type: 'Lab', description: 'CBC with ANC (Absolute Neutrophil Count)', priority: 'Urgent', notes: 'REMS-required — must be within range before dispensing' },
      { type: 'Lab', description: 'Fasting Glucose', priority: 'Routine', notes: 'Metabolic monitoring' },
      { type: 'Lab', description: 'Hemoglobin A1c', priority: 'Routine', notes: 'Diabetes surveillance' },
      { type: 'Lab', description: 'Fasting Lipid Panel', priority: 'Routine', notes: 'Cardiovascular risk monitoring' },
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Routine', notes: 'Hepatic and renal function' },
      { type: 'Vital Signs', description: 'Weight, BMI, Waist Circumference', priority: 'Routine', notes: 'Metabolic syndrome tracking' },
      { type: 'Vital Signs', description: 'Orthostatic Blood Pressure', priority: 'Routine', notes: 'Monitor for hypotension' },
    ],
  },
  {
    id: 'os8',
    name: 'Eating Disorder Evaluation',
    category: 'Psychiatric',
    description: 'Medical and psychiatric screening for anorexia, bulimia, or binge eating disorder',
    icon: '🍽️',
    color: '#0d9488',
    tags: ['Eating Disorder', 'Anorexia', 'Bulimia', 'BED'],
    orders: [
      { type: 'Lab', description: 'Comprehensive Metabolic Panel (CMP)', priority: 'Urgent', notes: 'Electrolyte imbalances — critical for purging behaviors' },
      { type: 'Lab', description: 'CBC with Differential', priority: 'Routine', notes: 'Baseline' },
      { type: 'Lab', description: 'Magnesium Level', priority: 'Routine', notes: 'Purging-related depletion' },
      { type: 'Lab', description: 'Phosphorus Level', priority: 'Routine', notes: 'Refeeding syndrome risk if severely malnourished' },
      { type: 'Lab', description: 'Thyroid Panel (TSH)', priority: 'Routine', notes: 'Metabolic evaluation' },
      { type: 'Lab', description: 'Urinalysis', priority: 'Routine', notes: 'Hydration status and renal function' },
      { type: 'Vital Signs', description: 'Weight, BMI, Orthostatic Vitals', priority: 'Urgent', notes: 'Critical metrics for eating disorders' },
      { type: 'Assessment', description: 'PHQ-9 Depression Screening', priority: 'Routine', notes: 'Comorbid depression' },
      { type: 'Referral', description: 'Nutritionist / Dietitian Referral', priority: 'Routine', notes: 'Meal planning and nutritional rehabilitation' },
      { type: 'Referral', description: 'Therapy Referral — CBT-E or DBT', priority: 'Routine', notes: 'Evidence-based eating disorder therapy' },
    ],
  },
];

const CATEGORIES = ['All', 'Psychiatric', 'Medication Monitoring'];
const TYPE_ICONS = { Lab: '🔬', Assessment: '📊', Referral: '🔄', 'Vital Signs': '💓', Procedure: '🏥', Imaging: '📷' };
const PRIORITY_COLOR = { Routine: '#22c55e', Urgent: '#f59e0b', STAT: '#ef4444' };

export default function OrderSetTemplates() {
  const { currentUser } = useAuth();
  const { addOrder, orders } = usePatient();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [checkedOrders, setCheckedOrders] = useState({});
  const [applyTarget, setApplyTarget] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [appliedSets, setAppliedSets] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: 'Psychiatric', description: '', orders: [] });
  const [newOrderForm, setNewOrderForm] = useState({ type: 'Lab', description: '', priority: 'Routine', notes: '' });

  const isPrescriber = currentUser?.role === 'prescriber';
  const isNurse = currentUser?.role === 'nurse';
  const canApply = isPrescriber || isNurse;

  const allTemplates = [...ORDER_SET_TEMPLATES, ...customTemplates];

  const filtered = allTemplates.filter(t => {
    const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const toggleOrder = (templateId, orderIdx) => {
    const key = `${templateId}-${orderIdx}`;
    setCheckedOrders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (template) => {
    const next = { ...checkedOrders };
    template.orders.forEach((_, i) => { next[`${template.id}-${i}`] = true; });
    setCheckedOrders(next);
  };

  const deselectAll = (template) => {
    const next = { ...checkedOrders };
    template.orders.forEach((_, i) => { delete next[`${template.id}-${i}`]; });
    setCheckedOrders(next);
  };

  const getSelectedCount = (template) =>
    template.orders.filter((_, i) => checkedOrders[`${template.id}-${i}`]).length;

  const applyOrderSet = (patientId) => {
    if (!selectedTemplate) return;
    const selectedOrders = selectedTemplate.orders.filter((_, i) => checkedOrders[`${selectedTemplate.id}-${i}`]);
    selectedOrders.forEach(order => {
      addOrder(patientId, {
        type: order.type,
        description: order.description,
        priority: order.priority,
        notes: `[Order Set: ${selectedTemplate.name}] ${order.notes || ''}`,
        orderSet: selectedTemplate.name,
        orderedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        orderedAt: new Date().toISOString(),
      });
    });
    setAppliedSets(prev => [...prev, {
      templateName: selectedTemplate.name,
      patientId,
      orderCount: selectedOrders.length,
      appliedAt: new Date().toISOString(),
      appliedBy: `${currentUser.firstName} ${currentUser.lastName}`,
    }]);
    setShowApplyModal(false);
    setApplyTarget('');
  };

  const addCustomOrder = () => {
    if (!newOrderForm.description.trim()) return;
    setCreateForm(prev => ({ ...prev, orders: [...prev.orders, { ...newOrderForm }] }));
    setNewOrderForm({ type: 'Lab', description: '', priority: 'Routine', notes: '' });
  };

  const saveCustomTemplate = () => {
    if (!createForm.name.trim() || createForm.orders.length === 0) return;
    const newTemplate = {
      id: `custom-${Date.now()}`,
      ...createForm,
      icon: '📦',
      color: '#6366f1',
      tags: ['Custom'],
    };
    setCustomTemplates(prev => [...prev, newTemplate]);
    setShowCreateForm(false);
    setCreateForm({ name: '', category: 'Psychiatric', description: '', orders: [] });
  };

  /* ─── Styles ─────────────────────────────────────────────────── */
  const card = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionLabel = {
    display: 'block',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b',
    marginBottom: 6,
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            📦 Order Set Templates
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Pre-built order bundles for common psychiatric workups and monitoring protocols
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canApply && (
            <button onClick={() => setShowCreateForm(true)}
              style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ➕ Create Custom Set
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Available Templates', value: allTemplates.length, icon: '📦', color: '#4f46e5' },
          { label: 'Custom Templates', value: customTemplates.length, icon: '✏️', color: '#0891b2' },
          { label: 'Applied This Session', value: appliedSets.length, icon: '✅', color: '#16a34a' },
          { label: 'Total Orders Available', value: allTemplates.reduce((sum, t) => sum + t.orders.length, 0), icon: '📋', color: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order sets by name, condition, or tag..."
            className="form-input"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>🔍</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              style={{ padding: '8px 16px', borderRadius: 8, border: selectedCategory === c ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: selectedCategory === c ? '#eff6ff' : '#fff', color: selectedCategory === c ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTemplate ? '380px 1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {/* Template List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: selectedTemplate ? 'calc(100vh - 300px)' : 'none', overflowY: selectedTemplate ? 'auto' : 'visible' }}>
          {filtered.map(template => (
            <div key={template.id}
              onClick={() => {
                setSelectedTemplate(selectedTemplate?.id === template.id ? null : template);
                // Pre-select all orders
                if (selectedTemplate?.id !== template.id) {
                  const next = {};
                  template.orders.forEach((_, i) => { next[`${template.id}-${i}`] = true; });
                  setCheckedOrders(next);
                }
              }}
              style={{
                ...card,
                cursor: 'pointer',
                borderColor: selectedTemplate?.id === template.id ? template.color : '#e2e8f0',
                borderWidth: selectedTemplate?.id === template.id ? 2 : 1,
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${template.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {template.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>{template.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 8 }}>{template.description}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${template.color}15`, color: template.color }}>
                      {template.orders.length} orders
                    </span>
                    {template.tags?.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, color: '#64748b' }}>No matching order sets found</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Try a different search term or category</div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTemplate && (
          <div style={{ ...card, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${selectedTemplate.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>{selectedTemplate.name}</h2>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selectedTemplate.category} · {selectedTemplate.orders.length} orders</div>
                </div>
              </div>
              <button onClick={() => setSelectedTemplate(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>{selectedTemplate.description}</p>

            {/* Select controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                Orders ({getSelectedCount(selectedTemplate)}/{selectedTemplate.orders.length} selected)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => selectAll(selectedTemplate)} style={{ fontSize: 11, color: '#4f46e5', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                <button onClick={() => deselectAll(selectedTemplate)} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Deselect All</button>
              </div>
            </div>

            {/* Order list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {selectedTemplate.orders.map((order, i) => {
                const key = `${selectedTemplate.id}-${i}`;
                const checked = !!checkedOrders[key];
                return (
                  <div key={i} onClick={() => toggleOrder(selectedTemplate.id, i)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10,
                      background: checked ? '#f0f9ff' : '#fafbfc', border: checked ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <input type="checkbox" checked={checked} readOnly
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: '#4f46e5' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14 }}>{TYPE_ICONS[order.type] || '📋'}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{order.description}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>{order.type}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${PRIORITY_COLOR[order.priority]}15`, color: PRIORITY_COLOR[order.priority] }}>{order.priority}</span>
                      </div>
                      {order.notes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{order.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Apply button */}
            {canApply && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setShowApplyModal(true)}
                  disabled={getSelectedCount(selectedTemplate) === 0}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10,
                    background: getSelectedCount(selectedTemplate) > 0 ? `linear-gradient(135deg,${selectedTemplate.color},${selectedTemplate.color}dd)` : '#cbd5e1',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
                    cursor: getSelectedCount(selectedTemplate) > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  📋 Apply {getSelectedCount(selectedTemplate)} Orders to Patient
                </button>
              </div>
            )}

            {!canApply && (
              <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', textAlign: 'center' }}>
                ⚠️ Only prescribers and nurses can apply order sets to patients
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowApplyModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ ...card, width: 440, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>Apply Order Set</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
              Applying <strong>{getSelectedCount(selectedTemplate)}</strong> orders from <strong>{selectedTemplate.name}</strong>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionLabel}>Patient ID *</label>
              <input type="text" className="form-input" value={applyTarget}
                onChange={e => setApplyTarget(e.target.value)}
                placeholder="Enter patient ID (e.g., p1, p2, p3...)"
                style={{ fontSize: 13 }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApplyModal(false)}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => applyOrderSet(applyTarget)} disabled={!applyTarget.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: applyTarget.trim() ? selectedTemplate.color : '#cbd5e1',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: 12,
                  cursor: applyTarget.trim() ? 'pointer' : 'not-allowed',
                }}>
                ✅ Confirm & Apply Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Template Modal */}
      {showCreateForm && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowCreateForm(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ ...card, width: 600, maxHeight: '80vh', overflowY: 'auto', padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✏️ Create Custom Order Set
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={sectionLabel}>Template Name *</label>
                <input type="text" className="form-input" value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Bipolar New Patient Workup" style={{ fontSize: 13 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={sectionLabel}>Category</label>
                  <select className="form-input" value={createForm.category}
                    onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))} style={{ fontSize: 13 }}>
                    <option value="Psychiatric">Psychiatric</option>
                    <option value="Medication Monitoring">Medication Monitoring</option>
                  </select>
                </div>
                <div>
                  <label style={sectionLabel}>Description</label>
                  <input type="text" className="form-input" value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description..." style={{ fontSize: 13 }} />
                </div>
              </div>
            </div>

            {/* Add orders */}
            <div style={{ marginBottom: 16 }}>
              <label style={sectionLabel}>Add Orders to Set</label>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 8, marginBottom: 8 }}>
                <select className="form-input" value={newOrderForm.type}
                  onChange={e => setNewOrderForm(f => ({ ...f, type: e.target.value }))} style={{ fontSize: 12 }}>
                  <option value="Lab">Lab</option>
                  <option value="Assessment">Assessment</option>
                  <option value="Referral">Referral</option>
                  <option value="Vital Signs">Vital Signs</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Imaging">Imaging</option>
                </select>
                <input type="text" className="form-input" value={newOrderForm.description}
                  onChange={e => setNewOrderForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Order description..." style={{ fontSize: 12 }} />
                <select className="form-input" value={newOrderForm.priority}
                  onChange={e => setNewOrderForm(f => ({ ...f, priority: e.target.value }))} style={{ fontSize: 12 }}>
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-input" value={newOrderForm.notes}
                  onChange={e => setNewOrderForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes (optional)" style={{ fontSize: 12, flex: 1 }} />
                <button onClick={addCustomOrder}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>

            {/* Current orders */}
            {createForm.orders.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 8 }}>
                  Orders in set ({createForm.orders.length}):
                </div>
                {createForm.orders.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f7f9fc', borderRadius: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{TYPE_ICONS[o.type] || '📋'}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{o.description}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[o.priority] }}>{o.priority}</span>
                    <button onClick={() => setCreateForm(f => ({ ...f, orders: f.orders.filter((_, idx) => idx !== i) }))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setShowCreateForm(false)}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveCustomTemplate}
                disabled={!createForm.name.trim() || createForm.orders.length === 0}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: createForm.name.trim() && createForm.orders.length > 0 ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#cbd5e1',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: 12,
                  cursor: createForm.name.trim() && createForm.orders.length > 0 ? 'pointer' : 'not-allowed',
                }}>
                💾 Save Order Set Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recently Applied */}
      {appliedSets.length > 0 && (
        <div style={{ ...card, marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Recently Applied Order Sets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appliedSets.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{a.templateName}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {a.orderCount} orders → Patient {a.patientId} · {a.appliedBy} · {new Date(a.appliedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
