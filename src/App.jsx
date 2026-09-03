import { useState } from 'react';
import IntakeTerminal from './IntakeTerminal';
import ProcessingTerminal from './ProcessingTerminal';
import EvidenceDashboard from './EvidenceDashboard';

export default function App() {
  const [appState,     setAppState]     = useState('INTAKE');
  // travelerData is set by IntakeTerminal, updated by ProcessingTerminal, and read by EvidenceDashboard.
  const [travelerData, setTravelerData] = useState(null);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090b' }}>
      {/* ── Global Header ─────────────────────────────────────── */}
      <header
        style={{
          background: '#18181b',
          borderBottom: '1px solid #27272a',
          position: 'sticky', top: 0, zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Left — Badge + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px', height: '36px',
                background: '#f59e0b',
                borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.8rem', fontWeight: 800,
                  color: '#09090b', letterSpacing: '0.02em',
                }}
              >
                VT
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: '#f59e0b',
                }}
              >
                VERITAS
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.7rem', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#a1a1aa',
                  lineHeight: 1.1,
                }}
              >
                Border Document Screening Console
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '28px', background: '#27272a', margin: '0 0.5rem' }} />

            {/* Problem ID Tag */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem', fontWeight: 500,
                color: '#52525b', letterSpacing: '0.1em',
              }}
            >
              SIH-26188 · TEAM DELTA
            </div>
          </div>

          {/* Right — Checkpoint & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.62rem', color: '#71717a', letterSpacing: '0.08em',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px',
              }}
            >
              <span style={{ color: '#a1a1aa' }}>CHECKPOINT: IGI T3 – Gate 4</span>
              <span>OFFICER ID: BUI-2291</span>
            </div>

            <div style={{ width: '1px', height: '28px', background: '#27272a' }} />

            {/* System Online Badge */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '4px',
                padding: '0.3rem 0.75rem',
              }}
            >
              <div
                className="pulse-green"
                style={{ width: '7px', height: '7px', background: '#10b981', flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.62rem', fontWeight: 700,
                  color: '#10b981', letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                SYSTEM ONLINE
              </span>
            </div>

            {/* State indicator */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem', fontWeight: 600,
                color: appState === 'PROCESSING' ? '#f59e0b'
                     : appState === 'DASHBOARD'  ? '#10b981'
                     : '#71717a',
                letterSpacing: '0.1em',
                background: '#0f0f10',
                border: '1px solid #27272a',
                borderRadius: '3px',
                padding: '0.25rem 0.6rem',
              }}
            >
              {appState}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '1.5rem' }}>
        {appState === 'INTAKE' && (
          <IntakeTerminal
            onNext={(data) => { setTravelerData(data); setAppState('PROCESSING'); }}
          />
        )}
        {appState === 'PROCESSING' && (
          <ProcessingTerminal
            travelerData={travelerData}
            onComplete={(apiResult) => {
              // 🚀 Yahan hum backend response ko parent state mein bind kar rahe hain
              setTravelerData(prev => ({ ...prev, verificationResult: apiResult }));
              setAppState('DASHBOARD');
            }}
          />
        )}
        {appState === 'DASHBOARD' && (
          <EvidenceDashboard
            travelerData={travelerData}
            onReset={() => { setTravelerData(null); setAppState('INTAKE'); }}
          />
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid #27272a',
          padding: '0.6rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem', color: '#3f3f46', letterSpacing: '0.1em',
          }}
        >
          VERITAS v2.4.1 · ICAO Doc 9303 · BUREAU OF IMMIGRATION © 2026
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem', color: '#3f3f46', letterSpacing: '0.1em',
          }}
        >
          CLASSIFIED – FOR AUTHORIZED USE ONLY
        </span>
      </footer>
    </div>
  );
}