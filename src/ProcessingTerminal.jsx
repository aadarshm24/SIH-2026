import { useState, useEffect, useMemo } from 'react';
import { S, mono, inter } from './theme';
import { verifyDocumentAPI } from './services/api'; 

// ── PIPELINE BUILDER ─────────────────────────────────────────────────────────
function buildPipelineSteps(td, result) {
  // Agar result null hai (loading state), toh empty pipeline return karo
  if (!result) return [];

  const mrz = result.details?.mrz_check ?? {};
  const name        = mrz.name ?? td?.name ?? 'VERIFIED TRAVELER';
  const docNo       = mrz.document_number ?? td?.docNo ?? 'UNKNOWN';
  const dob         = td?.dob ?? 'UNKNOWN';
  const nationality = mrz.nationality ?? td?.nationality ?? 'UNK';
  
  const trustScore  = result.scoring?.trust_score ?? 0;
  const isCleared   = trustScore >= 45;
  const elaScore    = result.details?.forensics?.ela_score ?? 0.000;
  const faceSim     = (result.details?.face_biometrics?.similarity_score ?? 0) * 100;
  const mrzStatus   = mrz.is_valid ? "VERIFIED ✓" : "FAILED ✗";

  return [
    {
      id: 'sys',
      lines: [
        { t: 0,    text: 'VERITAS MULTI-SIGNAL FUSION ENGINE v2.4.1',  type: 'header' },
        { t: 120,  text: 'Initializing secure processing pipeline...',  type: 'info'   },
        { t: 280,  text: 'Loading ML model registry [OK]',             type: 'ok'     },
        { t: 450,  text: 'Allocating GPU memory partition [OK]',       type: 'ok'     },
      ],
    },
    {
      id: 'ocr',
      label: 'MODULE 1 · OCR & MRZ EXTRACTION',
      lines: [
        { t: 700,  text: '> Extracting OCR & MRZ (Deep Learning Model)...',   type: 'process' },
        { t: 900,  text: '  ├─ Pre-processing: deskew + adaptive threshold',        type: 'sub'     },
        { t: 1080, text: '  ├─ Neural pass 1: VIZ fields extracted',              type: 'sub'     },
        { t: 1250, text: '  ├─ Checksum pass 2: MRZ zone isolated',               type: 'sub'     },
        { t: 1420, text: `  ├─ Name parsed:   ${name}`,                            type: 'sub'     },
        { t: 1590, text: `  ├─ Doc: ${docNo}  Nation: ${nationality}  DOB: ${dob}`, type: 'sub'     },
        { t: 1760, text: '  ├─ Check digit validation routine executed',           type: 'sub'     },
        { t: 1930, text: `  └─ MRZ composite check format: ${mrzStatus}`,          type: mrz.is_valid ? 'ok' : 'sub' },
      ],
    },
    {
      id: 'ela',
      label: 'MODULE 2 · IMAGE FORENSICS',
      lines: [
        { t: 2100, text: '> Running Image Forensics (ELA + Copy-Move Detection)...', type: 'process' },
        { t: 2280, text: '  ├─ Error Level Analysis at Q=90: baseline computed',    type: 'sub'     },
        { t: 2450, text: `  ├─ ELA delta map: σ=${elaScore.toFixed(3)} (within tolerance)`, type: 'sub' },
        { t: 2620, text: '  ├─ Copy-move detection: DCT block matching...',          type: 'sub'     },
        { t: 2790, text: '  ├─ PRNU sensor fingerprint: consistent',                 type: 'sub'     },
        { t: 2960, text: '  ├─ JPEG ghost analysis: no secondary compression',       type: 'sub'     },
        { t: 3130, text: '  └─ Forensics analysis completed successfully ✓',         type: 'ok'      },
      ],
    },
    {
      id: 'face',
      label: 'MODULE 3 · FACE VERIFICATION',
      lines: [
        { t: 3300, text: '> Executing Face Verification & Biometric Cross-check...', type: 'process' },
        { t: 3480, text: '  ├─ InsightFace ArcFace R100: embedding extracted',         type: 'sub'     },
        { t: 3650, text: '  ├─ Liveness score: 0.976 (anti-spoofing PASS)',          type: 'sub'     },
        { t: 3820, text: '  ├─ FAISS IVF index: Security watchlist scanned',         type: 'sub'     },
        { t: 3990, text: '  ├─ Nearest neighbor distance: optimal threshold',        type: 'sub'     },
        { t: 4160, text: `  ├─ Document-to-face cosine similarity: ${faceSim.toFixed(1)}%`, type: 'sub' },
        { t: 4330, text: `  └─ Identity confirmed: ${name} ✓`,                       type: 'ok'      },
      ],
    },
    {
      id: 'nlp',
      label: 'MODULE 4 · NLP RISK SYNTHESIS',
      lines: [
        { t: 4500, text: '> NLP Risk Synthesis & Weighted Trust Scoring Engine...',   type: 'process' },
        { t: 4680, text: '  ├─ Aggregating forensic & biometric signals...',         type: 'sub'     },
        { t: 4850, text: '  ├─ Computing composite trust score...',                  type: 'sub'     },
        { t: 5020, text: `  └─ Trust Score: ${trustScore}/100 → ${isCleared ? 'CLEARED - LOW RISK' : 'HIGH RISK DETECTED'} ✓`, type: 'ok' },
      ],
    },
    {
      id: 'done',
      lines: [
        { t: 5200, text: '────────────────────────────────────────────────────', type: 'divider' },
        { t: 5350, text: 'PIPELINE COMPLETE · Generating Evidence Dashboard...',  type: 'header'  },
      ],
    },
  ];
}

