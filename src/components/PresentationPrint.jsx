import React from 'react';

const printStyles = `
  @page {
    size: A4 landscape;
    margin: 0;
    padding: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
  .slide-container {
    width: 100%;
    height: 100vh;
    page-break-after: always !important;
    break-after: page !important;
    display: block;
    margin: 0;
    padding: 0;
  }
`;

const PresentationPrint = () => {
  const slides = [
    // Slide 1: Title
    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pageBreakAfter: 'always',
          position: 'relative'
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

    // Slide 2: Financial Summary (simplified for print)
    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          pageBreakAfter: 'always',
          overflow: 'hidden'
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
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Metric</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Current</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Trend</th>
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
                      <td style={{ padding: '10px 16px', fontWeight: '500', color: '#1e293b' }}>{row.metric}</td>
                      <td style={{ padding: '10px 16px', color: '#475569' }}>{row.current}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #bbf7d0',
                fontSize: '13px'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#166534', marginBottom: '8px' }}>Strengths</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ color: '#15803d', fontSize: '12px', marginBottom: '4px' }}>✓ Revenue growth</li>
                  <li style={{ color: '#15803d', fontSize: '12px', marginBottom: '4px' }}>✓ Market expansion</li>
                  <li style={{ color: '#15803d', fontSize: '12px' }}>✓ Strong customer base</li>
                </ul>
              </div>
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #fcd34d',
                fontSize: '13px'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>Weaknesses</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ color: '#b45309', fontSize: '12px', marginBottom: '4px' }}>⚠ Declining cash flow</li>
                  <li style={{ color: '#b45309', fontSize: '12px', marginBottom: '4px' }}>⚠ Rising costs</li>
                  <li style={{ color: '#b45309', fontSize: '12px' }}>⚠ Margin pressure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3-12: Remaining slides (simplified summaries for brevity)
    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always',
          overflow: 'hidden'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Identified Weaknesses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: '📉', title: 'Declining Cash Flow', desc: 'Operating cash flow decreased 12% year-over-year.' },
              { icon: '🎯', title: 'Revenue Concentration', desc: 'Top 5 clients account for 35% of revenue.' },
              { icon: '📈', title: 'Rising Costs', desc: 'Operating expenses increased 8% while revenue grew only 3%.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                fontSize: '13px'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#475569', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Managerial Accounting Concepts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {[
              { title: 'Budgetary Control', items: ['Plan & control spending', 'Variance analysis', 'Accountability'] },
              { title: 'Activity-Based Costing', items: ['Allocate costs accurately', 'Identify profitability', 'Improve efficiency'] },
              { title: 'CVP Analysis', items: ['Break-even analysis', 'Profit planning', 'Scenario modeling'] },
              { title: 'Capital Budgeting', items: ['Evaluate investments', 'NPV calculations', 'ROI assessment'] },
            ].map((concept, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                fontSize: '13px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{concept.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {concept.items.map((item, j) => (
                    <li key={j} style={{ color: '#475569', fontSize: '12px', marginBottom: '6px' }}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Strategy 1: Budgeting to Improve Cash Flow</h2>
          <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Objective:</p>
              <p>Optimize working capital</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Proposed Actions:</p>
              <p>Monthly forecasts, variance tracking, department accountability</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Expected Benefits:</p>
              <p>+$500K cash improvement, improved forecasting accuracy, better financial control</p>
            </div>
            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', marginTop: '40px' }}>
              <p style={{ fontWeight: 'bold', color: '#1e293b' }}>Implementation Timeline:</p>
              <p style={{ marginTop: '12px' }}>Q3: Assessment & Planning | Q4: System Setup | Q1+: Ongoing Management</p>
            </div>
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Strategy 2: Activity-Based Cost Management</h2>
          <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>Process Flow:</h3>
            <p style={{ marginBottom: '24px' }}>Logistics → Admin → Marketing → Tech Infrastructure</p>

            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>Recommended Actions:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Reduce Overhead</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px' }}>
                  <li>• Consolidate processes</li>
                  <li>• Automate where possible</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Optimize Resources</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px' }}>
                  <li>• Right-size teams</li>
                  <li>• Improve utilization</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Measure Value</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px' }}>
                  <li>• Track by activity</li>
                  <li>• Identify profitability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Strategy 3: Capital Budgeting for Growth</h2>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb', marginBottom: '24px' }}>Future Growth Investments</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', fontSize: '13px' }}>
            {[
              { title: 'AI & Automation', metrics: ['NPV: $2.1M', 'IRR: 23%', 'Payback: 2.3 years'] },
              { title: 'Services Expansion', metrics: ['NPV: $1.8M', 'IRR: 19%', 'Payback: 2.8 years'] },
              { title: 'Emerging Tech', metrics: ['NPV: $1.5M', 'IRR: 17%', 'Payback: 3.1 years'] },
            ].map((inv, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{inv.title}</h3>
                {inv.metrics.map((m, j) => <p key={j} style={{ marginBottom: '4px' }}>{m}</p>)}
              </div>
            ))}
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Decision-Making Using Financial Data</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px', fontSize: '13px' }}>
            {[
              { title: 'Cash Flow Decline', stat: '-$280K' },
              { title: 'Services Growth', stat: '+$2.1M' },
              { title: 'Net Income', stat: '+8.3%' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <p style={{ color: '#64748b', marginBottom: '8px' }}>{item.title}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{item.stat}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Managerial Decisions:</p>
          <ul style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <li>→ Implement structured budgeting framework</li>
            <li>→ Diversify revenue streams to reduce concentration</li>
            <li>→ Optimize operating expenses and cost structure</li>
          </ul>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Real-World Example: Microsoft</h2>
          <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Challenge:</p>
              <p>Declining revenue in legacy businesses, need for cost optimization and strategic shift</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Managerial Response:</p>
              <p>Restructured organization around cloud computing, artificial intelligence, and strategic acquisitions</p>
            </div>
            <div>
              <p style={{ fontWeight: 'bold', color: '#2563eb' }}>Results:</p>
              <p>Azure revenue achieved 30%+ CAGR, established enterprise cloud market leadership, diversified revenue streams</p>
            </div>
          </div>
        </div>
      )
    },

    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always'
        }}>
          <h2 style={{ fontSize: '44px', fontWeight: 'bold', color: '#1e293b', marginBottom: '32px' }}>Implementation Plan</h2>
          <div style={{ fontSize: '14px', lineHeight: 2 }}>
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>Phase 1: Assessment (0–6 months)</p>
              <p style={{ marginLeft: '20px' }}>Define KPIs, build cross-functional team, assess current state, conduct training</p>
            </div>
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>Phase 2: Deployment (6–12 months)</p>
              <p style={{ marginLeft: '20px' }}>Implement budgeting system, roll out ABC costing, establish monitoring dashboards</p>
            </div>
            <div>
              <p style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>Phase 3: Optimization (12–24 months)</p>
              <p style={{ marginLeft: '20px' }}>Refine processes, optimize resource allocation, expand to additional departments</p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 12: Conclusion
    {
      render: () => (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f1419 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pageBreakAfter: 'always'
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
              maxWidth: '900px'
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

    // Slide 13: About
    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'always',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '40px'
          }}>About This Presentation</h2>

          <div style={{ fontSize: '16px', lineHeight: '2', color: '#475569' }}>
            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', fontSize: '20px' }}>Author</h3>
            <p style={{ marginBottom: '32px' }}>Gilbert Akwasi Adjei-Donkor</p>

            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', fontSize: '20px' }}>Course</h3>
            <p style={{ marginBottom: '32px' }}>Managerial Accounting & Financial Analysis</p>

            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', fontSize: '20px' }}>Presentation Date</h3>
            <p style={{ marginBottom: '32px' }}>June 11, 2026</p>

            <h3 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', fontSize: '20px' }}>Overview</h3>
            <p>This presentation provides a comprehensive analysis of financial strategies for business optimization. It covers budgetary control, activity-based costing, capital budgeting, and data-driven decision-making frameworks to improve organizational financial performance.</p>
          </div>
        </div>
      )
    },

    // Slide 14: References
    {
      render: () => (
        <div style={{
          width: '100%',
          height: '100vh',
          background: '#ffffff',
          padding: '48px',
          pageBreakAfter: 'avoid',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h2 style={{
            fontSize: '44px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '32px'
          }}>References</h2>

          <div style={{
            fontSize: '11px',
            lineHeight: '1.6',
            color: '#1e293b'
          }}>
            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Apple Inc. (2025). <em>Annual report pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934 (Form 10-K)</em>. SEC. Apple FY2025 Form 10-K.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Apple Inc. (2025). <em>Investor relations: Annual reports and SEC filings</em>. Apple Investor Relations.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Atrill, P., & McLaney, E. (2022). <em>Management accounting for decision makers</em> (10th ed.). Pearson Education.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Brigham, E. F., & Ehrhardt, M. C. (2022). <em>Financial management: Theory and practice</em> (16th ed.). Cengage Learning.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Drury, C. (2022). <em>Management and cost accounting</em> (11th ed.). Cengage Learning.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Garrison, R. H., Noreen, E. W., & Brewer, P. C. (2024). <em>Managerial accounting</em> (18th ed.). McGraw-Hill Education.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Hansen, D. R., Mowen, M. M., & Heitger, D. L. (2023). <em>Cornerstones of managerial accounting</em> (8th ed.). Cengage Learning.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Horngren, C. T., Datar, S. M., & Rajan, M. V. (2023). <em>Cost accounting: A managerial emphasis</em> (17th ed.). Pearson Education.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Kaplan, R. S., & Atkinson, A. A. (2023). <em>Advanced management accounting</em> (4th ed.). Pearson Education.
            </p>

            <p style={{ marginBottom: '12px', textIndent: '-24px', paddingLeft: '24px' }}>
              Weygandt, J. J., Kimmel, P. D., & Martin, J. R. (2023). <em>Managerial accounting: Tools for business decision making</em> (10th ed.). Wiley.
            </p>
          </div>

          <div style={{
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '10px',
            color: '#64748b'
          }}>
            <p>Note: References formatted according to APA 7th Edition style guide.</p>
          </div>
        </div>
      )
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <style>{printStyles}</style>
      {slides.map((slide, i) => (
        <div key={i} className="slide-container" style={{ width: '100%', pageBreakAfter: 'always' }}>
          {slide.render()}
        </div>
      ))}
    </div>
  );
};

export default PresentationPrint;
