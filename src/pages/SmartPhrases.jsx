import React, { useState, useMemo } from 'react';
import { smartPhrases } from '../data/mockData';

export default function SmartPhrases() {
  const [search, setSearch] = useState('');
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [customPhrases, setCustomPhrases] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhrase, setNewPhrase] = useState({ shortcut: '', category: 'Custom', content: '' });

  const allPhrases = [...smartPhrases, ...customPhrases];
  const categories = ['All', ...new Set(allPhrases.map(p => p.category))];

  const filtered = useMemo(() => {
    let list = allPhrases;
    if (filterCategory !== 'All') {
      list = list.filter(p => p.category === filterCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.shortcut.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPhrases, filterCategory, search]);

  const handleCopy = async (phrase) => {
    try {
      await navigator.clipboard.writeText(phrase.content);
      setCopySuccess(phrase.shortcut);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = phrase.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopySuccess(phrase.shortcut);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const handleAddPhrase = () => {
    if (!newPhrase.shortcut.trim() || !newPhrase.content.trim()) return;

    const shortcut = newPhrase.shortcut.startsWith('.')
      ? newPhrase.shortcut
      : '.' + newPhrase.shortcut;

    setCustomPhrases(prev => [...prev, {
      shortcut,
      category: newPhrase.category || 'Custom',
      content: newPhrase.content,
    }]);
    setNewPhrase({ shortcut: '', category: 'Custom', content: '' });
    setShowAddForm(false);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>⚡ Smart Phrases</h1>
          <p>Quick-insert templates for clinical documentation — type the shortcut or click to copy</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          ➕ New Phrase
        </button>
      </div>

      {/* Usage Hint */}
      <div className="alert alert-info mb-4">
        <strong>💡 Tip:</strong> Type a dot-phrase shortcut (e.g., <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>.mseneg</code>) in any text field to auto-expand. Click on a phrase below to copy it to your clipboard.
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h2>➕ Create New Smart Phrase</h2>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">Shortcut (dot-phrase)</label>
                <input
                  className="form-input"
                  placeholder=".myphrase"
                  value={newPhrase.shortcut}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, shortcut: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  placeholder="e.g., Assessment, Note Template"
                  value={newPhrase.category}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Enter the phrase content..."
                value={newPhrase.content}
                onChange={(e) => setNewPhrase(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={handleAddPhrase}>Save Phrase</button>
              <button className="btn btn-outline" onClick={() => { setShowAddForm(false); setNewPhrase({ shortcut: '', category: 'Custom', content: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <input
            className="form-input"
            placeholder="🔍 Search phrases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 180 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-muted text-sm">{filtered.length} phrase{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Phrase Cards */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((phrase) => (
          <div
            key={phrase.shortcut}
            className={`card ${selectedPhrase === phrase.shortcut ? 'ring' : ''}`}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => setSelectedPhrase(selectedPhrase === phrase.shortcut ? null : phrase.shortcut)}
          >
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <code style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: 'var(--radius)' }}>
                    {phrase.shortcut}
                  </code>
                  <span className="badge badge-info">{phrase.category}</span>
                </div>
                <button
                  className={`btn btn-sm ${copySuccess === phrase.shortcut ? 'btn-primary' : 'btn-outline'}`}
                  onClick={(e) => { e.stopPropagation(); handleCopy(phrase); }}
                >
                  {copySuccess === phrase.shortcut ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>

              {selectedPhrase === phrase.shortcut && (
                <div style={{
                  marginTop: 12,
                  padding: 16,
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  maxHeight: 400,
                  overflow: 'auto',
                  border: '1px solid var(--border)',
                }}>
                  {phrase.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3>No phrases found</h3>
          <p className="text-sm mt-1">Try a different search or create a new phrase</p>
        </div>
      )}
    </div>
  );
}
