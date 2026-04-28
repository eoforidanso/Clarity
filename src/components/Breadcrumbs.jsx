import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePatient } from '../contexts/PatientContext';

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  schedule: 'Schedule',
  patients: 'Patient Search',
  chart: 'Chart',
  inbox: 'Clinical Inbox',
  prescribe: 'E-Prescribe',
  telehealth: 'Telehealth',
  'smart-phrases': 'Smart Phrases',
  'btg-audit': 'BTG Audit',
  'admin-toolkit': 'Admin Toolkit',
  session: 'Session',
  analytics: 'Analytics',
  'care-gaps': 'Care Gaps',
  'staff-messaging': 'Staff Messaging',
  settings: 'Settings',
  'billing-dashboard': 'Billing',
  'claims-management': 'Claims',
  'denial-management': 'Denials',
  'telehealth-billing': 'TH Billing',
  'patient-portal-billing': 'Patient Billing',
  'quality-measures': 'Quality Measures',
  documents: 'Documents',
  'audit-trail': 'Audit Trail',
  referrals: 'Referrals',
  'prior-auth': 'Prior Auth',
  'treatment-plans': 'Treatment Plans',
  'intake-forms': 'Intake Forms',
  superbills: 'Superbills',
  efax: 'eFax',
  'provider-performance': 'Provider Performance',
  waitlist: 'Waitlist',
  eligibility: 'Eligibility',
  'patient-statements': 'Statements',
  'batch-claims': 'Batch Claims',
  tasks: 'Tasks',
  'med-rec': 'Med Reconciliation',
  'patient-recall': 'Patient Recall',
  'cds-alerts': 'CDS Alerts',
  'report-builder': 'Report Builder',
  consents: 'Consents',
  'patient-education': 'Education',
  'secure-notes': 'Secure Notes',
  'insurance-cards': 'Insurance Cards',
  'fee-schedules': 'Fee Schedules',
  'scheduling-templates': 'Templates',
  'lab-tracking': 'Lab Tracking',
  'vitals-trending': 'Vitals Trending',
  'network-integrations': 'Network Integrations',
  'ai-triage': 'AI Triage',
  'patient-checkin': 'Patient Check-In',
  'cost-estimator': 'Cost Estimator',
};

const CHART_TAB_LABELS = {
  summary: 'Summary',
  encounters: 'Encounters',
  demographics: 'Demographics',
  allergies: 'Allergies',
  problems: 'Problem List',
  vitals: 'Vitals',
  medications: 'Medications',
  orders: 'Orders',
  assessments: 'Assessments',
  immunizations: 'Immunizations',
  labs: 'Lab Results',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { selectedPatient } = usePatient();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1 && segments[0] === 'dashboard') return null;

  const crumbs = [{ label: 'Home', path: '/dashboard' }];

  if (segments[0] === 'chart' && segments.length >= 2) {
    crumbs.push({ label: 'Patients', path: '/patients' });
    if (selectedPatient) {
      crumbs.push({
        label: `${selectedPatient.lastName}, ${selectedPatient.firstName}`,
        path: `/chart/${segments[1]}/summary`,
      });
    }
    if (segments[2] && CHART_TAB_LABELS[segments[2]]) {
      crumbs.push({ label: CHART_TAB_LABELS[segments[2]], path: null });
    }
  } else if (segments[0] === 'session') {
    crumbs.push({ label: 'Schedule', path: '/schedule' });
    crumbs.push({ label: 'Clinical Session', path: null });
  } else {
    const routeKey = segments[0];
    crumbs.push({ label: ROUTE_LABELS[routeKey] || routeKey, path: null });
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {c.path && i < crumbs.length - 1 ? (
            <Link to={c.path} className="breadcrumb-link">{c.label}</Link>
          ) : (
            <span className="breadcrumb-current">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
