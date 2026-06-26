import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePatient } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';

// ── Curated ICD-10 codes (psychiatric + common comorbidities) ─────────────────
const ICD10 = [
  { code:'F32.0', label:'Major depressive disorder, single episode, mild' },
  { code:'F32.1', label:'Major depressive disorder, single episode, moderate' },
  { code:'F32.2', label:'Major depressive disorder, single episode, severe' },
  { code:'F32.3', label:'Major depressive disorder, single episode, severe with psychosis' },
  { code:'F32.9', label:'Major depressive disorder, single episode, unspecified' },
  { code:'F33.0', label:'Major depressive disorder, recurrent, mild' },
  { code:'F33.1', label:'Major depressive disorder, recurrent, moderate' },
  { code:'F33.2', label:'Major depressive disorder, recurrent, severe' },
  { code:'F33.9', label:'Major depressive disorder, recurrent, unspecified' },
  { code:'F41.0', label:'Panic disorder' },
  { code:'F41.1', label:'Generalized anxiety disorder' },
  { code:'F41.9', label:'Anxiety disorder, unspecified' },
  { code:'F40.10', label:'Social anxiety disorder' },
  { code:'F40.01', label:'Agoraphobia with panic disorder' },
  { code:'F42.2', label:'OCD — mixed obsessional thoughts and acts' },
  { code:'F43.10', label:'PTSD, unspecified' },
  { code:'F43.11', label:'PTSD, acute' },
  { code:'F43.12', label:'PTSD, chronic' },
  { code:'F43.22', label:'Adjustment disorder with anxiety' },
  { code:'F43.23', label:'Adjustment disorder with mixed anxiety and depressed mood' },
  { code:'F31.0',  label:'Bipolar I, current episode hypomanic' },
  { code:'F31.10', label:'Bipolar I, current episode manic, unspecified' },
  { code:'F31.30', label:'Bipolar I, current episode depressed' },
  { code:'F31.81', label:'Bipolar II disorder' },
  { code:'F31.9',  label:'Bipolar disorder, unspecified' },
  { code:'F20.9',  label:'Schizophrenia, unspecified' },
  { code:'F25.0',  label:'Schizoaffective disorder, bipolar type' },
  { code:'F25.1',  label:'Schizoaffective disorder, depressive type' },
  { code:'F90.0',  label:'ADHD, predominantly inattentive' },
  { code:'F90.1',  label:'ADHD, predominantly hyperactive-impulsive' },
  { code:'F90.2',  label:'ADHD, combined presentation' },
  { code:'F84.0',  label:'Autism spectrum disorder' },
  { code:'F60.3',  label:'Borderline personality disorder' },
  { code:'F60.2',  label:'Antisocial personality disorder' },
  { code:'F60.6',  label:'Avoidant personality disorder' },
  { code:'F60.9',  label:'Personality disorder, unspecified' },
  { code:'G47.00', label:'Insomnia, unspecified' },
  { code:'F51.01', label:'Primary insomnia' },
  { code:'F10.10', label:'Alcohol use disorder, mild' },
  { code:'F10.20', label:'Alcohol use disorder, moderate or severe' },
  { code:'F11.20', label:'Opioid use disorder, moderate or severe' },
  { code:'F12.20', label:'Cannabis use disorder, moderate or severe' },
  { code:'F14.20', label:'Cocaine use disorder, moderate or severe' },
  { code:'F50.00', label:'Anorexia nervosa, unspecified' },
  { code:'F50.2',  label:'Bulimia nervosa' },
  { code:'R45.851',label:'Suicidal ideation' },
  { code:'R45.88', label:'Nonsuicidal self-injurious behavior' },
  { code:'Z13.39', label:'Encounter for mental health screening' },
  { code:'E11.9',  label:'Type 2 diabetes mellitus without complications' },
  { code:'I10',    label:'Essential hypertension' },
  { code:'E78.5',  label:'Hyperlipidemia, unspecified' },
  { code:'E66.9',  label:'Obesity, unspecified' },
  { code:'K21.0',  label:'GERD with esophagitis' },
  { code:'F06.32', label:'Depressive disorder due to another medical condition' },
  { code:'F06.4',  label:'Anxiety disorder due to another medical condition' },
];

