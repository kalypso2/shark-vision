'use client'

/**
 * Debug Page: RAG System & Threshold Calibration
 * Shows research-based calibration and validates current settings
 */

import { 
  RESEARCH_CALIBRATED_THRESHOLDS, 
  getCalibrationExplanation,
  validateThresholds,
  getExpectedMetrics 
} from '@/lib/rag/threshold_calibration'
import { KNOWLEDGE_BASE, getBenchmarks } from '@/lib/rag/knowledge_base'

export default function DebugPage() {
  const calibrationExplanations = getCalibrationExplanation()
  const benchmarks = getBenchmarks()
  
  // Example validation (in real use, would pull from actual running thresholds)
  const validation = validateThresholds({
    gesture: 0.03,
    staticMovement: 0.006,
    dynamicMovement: 0.015,
  })

  // Example expected metrics for a 60-second presentation
  const expectedMetrics = getExpectedMetrics(60)

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        🦈 Shark Vision - RAG Debug Panel
      </h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
        Research-backed threshold calibration and knowledge base validation
      </p>

      {/* Calibrated Thresholds */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          📊 Research-Calibrated Thresholds
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {Object.entries(RESEARCH_CALIBRATED_THRESHOLDS).map(([key, value]) => (
            <div key={key} style={{ 
              padding: '1rem', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              backgroundColor: '#f9f9f9'
            }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                {key}
              </h3>
              <pre style={{ 
                fontSize: '0.85rem', 
                background: '#fff', 
                padding: '0.5rem',
                borderRadius: '4px',
                overflow: 'auto'
              }}>
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Calibration Explanations */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          📚 Research-Based Explanations
        </h2>
        
        {Object.entries(calibrationExplanations).map(([key, explanation]) => (
          <div key={key} style={{ 
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f0f8ff',
            borderLeft: '4px solid #007bff',
            borderRadius: '4px'
          }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', textTransform: 'capitalize', fontWeight: 'bold' }}>
              {key}
            </h3>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              {explanation}
            </p>
          </div>
        ))}
      </section>

      {/* Validation Results */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          ✅ Threshold Validation
        </h2>
        
        {validation.isAligned ? (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            color: '#155724'
          }}>
            <strong>✓ All thresholds aligned with research!</strong>
          </div>
        ) : (
          <div>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeeba',
              borderRadius: '8px',
              color: '#856404',
              marginBottom: '1rem'
            }}>
              <strong>⚠ {validation.recommendations.length} threshold(s) need adjustment</strong>
            </div>
            
            {validation.recommendations.map((rec, idx) => (
              <div key={idx} style={{ 
                padding: '1rem',
                marginBottom: '0.5rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {rec.threshold}: {rec.issue}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  Current: {rec.current} → Recommended: {rec.recommended}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  {rec.reasoning}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expected Metrics */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          📈 Expected Metrics (60-second presentation)
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Gestures</h3>
            <div style={{ fontSize: '0.9rem' }}>
              Min: {expectedMetrics.gestures.min}<br />
              Optimal: {expectedMetrics.gestures.optimal}<br />
              Max: {expectedMetrics.gestures.max}<br />
              <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({expectedMetrics.gestures.source})</span>
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Forward Gaze %</h3>
            <div style={{ fontSize: '0.9rem' }}>
              Min: {expectedMetrics.forwardGazePercentage.min}%<br />
              Optimal: {expectedMetrics.forwardGazePercentage.optimal}%<br />
              Max: {expectedMetrics.forwardGazePercentage.max}%<br />
              <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({expectedMetrics.forwardGazePercentage.source})</span>
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Good Posture %</h3>
            <div style={{ fontSize: '0.9rem' }}>
              Min: {expectedMetrics.goodPosturePercentage.min}%<br />
              Optimal: {expectedMetrics.goodPosturePercentage.optimal}%<br />
              Max: {expectedMetrics.goodPosturePercentage.max}%<br />
              <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>({expectedMetrics.goodPosturePercentage.source})</span>
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Base */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
          📖 Knowledge Base ({KNOWLEDGE_BASE.length} entries)
        </h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Benchmarks with Quantitative Data:</strong> {benchmarks.length}
        </div>

        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto', 
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          {benchmarks.map((entry) => (
            <div key={entry.id} style={{ 
              padding: '1rem',
              borderBottom: '1px solid #eee',
              backgroundColor: entry.id.includes('bench') ? '#f0fff0' : '#fff'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                {entry.category.toUpperCase()} - {entry.type}
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                {entry.content}
              </div>
              {entry.quantitative_data && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  padding: '0.5rem',
                  backgroundColor: '#e7f3ff',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <strong>Data:</strong> {entry.quantitative_data.metric} = {entry.quantitative_data.value} {entry.quantitative_data.unit}
                  {entry.quantitative_data.range && (
                    <span> (range: {entry.quantitative_data.range[0]}-{entry.quantitative_data.range[1]})</span>
                  )}
                  <br />
                  <span style={{ opacity: 0.8 }}>Context: {entry.quantitative_data.context}</span>
                </div>
              )}
              <div style={{ fontSize: '0.8rem', opacity: 0.7, fontStyle: 'italic' }}>
                Source: {entry.source}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation */}
      <div style={{ 
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <a href="/" style={{ marginRight: '1rem', color: '#007bff', textDecoration: 'none' }}>
          ← Back to Home
        </a>
        <a href="/analysis-python" style={{ color: '#007bff', textDecoration: 'none' }}>
          Start Analysis →
        </a>
      </div>
    </div>
  )
}

