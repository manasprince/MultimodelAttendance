import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Eye, Shield, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export default function VideoFeed({
  isActive,
  sessionId,
  blurPrivacy,
  onBlurToggle,
  onFrameProcessed,
  audioData,
  onCaptureSnapshot
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fps, setFps] = useState(0);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Camera
  const startCamera = async () => {
    try {
      setCameraLoading(true);
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCamera(true);
      setCameraLoading(false);
    } catch (err) {
      console.warn('Camera access denied or device not found:', err);
      setErrorMsg('Webcam access was not granted or no camera is connected.');
      setHasCamera(false);
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHasCamera(false);
    setAnnotatedFrame(null);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Frame Capture and Ingestion Loop
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !sessionId || !isActive || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply client-side blur if privacy is active
    if (blurPrivacy) {
      ctx.filter = 'blur(10px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    const b64 = canvas.toDataURL('image/jpeg', 0.75);

    try {
      setIsProcessing(true);
      const startT = performance.now();
      
      const payload = {
        session_id: sessionId,
        image_base64: b64,
        audio_energy: audioData?.energy_level || 0.0,
        audio_active: audioData?.speech_active || false,
        blur_privacy: blurPrivacy
      };

      const result = await onFrameProcessed(payload);
      
      const elapsed = performance.now() - startT;
      setFps(Math.round(1000 / Math.max(elapsed, 100)));

      if (result && result.processed_image_base64) {
        setAnnotatedFrame(result.processed_image_base64);
      }
    } catch (e) {
      console.error('Frame processing failed:', e);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, isActive, blurPrivacy, isProcessing, audioData, onFrameProcessed]);

  // Periodic Processing Interval
  useEffect(() => {
    if (isActive && hasCamera) {
      timerRef.current = setInterval(() => {
        captureAndProcess();
      }, 1600);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, hasCamera, captureAndProcess]);

  // Snapshot grabber for registration
  const handleSnapshotClick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.85);
    if (onCaptureSnapshot) {
      onCaptureSnapshot(b64);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Video Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`live-indicator ${isActive ? 'live-indicator-recording' : ''}`} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {isActive ? 'Live Video Telemetry Active' : 'Camera Monitor (Standby)'}
          </span>
          {fps > 0 && isActive && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {fps} Hz
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Privacy Blur Toggle */}
          <button
            onClick={onBlurToggle}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              color: blurPrivacy ? '#67e8f9' : 'var(--text-muted)',
              borderColor: blurPrivacy ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-color)',
              background: blurPrivacy ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
            }}
            title="Blur facial snapshot data for privacy protection"
          >
            <Shield size={14} />
            <span>{blurPrivacy ? 'Privacy Blur ON' : 'Privacy Blur OFF'}</span>
          </button>

          {/* Toggle Camera */}
          <button
            onClick={hasCamera ? stopCamera : startCamera}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            title={hasCamera ? 'Disable Camera' : 'Enable Camera'}
          >
            {hasCamera ? <Camera size={14} color="#34d399" /> : <CameraOff size={14} color="#f87171" />}
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#030712',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Real-time Video Stream Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: hasCamera ? 'block' : 'none',
            transform: 'scaleX(-1)', // Mirror feed
            filter: blurPrivacy ? 'blur(12px)' : 'none'
          }}
        />

        {/* Server OpenCV Annotated Overlay (if available from frame processor) */}
        {annotatedFrame && isActive && (
          <img
            src={annotatedFrame}
            alt="OpenCV Annotated Frame"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              opacity: 0.95
            }}
          />
        )}

        {/* Offscreen Canvas for Frame Capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Error or Inactive State Placeholder */}
        {!hasCamera && (
          <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
            {cameraLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <RefreshCw size={32} className="animate-spin" color="var(--primary-light)" />
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Initializing camera...</span>
              </div>
            ) : errorMsg ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={36} color="#f87171" />
                <span style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 600 }}>{errorMsg}</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  You can still manually manage and record attendance without video feed.
                </p>
                <button onClick={startCamera} className="btn-primary" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                  Retry Camera Connection
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <CameraOff size={36} color="var(--text-dim)" />
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Camera is currently off</span>
                <button onClick={startCamera} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                  Turn On Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* HUD Overlay Stamp */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          borderRadius: 6,
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: '#d1d5db',
          display: 'flex',
          gap: 12
        }}>
          <span>MODE: {blurPrivacy ? 'PRIVACY_PROTECTED' : 'COMPUTER_VISION'}</span>
          <span>AGENT: {isProcessing ? 'SCANNING...' : 'MONITORING'}</span>
        </div>

        {onCaptureSnapshot && hasCamera && (
          <button
            onClick={handleSnapshotClick}
            className="btn-secondary"
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              padding: '6px 12px',
              fontSize: '0.75rem',
              background: 'rgba(0,0,0,0.7)'
            }}
          >
            <Camera size={14} />
            <span>Capture Face Profile</span>
          </button>
        )}
      </div>
    </div>
  );
}

