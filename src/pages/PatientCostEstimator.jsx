import React, { useState, useMemo } from 'react';

/* ── Patient Cost Estimator ──────────────────────────────
   Pre-visit out-of-pocket cost estimates based on benefits
   Matches athenaOne's payment estimation workflow
──────────────────────────────────────────────────────── */

const SERVICE_CATEGORIES = [
  {
    id: 'office-visit', name: 'Office Visits', icon: '🏥',
    services: [
      { cpt: '99213', desc: 'Office Visit — Low Complexity', baseFee: 150 },
      { cpt: '99214', desc: 'Office Visit — Moderate Complexity', baseFee: 220 },
      { cpt: '99215', desc: 'Office Visit — High Complexity', baseFee: 320 },
      { cpt: '99205', desc: 'New Patient — High Complexity', baseFee: 380 },
    ],
  },
  {
    id: 'psych-eval', name: 'Psychiatric Evaluations', icon: '🧠',
    services: [
      { cpt: '90791', desc: 'Psychiatric Diagnostic Evaluation', baseFee: 350 },
      { cpt: '90792', desc: 'Psych Eval w/ Medical Services', baseFee: 400 },
    ],
  },
  {
    id: 'therapy', name: 'Psychotherapy', icon: '💬',
    services: [
      { cpt: '90832', desc: 'Psychotherapy 16–37 min', baseFee: 120 },
      { cpt: '90834', desc: 'Psychotherapy 38–52 min', baseFee: 175 },
      { cpt: '90837', desc: 'Psychotherapy 53+ min', baseFee: 230 },
    ],
  },
  {
    id: 'med-mgmt', name: 'Medication Management', icon: '💊',
    services: [
      { cpt: '99213', desc: 'Med Management — Follow-Up', baseFee: 150 },
      { cpt: '99214', desc: 'Med Management — Complex', baseFee: 220 },
    ],
  },
  {
    id: 'testing', name: 'Psychological Testing', icon: '📋',
    services: [
      { cpt: '96130', desc: 'Psych Testing Evaluation', baseFee: 250 },
      { cpt: '96131', desc: 'Psych Testing Eval Add-On (each 30min)', baseFee: 150 },
      { cpt: '96136', desc: 'Psych Test Administration', baseFee: 110 },
    ],
  },
  {
    id: 'crisis', name: 'Crisis Services', icon: '🚨',
    services: [
      { cpt: '90839', desc: 'Crisis Psychotherapy — First 60 min', baseFee: 280 },
      { cpt: '90840', desc: 'Crisis — Add-On per 30 min', baseFee: 140 },
    ],
  },
  {
    id: 'telehealth', name: 'Telehealth', icon: '📹',
    services: [
      { cpt: '99213-95', desc: 'Telehealth — Low Complexity', baseFee: 140 },
      { cpt: '99214-95', desc: 'Telehealth — Moderate Complexity', baseFee: 210 },
      { cpt: '90834-95', desc: 'Telehealth Psychotherapy 38-52 min', baseFee: 165 },
    ],
  },
];

const INSURANCE_PLANS = [
  { id: 'bcbs-ppo', name: 'Blue Cross PPO', copay: 30, deductible: 1500, deductibleMet: 1120, coinsurance: 20, oopMax: 6000, oopMet: 2340, inNetwork: true, mentalHealthParity: true },
  { id: 'aetna-hmo', name: 'Aetna HMO', copay: 25, deductible: 2000, deductibleMet: 750, coinsurance: 30, oopMax: 5500, oopMet: 1200, inNetwork: true, mentalHealthParity: true },
  { id: 'uhc-ppo', name: 'UnitedHealthcare PPO', copay: 40, deductible: 2500, deductibleMet: 2500, coinsurance: 20, oopMax: 7000, oopMet: 3800, inNetwork: true, mentalHealthParity: true },
  { id: 'cigna-epo', name: 'Cigna EPO', copay: 35, deductible: 1000, deductibleMet: 1000, coinsurance: 25, oopMax: 4500, oopMet: 1680, inNetwork: true, mentalHealthParity: true },
  { id: 'medicare', name: 'Medicare Part B', copay: 0, deductible: 257, deductibleMet: 257, coinsurance: 20, oopMax: 999999, oopMet: 0, inNetwork: true, mentalHealthParity: true },
  { id: 'medicaid', name: 'Medicaid', copay: 0, deductible: 0, deductibleMet: 0, coinsurance: 0, oopMax: 999999, oopMet: 0, inNetwork: true, mentalHealthParity: true },
  { id: 'self-pay', name: 'Self-Pay / Uninsured', copay: 0, deductible: 0, deductibleMet: 0, coinsurance: 100, oopMax: 999999, oopMet: 0, inNetwork: false, mentalHealthParity: false },
];

