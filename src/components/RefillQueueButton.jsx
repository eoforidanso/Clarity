import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RefillQueueButton({ medication, patientId, patientName }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [toast, setToast] = useState(null);

  const handleAddToQueue = () => {
    try {
      // Load existing refills
      const stored = localStorage.getItem('clarity_refill_queue') || '[]';
      const refillQueue = JSON.parse(stored);

      // Create new refill record
      const newRefill = {
        id: `refill-${Date.now()}`,
        patientId,
        patientName,
        medicationId: medication.id,
        medicationName: medication.name,
        dose: medication.dose || '',
        frequency: medication.frequency || '',
        refillsRemaining: medication.refillsLeft || 0,
        daysRemaining: Math.floor(medication.daysSupply || 30),
        lastFilled: medication.lastFilled || new Date().toISOString().slice(0, 10),
        pharmacy: medication.pharmacy || '',
        pharmacyPhone: medication.pharmacyPhone || '',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        createdBy: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'System',
        queuedAt: null,
        sentAt: null,
        notes: '',
      };

      // Add to queue
      refillQueue.push(newRefill);
      localStorage.setItem('clarity_refill_queue', JSON.stringify(refillQueue));

      // Show success toast
      setToast('✅ Added to refill queue');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('Error adding to refill queue:', err);
      setToast('❌ Failed to add to queue');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleGoToQueue = () => {
    navigate('/refill-queue', { state: { medicationId: medication.id } });
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'white',
          padding: '12px 16px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: 13,
          fontWeight: 700,
          zIndex: 3000,
          animation: 'slideIn 0.3s ease',
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAddToQueue}
          title="Add this medication to the refill queue"
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#f0fdf4',
            color: '#10b981',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#10b981';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0fdf4';
            e.currentTarget.style.color = '#10b981';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          💊 Add to Queue
        </button>

        <button
          onClick={handleGoToQueue}
          title="Go to refill queue dashboard"
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: 'white',
            color: '#3b82f6',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eff6ff';
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          📋 Queue
        </button>
      </div>
    </div>
  );
}
