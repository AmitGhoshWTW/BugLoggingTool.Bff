// src/components/TemplateSelector.jsx
import React, { useState } from 'react';
import { bugReportTemplates } from '../data/templates';

export default function TemplateSelector({ onSelectTemplate, selectedTemplate }) {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (template) => {
    onSelectTemplate(template);
    setShowModal(false);
  };

  return (
    <>
      {/* Template Badge */}
      {selectedTemplate && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{selectedTemplate.icon}</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                Using Template: {selectedTemplate.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {selectedTemplate.description}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Change Template
          </button>
        </div>
      )}

      {/* Select Template Button (if no template selected) */}
      {!selectedTemplate && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '20px' }}>📋</span>
          Select Report Template
        </button>
      )}

      {/* Template Selection Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                Select Report Template
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
              Choose a template to guide you through reporting. Templates ensure you provide all necessary information.
            </p>

            {/* Template Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {bugReportTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  style={{
                    padding: '20px',
                    border: selectedTemplate?.id === template.id 
                      ? '2px solid #667eea' 
                      : '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: selectedTemplate?.id === template.id 
                      ? '#f0f4ff' 
                      : 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                    {template.icon}
                  </div>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#333',
                    marginBottom: '8px'
                  }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                    {template.description}
                  </div>
                  {template.category && (
                    <div style={{
                      marginTop: '12px',
                      padding: '4px 8px',
                      background: '#e3f2fd',
                      color: '#0078d7',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {template.category}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}