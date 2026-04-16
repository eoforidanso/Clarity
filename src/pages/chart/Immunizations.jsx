import React from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Immunizations({ patientId }) {
  const { immunizations } = usePatient();
  const patientImm = immunizations[patientId] || [];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>💉 Immunization History ({patientImm.length})</h2>
        </div>
        <div className="card-body no-pad">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vaccine</th><th>Date</th><th>Site</th><th>Route</th><th>Lot #</th><th>Manufacturer</th><th>Administered By</th><th>Next Due</th>
              </tr>
            </thead>
            <tbody>
              {patientImm.map((imm) => (
                <tr key={imm.id}>
                  <td className="font-semibold">{imm.vaccine}</td>
                  <td>{imm.date}</td>
                  <td>{imm.site}</td>
                  <td>{imm.route}</td>
                  <td className="text-sm" style={{ fontFamily: 'monospace' }}>{imm.lot}</td>
                  <td className="text-sm">{imm.manufacturer}</td>
                  <td className="text-sm text-muted">{imm.administeredBy}</td>
                  <td>
                    <span className={`badge ${imm.nextDue === 'Complete' ? 'badge-success' : 'badge-warning'}`}>
                      {imm.nextDue}
                    </span>
                  </td>
                </tr>
              ))}
              {patientImm.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No immunization records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
