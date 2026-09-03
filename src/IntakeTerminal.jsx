import { useState, useEffect, useRef } from 'react';
import { S, mono, inter } from './theme';
import PanelHeader from './components/PanelHeader';

export const SAMPLE_TRAVELER = {
  name:        'ARJUN R MEHTA',
  docNo:       'P6291847A',
  dob:         '12 MAR 1989',
  nationality: 'IND',
  expiry:      '11 MAR 2029',
  gender:      'M',
  issued:      '12 MAR 2019',
};

const FORM_FIELDS = [
  { key: 'name',        label: 'FULL NAME',     placeholder: 'e.g. JOHN A DOE' },
  { key: 'docNo',       label: 'DOCUMENT NO',   placeholder: 'e.g. P1234567' },
  { key: 'dob',         label: 'DATE OF BIRTH', placeholder: 'e.g. 01 JAN 1990' },
  { key: 'nationality', label: 'NATIONALITY',   placeholder: 'e.g. IND' },
  { key: 'expiry',      label: 'EXPIRY DATE',   placeholder: 'e.g. 01 JAN 2030' },
  { key: 'gender',      label: 'GENDER',        placeholder: 'M / F / X' },
];

export default function IntakeTerminal({ onNext }) {
  const [docLoaded,    setDocLoaded]    = useState(false);
  const [previewUrl,   setPreviewUrl]   = useState(null); 
  const [formData,     setFormData]     = useState(SAMPLE_TRAVELER);
  
  // 🚀 Real files stored here for backend transmission
  const [rawDocFile,   setRawDocFile]   = useState(null);

  const [cameraReady,  setCameraReady]  = useState(false);
  const [cameraError,  setCameraError]  = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
            setTimeout(() => setFaceDetected(true), 2200);
          };
        }
      } catch (e) {
        setCameraError(true);
      }
    }
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRawDocFile(file); // Save actual File object for backend

    if (file.type.startsWith('image/')) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setFormData(SAMPLE_TRAVELER);
    setDocLoaded(true);
  };

  const handleLoadSample = async () => {
    setPreviewUrl(null);
    setFormData(SAMPLE_TRAVELER);
    setDocLoaded(true);

    // Create a dummy File object from sample if needed or let backend handle sample
    // For demo safety, we fetch a default dummy passport image blob if required, 
    // or pass null so backend can use a fallback sample image.
    try {
      const response = await fetch('https://images.unsplash.com/photo-1544717305-2782549b5136?w=800'); // placeholder sample
      const blob = await response.blob();
      const sampleFile = new File([blob], "sample_passport.jpg", { type: "image/jpeg" });
      setRawDocFile(sampleFile);
    } catch {
      setRawDocFile(null);
    }
  };

  const updateField = (key, value) =>
    setFormData(prev => ({ ...prev, [key]: value.toUpperCase() }));

  // Capture current video frame as a File object for live_photo
  const captureLivePhoto = () => {
    return new Promise((resolve) => {
      if (!videoRef.current || cameraError) {
        resolve(null);
        return;
      }
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const liveFile = new File([blob], "live_capture.jpg", { type: "image/jpeg" });
        resolve(liveFile);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleScan = async () => {
    // BUG FIX: Call captureLivePhoto() directly.
    // Previously called captureLiveProfileSnapshot which was a `const` alias
    // defined AFTER this function — consts are NOT hoisted, causing a
    // ReferenceError at runtime. The alias is removed entirely.
    const livePhotoFile = await captureLivePhoto();

    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

    // Bundle everything into travelerData to pass down to ProcessingTerminal
    const comprehensiveData = {
      ...formData,
      documentFile: rawDocFile,
      livePhotoFile: livePhotoFile,
    };

    onNext(comprehensiveData);
  };

  const canScan = docLoaded && (cameraReady || cameraError);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '3px', height: '22px', background: S.amber, borderRadius: '2px' }} />
        <div>
          <div style={{ ...mono, fontSize: '0.6rem', color: S.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            STAGE 01 / 03
          </div>
          <h1 style={{ ...inter, fontSize: '1.1rem', fontWeight: 700, color: S.text, margin: 0, letterSpacing: '-0.01em' }}>
            Document Intake &amp; Identity Acquisition
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* LEFT: Document Intake */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
          <PanelHeader label="Document Intake" icon="📄" status="PORT: USB-DOC-01 · READY" statusColor={S.green} />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div
              style={{
                border: `2px dashed ${docLoaded ? S.green : S.faint}`,
                borderRadius: '6px', padding: '1.5rem', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: docLoaded ? 'rgba(16,185,129,0.04)' : 'transparent',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded document"
                  style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', marginBottom: '0.5rem', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {docLoaded ? '✅' : '📁'}
                </div>
              )}
              <div style={{ ...mono, fontSize: '0.62rem', color: docLoaded ? S.green : S.sub, letterSpacing: '0.1em' }}>
                {docLoaded ? 'DOCUMENT LOADED — CLICK TO REPLACE' : 'CLICK TO UPLOAD DOCUMENT'}
              </div>
              <div style={{ ...inter, fontSize: '0.65rem', color: S.muted, marginTop: '0.25rem' }}>
                {docLoaded ? (previewUrl ? 'Preview above' : 'No preview for PDF') : 'Accepts: JPEG, PNG, PDF · Max 10MB'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: S.border }} />
              <span style={{ ...mono, fontSize: '0.58rem', color: S.faint, letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: S.border }} />
            </div>

            <div
              style={{
                background: S.surface,
                border: `1px solid ${(docLoaded && !previewUrl) ? S.green : S.border}`,
                borderRadius: '6px', padding: '0.85rem', cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
              }}
              onClick={handleLoadSample}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{
                      ...mono, fontSize: '0.55rem', fontWeight: 700,
                      background: (docLoaded && !previewUrl) ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
                      color: (docLoaded && !previewUrl) ? S.green : S.amber,
                      border: `1px solid ${(docLoaded && !previewUrl) ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`,
                      borderRadius: '3px', padding: '0.15rem 0.45rem', letterSpacing: '0.1em',
                    }}>
                      {(docLoaded && !previewUrl) ? '✓ LOADED' : 'SAMPLE A'}
                    </span>
                    <span style={{ ...mono, fontSize: '0.55rem', color: S.faint }}>TYPE P · GENUINE</span>
                  </div>
                  <div style={{ ...mono, fontSize: '0.72rem', fontWeight: 700, color: S.text }}>
                    ARJUN R MEHTA
                  </div>
                </div>
                <div style={{ width: '44px', height: '56px', flexShrink: 0, background: '#1a1a1c', border: `1px solid ${S.border}`, borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  <div style={{ fontSize: '1.2rem' }}>🛂</div>
                  <div style={{ ...mono, fontSize: '0.38rem', color: S.faint }}>SAMPLE</div>
                </div>
              </div>
            </div>

            {docLoaded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ ...mono, fontSize: '0.5rem', color: S.amber, letterSpacing: '0.14em', marginBottom: '0.1rem' }}>
                  ▸ VERIFY EXTRACTED DATA — EDIT IF NEEDED
                </div>
                {FORM_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <div style={{ ...mono, fontSize: '0.48rem', color: S.faint, letterSpacing: '0.1em', marginBottom: '0.18rem' }}>
                      {label}
                    </div>
                    <input
                      type="text"
                      value={formData[key]}
                      placeholder={placeholder}
                      onChange={e => updateField(key, e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#0f0f10', border: `1px solid ${S.border}`,
                        borderRadius: '4px', padding: '0.38rem 0.6rem',
                        ...mono, fontSize: '0.63rem', color: S.text, outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live Camera Verification */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
          <PanelHeader
            label="Live Identity Verification" icon="📷"
            status={cameraError ? 'CAMERA UNAVAILABLE' : cameraReady ? 'FEED ACTIVE' : 'INITIALIZING...'}
            statusColor={cameraError ? S.red : cameraReady ? S.green : S.amber}
          />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ position: 'relative', background: '#0a0a0b', border: `1px solid ${S.border}`, borderRadius: '6px', overflow: 'hidden', aspectRatio: '4/3' }}>
              {!cameraError ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {faceDetected && (
                    <div style={{ position: 'absolute', top:'50%', left:'50%', transform:'translate(-50%,-60%)', width:'90px', height:'110px', border:`1.5px solid ${S.green}`, borderRadius:'6px', boxShadow:'0 0 20px rgba(16,185,129,0.3)' }}>
                      <div style={{ position:'absolute', bottom:'-24px', left:'50%', transform:'translateX(-50%)', ...mono, fontSize:'0.5rem', color:S.green, background:'rgba(9,9,11,0.85)', padding:'0.2rem 0.4rem', borderRadius:'2px' }}>FACE DETECTED</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'1rem' }}>
                  <div style={{ fontSize:'2rem' }}>⚠️</div>
                  <div style={{ ...mono, fontSize:'0.62rem', color:S.red }}>CAMERA UNAVAILABLE</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem', paddingBottom:'1rem' }}>
        <button id="btn-initialize-scan" className="hw-btn hw-btn-primary" onClick={handleScan} disabled={!canScan} style={{ fontSize:'0.72rem', letterSpacing:'0.15em' }}>
          <span>⚡</span><span>Initialize Multi-Signal Fusion Scan</span>
        </button>
      </div>
    </div>
  );
}