const QUICK_LABS = [
  'CMP (Comprehensive Metabolic Panel)',
  'BMP (Basic Metabolic Panel)',
  'CBC with Differential',
  'Lipid Panel',
  'TSH + Free T3/T4',
  'HbA1c + Fasting Glucose',
  'Lithium Level (trough)',
  'Valproic Acid (Depakote) Level',
  'Lamotrigine Level',
  'Carbamazepine Level',
  'Clozapine Level + ANC',
  'Olanzapine Level',
  'Metabolic Syndrome Panel',
  'Liver Function Tests (LFTs)',
  'Renal Function Panel',
  'Prolactin Level',
  'Vitamin D (25-OH)',
  'Vitamin B12 / Folate',
  'Urine Drug Screen (10-panel)',
  'Urine Drug Screen (5-panel)',
  'Fasting Insulin + HOMA-IR',
  'Urinalysis (UA)',
  'Testosterone (Total/Free)',
  'Cortisol (AM)',
  'Iron Studies (Fe, TIBC, Ferritin)',
];

const QUICK_MEDS = [
  { name:'sertraline',           dose:'50mg',  sig:'Take 1 tablet by mouth once daily in the morning', qty:'30', refills:'3' },
  { name:'escitalopram',         dose:'10mg',  sig:'Take 1 tablet by mouth once daily', qty:'30', refills:'3' },
  { name:'fluoxetine',           dose:'20mg',  sig:'Take 1 capsule by mouth once daily in the morning', qty:'30', refills:'3' },
  { name:'venlafaxine XR',       dose:'75mg',  sig:'Take 1 capsule by mouth once daily with food', qty:'30', refills:'3' },
  { name:'bupropion XL',         dose:'150mg', sig:'Take 1 tablet by mouth once daily in the morning', qty:'30', refills:'3' },
  { name:'mirtazapine',          dose:'15mg',  sig:'Take 1 tablet by mouth at bedtime', qty:'30', refills:'3' },
  { name:'buspirone',            dose:'10mg',  sig:'Take 1 tablet by mouth twice daily', qty:'60', refills:'3' },
  { name:'hydroxyzine',          dose:'25mg',  sig:'Take 1 tablet by mouth as needed for anxiety', qty:'30', refills:'3' },
  { name:'lorazepam',            dose:'0.5mg', sig:'Take 1 tablet by mouth as needed for anxiety. Max 2mg/day.', qty:'30', refills:'0' },
  { name:'clonazepam',           dose:'0.5mg', sig:'Take 1 tablet by mouth twice daily as needed', qty:'60', refills:'0' },
  { name:'quetiapine',           dose:'25mg',  sig:'Take 1 tablet by mouth at bedtime', qty:'30', refills:'3' },
  { name:'aripiprazole',         dose:'10mg',  sig:'Take 1 tablet by mouth once daily', qty:'30', refills:'3' },
  { name:'risperidone',          dose:'1mg',   sig:'Take 1 tablet by mouth twice daily', qty:'60', refills:'3' },
  { name:'olanzapine',           dose:'5mg',   sig:'Take 1 tablet by mouth at bedtime', qty:'30', refills:'3' },
  { name:'lithium carbonate',    dose:'300mg', sig:'Take 1 capsule by mouth three times daily with food', qty:'90', refills:'3' },
  { name:'valproic acid ER',     dose:'500mg', sig:'Take 1 tablet by mouth once daily with food', qty:'30', refills:'3' },
  { name:'lamotrigine',          dose:'100mg', sig:'Take 1 tablet by mouth twice daily', qty:'60', refills:'3' },
  { name:'amphetamine salts',    dose:'10mg',  sig:'Take 1 tablet by mouth in the morning', qty:'30', refills:'0' },
  { name:'methylphenidate',      dose:'10mg',  sig:'Take 1 tablet by mouth twice daily (morning and noon)', qty:'60', refills:'0' },
  { name:'atomoxetine',          dose:'40mg',  sig:'Take 1 capsule by mouth once daily in the morning', qty:'30', refills:'3' },
  { name:'trazodone',            dose:'50mg',  sig:'Take 1 tablet by mouth at bedtime as needed for sleep', qty:'30', refills:'3' },
  { name:'prazosin',             dose:'1mg',   sig:'Take 1 tablet by mouth at bedtime for nightmares', qty:'30', refills:'3' },
  { name:'naltrexone',           dose:'50mg',  sig:'Take 1 tablet by mouth once daily', qty:'30', refills:'3' },
  { name:'clozapine',            dose:'25mg',  sig:'Take 1 tablet by mouth twice daily with food', qty:'60', refills:'3' },
];

