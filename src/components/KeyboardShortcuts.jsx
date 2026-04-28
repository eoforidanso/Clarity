import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS = [
  { keys: ['Alt', 'N'], description: 'New Progress Note', section: 'Clinical' },
  { keys: ['Alt', 'P'], description: 'Find Patient', section: 'Navigation' },
  { keys: ['Alt', 'S'], description: 'Open Schedule', section: 'Navigation' },
  { keys: ['Alt', 'I'], description: 'Open Inbox', section: 'Navigation' },
  { keys: ['Alt', 'D'], description: 'Go to Dashboard', section: 'Navigation' },
  { keys: ['Alt', 'T'], description: 'Open Telehealth', section: 'Clinical' },
  { keys: ['Alt', 'M'], description: 'Staff Messaging', section: 'Communication' },
  { keys: ['Ctrl/⌘', 'K'], description: 'Command Palette', section: 'System' },
  { keys: ['Alt', '/'], description: 'Show Shortcuts', section: 'System' },
  { keys: ['Escape'], description: 'Close Modal/Panel', section: 'System' },
];

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKey = (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.altKey && e.key === '/') { e.preventDefault(); setShowHelp(prev => !prev); return; }
      if (e.altKey && e.key === 'p') { e.preventDefault(); navigate('/patients'); return; }
      if (e.altKey && e.key === 's') { e.preventDefault(); navigate('/schedule'); return; }
      if (e.altKey && e.key === 'i') { e.preventDefault(); navigate('/inbox'); return; }
      if (e.altKey && e.key === 'd') { e.preventDefault(); navigate('/dashboard'); return; }
      if (e.altKey && e.key === 't') { e.preventDefault(); navigate('/telehealth'); return; }
      if (e.altKey && e.key === 'm') { e.preventDefault(); navigate('/staff-messaging'); return; }
      if (e.altKey && e.key === 'n') { e.preventDefault(); navigate('/smart-phrases'); return; }
      if (e.key === 'Escape' && showHelp) { setShowHelp(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [navigate, showHelp]);

  if (!showHelp) return null;

  const grouped = {};
  SHORTCUTS.forEach(s => {
    if (!grouped[s.section]) grouped[s.section] = [];
    grouped[s.section].push(s);
  });

  return (
    <div className="shortcuts-overlay" onClick={() => setShowHelp(false)}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="modal-close" onClick={() => setShowHelp(false)}>✕</button>
        </div>
        <div className="shortcuts-body">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="shortcuts-section">
              <h4>{section}</h4>
              {items.map((s, i) => (
                <div key={i} className="shortcut-row">
                  <span className="shortcut-desc">{s.description}</span>
                  <div className="shortcut-keys">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd>{k}</kbd>
                        {j < s.keys.length - 1 && <span>+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          Press <kbd>Alt</kbd>+<kbd>/</kbd> to toggle this panel
        </div>
      </div>
    </div>
  );
}
