import React from 'react';
import { Lightbulb, Info, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

export default function SuggestionBox({ suggestionText, ruleId }) {
  if (!suggestionText) {
    return (
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Lightbulb size={20} color="var(--accent-cyan)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Agent is analyzing classroom signals to formulate teaching suggestions...
        </span>
      </div>
    );
  }

  // Parse title, observation, and suggestion if formatted with '->'
  let title = 'Teaching Suggestion';
  let observation = '';
  let action = suggestionText;

  if (suggestionText.includes(':') && suggestionText.includes('->')) {
    const parts = suggestionText.split(':');
    title = parts[0].trim();
    const rest = parts.slice(1).join(':');
    const subParts = rest.split('->');
    observation = subParts[0].trim();
    action = subParts[1] ? subParts[1].trim() : '';
  }

  const isUrgent = ruleId === 'RULE_ROOM_COMMOTION' || ruleId === 'RULE_ATTENTION_DIP';

  return (
    <div className="glass-panel" style={{
      padding: '18px',
      borderLeft: `4px solid ${isUrgent ? '#f59e0b' : '#06b6d4'}`,
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(31, 41, 55, 0.6) 100%)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={18} color={isUrgent ? '#f59e0b' : '#06b6d4'} />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
            {title}
          </h4>
        </div>
        {ruleId && (
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)'
          }}>
            {ruleId}
          </span>
        )}
      </div>

      {observation && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6
        }}>
          <strong style={{ color: '#d1d5db' }}>Observed:</strong>
          <span>{observation}</span>
        </div>
      )}

      <div style={{
        padding: '10px 14px',
        background: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10
      }}>
        <ChevronRight size={18} color={isUrgent ? '#f59e0b' : '#06b6d4'} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isUrgent ? '#fde68a' : '#a5f3fc', textTransform: 'uppercase', marginBottom: 2 }}>
            Recommended Action
          </div>
          <div style={{ fontSize: '0.85rem', color: '#f3f4f6', lineHeight: 1.4 }}>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}

