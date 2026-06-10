/**
 * AssessmentScorer — PHQ-9 / GAD-7 / C-SSRS
 * Renders the questionnaire, auto-scores, trends previous scores over time.
 */
import React, { useState, useMemo } from 'react';
import { ASSESSMENTS, ASSESSMENT_LIST } from '../data/assessmentTemplates';

const BG    = '#1a1f2e';
const BG2   = '#232838';
const BG3   = '#2a3045';
const BORDER = 'rgba(255,255,255,0.08)';
const T_PRI = 'rgba(255,255,255,0.95)';
const T_SEC = 'rgba(255,255,255,0.60)';
const T_MUT = 'rgba(255,255,255,0.38)';
const ACCENT = '#6366f1';

// Simple SVG sparkline
function Sparkline({ scores, maxScore, color = '#6366f1' }) {
  if (!scores || scores.length < 2) return null;
  const W = 220, H = 48, PAD = 4;
  const max = maxScore || Math.max(...scores.map(s => s.score), 1);
  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - s.score / max) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');
  const lastScore = scores[scores.length - 1];
  const lx = PAD + (W - PAD * 2);
  const ly = PAD + (1 - lastScore.score / max) * (H - PAD * 2);

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="4" fill={color} />
      {scores.map((s, i) => {
        const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
        const y = PAD + (1 - s.score / max) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0.5" />;
      })}
    </svg>
  );
}

function HistoryRow({ entry, maxScore }) {
  const result = typeof entry.scoring === 'function'
    ? entry.scoring(entry.score)
    : entry.result;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <span style={{ fontSize: 11, color: T_MUT, minWidth: 82 }}>{entry.date}</span>
      <div style={{
        fontSize: 14, fontWeight: 800, minWidth: 28, color: result?.color || T_PRI,
      }}>
        {entry.score !== undefined ? entry.score : '—'}
        {maxScore && <span style={{ fontSize: 10, fontWeight: 400, color: T_MUT }}>/{maxScore}</span>}
      </div>
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
        background: result?.bg || BG3, color: result?.color || T_SEC,
        border: `1px solid ${result?.color || BORDER}40`,
      }}>
        {result?.severity || entry.severity || '—'}
      </span>
      {entry.provider && <span style={{ fontSize: 10.5, color: T_MUT, marginLeft: 'auto' }}>{entry.provider}</span>}
    </div>
  );
}

