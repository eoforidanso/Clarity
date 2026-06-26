import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const FinancialPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const presentationRef = useRef(null);

  const slides = [
    // Slide 1: Title
    {
      id: 1,
      render: () => (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            filter: 'blur(120px)',
            top: '-80px',
            right: '-80px',
            pointerEvents: 'none'
          }}></div>

          <div style={{ textAlign: 'center', zIndex: 10 }}>
            <h1 style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '24px',
              letterSpacing: '-0.02em'
            }}>Financial Analysis<br />& Strategy</h1>

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              margin: '32px 0',
              width: '384px'
            }}></div>

            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', lineHeight: '1.8' }}>
              <p>Gilbert Akwasi Adjei-Donkor</p>
              <p style={{ color: '#60a5fa', marginTop: '16px' }}>June 11, 2026</p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 2: Financial Summary
    {
      id: 2,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Financial Analysis Summary</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '32px',
            flex: 1
          }}>
            {/* Table */}
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <tr>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '600' }}>Metric</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '600' }}>Current</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '600' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Cash Flow', current: '$2.3M', trend: '↓ -12%' },
                    { metric: 'Operating Margin', current: '18.5%', trend: '↓ -2.3%' },
                    { metric: 'Revenue Growth', current: '$45M', trend: '↑ +8%' },
                    { metric: 'Customer Base', current: '2,450', trend: '↑ +5%' },
                    { metric: 'Debt Ratio', current: '0.45', trend: '↑ +0.08' },
                  ].map((row, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px', fontWeight: '500', color: '#1e293b' }}>{row.metric}</td>
                      <td style={{ padding: '16px 24px', color: '#475569' }}>{row.current}</td>
                      <td style={{ padding: '16px 24px', color: '#64748b' }}>{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #bbf7d0'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#166534', marginBottom: '12px', fontSize: '18px' }}>Strengths</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ color: '#15803d', fontSize: '14px', marginBottom: '8px' }}>✓ Revenue growth</li>
                  <li style={{ color: '#15803d', fontSize: '14px', marginBottom: '8px' }}>✓ Market expansion</li>
                  <li style={{ color: '#15803d', fontSize: '14px' }}>✓ Strong customer base</li>
                </ul>
              </div>
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #fcd34d'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '12px', fontSize: '18px' }}>Weaknesses</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ color: '#b45309', fontSize: '14px', marginBottom: '8px' }}>⚠ Declining cash flow</li>
                  <li style={{ color: '#b45309', fontSize: '14px', marginBottom: '8px' }}>⚠ Rising costs</li>
                  <li style={{ color: '#b45309', fontSize: '14px' }}>⚠ Margin pressure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: Weaknesses
    {
      id: 3,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Identified Weaknesses</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            flex: 1
          }}>
            {[
              { icon: '📉', title: 'Declining Cash Flow', desc: 'Operating cash flow decreased 12% year-over-year, limiting investment capacity.' },
              { icon: '🎯', title: 'Revenue Concentration', desc: 'Top 5 clients account for 35% of revenue, creating dependency risk.' },
              { icon: '📈', title: 'Rising Costs', desc: 'Operating expenses increased 8% while revenue grew only 3% in Q2.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '32px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ color: '#475569', marginBottom: '24px', flex: 1, lineHeight: 1.6, fontSize: '14px' }}>{item.desc}</p>
                <div style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>Why It Matters</div>
              </div>
            ))}
          </div>
        </div>
      )
    },

    // Slide 4: Concepts
    {
      id: 4,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Managerial Accounting Concepts</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '32px',
            flex: 1
          }}>
            {[
              { title: 'Budgetary Control', items: ['Plan & control spending', 'Variance analysis', 'Accountability'] },
              { title: 'Activity-Based Costing', items: ['Allocate costs accurately', 'Identify profitability', 'Improve efficiency'] },
              { title: 'CVP Analysis', items: ['Break-even analysis', 'Profit planning', 'Scenario modeling'] },
              { title: 'Capital Budgeting', items: ['Evaluate investments', 'NPV calculations', 'ROI assessment'] },
            ].map((concept, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '32px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>{concept.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {concept.items.map((item, j) => (
                    <li key={j} style={{ color: '#475569', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ color: '#2563eb', marginRight: '8px' }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )
    },

    // Slide 5: Strategy 1
    {
      id: 5,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Strategy 1: Budgeting to Improve Cash Flow</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            flex: 1
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { label: 'Objective', value: 'Optimize working capital' },
                { label: 'Proposed Actions', value: 'Monthly forecasts, variance tracking' },
                { label: 'Budget Controls', value: 'Department-level accountability' },
                { label: 'Expected Benefits', value: '+$500K cash improvement' },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ color: '#1e293b', fontSize: '18px' }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}>
              <div style={{
                position: 'relative',
                width: '320px',
                height: '320px'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '128px',
                    height: '128px',
                    background: '#2563eb',
                    borderRadius: '50%',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>Cash Flow Cycle</div>
                </div>
                {['Cash In', 'Budgeting', 'Variance Analysis', 'Cash Out'].map((stage, i) => {
                  const angle = (i * 90 - 90) * (Math.PI / 180);
                  const x = 140 * Math.cos(angle);
                  const y = 140 * Math.sin(angle);
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      width: '96px',
                      height: '64px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                    }}>
                      <div style={{
                        background: '#f1f5f9',
                        padding: '12px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1'
                      }}>{stage}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 6: Strategy 2
    {
      id: 6,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Strategy 2: Activity-Based Cost Management</h2>

          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              {['Logistics', 'Admin', 'Marketing', 'Tech Infrastructure'].map((node, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: '#2563eb',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textAlign: 'center'
                  }}>{node}</div>
                  {i < 3 && <div style={{ width: '32px', borderTop: '2px solid #94a3b8' }}></div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            flex: 1
          }}>
            {[
              { title: 'Reduce Overhead', items: ['Consolidate processes', 'Automate where possible'] },
              { title: 'Optimize Resources', items: ['Right-size teams', 'Improve utilization'] },
              { title: 'Measure Value', items: ['Track by activity', 'Identify profitability'] },
            ].map((action, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', fontSize: '18px' }}>{action.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {action.items.map((item, j) => (
                    <li key={j} style={{ color: '#475569', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ color: '#2563eb', marginRight: '8px' }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )
    },

    // Slide 7: Strategy 3
    {
      id: 7,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '24px'
          }}>Strategy 3: Capital Budgeting for Growth</h2>

          <div style={{
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px',
            fontWeight: 'bold',
            fontSize: '20px',
            textAlign: 'center'
          }}>Future Growth Investments</div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            flex: 1
          }}>
            {[
              { title: 'AI & Automation', metrics: ['NPV: $2.1M', 'IRR: 23%', 'Payback: 2.3y'] },
              { title: 'Services Expansion', metrics: ['NPV: $1.8M', 'IRR: 19%', 'Payback: 2.8y'] },
              { title: 'Emerging Tech', metrics: ['NPV: $1.5M', 'IRR: 17%', 'Payback: 3.1y'] },
            ].map((inv, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '32px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px' }}>{inv.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {inv.metrics.map((metric, j) => (
                    <p key={j} style={{ color: '#475569', fontSize: '14px' }}>{metric}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },

    // Slide 8: Decision Making
    {
      id: 8,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Decision-Making Using Financial Data</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
            marginBottom: '32px'
          }}>
            {[
              { title: 'Cash Flow Decline', stat: '-$280K', detail: 'YoY reduction' },
              { title: 'Services Growth', stat: '+$2.1M', detail: 'Revenue expansion' },
              { title: 'Net Income Increase', stat: '+8.3%', detail: 'Operational efficiency' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{item.title}</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>{item.stat}</p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>{item.detail}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '24px', textAlign: 'center' }}>Managerial Decisions</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {['Implement budgeting', 'Diversify revenue', 'Optimize costs'].map((decision, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px', color: '#2563eb' }}>↓</div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', textAlign: 'center' }}>{decision}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },

    // Slide 9: Microsoft Case Study
    {
      id: 9,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Real-World Example: Microsoft</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            flex: 1
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { label: 'Challenge', text: 'Declining revenue in legacy businesses, need for cost optimization' },
                { label: 'Response', text: 'Restructured around cloud, AI, and strategic acquisitions' },
                { label: 'Results', text: 'Azure revenue 30%+ CAGR, enterprise cloud market leadership' },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>{item.label}</p>
                  <p style={{ color: '#1e293b', fontSize: '14px', lineHeight: 1.6 }}>{item.text}</p>
                </div>
              ))}
            </div>

            <div style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <p style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Cloud + AI Innovation</p>
              <div style={{ display: 'flex', gap: '24px' }}>
                {[
                  { color: '#0078D4', label: 'Azure' },
                  { color: '#7FBA00', label: 'Office' },
                  { color: '#FFB900', label: 'Dynamics' },
                  { color: '#F25022', label: 'Growth' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: item.color,
                      borderRadius: '50%',
                      marginBottom: '8px'
                    }}></div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 10: Implementation Plan
    {
      id: 10,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Implementation Plan</h2>

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '100%', maxWidth: '1024px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '32px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '32px',
                  left: '0',
                  right: '0',
                  height: '4px',
                  background: '#cbd5e1'
                }}></div>

                {[
                  { period: '0–6 months', label: 'Phase 1: Assessment' },
                  { period: '6–12 months', label: 'Phase 2: Deployment' },
                  { period: '12–24 months', label: 'Phase 3: Optimization' },
                ].map((phase, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 10,
                    width: '33.33%'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      background: '#2563eb',
                      borderRadius: '50%',
                      marginBottom: '16px',
                      border: '4px solid #ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}></div>
                    <div style={{
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      width: '100%',
                      textAlign: 'center'
                    }}>
                      <p style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>{phase.period}</p>
                      <p style={{ color: '#1e293b', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>{phase.label}</p>
                      <ul style={{ fontSize: '12px', color: '#64748b', listStyle: 'none', padding: 0 }}>
                        <li>• Define KPIs</li>
                        <li>• Build team</li>
                        <li>• Train staff</li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 11: Projected Results
    {
      id: 11,
      render: () => (
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>Projected Results</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {[
              { label: 'Cash Flow', value: '+$450K', color: '#10b981' },
              { label: 'Services Growth', value: '+12%', color: '#2563eb' },
              { label: 'Operating Expenses', value: '-8%', color: '#ef4444' },
              { label: 'Gross Margin', value: '+2.1%', color: '#f59e0b' },
            ].map((metric, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{metric.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: metric.color }}>{metric.value}</p>
              </div>
            ))}
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '100%',
              height: '256px',
              background: '#f1f5f9',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                height: '100%',
                gap: '16px'
              }}>
                {[
                  { label: 'Cash Flow', current: 40, projected: 60 },
                  { label: 'Growth', current: 45, projected: 75 },
                  { label: 'Expenses', current: 65, projected: 50 },
                ].map((data, i) => (
                  <div key={i} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
                      <div style={{
                        width: '24px',
                        background: '#bfdbfe',
                        borderRadius: '4px',
                        height: `${data.current * 1.5}px`
                      }}></div>
                      <div style={{
                        width: '24px',
                        background: '#2563eb',
                        borderRadius: '4px',
                        height: `${data.projected * 1.5}px`
                      }}></div>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{data.label}</p>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#bfdbfe', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Current</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#2563eb', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Projected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 12: Conclusion
    {
      id: 12,
      render: () => (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            filter: 'blur(120px)',
            bottom: '-80px',
            left: '-80px',
            pointerEvents: 'none'
          }}></div>

          <div style={{ textAlign: 'center', zIndex: 10 }}>
            <h2 style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '32px'
            }}>Key Findings</h2>

            <div style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '18px',
              lineHeight: '2',
              marginBottom: '32px'
            }}>
              <p>✓ Cash flow optimization requires structured budgeting discipline</p>
              <p>✓ Activity-based costing reveals true profitability drivers</p>
              <p>✓ Strategic capital investments align with growth objectives</p>
              <p>✓ Data-driven decisions mitigate financial risks</p>
            </div>

            <div style={{
              background: '#2563eb',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              <p style={{
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>Implementation: Begin with budgeting framework within Q3 2026</p>
            </div>
          </div>
        </div>
      )
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const exportToPdf = () => {
    const element = presentationRef.current;
    const opt = {
      margin: 0,
      filename: 'Financial_Analysis_Strategy.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { format: 'a4', orientation: 'landscape' },
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Main Presentation Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#000000'
      }}>
        <div ref={presentationRef} style={{
          width: '100%',
          height: '100%',
          aspectRatio: '16/9'
        }}>
          {slides[currentSlide].render()}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        background: '#1f2937',
        borderTop: '1px solid #374151',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={prevSlide}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#374151',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#4b5563'}
          onMouseOut={(e) => e.target.style.background = '#374151'}
        >
          <ChevronLeft size={20} /> Previous
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#ffffff', fontWeight: '600' }}>
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <div style={{
            width: '256px',
            height: '8px',
            background: '#374151',
            borderRadius: '9999px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                height: '100%',
                background: '#2563eb',
                transition: 'width 0.3s',
                width: `${((currentSlide + 1) / slides.length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={exportToPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#047857'}
            onMouseOut={(e) => e.target.style.background = '#059669'}
          >
            <Download size={20} /> Export PDF
          </button>
          <button
            onClick={nextSlide}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#374151',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#4b5563'}
            onMouseOut={(e) => e.target.style.background = '#374151'}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialPresentation;
