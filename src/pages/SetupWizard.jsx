import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 'practice',  label: 'Practice Info',    icon: '🏥' },
  { id: 'location',  label: 'First Location',   icon: '📍' },
  { id: 'provider',  label: 'Add a Provider',   icon: '👤' },
  { id: 'billing',   label: 'Billing Setup',    icon: '💳' },
  { id: 'done',      label: 'All set!',         icon: '🎉' },
];

function StepBar({ currentIndex }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: i < currentIndex ? 16 : 14,
              background: i < currentIndex ? 'var(--primary)' : i === currentIndex ? 'var(--primary)' : 'var(--bg-secondary)',
              color: i <= currentIndex ? '#fff' : 'var(--text-secondary)',
              border: i === currentIndex ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: 700,
              boxShadow: i === currentIndex ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
            }}>
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i <= currentIndex ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === currentIndex ? 700 : 400 }}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              width: 48, height: 2, marginBottom: 20,
              background: i < currentIndex ? 'var(--primary)' : 'var(--border)',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function PracticeStep({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Tell us about your practice</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>This info appears on patient documents and superbills.</p>
      {[
        { label: 'Practice Name', key: 'name', placeholder: 'Clarity Mental Health' },
        { label: 'Specialty', key: 'specialty', placeholder: 'Psychiatry / Mental Health' },
        { label: 'NPI (Group)', key: 'npi', placeholder: '1234567890' },
        { label: 'Tax ID / EIN', key: 'taxId', placeholder: '12-3456789' },
        { label: 'Phone', key: 'phone', placeholder: '(555) 000-0000' },
        { label: 'Website', key: 'website', placeholder: 'https://clarity.health' },
      ].map(({ label, key, placeholder }) => (
        <div className="form-group" key={key}>
          <label className="form-label">{label}</label>
          <input className="form-input" placeholder={placeholder} value={data[key] || ''} onChange={e => onChange(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function LocationStep({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Your first office location</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>You can add more locations later in Multi-Location settings.</p>
      {[
        { label: 'Location Name', key: 'locName', placeholder: 'Main Office' },
        { label: 'Address', key: 'address', placeholder: '123 Wellness Ave' },
        { label: 'City', key: 'city', placeholder: 'New York' },
        { label: 'State', key: 'state', placeholder: 'NY' },
        { label: 'ZIP', key: 'zip', placeholder: '10001' },
        { label: 'Phone', key: 'locPhone', placeholder: '(555) 000-0000' },
      ].map(({ label, key, placeholder }) => (
        <div className="form-group" key={key}>
          <label className="form-label">{label}</label>
          <input className="form-input" placeholder={placeholder} value={data[key] || ''} onChange={e => onChange(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function ProviderStep({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Add your first provider</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>You can add and manage providers in User Management.</p>
      {[
        { label: 'First Name', key: 'provFirst', placeholder: 'Jane' },
        { label: 'Last Name', key: 'provLast', placeholder: 'Smith' },
        { label: 'Credentials', key: 'provCreds', placeholder: 'MD, NP, LCSW…' },
        { label: 'Specialty', key: 'provSpecialty', placeholder: 'Psychiatry' },
        { label: 'NPI (Individual)', key: 'provNpi', placeholder: '1234567890' },
        { label: 'Email', key: 'provEmail', placeholder: 'jane@clinic.com' },
      ].map(({ label, key, placeholder }) => (
        <div className="form-group" key={key}>
          <label className="form-label">{label}</label>
          <input className="form-input" placeholder={placeholder} value={data[key] || ''} onChange={e => onChange(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function BillingStep({ data, onChange }) {
  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Billing configuration</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>Set up your clearinghouse and payer connections. You can skip and configure later.</p>
      {[
        { label: 'Clearinghouse', key: 'clearinghouse', placeholder: 'Change Healthcare / Availity / Waystar' },
        { label: 'Submitter ID', key: 'submitterId', placeholder: 'Your EDI submitter ID' },
        { label: 'Primary Payer (most common)', key: 'primaryPayer', placeholder: 'Blue Cross Blue Shield' },
        { label: 'Default POS Code', key: 'pos', placeholder: '11 (Office) / 02 (Telehealth)' },
      ].map(({ label, key, placeholder }) => (
        <div className="form-group" key={key}>
          <label className="form-label">{label}</label>
          <input className="form-input" placeholder={placeholder} value={data[key] || ''} onChange={e => onChange(key, e.target.value)} />
        </div>
      ))}
      <div className="alert" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginTop: 8, fontSize: 13 }}>
        💡 Billing setup can be completed later in <strong>Payer Profiles</strong> and <strong>Fee Schedules</strong>.
      </div>
    </div>
  );
}

function DoneStep({ navigate }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Clarity is ready!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
        Your practice is configured. You can update any of these settings at any time from the Admin Toolkit.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/schedule')}>
          Go to Schedule →
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/patient-registration')}>
          Register First Patient
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
      </div>
    </div>
  );
}

export default function SetupWizard() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({});

  const onChange = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1);
      if (stepIndex === STEPS.length - 2) {
        try { localStorage.setItem('clarity_setup_complete', '1'); } catch {}
      }
    }
  };

  const back = () => setStepIndex(i => Math.max(0, i - 1));

  const currentStep = STEPS[stepIndex];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>🧠 Clarity</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Practice Setup · Step {stepIndex + 1} of {STEPS.length}</div>
        </div>
        <StepBar currentIndex={stepIndex} />
        <div className="card" style={{ padding: 32 }}>
          {currentStep.id === 'practice'  && <PracticeStep data={data} onChange={onChange} />}
          {currentStep.id === 'location'  && <LocationStep data={data} onChange={onChange} />}
          {currentStep.id === 'provider'  && <ProviderStep data={data} onChange={onChange} />}
          {currentStep.id === 'billing'   && <BillingStep data={data} onChange={onChange} />}
          {currentStep.id === 'done'      && <DoneStep navigate={navigate} />}

          {currentStep.id !== 'done' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={back} disabled={stepIndex === 0}>← Back</button>
              <div style={{ display: 'flex', gap: 10 }}>
                {stepIndex < STEPS.length - 2 && (
                  <button className="btn btn-ghost" onClick={next} style={{ color: 'var(--text-secondary)' }}>Skip</button>
                )}
                <button className="btn btn-primary" onClick={next}>
                  {stepIndex === STEPS.length - 2 ? 'Finish Setup' : 'Next →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
