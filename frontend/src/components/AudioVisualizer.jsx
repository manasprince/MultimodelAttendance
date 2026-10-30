import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';

export default function AudioVisualizer({ isActive, onAudioTelemetry }) {
  const [micGranted, setMicGranted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [energy, setEnergy] = useState(0);
  const [speechActive, setSpeechActive] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  const startAudio = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMicGranted(true);
      drawVisualizer();
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setErrorMsg('Microphone permission required for audio telemetry.');
      setMicGranted(false);
    }
  };

  const stopAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicGranted(false);
    setEnergy(0);
    setSpeechActive(false);
  };

  useEffect(() => {
    if (isActive) {
      startAudio();
    } else {
      stopAudio();
    }
    return () => stopAudio();
  }, [isActive]);

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let lastSendTime = 0;

    const render = (time) => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      // Compute RMS Energy
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] / 255.0;
        sum += val * val;
        if (val > peak) peak = val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const isSpeaking = rms > 0.08;

      setEnergy(rms);
      setSpeechActive(isSpeaking);

      // Send telemetry to parent ~every 1.5 seconds
      if (time - lastSendTime > 1500) {
        lastSendTime = time;
        if (onAudioTelemetry) {
          onAudioTelemetry({
            energy_level: Math.round(rms * 100) / 100,
            speech_active: isSpeaking,
            peak_volume: Math.round(peak * 100) / 100,
          });
        }
      }

      // Draw bars
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        
        // Gradient color: Cyan to Indigo to Red for peaks
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(0.7, '#6366f1');
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
        if (x > width) break;
      }
    };

    render(0);
  };

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {micGranted ? <Mic size={16} color="#06b6d4" /> : <MicOff size={16} color="var(--text-dim)" />}
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Audio Activity & Speech Pacing</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: 6,
            background: speechActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: speechActive ? '#34d399' : 'var(--text-dim)',
            fontWeight: 600
          }}>
            {speechActive ? 'SPEECH ACTIVE' : 'QUIET / IDLE'}
          </span>
        </div>
      </div>

      {errorMsg ? (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 8,
          fontSize: '0.78rem',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
          <button onClick={startAudio} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      ) : (
        <div>
          {/* Visual Canvas */}
          <canvas
            ref={canvasRef}
            width={340}
            height={46}
            style={{
              width: '100%',
              height: 46,
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 6,
              display: 'block'
            }}
          />

          {/* Energy Meter Bar */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', width: 60 }}>Energy: {Math.round(energy * 100)}%</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, energy * 200)}%`,
                background: energy > 0.6 ? '#ef4444' : (energy > 0.3 ? '#f59e0b' : '#06b6d4'),
                transition: 'width 0.1s ease'
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

