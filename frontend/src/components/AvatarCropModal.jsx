/**
 * AvatarCropModal
 * ─────────────────────────────────────────────────────
 * A polished avatar upload & crop flow:
 *  1. User picks an image (any ratio)
 *  2. A crop UI lets them drag / pinch-zoom to frame a 1:1 region
 *  3. Circular live preview shown on the right
 *  4. On confirm → crops to 400×400 JPEG → sends to backend → updates Supabase
 */
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Upload, Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

/* ── helpers ────────────────────────────────────────────────── */
async function getCroppedImg(imageSrc, pixelCrop, outputSize = 400) {
  const image = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  // Draw cropped region scaled to outputSize×outputSize
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputSize, outputSize,
  );

  return canvas.toDataURL('image/jpeg', 0.92);  // high-quality JPEG
}

/* ── component ─────────────────────────────────────────────── */
export default function AvatarCropModal({ onClose, onSuccess }) {
  const { refreshUser } = useAuth();

  const [step, setStep]                     = useState('pick');   // 'pick' | 'crop' | 'uploading' | 'done'
  const [rawSrc, setRawSrc]                 = useState(null);
  const [crop, setCrop]                     = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                     = useState(1);
  const [rotation, setRotation]             = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [preview, setPreview]               = useState(null);
  const [error, setError]                   = useState('');
  const [progress, setProgress]             = useState(0);

  /* File picked */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('File must be under 10 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setRawSrc(reader.result); setStep('crop'); };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  /* Generate preview */
  const handlePreview = async () => {
    if (!croppedAreaPixels) return;
    const dataUrl = await getCroppedImg(rawSrc, croppedAreaPixels);
    setPreview(dataUrl);
  };

  /* Upload */
  const handleUpload = async () => {
    if (!croppedAreaPixels) return;
    setStep('uploading');
    setProgress(20);
    try {
      const dataUrl = await getCroppedImg(rawSrc, croppedAreaPixels);
      setProgress(50);
      const { data } = await api.post('/auth/upload-avatar', { image_data: dataUrl });
      setProgress(90);
      await refreshUser();
      setProgress(100);
      setStep('done');
      if (onSuccess) onSuccess(data.avatar_url);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setStep('crop');
    }
  };

  const C = {
    bg: '#0d1526', border: 'rgba(255,255,255,.08)',
    text: '#f1f5f9', muted: '#64748b', muted2: '#94a3b8',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:18, width:560, maxWidth:'95vw', boxShadow:'0 24px 80px rgba(0,0,0,.7)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.05rem', color:C.text }}>
              {step==='pick'      ? '📸 Upload Profile Picture'  :
               step==='crop'      ? '✂️ Crop Your Photo'          :
               step==='uploading' ? '⬆️ Uploading…'               :
                                    '✅ Done!'}
            </div>
            <div style={{ fontSize:'.73rem', color:C.muted, marginTop:'.15rem' }}>
              {step==='pick' ? 'Choose any image — we\'ll help you crop it to a perfect square.' :
               step==='crop' ? 'Drag to reposition · Scroll or use slider to zoom · Rotate if needed.' :
               ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, padding:'.25rem' }}>
            <X size={20}/>
          </button>
        </div>

        {/* ── PICK STEP ─────────────────────────────────────────────── */}
        {step === 'pick' && (
          <div style={{ padding:'2.5rem 1.5rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem' }}>
            <label htmlFor="avatar-file-input" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem', cursor:'pointer', padding:'2.5rem 3rem', borderRadius:14, border:'2px dashed rgba(99,102,241,.35)', background:'rgba(99,102,241,.04)', width:'100%', boxSizing:'border-box', transition:'.2s' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(99,102,241,.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Upload size={28} color="#6366f1"/>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:700, color:C.muted2, fontSize:'.95rem' }}>Click to choose a photo</div>
                <div style={{ fontSize:'.75rem', color:C.muted, marginTop:'.35rem' }}>JPG, PNG, WebP — up to 10 MB · Any aspect ratio supported</div>
              </div>
              <input id="avatar-file-input" type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
            </label>
            {error && <div style={{ color:'#ef4444', fontSize:'.8rem', textAlign:'center' }}>{error}</div>}
          </div>
        )}

        {/* ── CROP STEP ─────────────────────────────────────────────── */}
        {step === 'crop' && (
          <>
            {/* Crop area */}
            <div style={{ position:'relative', height:320, background:'#060c1a' }}>
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                onInteractionEnd={handlePreview}
                style={{
                  containerStyle: { background:'#060c1a' },
                  cropAreaStyle:  { border:'3px solid rgba(99,102,241,.9)', boxShadow:'0 0 0 9999px rgba(6,12,26,.75)' },
                }}
              />
            </div>

            {/* Controls + Preview */}
            <div style={{ padding:'1rem 1.5rem', display:'grid', gridTemplateColumns:'1fr auto', gap:'1.25rem', alignItems:'center', borderTop:`1px solid ${C.border}` }}>
              <div>
                {/* Zoom slider */}
                <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.7rem' }}>
                  <ZoomOut size={14} color={C.muted}/>
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e=>setZoom(Number(e.target.value))}
                    style={{ flex:1, accentColor:'#6366f1', cursor:'pointer' }}
                  />
                  <ZoomIn size={14} color={C.muted}/>
                  <span style={{ fontSize:'.72rem', color:C.muted, width:32, textAlign:'right' }}>{zoom.toFixed(1)}×</span>
                </div>

                {/* Rotation slider */}
                <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
                  <RotateCcw size={14} color={C.muted}/>
                  <input type="range" min={-180} max={180} step={1} value={rotation} onChange={e=>setRotation(Number(e.target.value))}
                    style={{ flex:1, accentColor:'#6366f1', cursor:'pointer' }}
                  />
                  <span style={{ fontSize:'.72rem', color:C.muted, width:40, textAlign:'right' }}>{rotation}°</span>
                </div>
              </div>

              {/* Live preview */}
              <div style={{ textAlign:'center' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', border:'3px solid rgba(99,102,241,.5)', background:'#111e35', margin:'0 auto' }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.65rem', color:C.muted }}>Preview</div>
                  }
                </div>
                <div style={{ fontSize:'.65rem', color:C.muted, marginTop:'.35rem' }}>Preview</div>
              </div>
            </div>

            {/* Error */}
            {error && <div style={{ padding:'0 1.5rem .75rem', color:'#ef4444', fontSize:'.8rem' }}>{error}</div>}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:'.75rem', padding:'.75rem 1.5rem 1.25rem', borderTop:`1px solid ${C.border}` }}>
              <button onClick={()=>{ setStep('pick'); setRawSrc(null); setPreview(null); setRotation(0); setZoom(1); }}
                style={{ flex:1, padding:'.6rem', borderRadius:8, background:'rgba(255,255,255,.05)', border:`1px solid ${C.border}`, color:C.muted2, fontWeight:600, cursor:'pointer', fontSize:'.84rem' }}>
                ← Choose Different
              </button>
              <button onClick={handleUpload}
                style={{ flex:2, padding:'.6rem', borderRadius:8, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.84rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem' }}>
                <Check size={16}/> Upload Photo
              </button>
            </div>
          </>
        )}

        {/* ── UPLOADING STEP ────────────────────────────────────────── */}
        {step === 'uploading' && (
          <div style={{ padding:'3rem 2rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(99,102,241,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', border:'3px solid #6366f1', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
            </div>
            <div style={{ fontWeight:700, color:C.muted2 }}>Uploading your photo…</div>
            <div style={{ width:'100%', maxWidth:280, height:6, background:'rgba(255,255,255,.06)', borderRadius:3 }}>
              <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#4f46e5,#7c3aed)', width:`${progress}%`, transition:'width .4s ease' }}/>
            </div>
          </div>
        )}

        {/* ── DONE STEP ─────────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ padding:'3rem 2rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(16,185,129,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem' }}>✅</div>
            <div style={{ fontWeight:700, color:'#10b981', fontSize:'1rem' }}>Profile picture updated!</div>
            <div style={{ fontSize:'.78rem', color:C.muted }}>Your new photo is live across SmartSec.</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
