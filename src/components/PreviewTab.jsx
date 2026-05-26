import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { parseScript, framesToTimecode, buildCharSchedule } from '../lib/parseScript';
import { buildSoundSchedule } from '../lib/soundSchedule';
import { ensureContext, decodeLibrary, playRandom, stopAll } from '../lib/audioEngine';
import VisualTimeline from './VisualTimeline';

export default function PreviewTab({ script, settings, library }) {
  const { rows, totalFrames } = useMemo(() => parseScript(script, settings), [script, settings]);
  const charSchedule = useMemo(() => buildCharSchedule(rows), [rows]);
  const soundSchedule = useMemo(() => buildSoundSchedule(rows, settings.voice), [rows, settings.voice]);
  const fps = settings.fps;

  const [playState, setPlayState] = useState('idle');
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(null);
  const triggerIdxRef = useRef(-1);
  const buffersRef = useRef([]);

  const decodeIfNeeded = useCallback(async () => {
    if (library.length === 0) {
      buffersRef.current = [];
      return;
    }
    buffersRef.current = await decodeLibrary(library);
  }, [library]);

  useEffect(() => {
    decodeIfNeeded();
  }, [decodeIfNeeded]);

  const setFrame = useCallback((f) => {
    const clamped = Math.max(0, Math.min(totalFrames, f));
    frameRef.current = clamped;
    setCurrentFrame(clamped);
    let idx = -1;
    for (let i = 0; i < soundSchedule.length; i++) {
      if (soundSchedule[i].frame <= clamped) idx = i;
      else break;
    }
    triggerIdxRef.current = idx;
  }, [totalFrames, soundSchedule]);

  const tickRef = useRef(null);
  const tick = useCallback((now) => {
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    const advance = dt * fps;
    let next = frameRef.current + advance;

    if (next >= totalFrames) {
      next = totalFrames;
    }

    while (
      triggerIdxRef.current + 1 < soundSchedule.length &&
      soundSchedule[triggerIdxRef.current + 1].frame <= next
    ) {
      triggerIdxRef.current += 1;
      if (buffersRef.current.length > 0) {
        playRandom(buffersRef.current, {
          pitchJitter: settings.voice.pitchJitter,
          volumeJitter: settings.voice.volumeJitter,
          masterVolume: settings.voice.masterVolume,
        });
      }
    }

    frameRef.current = next;
    setCurrentFrame(next);

    if (next >= totalFrames) {
      setPlayState('idle');
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [fps, totalFrames, soundSchedule, settings.voice]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const onPlay = useCallback(async () => {
    if (totalFrames === 0) return;
    ensureContext();
    await decodeIfNeeded();
    if (frameRef.current >= totalFrames) {
      setFrame(0);
    }
    lastTimeRef.current = performance.now();
    setPlayState('playing');
    rafRef.current = requestAnimationFrame(tick);
  }, [decodeIfNeeded, setFrame, tick, totalFrames]);

  const onPause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopAll();
    setPlayState('paused');
  }, []);

  const onRestart = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopAll();
    setFrame(0);
    setPlayState('idle');
  }, [setFrame]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopAll();
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopAll();
    setFrame(0);
    setPlayState('idle');
  }, [script, settings.fps, settings.framesPerChar, settings.initialDelay, settings.countSpaces, settings.holds, setFrame]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const revealedCount = useMemo(() => {
    let n = 0;
    for (const c of charSchedule) {
      if (c.frame <= currentFrame) n += 1;
      else break;
    }
    return n;
  }, [charSchedule, currentFrame]);

  const onScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const wasPlaying = playState === 'playing';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopAll();
    setFrame(ratio * totalFrames);
    if (wasPlaying) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setPlayState('paused');
    }
  };

  const playing = playState === 'playing';

  return (
    <div className="grid gap-6">
      <div className="rounded-lg p-6" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
        <div className="text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
          Preview
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontOpticalSizing: 'auto',
            fontSize: '1.6rem',
            lineHeight: 1.5,
            minHeight: '6rem',
            color: '#5a4d44',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {charSchedule.length === 0 ? (
            <span style={{ color: '#5a4d44', fontSize: '1rem', fontFamily: "'JetBrains Mono', monospace" }}>
              Type a script in the Text tab to preview it here.
            </span>
          ) : (
            <>
              <span style={{ color: '#f5ead8' }}>
                {charSchedule.slice(0, revealedCount).map(c => c.char).join('')}
              </span>
              <span style={{ color: '#5a4d44' }}>
                {charSchedule.slice(revealedCount).map(c => c.char).join('')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
        <div className="flex items-center justify-between p-4 gap-4 flex-wrap" style={{ borderBottom: '1px solid #3a302a' }}>
          <div className="flex items-center gap-2">
            {playing ? (
              <button
                onClick={onPause}
                className="rounded px-4 py-2 flex items-center gap-2 text-sm transition-colors"
                style={{ backgroundColor: '#e89752', color: '#1c1714', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Pause size={14}/> Pause
              </button>
            ) : (
              <button
                onClick={onPlay}
                disabled={totalFrames === 0}
                className="rounded px-4 py-2 flex items-center gap-2 text-sm transition-colors"
                style={{
                  backgroundColor: totalFrames === 0 ? '#322a23' : '#e89752',
                  color: totalFrames === 0 ? '#5a4d44' : '#1c1714',
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: totalFrames === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Play size={14}/> {playState === 'paused' ? 'Resume' : 'Play'}
              </button>
            )}
            <button
              onClick={onRestart}
              className="rounded px-3 py-2 flex items-center gap-2 text-sm transition-colors"
              style={{ backgroundColor: '#322a23', border: '1px solid #3a302a', color: '#f5ead8', fontFamily: "'JetBrains Mono', monospace" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1c1714'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#322a23'}
            >
              <RotateCcw size={14}/>
            </button>
          </div>

          <div className="flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#e89752', fontSize: '1.4rem', fontWeight: 500 }}>
              {framesToTimecode(currentFrame, fps)}
            </span>
            <span style={{ color: '#5a4d44' }}>/</span>
            <span style={{ color: '#b8a89a', fontSize: '1rem' }}>
              {framesToTimecode(totalFrames, fps)}
            </span>
          </div>
        </div>

        <div onClick={onScrub} style={{ cursor: totalFrames > 0 ? 'pointer' : 'default' }}>
          <VisualTimeline
            rows={rows}
            totalFrames={totalFrames}
            fps={fps}
            view="bar"
            soundTriggers={soundSchedule}
            playhead={currentFrame}
          />
        </div>

        <div className="px-4 py-3" style={{ borderTop: '1px solid #3a302a', display: 'flex', gap: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#7a6a5e', flexWrap: 'wrap' }}>
          <span>{soundSchedule.length} sound trigger{soundSchedule.length === 1 ? '' : 's'}</span>
          <span style={{ color: '#5a4d44' }}>·</span>
          <span>every {settings.voice.everyNChars} char{settings.voice.everyNChars === 1 ? '' : 's'}</span>
          {library.length === 0 && (
            <>
              <span style={{ color: '#5a4d44' }}>·</span>
              <span style={{ color: '#d4b86a' }}>upload sounds in the Audio tab to hear playback</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