const TABS = ['diagnoses','orders','meds','labs'];
const TAB_LABELS = { diagnoses:'🩺 Diagnoses', orders:'📝 Orders', meds:'💊 Meds', labs:'🔬 Labs' };
const TYPE_ICON = { dx:'🩺', order:'📝', med:'💊', lab:'🔬' };

function blankDx()    { return { code:'', label:'', status:'Active', onsetDate:'' }; }
function blankOrder() { return { orderType:'Imaging', desc:'', priority:'Routine', notes:'' }; }
function blankMed()   { return { name:'', dose:'', sig:'', qty:'30', refills:'3' }; }
function blankLab()   { return { panel:'', priority:'Routine' }; }

export default function DiagnosisOrderComposer({ isOpen, onClose, patientId }) {
  const { addOrder, addProblem, addMedication } = usePatient();
  const { currentUser } = useAuth();

  const [tab, setTab]         = useState('diagnoses');
  const [search, setSearch]   = useState('');
  const [staged, setStaged]   = useState([]);
  const [submitting, setSub]  = useState(false);
  const [done, setDone]       = useState(false);

  const [dx,    setDx]    = useState(blankDx());
  const [ord,   setOrd]   = useState(blankOrder());
  const [med,   setMed]   = useState(blankMed());
  const [lab,   setLab]   = useState(blankLab());

  const [dxDrop,  setDxDrop]  = useState(false);
  const [medDrop, setMedDrop] = useState(false);
  const [labDrop, setLabDrop] = useState(false);

  const searchRef = useRef(null);
  const dxRef     = useRef(null);
  const medRef    = useRef(null);
  const labRef    = useRef(null);

  // Focus search on open
  useEffect(() => { if (isOpen) { setTimeout(() => searchRef.current?.focus(), 80); } }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch(''); setTab('diagnoses');
      setDx(blankDx()); setOrd(blankOrder()); setMed(blankMed()); setLab(blankLab());
      setDxDrop(false); setMedDrop(false); setLabDrop(false);
    }
  }, [isOpen]);

  // ── Unified search results ───────────────────────────────────────────────────
  const unifiedResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    ICD10.filter(c => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
      .slice(0, 4).forEach(c => results.push({ type:'dx', code:c.code, label:c.label }));
    QUICK_MEDS.filter(m => m.name.toLowerCase().includes(q))
      .slice(0, 3).forEach(m => results.push({ type:'med', ...m, label:`${m.name} ${m.dose}` }));
    QUICK_LABS.filter(l => l.toLowerCase().includes(q))
      .slice(0, 3).forEach(l => results.push({ type:'lab', panel:l, label:l }));
    return results.slice(0, 10);
  }, [search]);

  // ── Per-tab filtered lists ───────────────────────────────────────────────────
  const dxResults  = useMemo(() => {
    const q = dx.code.trim().toLowerCase() || dx.label.trim().toLowerCase();
    if (!q) return [];
    return ICD10.filter(c => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)).slice(0, 8);
  }, [dx.code, dx.label]);

  const medResults = useMemo(() => {
    const q = med.name.trim().toLowerCase();
    if (!q) return [];
    return QUICK_MEDS.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [med.name]);

  const labResults = useMemo(() => {
    const q = lab.panel.trim().toLowerCase();
    if (!q) return [];
    return QUICK_LABS.filter(l => l.toLowerCase().includes(q)).slice(0, 8);
  }, [lab.panel]);

  // ── Stage helpers ────────────────────────────────────────────────────────────
  const stage = (item) => setStaged(p => [...p, { ...item, _id: Date.now() + Math.random() }]);
  const unstage = (id) => setStaged(p => p.filter(i => i._id !== id));

  const stageFromSearch = (item) => {
    stage(item);
    setSearch('');
  };

  // ── Per-tab add ──────────────────────────────────────────────────────────────
  const addDx = () => {
    if (!dx.code || !dx.label) return;
    stage({ type:'dx', code:dx.code, label:dx.label, status:dx.status, onsetDate:dx.onsetDate });
    setDx(blankDx());
  };

  const addOrd = () => {
    if (!ord.desc.trim()) return;
    stage({ type:'order', orderType:ord.orderType, label:ord.desc, priority:ord.priority, notes:ord.notes });
    setOrd(blankOrder());
  };

  const addMed = () => {
    if (!med.name.trim()) return;
    stage({ type:'med', name:med.name, label:`${med.name}${med.dose ? ' ' + med.dose : ''}`, dose:med.dose, sig:med.sig, qty:med.qty, refills:med.refills });
    setMed(blankMed());
  };

  const addLab = () => {
    if (!lab.panel.trim()) return;
    stage({ type:'lab', panel:lab.panel, label:lab.panel, priority:lab.priority });
    setLab(blankLab());
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submitAll = async () => {
    if (!staged.length || submitting) return;
    setSub(true);
    const today = new Date().toISOString().split('T')[0];
    const provider = currentUser?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim();

    for (const item of staged) {
      try {
        if (item.type === 'dx') {
          await addProblem(patientId, { code:item.code, description:item.label, status:item.status||'Active', onsetDate:item.onsetDate||'', diagnosedBy:provider });
        } else if (item.type === 'med') {
          await addMedication(patientId, { name:item.name, dose:item.dose, sig:item.sig, route:'Oral', frequency:'Once daily', quantity:item.qty||'30', refills:item.refills||'0', prescriber:provider, startDate:today, status:'Active' });
        } else if (item.type === 'lab') {
          await addOrder(patientId, { type:'Lab', description:item.panel||item.label, priority:item.priority, status:'Pending', orderedDate:today, orderedBy:provider });
        } else if (item.type === 'order') {
          await addOrder(patientId, { type:item.orderType, description:item.label, priority:item.priority, notes:item.notes||'', status:'Pending', orderedDate:today, orderedBy:provider });
        }
      } catch (err) {
        console.error('[composer] item failed:', err.message);
      }
    }

    setSub(false);
    setDone(true);
    setTimeout(() => { setDone(false); setStaged([]); onClose(); }, 1400);
  };

  if (!isOpen) return null;

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1200, display:'flex', justifyContent:'flex-end' };
  const panel   = { width:'480px', maxWidth:'96vw', height:'100vh', background:'var(--bg-white)', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.18)', overflow:'hidden' };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────── */}
        <div style={{ padding:'16px 20px', borderBottom:'1.5px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0, background:'var(--bg-white)' }}>
          <span style={{ fontSize:20 }}>✦</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:15, color:'var(--text-primary)' }}>Diagnoses &amp; Orders</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>Search or build your clinical plan</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-muted)', lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        {/* ── Unified search ───────────────────────────────── */}
        <div style={{ padding:'12px 20px 0', flexShrink:0, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:8, padding:'8px 12px', transition:'border-color .15s' }}
               onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
               onBlur={e  => e.currentTarget.style.borderColor = 'var(--border)'}>
            <span style={{ fontSize:14, color:'var(--text-muted)' }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearch('')}
              placeholder="Search diagnoses, meds, labs…"
              style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, color:'var(--text-primary)' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:0 }}>×</button>}
          </div>

          {/* Unified results dropdown */}
          {unifiedResults.length > 0 && (
            <div style={{ position:'absolute', left:20, right:20, top:'100%', marginTop:4, background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:10, overflow:'hidden' }}>
              {unifiedResults.map((r, i) => (
                <div key={i}
                  onClick={() => stageFromSearch(r)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)', transition:'background .08s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--primary-light)'}
                  onMouseLeave={e => e.currentTarget.style.background=''}
                >
                  <span style={{ fontSize:15, width:22, textAlign:'center', flexShrink:0 }}>{TYPE_ICON[r.type]}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
                    {r.code && <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{r.code}</div>}
                    {r.type==='med' && <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1 }}>{r.sig?.slice(0,60)}</div>}
                  </div>
                  <span style={{ fontSize:10, color:'var(--primary)', fontWeight:700, flexShrink:0 }}>+ Add</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:'2px solid var(--border)', padding:'0 20px', marginTop:12, flexShrink:0, gap:0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'8px 14px', border:'none', borderBottom: tab===t ? '2.5px solid var(--primary)' : '2.5px solid transparent', background:'transparent', color: tab===t ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: tab===t ? 700 : 600, fontSize:12.5, cursor:'pointer', marginBottom:-2, transition:'color .12s' }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>

          {/* DIAGNOSES TAB */}
          {tab === 'diagnoses' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5 }}>ICD-10 Search</div>
              <div style={{ position:'relative' }} ref={dxRef}>
                <input
                  value={dx.code}
                  onChange={e => { setDx(p=>({...p, code:e.target.value})); setDxDrop(true); }}
                  onFocus={() => setDxDrop(true)}
                  placeholder="ICD-10 code  (e.g. F33.1)"
                  style={inputStyle}
                />
                {dxDrop && dxResults.length > 0 && (
                  <Dropdown items={dxResults.map(c=>({ label:c.label, sub:c.code }))} onSelect={c => { setDx(p=>({...p, code:c.code, label:c.label})); setDxDrop(false); }} />
                )}
              </div>
              <input
                value={dx.label}
                onChange={e => setDx(p=>({...p, label:e.target.value}))}
                placeholder="Description"
                style={inputStyle}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={dx.status} onChange={e=>setDx(p=>({...p,status:e.target.value}))} style={selectStyle}>
                    <option>Active</option>
                    <option>In Remission</option>
                    <option>Resolved</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Onset date</label>
                  <input type="date" value={dx.onsetDate} onChange={e=>setDx(p=>({...p,onsetDate:e.target.value}))} style={inputStyle} />
                </div>
              </div>
              <AddBtn disabled={!dx.code||!dx.label} onClick={addDx} />
            </div>
          )}

          {/* ORDERS TAB */}
          {tab === 'orders' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5 }}>New Order</div>
              <div>
                <label style={labelStyle}>Type</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['Imaging','Referral','Procedure','Other'].map(t => (
                    <button key={t} onClick={()=>setOrd(p=>({...p,orderType:t}))}
                      style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid', borderColor: ord.orderType===t ? 'var(--primary)' : 'var(--border)', background: ord.orderType===t ? 'var(--primary)' : 'transparent', color: ord.orderType===t ? '#fff' : 'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input value={ord.desc} onChange={e=>setOrd(p=>({...p,desc:e.target.value}))} placeholder="e.g. MRI Brain without contrast" style={inputStyle} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={ord.priority} onChange={e=>setOrd(p=>({...p,priority:e.target.value}))} style={selectStyle}>
                    <option>Routine</option><option>Urgent</option><option>STAT</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={ord.notes} onChange={e=>setOrd(p=>({...p,notes:e.target.value}))} placeholder="Clinical indication, special instructions…" rows={2} style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit' }} />
              </div>
              <AddBtn disabled={!ord.desc.trim()} onClick={addOrd} />
            </div>
          )}

          {/* MEDS TAB */}
          {tab === 'meds' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5 }}>Medication</div>
              <div style={{ position:'relative' }} ref={medRef}>
                <input value={med.name} onChange={e=>{setMed(p=>({...p,name:e.target.value})); setMedDrop(true);}} onFocus={()=>setMedDrop(true)} placeholder="Search medication…" style={inputStyle} />
                {medDrop && medResults.length > 0 && (
                  <Dropdown items={medResults.map(m=>({ label:m.name, sub:`${m.dose} · ${m.sig?.slice(0,50)}` }))} onSelect={(_, i) => { const m=medResults[i]; setMed({ name:m.name, dose:m.dose, sig:m.sig, qty:m.qty, refills:m.refills }); setMedDrop(false); }} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>Dose</label><input value={med.dose} onChange={e=>setMed(p=>({...p,dose:e.target.value}))} placeholder="50mg" style={inputStyle} /></div>
                <div><label style={labelStyle}>Qty</label><input value={med.qty} onChange={e=>setMed(p=>({...p,qty:e.target.value}))} placeholder="30" style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Sig</label><input value={med.sig} onChange={e=>setMed(p=>({...p,sig:e.target.value}))} placeholder="Take 1 tablet by mouth once daily" style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>Refills</label>
                <select value={med.refills} onChange={e=>setMed(p=>({...p,refills:e.target.value}))} style={selectStyle}>
                  {['0','1','2','3','5','11'].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <AddBtn disabled={!med.name.trim()} onClick={addMed} />
            </div>
          )}

          {/* LABS TAB */}
          {tab === 'labs' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5 }}>Lab Panel</div>
              <div style={{ position:'relative' }} ref={labRef}>
                <input value={lab.panel} onChange={e=>{setLab(p=>({...p,panel:e.target.value})); setLabDrop(true);}} onFocus={()=>setLabDrop(true)} placeholder="Search lab panels…" style={inputStyle} />
                {labDrop && labResults.length > 0 && (
                  <Dropdown items={labResults.map(l=>({ label:l }))} onSelect={(item) => { setLab(p=>({...p,panel:item.label})); setLabDrop(false); }} />
                )}
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <div style={{ display:'flex', gap:6 }}>
                  {['Routine','Urgent','STAT'].map(p=>(
                    <button key={p} onClick={()=>setLab(prev=>({...prev,priority:p}))}
                      style={{ padding:'5px 14px', borderRadius:20, border:'1.5px solid', borderColor: lab.priority===p ? 'var(--primary)':'var(--border)', background: lab.priority===p ? 'var(--primary)':'transparent', color: lab.priority===p ? '#fff':'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .12s' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick-pick common panels */}
              <div style={{ marginTop:4 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:6 }}>Quick pick</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['CBC with Differential','CMP (Comprehensive Metabolic Panel)','Lipid Panel','TSH + Free T3/T4','HbA1c + Fasting Glucose','Urine Drug Screen (10-panel)','Lithium Level (trough)','Metabolic Syndrome Panel'].map(l=>(
                    <button key={l} onClick={()=>{ stage({ type:'lab', panel:l, label:l, priority:lab.priority }); }}
                      style={{ padding:'4px 10px', borderRadius:16, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-secondary)', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .1s', whiteSpace:'nowrap' }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)';e.currentTarget.style.color='var(--primary)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-secondary)';}}>
                      + {l}
                    </button>
                  ))}
                </div>
              </div>

              <AddBtn disabled={!lab.panel.trim()} onClick={addLab} />
            </div>
          )}
        </div>

        {/* ── Staged plan ─────────────────────────────────── */}
        {staged.length > 0 && (
          <div style={{ borderTop:'2px solid var(--border)', flexShrink:0, maxHeight:220, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 20px 6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>Plan ({staged.length} item{staged.length!==1?'s':''})</span>
              <button onClick={()=>setStaged([])} style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>Clear all</button>
            </div>
            <div style={{ overflowY:'auto', padding:'0 20px 8px', flex:1 }}>
              {staged.map(item => (
                <div key={item._id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border-light)' }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{TYPE_ICON[item.type]}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                    {item.code && <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{item.code}</div>}
                    {item.priority && item.type!=='dx' && <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{item.priority}{item.orderType ? ` · ${item.orderType}` : ''}</div>}
                  </div>
                  <button onClick={()=>unstage(item._id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 2px', flexShrink:0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer / Submit ──────────────────────────────── */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg-white)' }}>
          {done ? (
            <div style={{ textAlign:'center', color:'var(--success)', fontWeight:700, fontSize:13.5, padding:'6px 0' }}>
              ✓ Plan submitted successfully
            </div>
          ) : (
            <button
              onClick={submitAll}
              disabled={!staged.length || submitting}
              style={{ width:'100%', padding:'11px', borderRadius:8, border:'none', background: staged.length ? 'var(--primary)' : 'var(--border)', color: staged.length ? '#fff' : 'var(--text-muted)', fontWeight:700, fontSize:13.5, cursor: staged.length ? 'pointer' : 'not-allowed', transition:'background .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {submitting ? '⏳ Submitting…' : staged.length ? `Submit Plan (${staged.length} item${staged.length!==1?'s':''})` : 'Add items to your plan'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Dropdown({ items, onSelect }) {
  return (
    <div style={{ position:'absolute', left:0, right:0, top:'100%', marginTop:3, background:'var(--bg-white)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:20, overflow:'hidden' }}>
      {items.map((item, i) => (
        <div key={i} onClick={() => onSelect(item, i)}
          style={{ padding:'8px 12px', cursor:'pointer', borderBottom: i<items.length-1 ? '1px solid var(--border-light)' : 'none', transition:'background .08s' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--primary-light)'}
          onMouseLeave={e=>e.currentTarget.style.background=''}>
          <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-primary)' }}>{item.label}</div>
          {item.sub && <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function AddBtn({ disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ alignSelf:'flex-end', padding:'7px 20px', borderRadius:7, border:'none', background: disabled ? 'var(--border)' : 'var(--primary)', color: disabled ? 'var(--text-muted)' : '#fff', fontWeight:700, fontSize:12.5, cursor: disabled ? 'not-allowed':'pointer', transition:'background .12s', marginTop:4 }}>
      + Add to plan
    </button>
  );
}

const inputStyle  = { width:'100%', padding:'8px 10px', border:'1.5px solid var(--border)', borderRadius:6, fontSize:12.5, color:'var(--text-primary)', background:'var(--bg)', outline:'none', boxSizing:'border-box', transition:'border-color .15s', fontFamily:'inherit' };
const selectStyle = { ...inputStyle, cursor:'pointer' };
const labelStyle  = { display:'block', fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.4, marginBottom:4 };
