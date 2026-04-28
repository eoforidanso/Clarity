import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatient } from '../contexts/PatientContext';

export default function BTGGuard({ patientId, children }) {
  const { currentUser } = useAuth();
  const { selectedPatient, hasBTGAccess, requestBTGAccess } = usePatient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!selectedPatient || !selectedPatient.isBTG) {
    return children;
  }

  // Patient's assigned provider can always access
  if (selectedPatient.assignedProvider === currentUser?.id) {
    return children;
  }

  if (hasBTGAccess(patientId)) {
    return children;
  }

  const handleBTG = () => {
    if (reason.trim().length < 10) {
      setError('Please provide a detailed reason (at least 10 characters) for accessing this protected record.');
      return;
    }
    const userName = `${currentUser.firstName} ${currentUser.lastName}${currentUser.credentials ? ', ' + currentUser.credentials : ''}`;
    requestBTGAccess(patientId, currentUser.id, userName, reason);
  };

  return (
    <div className="btg-overlay">
      <div className="btg-icon">🔒</div>
      <h2>Break-the-Glass Access Required</h2>
      <p>
        This patient's record is protected under BTG (Break-the-Glass) policy. 
        Access is restricted to authorized providers only. To proceed, you must 
        provide a valid clinical reason. All access attempts are logged and audited.
      </p>

      <div className="alert alert-warning" style={{ textAlign: 'left' }}>
        <strong>⚠️ Warning:</strong> Unauthorized access to protected health information 
        is a violation of HIPAA regulations and organizational policy. Your access will 
        be recorded in the audit log.
      </div>

      <div className="form-group" style={{ textAlign: 'left' }}>
        <label className="form-label">Reason for Access *</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Enter a detailed clinical reason for accessing this record..."
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(''); }}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-danger" onClick={handleBTG}>
          🔓 Break the Glass — Access Record
        </button>
      </div>
    </div>
  );
}
