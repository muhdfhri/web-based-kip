import React, { useState } from 'react';

const OilClarificationInteractiveTour = ({ activeSection, tours = {}, onSectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const currentTour = tours[activeSection] || [];

  if (!isOpen || currentTour.length === 0) {
    return (
      <button
        onClick={() => {
          setCurrentStep(0);
          setIsOpen(true);
        }}
        style={{
          background: 'rgba(255, 219, 59, 0.15)',
          border: '1px solid #ffdb3b',
          color: '#0f172a',
          fontSize: '10px',
          fontWeight: 800,
          padding: '3px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginLeft: '8px'
        }}
      >
        💡 GUIDE TOUR
      </button>
    );
  }

  const step = currentTour[currentStep] || {};

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        background: '#0f172a',
        border: '1px solid #ffdb3b',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        width: '320px',
        color: '#f8fafc'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffdb3b', textTransform: 'uppercase' }}>
          {step.title || 'Station Tour'} ({currentStep + 1}/{currentTour.length})
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.4 }}>
        {step.content || 'Tour step description.'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          style={{
            padding: '4px 10px',
            background: 'transparent',
            color: currentStep === 0 ? '#475569' : '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Prev
        </button>
        {currentStep < currentTour.length - 1 ? (
          <button
            onClick={() => setCurrentStep(prev => Math.min(currentTour.length - 1, prev + 1))}
            style={{
              padding: '4px 10px',
              background: '#ffdb3b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px 10px',
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
};

export default OilClarificationInteractiveTour;
