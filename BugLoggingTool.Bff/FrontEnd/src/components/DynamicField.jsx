// src/components/DynamicField.jsx
import React from 'react';

export default function DynamicField({ field, value, onChange, error }) {
  const commonStyle = {
    width: '100%',
    padding: '8px',
    border: error ? '2px solid #dc3545' : '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit'
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={commonStyle}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            style={{
              ...commonStyle,
              resize: 'vertical'
            }}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            style={{
              ...commonStyle,
              backgroundColor: 'white'
            }}
          >
            <option value="">-- Select {field.label} --</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options.map((option) => (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: value === option ? '#f0f4ff' : 'white'
                }}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            style={commonStyle}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={commonStyle}
          />
        );
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        marginBottom: '6px',
        fontWeight: '500',
        fontSize: '14px',
        color: '#333'
      }}>
        {field.label}
        {field.required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
      </label>

      {renderField()}

      {error && (
        <div style={{
          marginTop: '4px',
          color: '#dc3545',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}