export default function AssessmentScorer({ patientId, patientName, existingScores = {}, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('PHQ9');
  const [answers, setAnswers] = useState({});
  const [followUp, setFollowUp] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const tmpl = ASSESSMENTS[activeTab];
  const isCSSRS = activeTab === 'CSSRS';

  const score = useMemo(() => {
    if (isCSSRS) return null;
    return tmpl.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
  }, [answers, tmpl, isCSSRS]);

  const result = useMemo(() => {
    if (!tmpl) return null;
    if (isCSSRS) return tmpl.scoring(answers);
    if (score === null) return null;
    return tmpl.scoring(score);
  }, [answers, score, tmpl, isCSSRS]);

  const prevScores = existingScores[activeTab] || [];
  const hasSuicidalFlag = !isCSSRS && answers['phq9'] >= 1;

  const handleSubmit = () => {
    const entry = {
      date: new Date().toISOString().split('T')[0],
      assessmentId: activeTab,
      answers: { ...answers },
      score: score ?? null,
      result,
      followUp,
      provider: 'Current Provider',
    };
    onSave?.(activeTab, entry);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setFollowUp('');
    setSubmitted(false);
  };

  const allAnswered = tmpl.questions.every(q => answers[q.id] !== undefined);

  return (
    <div style={{
      background: BG, border: `1px solid ${BORDER}`, borderRadius: 14,
      overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#141824', padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div>
          <div style={{ color: T_PRI, fontWeight: 700, fontSize: 15 }}>📋 Clinical Assessments</div>
          <div style={{ color: T_MUT, fontSize: 11, marginTop: 2 }}>
            {patientName || 'Patient'} · standardized screening tools
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background:'none', border:'none', color:T_MUT, fontSize:20, cursor:'pointer' }}>✕</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: BG2 }}>
        {ASSESSMENT_LIST.map(a => (
          <button
            key={a.id}
            onClick={() => { setActiveTab(a.id); setAnswers({}); setFollowUp(''); setSubmitted(false); }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: activeTab === a.id ? BG3 : 'transparent',
              color: activeTab === a.id ? T_PRI : T_MUT,
              fontWeight: activeTab === a.id ? 700 : 400,
              fontSize: 12.5,
              borderBottom: activeTab === a.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {a.name}
            {(existingScores[a.id]?.length > 0) && (
              <span style={{ fontSize: 9.5, marginLeft: 4, color: ACCENT }}>
                ({existingScores[a.id].length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', height: 520 }}>

        {/* Left: questionnaire */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10.5, color: T_MUT, marginBottom: 4 }}>{tmpl.fullName}</div>
          <div style={{ fontSize: 11.5, color: T_SEC, marginBottom: 14, lineHeight: 1.5 }}>{tmpl.instructions}</div>

          {submitted && result ? (
            /* ── Result card ── */
            <div style={{ background: result.bg, border: `1px solid ${result.color}40`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {tmpl.name} Result
              </div>
              {!isCSSRS && (
                <div style={{ fontSize: 28, fontWeight: 900, color: result.color, margin: '4px 0' }}>
                  {score} <span style={{ fontSize: 13, fontWeight: 400 }}>/ {tmpl.maxScore}</span>
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: result.color }}>{result.severity}</div>
              <div style={{ fontSize: 12, color: result.color, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>
                {result.recommendation}
              </div>
              {hasSuicidalFlag && (
                <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                  ⚠ PHQ-9 Item 9 positive — conduct C-SSRS evaluation
                </div>
              )}
              <button
                onClick={handleReset}
                style={{ marginTop: 12, background: 'none', border: `1px solid ${result.color}60`, color: result.color, borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}
              >
                Take Again
              </button>
            </div>
          ) : (
            <>
              {tmpl.questions.map((q, qi) => (
                <div key={q.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, color: T_PRI, marginBottom: 6, lineHeight: 1.45 }}>
                    <span style={{ color: T_MUT, fontSize: 11 }}>{qi + 1}. </span>
                    {q.text}
                    {q.isSuicidal && <span style={{ fontSize: 10, color: '#dc2626', marginLeft: 6 }}>⚠ Item 9</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tmpl.options.map(opt => {
                      const sel = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                          style={{
                            padding: '5px 10px', fontSize: 11.5, borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${sel ? ACCENT : BORDER}`,
                            background: sel ? `${ACCENT}25` : BG3,
                            color: sel ? T_PRI : T_SEC,
                            fontWeight: sel ? 700 : 400,
                            transition: 'all 0.12s',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {tmpl.followUpQuestion && !isCSSRS && (
                <div style={{ marginTop: 8, padding: 12, background: BG2, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 12, color: T_SEC, marginBottom: 8, lineHeight: 1.45 }}>{tmpl.followUpQuestion.text}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tmpl.followUpQuestion.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFollowUp(opt)}
                        style={{
                          padding: '4px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                          border: `1px solid ${followUp === opt ? ACCENT : BORDER}`,
                          background: followUp === opt ? `${ACCENT}25` : BG3,
                          color: followUp === opt ? T_PRI : T_SEC,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={!allAnswered}
                onClick={handleSubmit}
                style={{
                  marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  background: allAnswered ? ACCENT : BG3, color: allAnswered ? '#fff' : T_MUT,
                  fontSize: 13, fontWeight: 700, cursor: allAnswered ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                {allAnswered ? 'Score & Save →' : `Answer all ${tmpl.questions.length} questions to score`}
              </button>
            </>
          )}
        </div>

        {/* Right: history + trend */}
        <div style={{ width: 280, overflowY: 'auto', padding: '16px', background: BG2 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T_MUT, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
            Score History
          </div>

          {prevScores.length >= 2 && !isCSSRS && (
            <div style={{ marginBottom: 14 }}>
              <Sparkline
                scores={prevScores}
                maxScore={tmpl.maxScore}
                color={ACCENT}
              />
              <div style={{ fontSize: 10, color: T_MUT, marginTop: 4 }}>
                Trend over {prevScores.length} assessments
              </div>
            </div>
          )}

          {prevScores.length === 0 ? (
            <div style={{ color: T_MUT, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
              No previous {tmpl.name} scores on file.
            </div>
          ) : (
            [...prevScores].reverse().map((entry, i) => (
              <HistoryRow
                key={i}
                entry={{ ...entry, scoring: tmpl.scoring }}
                maxScore={tmpl.maxScore}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