export default function PatientCostEstimator() {
  const [selectedPlan, setSelectedPlan] = useState(INSURANCE_PLANS[0]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.cpt === service.cpt);
      if (exists) return prev.filter(s => s.cpt !== service.cpt);
      return [...prev, { ...service, qty: 1 }];
    });
  };

  const updateQty = (cpt, qty) => {
    setSelectedServices(prev => prev.map(s => s.cpt === cpt ? { ...s, qty: Math.max(1, qty) } : s));
  };

  const estimate = useMemo(() => {
    if (!selectedServices.length) return null;
    const plan = selectedPlan;
    const totalCharges = selectedServices.reduce((s, svc) => s + (svc.baseFee * svc.qty), 0);

    if (plan.id === 'self-pay') {
      const slidingScale = totalCharges * 0.6; // 40% discount for self-pay
      return {
        totalCharges,
        allowedAmount: totalCharges,
        deductibleApplied: 0,
        coinsurancePortion: 0,
        copay: 0,
        patientResponsibility: slidingScale,
        planPays: 0,
        discount: totalCharges - slidingScale,
        note: 'Self-pay sliding scale applied (40% discount)',
      };
    }

    if (plan.id === 'medicaid') {
      return {
        totalCharges,
        allowedAmount: totalCharges * 0.45,
        deductibleApplied: 0,
        coinsurancePortion: 0,
        copay: 0,
        patientResponsibility: 0,
        planPays: totalCharges * 0.45,
        discount: 0,
        note: 'Medicaid — $0 patient responsibility',
      };
    }

    const allowedAmount = totalCharges * 0.85; // contracted rate
    const remainingDeductible = Math.max(0, plan.deductible - plan.deductibleMet);
    const deductibleApplied = Math.min(remainingDeductible, allowedAmount);
    const afterDeductible = allowedAmount - deductibleApplied;
    const coinsurancePortion = afterDeductible * (plan.coinsurance / 100);
    const remainingOop = Math.max(0, plan.oopMax - plan.oopMet);
    const totalPatient = Math.min(deductibleApplied + coinsurancePortion + plan.copay, remainingOop);
    const planPays = allowedAmount - deductibleApplied - coinsurancePortion;

    return {
      totalCharges,
      allowedAmount: Math.round(allowedAmount * 100) / 100,
      deductibleApplied: Math.round(deductibleApplied * 100) / 100,
      coinsurancePortion: Math.round(coinsurancePortion * 100) / 100,
      copay: plan.copay,
      patientResponsibility: Math.round(totalPatient * 100) / 100,
      planPays: Math.round(Math.max(0, planPays) * 100) / 100,
      discount: Math.round((totalCharges - allowedAmount) * 100) / 100,
      note: null,
    };
  }, [selectedServices, selectedPlan]);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>💲 Patient Cost Estimator</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Pre-visit out-of-pocket cost estimates based on insurance benefits — Good Faith Estimate compliant
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">📄 Print Estimate</button>
          <button className="btn btn-primary btn-sm">📧 Email to Patient</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* Left — Service selection */}
        <div>
          {/* Insurance plan selector */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2 style={{ margin: 0, fontSize: 14 }}>💳 Select Insurance Plan</h2></div>
            <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {INSURANCE_PLANS.map(plan => (
                <button key={plan.id}
                  className={`btn btn-sm ${selectedPlan.id === plan.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedPlan(plan)}>
                  {plan.name}
                </button>
              ))}
            </div>
          </div>

          {/* Benefit summary */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2 style={{ margin: 0, fontSize: 14 }}>📊 Benefit Summary — {selectedPlan.name}</h2></div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: '#f0f9ff' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Copay</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>${selectedPlan.copay}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: '#f0fdf4' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Deductible</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>${selectedPlan.deductibleMet.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>/${selectedPlan.deductible.toLocaleString()}</span></div>
                <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#e5e7eb', marginTop: 4 }}>
                  <div style={{ width: `${Math.min(100, (selectedPlan.deductibleMet / selectedPlan.deductible) * 100)}%`, height: '100%', borderRadius: 4, background: '#22c55e' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: '#fefce8' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Coinsurance</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#a16207' }}>{selectedPlan.coinsurance}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: '#faf5ff' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OOP Max</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>${selectedPlan.oopMet.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>/{selectedPlan.oopMax === 999999 ? 'N/A' : `$${selectedPlan.oopMax.toLocaleString()}`}</span></div>
                {selectedPlan.oopMax < 999999 && (
                  <div style={{ width: '100%', height: 4, borderRadius: 4, background: '#e5e7eb', marginTop: 4 }}>
                    <div style={{ width: `${Math.min(100, (selectedPlan.oopMet / selectedPlan.oopMax) * 100)}%`, height: '100%', borderRadius: 4, background: '#8b5cf6' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service selection */}
          <div className="card">
            <div className="card-header"><h2 style={{ margin: 0, fontSize: 14 }}>🏥 Select Services</h2></div>
            <div className="card-body">
              {SERVICE_CATEGORIES.map(cat => (
                <div key={cat.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                    {cat.icon} {cat.name}
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {cat.services.map(svc => {
                      const isSelected = selectedServices.some(s => s.cpt === svc.cpt);
                      return (
                        <div key={svc.cpt}
                          onClick={() => toggleService(svc)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                            background: isSelected ? 'var(--primary-light)' : '#fff',
                          }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--primary)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 11, flexShrink: 0,
                          }}>
                            {isSelected && '✓'}
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{svc.cpt}</span>
                          <span style={{ flex: 1, fontSize: 12.5 }}>{svc.desc}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>${svc.baseFee}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Estimate summary */}
        <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #0060b6, #3b82f6)',
              color: '#fff',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Estimated Patient Responsibility</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>
                {estimate ? `$${estimate.patientResponsibility.toFixed(2)}` : '$0.00'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Good Faith Estimate</div>
            </div>

            <div className="card-body">
              {selectedServices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
                  Select services to see cost estimate
                </div>
              ) : (
                <>
                  {/* Selected services */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Selected Services</div>
                    {selectedServices.map(svc => (
                      <div key={svc.cpt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{svc.cpt}</span>
                        <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: 11 }}>{svc.desc}</span>
                        <input type="number" min={1} max={10} value={svc.qty}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateQty(svc.cpt, Number(e.target.value))}
                          style={{ width: 36, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, textAlign: 'center' }} />
                        <span style={{ fontWeight: 700, minWidth: 48, textAlign: 'right' }}>${(svc.baseFee * svc.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cost breakdown */}
                  {estimate && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginBottom: 12, fontSize: 11 }}
                        onClick={() => setShowBreakdown(v => !v)}>
                        {showBreakdown ? '▲ Hide' : '▼ Show'} Detailed Breakdown
                      </button>
                      {showBreakdown && (
                        <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Charges</span>
                            <span style={{ fontWeight: 600 }}>${estimate.totalCharges.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Network Discount</span>
                            <span style={{ fontWeight: 600, color: '#22c55e' }}>−${estimate.discount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Allowed Amount</span>
                            <span style={{ fontWeight: 600 }}>${estimate.allowedAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Deductible Applied</span>
                            <span style={{ fontWeight: 600 }}>${estimate.deductibleApplied.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Coinsurance ({selectedPlan.coinsurance}%)</span>
                            <span style={{ fontWeight: 600 }}>${estimate.coinsurancePortion.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Copay</span>
                            <span style={{ fontWeight: 600 }}>${estimate.copay.toFixed(2)}</span>
                          </div>
                          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Plan Pays</span>
                            <span style={{ fontWeight: 600, color: '#22c55e' }}>${estimate.planPays.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      {estimate.note && (
                        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#fefce8', border: '1px solid #fde047', fontSize: 11, color: '#854d0e' }}>
                          ℹ️ {estimate.note}
                        </div>
                      )}
                      <div style={{
                        marginTop: 12, padding: '12px 16px', borderRadius: 8,
                        background: 'linear-gradient(135deg, #f0f9ff, #dbeafe)',
                        border: '1.5px solid #93c5fd', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af' }}>YOU PAY</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>${estimate.patientResponsibility.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#fafbfc', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong>⚠️ Disclaimer:</strong> This is an estimate only. Actual costs may vary based on services rendered, coding, and your plan's specific adjudication. This estimate is provided in compliance with the No Surprises Act Good Faith Estimate requirements.
          </div>
        </div>
      </div>
    </div>
  );
}
