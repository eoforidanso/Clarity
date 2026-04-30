import React, { useState } from 'react';
import { useTraining } from '../contexts/TrainingContext';

export default function TrainingBanner() {
  const { isTraining, disableTraining, resetTrainingData } = useTraining();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  if (!isTraining) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '8px',
      background: 'linear-gradient(90deg, #7c2d12, #c2410c)',
      borderBottom: '2px solid #ea580c',
      padding: '7px 18px',
      fontSize: 12,
      fontWeight: 700,
      color: '#fff',
      flexShrink: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          background: '#fff',
          color: '#c2410c',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.5px',
        }}>
          TRAINING
        </span>
        <span>You are in <strong>Training Mode</strong> — no real patient data will be affected. Safe to explore all features.</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Reset */}
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 5,
              padding: '3px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔄 Reset Training Data
          </button>
        ) : (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11 }}>Reset all data?</span>
            <button
              onClick={() => { setConfirmReset(false); resetTrainingData(); }}
              style={{ background: '#fff', color: '#c2410c', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </span>
        )}

        {/* Exit */}
        {!confirmExit ? (
          <button
            onClick={() => setConfirmExit(true)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 5,
              padding: '3px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ✕ Exit Training Mode
          </button>
        ) : (
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11 }}>Exit training?</span>
            <button
              onClick={() => { setConfirmExit(false); disableTraining(); }}
              style={{ background: '#fff', color: '#c2410c', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
            >
              Yes, Exit
            </button>
            <button
              onClick={() => setConfirmExit(false)}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