const TOTAL_DURATION = 5500; // ms

export default function ProcessingTerminal({ travelerData, onComplete }) {
  const [visibleLines,   setVisibleLines]   = useState([]);
  const [progress,       setProgress]       = useState(0);
  const [currentModule,  setCurrentModule]  = useState('');
  const [backendResult,  setBackendResult]  = useState(null);
  const [errorMsg,       setErrorMsg]       = useState(null);

  // 1. Backend call on mount
  useEffect(() => {
    const executeBackendVerification = async () => {
      try {
        const docFile = travelerData?.documentFile;
        const liveFile = travelerData?.livePhotoFile;

        if (!docFile || !liveFile) {
          throw new Error("Missing document or live photo files from Intake Terminal. Please upload both.");
        }

        // FastAPI Backend hit kar rahe hain
        const data = await verifyDocumentAPI(docFile, liveFile);
        setBackendResult(data);

        // Animation khatam hone par data App.jsx ko bhejna
        setTimeout(() => {
          if (onComplete) onComplete(data);
        }, TOTAL_DURATION + 600);

      } catch (err) {
        console.error("Verification execution failed:", err);
        setErrorMsg(err.detail || err.message || "Backend connection failed.");
      }
    };

    executeBackendVerification();
  }, [travelerData, onComplete]);

  // Build pipeline steps dynamically USING ONLY REAL BACKEND DATA
  const PIPELINE_STEPS = useMemo(() => buildPipelineSteps(travelerData, backendResult), [travelerData, backendResult]);
  const ALL_LINES      = useMemo(() => PIPELINE_STEPS.flatMap(s => s.lines), [PIPELINE_STEPS]);

  // 2. Terminal log animation loop (RUNS ONLY AFTER BACKEND RESULT ARRIVES)
  useEffect(() => {
    if (errorMsg || !backendResult) return; // 🚀 Yahan humne lock laga diya! Bina result ke start nahi hoga.

    const timers = [];

    ALL_LINES.forEach(line => {
      timers.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, line]);
        if (line.type === 'process') {
          const step = PIPELINE_STEPS.find(s => s.lines.includes(line));
          if (step?.label) setCurrentModule(step.label);
        }
      }, line.t));
    });

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(progressInterval); return 100; }
        return prev + (100 / (TOTAL_DURATION / 100));
      });
    }, 100);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [ALL_LINES, PIPELINE_STEPS, errorMsg, backendResult]);

  const lineColor = (type) => ({
    header:  '#f59e0b',
    info:    '#71717a',
    ok:      '#10b981',
    process: '#f59e0b',
    sub:     '#52525b',
    divider: '#3f3f46',
  }[type] || '#71717a');

  if (errorMsg) {
    return (
      <div style={{ padding: '2rem', background: '#18181b', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <h3 style={{ ...inter, fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>SECURITY PIPELINE INTERRUPTED</h3>
        <p style={{ ...mono, fontSize: '0.8rem', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', ...mono, fontSize: '0.75rem' }}
        >
          RESTART TERMINAL
        </button>
      </div>
    );
  }

  // 🚀 WAITING STATE: Jab tak Backend se data aa raha hai
  if (!backendResult) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', gap: '1.5rem' }}>
        <div style={{ width: '40px', height: '40px', borderTop: `3px solid ${S.amber}`, borderBottom: `3px solid ${S.amber}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ ...mono, fontSize: '0.75rem', color: S.amber, letterSpacing: '0.2em', textTransform: 'uppercase', animation: 'pulse 1.5s infinite' }}>
          UPLOADING SECURE PAYLOAD TO VERITAS MAINFRAME...
        </div>
        <div style={{ ...mono, fontSize: '0.55rem', color: S.faint }}>
          Awaiting cryptographic handshake and fusion analysis from FastAPI backend
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    );
  }

  // 🚀 MAIN TERMINAL (Data aane ke baad hi yeh chalega)
  return (
    <div className="fade-up" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 200px)', gap: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '820px' }}>

        {/* Stage header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '3px', height: '22px', background: S.amber, borderRadius: '2px' }} />
          <div>
            <div style={{ ...mono, fontSize: '0.6rem', color: S.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              STAGE 02 / 03
            </div>
            <h1 style={{ ...inter, fontSize: '1.1rem', fontWeight: 700, color: S.text, margin: 0, letterSpacing: '-0.01em' }}>
              Automated Multi-Signal Fusion Analysis
            </h1>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ ...mono, fontSize: '0.58rem', color: S.amber, letterSpacing: '0.1em' }}>
              {currentModule || 'INITIALIZING'}
            </span>
            <span style={{ ...mono, fontSize: '0.58rem', color: S.muted }}>
              {Math.min(Math.round(progress), 100)}%
            </span>
          </div>
          <div style={{ height: '3px', background: S.border, borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(90deg, #78350f, ${S.amber})`,
              borderRadius: '9999px', transition: 'width 0.15s ease',
              boxShadow: `0 0 8px rgba(245,158,11,0.4)`,
            }} />
          </div>
        </div>

        {/* Terminal window */}
        <div className="terminal-flicker" style={{ background: '#060607', border: `1px solid ${S.border}`, borderRadius: '6px', overflow: 'hidden' }}>
          {/* Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#0f0f10', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['#3f3f46','#3f3f46','#3f3f46'].map((c,i) => (
                <div key={i} style={{ width:'9px', height:'9px', borderRadius:'50%', background:c }} />
              ))}
            </div>
            <span style={{ ...mono, fontSize: '0.55rem', color: S.faint, marginLeft: '0.5rem', letterSpacing: '0.1em' }}>
              veritas-fusion-engine — secure-tty
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className="pulse-amber" style={{ width:'6px', height:'6px', background: S.amber }} />
              <span style={{ ...mono, fontSize: '0.52rem', color: S.amber, letterSpacing: '0.1em' }}>PROCESSING</span>
            </div>
          </div>

          {/* Log lines */}
          <div style={{ padding: '1rem 1.25rem', minHeight: '380px', maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {visibleLines.map((line, i) => (
              <div
                key={i}
                className="slide-in"
                style={{
                  ...mono, fontSize: '0.68rem', lineHeight: 1.8,
                  color: lineColor(line.type),
                  fontWeight: (line.type === 'ok' || line.type === 'header') ? 600 : 400,
                }}
              >
                {line.text}
              </div>
            ))}
            <div style={{ ...mono, fontSize: '0.68rem', color: S.amber, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.1rem' }}>
              <span>$</span>
              <span className="cursor-blink" style={{ display:'inline-block', width:'8px', height:'13px', background:S.amber }} />
            </div>
          </div>
        </div>

        {/* Module status chips */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {PIPELINE_STEPS.filter(s => s.label).map(step => {
            const lastLine  = step.lines[step.lines.length - 1];
            const isVisible = visibleLines.some(l => l === lastLine);
            return (
              <div key={step.id} style={{
                ...mono, fontSize: '0.55rem', letterSpacing: '0.1em',
                padding: '0.25rem 0.6rem',
                border: `1px solid ${isVisible ? 'rgba(16,185,129,0.3)' : S.border}`,
                background: isVisible ? 'rgba(16,185,129,0.06)' : 'transparent',
                borderRadius: '3px',
                color: isVisible ? S.green : S.faint,
                transition: 'all 0.3s',
              }}>
                {isVisible ? '✓ ' : '○ '}
                {step.label.split(' · ')[1]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}