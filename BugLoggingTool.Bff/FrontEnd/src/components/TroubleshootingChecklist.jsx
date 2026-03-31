// src/components/TroubleshootingChecklist.jsx
import React from 'react';

export default function TroubleshootingChecklist({ checklist, values, onChange, errors }) {
  if (!checklist || checklist.length === 0) return null;

  const allRequiredCompleted = checklist
    .filter(item => item.required)
    .every(item => values[item.id]);

  return (
    <div style={{
      border: '2px dashed #ddd',
      borderRadius: '8px',
      padding: '16px',
      background: '#fafafa',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <label style={{
          fontWeight: '600',
          fontSize: '15px',
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          Troubleshooting Checklist
        </label>

        {allRequiredCompleted && (
          <span style={{
            padding: '4px 12px',
            background: '#d4edda',
            color: '#155724',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            ✓ All Required Steps Complete
          </span>
        )}
      </div>

      <p style={{
        fontSize: '13px',
        color: '#666',
        marginBottom: '12px',
        lineHeight: '1.5'
      }}>
        Please complete these troubleshooting steps before submitting. This helps us resolve your issue faster.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {checklist.map((item) => (
          <label
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              background: 'white',
              border: errors[item.id] ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!errors[item.id]) {
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              if (!errors[item.id]) {
                e.currentTarget.style.borderColor = '#ddd';
              }
            }}
          >
            <input
              type="checkbox"
              checked={values[item.id] || false}
              onChange={(e) => onChange(item.id, e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                marginTop: '2px'
              }}
            />
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: '14px',
                color: '#333',
                fontWeight: item.required ? '500' : 'normal'
              }}>
                {item.label}
                {item.required && (
                  <span style={{
                    marginLeft: '6px',
                    padding: '2px 6px',
                    background: '#fff3cd',
                    color: '#856404',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    REQUIRED
                  </span>
                )}
              </span>
              {errors[item.id] && (
                <div style={{
                  marginTop: '4px',
                  color: '#dc3545',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {errors[item.id]}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}