import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const DEFAULT_SETTINGS = {
  fps: 60,
  framesPerChar: 2,
  initialDelay: 6,
  countSpaces: false,
  holds: {
    comma: 7,
    period: 15,
    emDash: 12,
    ellipsis: 24,
    question: 10,
    exclamation: 10,
  },
};

const DEFAULT_SCRIPT = "I've got an idea... Pick something yummy for me. No better time to start working on our goals now";

function framesToTimecode(frames, fps) {
  const f = Math.max(0, Math.round(frames));
  const totalSeconds = Math.floor(f / fps);
  const frameRemainder = f % fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}:${String(frameRemainder).padStart(2, '0')}`;
}

function parseScript(text, settings) {
  // Normalize: "..." → "…", "--" → "—"
  const normalized = text.replace(/\.\.\./g, '…').replace(/--/g, '—');
  const { framesPerChar, countSpaces, initialDelay, holds } = settings;
  const events = [];
  let chunk = '';

  const flushChunk = () => {
    if (chunk.length === 0) return;
    const chars = countSpaces ? chunk.length : chunk.replace(/ /g, '').length;
    if (chars === 0) {
      chunk = '';
      return;
    }
    events.push({
      type: 'chunk',
      label: `"${chunk.trim()}"`,
      chars,
      frames: Math.round(chars * framesPerChar),
    });
    chunk = '';
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '…') {
      flushChunk();
      // Ellipsis displays period-by-period: dot reveals, hold, repeat 3x
      for (let dotIdx = 1; dotIdx <= 3; dotIdx++) {
        events.push({ type: 'punct-reveal', label: `ellipsis dot ${dotIdx}`, chars: 1, frames: Math.round(framesPerChar) });
        events.push({ type: 'punct-hold', label: 'ellipsis hold', frames: holds.ellipsis });
      }
    } else if (ch === '—') {
      chunk += ch;
      flushChunk();
      events.push({ type: 'punct-hold', label: 'em-dash hold', frames: holds.emDash });
    } else if (ch === '.') {
      chunk += ch;
      flushChunk();
      events.push({ type: 'punct-hold', label: 'period hold', frames: holds.period });
    } else if (ch === ',') {
      chunk += ch;
      flushChunk();
      events.push({ type: 'punct-hold', label: 'comma hold', frames: holds.comma });
    } else if (ch === '?') {
      chunk += ch;
      flushChunk();
      events.push({ type: 'punct-hold', label: 'question hold', frames: holds.question });
    } else if (ch === '!') {
      chunk += ch;
      flushChunk();
      events.push({ type: 'punct-hold', label: 'exclamation hold', frames: holds.exclamation });
    } else {
      chunk += ch;
    }
  }
  flushChunk();

  let accumulated = initialDelay;
  const rows = [{ label: 'Initial delay', frames: initialDelay, accumulated, type: 'delay' }];
  for (const ev of events) {
    accumulated += ev.frames;
    rows.push({ ...ev, accumulated });
  }

  const totalChars = events
    .filter(e => e.type === 'chunk' || e.type === 'punct-reveal')
    .reduce((sum, e) => sum + (e.chars || 0), 0);

  return { rows, totalFrames: accumulated, totalChars };
}

function SettingNumber({ label, value, onChange, options, step, min, max }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.12em] mb-1.5" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </label>
      {options ? (
        <div className="flex rounded overflow-hidden" style={{ backgroundColor: '#1c1714', border: '1px solid #3a302a' }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
                backgroundColor: value === opt ? '#e89752' : 'transparent',
                color: value === opt ? '#1c1714' : '#b8a89a',
                fontWeight: value === opt ? 600 : 400,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          step={step}
          min={min}
          max={max}
          className="rounded px-3 py-1.5 text-sm w-20 focus:outline-none"
          style={{
            backgroundColor: '#1c1714',
            border: '1px solid #3a302a',
            color: '#f5ead8',
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: 'tabular-nums',
          }}
          onFocus={e => e.target.style.borderColor = '#e89752'}
          onBlur={e => e.target.style.borderColor = '#3a302a'}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
      <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
      <div className="text-3xl mt-1" style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 500,
        color: '#e89752',
        fontOpticalSizing: 'auto',
      }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#b8a89a', fontFamily: "'JetBrains Mono', monospace" }}>
        {sub}
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '2px' }} />
      <span>{label}</span>
    </div>
  );
}

function VisualTimeline({ rows, totalFrames, fps, view, onViewChange }) {
  if (totalFrames === 0 || rows.length === 0) {
    return (
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #3a302a' }}>
        <div style={{ height: '28px', backgroundColor: '#1c1714', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-xs" style={{ color: '#5a4d44', fontFamily: "'JetBrains Mono', monospace" }}>
            empty timeline
          </span>
        </div>
      </div>
    );
  }

  const colorForType = (type) => {
    switch (type) {
      case 'delay': return '#3a302a';
      case 'chunk': return '#e89752';
      case 'punct-reveal': return '#d4b86a';
      case 'punct-hold': return '#5a4d44';
      default: return '#3a302a';
    }
  };

  // Determine tick interval based on total duration
  const totalSeconds = totalFrames / fps;
  let tickInterval;
  if (totalSeconds < 1.5) tickInterval = 0.25;
  else if (totalSeconds < 4) tickInterval = 0.5;
  else if (totalSeconds < 15) tickInterval = 1;
  else if (totalSeconds < 60) tickInterval = 5;
  else tickInterval = 10;

  const ticks = [];
  for (let t = 0; t <= totalSeconds + 0.0001; t += tickInterval) {
    ticks.push(Math.round(t * 10000) / 10000);
  }

  // Cumulative-char points for velocity view (and useful elsewhere)
  const points = [{ frame: 0, chars: 0, label: 'start', type: 'start' }];
  let cumChars = 0;
  for (const row of rows) {
    if (row.type === 'chunk' || row.type === 'punct-reveal') {
      cumChars += row.chars || 0;
    }
    points.push({ frame: row.accumulated, chars: cumChars, label: row.label, type: row.type });
  }
  const maxChars = Math.max(1, cumChars);
  const yAxisTicks = maxChars >= 4
    ? [0, Math.round(maxChars / 2), maxChars]
    : Array.from({ length: maxChars + 1 }, (_, i) => i);

  const views = [
    { id: 'bar', label: 'Bar' },
    { id: 'keyframe', label: 'Keys' },
    { id: 'velocity', label: 'Velocity' },
  ];

  const showYAxis = view === 'velocity';
  const yAxisWidth = 32;

  return (
    <div className="px-4 py-4" style={{ borderBottom: '1px solid #3a302a' }}>
      {/* Header row */}
      <div className="flex justify-between items-center mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
            Visual timeline
          </span>
          <div className="flex rounded overflow-hidden" style={{ backgroundColor: '#1c1714', border: '1px solid #3a302a' }}>
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className="px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition-colors"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  backgroundColor: view === v.id ? '#e89752' : 'transparent',
                  color: view === v.id ? '#1c1714' : '#b8a89a',
                  fontWeight: view === v.id ? 600 : 400,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[10px]" style={{ color: '#b8a89a', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
          {framesToTimecode(totalFrames, fps)}
        </span>
      </div>

      {/* Track + (optional) Y axis */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {showYAxis && (
          <div style={{ width: `${yAxisWidth}px`, position: 'relative', fontSize: '9px', color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {yAxisTicks.map(t => (
              <span key={t} style={{
                position: 'absolute',
                top: `${100 - (t / maxChars) * 100}%`,
                right: 4,
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
              }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'bar' && (
            <div style={{ display: 'flex', height: '28px', backgroundColor: '#1c1714', borderRadius: '4px', overflow: 'hidden', border: '1px solid #3a302a' }}>
              {rows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    flexGrow: row.frames,
                    flexBasis: 0,
                    backgroundColor: colorForType(row.type),
                    opacity: row.type === 'delay' ? 0.6 : 1,
                    cursor: 'help',
                    minWidth: row.frames > 0 ? '1px' : 0,
                    borderRight: i < rows.length - 1 ? '1px solid rgba(28, 23, 20, 0.4)' : 'none',
                  }}
                  title={`${row.label} · +${row.frames}f · ends ${framesToTimecode(row.accumulated, fps)} (${row.accumulated}f)`}
                />
              ))}
            </div>
          )}

          {view === 'keyframe' && (
            <div style={{ position: 'relative', height: '36px', backgroundColor: '#1c1714', borderRadius: '4px', border: '1px solid #3a302a' }}>
              <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: '1px', backgroundColor: '#3a302a' }} />
              <div
                title="start"
                style={{
                  position: 'absolute', left: '8px', top: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  width: '8px', height: '8px',
                  backgroundColor: '#7a6a5e',
                }}
              />
              {rows.map((row, i) => {
                const ratio = row.accumulated / totalFrames;
                return (
                  <div
                    key={i}
                    title={`${row.label} · +${row.frames}f · ends ${framesToTimecode(row.accumulated, fps)} (${row.accumulated}f)`}
                    style={{
                      position: 'absolute',
                      left: `calc(8px + (100% - 16px) * ${ratio})`,
                      top: '50%',
                      transform: 'translate(-50%, -50%) rotate(45deg)',
                      width: '8px',
                      height: '8px',
                      backgroundColor: colorForType(row.type),
                      cursor: 'help',
                    }}
                  />
                );
              })}
            </div>
          )}

          {view === 'velocity' && (
            <div style={{ position: 'relative', height: '140px', backgroundColor: '#1c1714', borderRadius: '4px', border: '1px solid #3a302a' }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ display: 'block', position: 'absolute', inset: 0 }}
              >
                {yAxisTicks.map(t => {
                  const y = 100 - (t / maxChars) * 100;
                  return (
                    <line key={t} x1="0" y1={y} x2="100" y2={y} stroke="#3a302a" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                  );
                })}
                <polyline
                  points={points.map(p => `${(p.frame / totalFrames) * 100},${100 - (p.chars / maxChars) * 100}`).join(' ')}
                  fill="none"
                  stroke="#e89752"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              {points.map((p, i) => (
                <div
                  key={i}
                  title={`${p.label} · ${p.chars} char${p.chars === 1 ? '' : 's'} revealed · ${framesToTimecode(p.frame, fps)}`}
                  style={{
                    position: 'absolute',
                    left: `${(p.frame / totalFrames) * 100}%`,
                    top: `${100 - (p.chars / maxChars) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#e89752',
                    border: '1px solid #1c1714',
                    cursor: 'help',
                  }}
                />
              ))}
            </div>
          )}

          {/* Tick marks */}
          <div className="relative mt-1.5" style={{ height: '16px' }}>
            {ticks.map((s, i) => {
              const pct = (s * fps / totalFrames) * 100;
              if (pct > 100.5) return null;
              const isWhole = Math.abs(s - Math.round(s)) < 0.001;
              const transform = pct < 1 ? 'translateX(0)' : pct > 99 ? 'translateX(-100%)' : 'translateX(-50%)';
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: 0,
                      width: '1px',
                      height: isWhole ? '5px' : '3px',
                      backgroundColor: isWhole ? '#7a6a5e' : '#3a302a',
                    }}
                  />
                  {isWhole && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${pct}%`,
                        transform,
                        color: '#7a6a5e',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        top: '7px',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {s}s
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 flex-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#7a6a5e' }}>
        {view === 'velocity' ? (
          <LegendItem color="#e89752" label="cumulative characters revealed" />
        ) : (
          <>
            <LegendItem color="#e89752" label="text reveal" />
            <LegendItem color="#d4b86a" label="ellipsis dot" />
            <LegendItem color="#5a4d44" label="hold" />
            <LegendItem color="rgba(58, 48, 42, 0.6)" label="initial delay" />
          </>
        )}
      </div>
    </div>
  );
}

export default function SpeechTimingCalculator() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timelineView, setTimelineView] = useState('bar');

  const { rows, totalFrames, totalChars } = useMemo(
    () => parseScript(script, settings),
    [script, settings]
  );

  const indexedRows = useMemo(() => {
    let running = 0;
    return rows.map(r => {
      const adds = r.type === 'chunk' || r.type === 'punct-reveal';
      if (adds) running += r.chars || 0;
      return { ...r, cumChars: running, addsChars: adds };
    });
  }, [rows]);

  const seconds = (totalFrames / settings.fps).toFixed(2);

  const copyTimeline = useCallback(() => {
    const lines = indexedRows.map(r => {
      const tc = framesToTimecode(r.accumulated, settings.fps);
      const idx = r.addsChars ? String(r.cumChars) : '·';
      return `${tc.padEnd(10)}${String(r.accumulated).padEnd(6)}${idx.padEnd(5)}— ${r.label}`;
    }).join('\n');
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [indexedRows, settings.fps]);

  const updateHold = (key, val) => {
    setSettings(s => ({ ...s, holds: { ...s.holds, [key]: Number(val) || 0 } }));
  };

  const rowColor = (type) => {
    if (type === 'punct-hold') return '#b8a89a';
    if (type === 'punct-reveal') return '#d4b86a';
    if (type === 'delay') return '#7a6a5e';
    return '#f5ead8';
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .stc-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .stc-root h1, .stc-root h2 { font-family: 'Fraunces Variable', Georgia, serif; }
      `}</style>

      <div className="stc-root min-h-screen p-4 md:p-6 lg:p-8" style={{ backgroundColor: '#1c1714', color: '#f5ead8' }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-baseline gap-3 flex-wrap">
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 500,
              fontSize: '2rem',
              letterSpacing: '-0.01em',
              fontOpticalSizing: 'auto',
            }}>
              Speech Timing
            </h1>
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
              Foodimal · v1
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr] lg:items-start">
          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          {/* Settings */}
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
            <div className="flex flex-wrap gap-4 items-end">
              <SettingNumber
                label="FPS"
                value={settings.fps}
                onChange={v => setSettings(s => ({ ...s, fps: Number(v) || 60 }))}
                options={[30, 60]}
              />
              <SettingNumber
                label="Frames / char"
                value={settings.framesPerChar}
                onChange={v => setSettings(s => ({ ...s, framesPerChar: Number(v) || 2 }))}
                step="0.5"
                min="1"
                max="5"
              />
              <SettingNumber
                label="Initial delay"
                value={settings.initialDelay}
                onChange={v => setSettings(s => ({ ...s, initialDelay: Number(v) || 0 }))}
                min="0"
              />
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={settings.countSpaces}
                  onChange={e => setSettings(s => ({ ...s, countSpaces: e.target.checked }))}
                  className="w-4 h-4"
                  style={{ accentColor: '#e89752' }}
                />
                <span className="text-sm" style={{ color: '#b8a89a' }}>Count spaces</span>
              </label>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ml-auto flex items-center gap-1 text-sm transition-colors pb-1.5"
                style={{ color: '#b8a89a' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f5ead8'}
                onMouseLeave={e => e.currentTarget.style.color = '#b8a89a'}
              >
                Punctuation holds
                {showAdvanced ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #3a302a' }}>
                <div className="text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
                  Hold frames (added on top of character reveal)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <SettingNumber label="Comma" value={settings.holds.comma} onChange={v => updateHold('comma', v)}/>
                  <SettingNumber label="Period" value={settings.holds.period} onChange={v => updateHold('period', v)}/>
                  <SettingNumber label="Em-dash" value={settings.holds.emDash} onChange={v => updateHold('emDash', v)}/>
                  <SettingNumber label="Ellipsis" value={settings.holds.ellipsis} onChange={v => updateHold('ellipsis', v)}/>
                  <SettingNumber label="Question" value={settings.holds.question} onChange={v => updateHold('question', v)}/>
                  <SettingNumber label="Exclamation" value={settings.holds.exclamation} onChange={v => updateHold('exclamation', v)}/>
                </div>
              </div>
            )}
          </div>

          {/* Script input */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
              Script
            </label>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              className="w-full rounded-lg p-4 resize-none focus:outline-none"
              rows={4}
              placeholder="Type your line here..."
              style={{
                backgroundColor: '#28211c',
                border: '1px solid #3a302a',
                color: '#f5ead8',
                fontFamily: "'Fraunces', Georgia, serif",
                fontOpticalSizing: 'auto',
                fontSize: '1.1rem',
                lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = '#e89752'}
              onBlur={e => e.target.style.borderColor = '#3a302a'}
            />
          </div>

          </div>
          <div className="min-w-0 mt-6 lg:mt-0">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <SummaryCard label="Total" value={framesToTimecode(totalFrames, settings.fps)} sub={`${totalFrames} frames @ ${settings.fps}fps`}/>
            <SummaryCard label="Seconds" value={seconds} sub="duration"/>
            <SummaryCard label="Characters" value={totalChars} sub={settings.countSpaces ? "incl. spaces" : "excl. spaces"}/>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #3a302a' }}>
              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: '1.1rem' }}>
                Timeline breakdown
              </h2>
              <button
                onClick={copyTimeline}
                className="flex items-center gap-2 text-sm rounded px-3 py-1.5 transition-colors"
                style={{
                  backgroundColor: '#322a23',
                  border: '1px solid #3a302a',
                  color: '#f5ead8',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1c1714'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#322a23'}
              >
                {copied ? <><Check size={14} style={{ color: '#d4b86a' }}/>Copied</> : <><Copy size={14}/>Copy</>}
              </button>
            </div>
            <VisualTimeline rows={rows} totalFrames={totalFrames} fps={settings.fps} view={timelineView} onViewChange={setTimelineView} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: '#7a6a5e', borderBottom: '1px solid #3a302a' }}>
                <div>Event</div>
                <div className="text-right">Frames</div>
                <div className="text-right w-14">Index</div>
                <div className="text-right w-24">Timecode</div>
              </div>
              {indexedRows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2"
                  style={{
                    color: rowColor(row.type),
                    fontVariantNumeric: 'tabular-nums',
                    backgroundColor: i % 2 === 1 ? 'rgba(50, 42, 35, 0.4)' : 'transparent',
                    fontStyle: row.type === 'delay' ? 'italic' : 'normal',
                  }}
                >
                  <div className="truncate">{row.label}</div>
                  <div className="text-right">{row.frames > 0 ? `+${row.frames}` : '—'}</div>
                  <div className="text-right w-14" style={{
                    color: row.addsChars ? '#e89752' : '#5a4d44',
                    fontWeight: row.addsChars ? 600 : 400,
                  }}>
                    {row.addsChars ? row.cumChars : '·'}
                  </div>
                  <div className="text-right w-24">
                    <div style={{ color: '#e89752', fontWeight: 600, lineHeight: 1.1 }}>{framesToTimecode(row.accumulated, settings.fps)}</div>
                    <div style={{ color: '#5a4d44', fontSize: '0.68rem', lineHeight: 1, marginTop: '2px' }}>{row.accumulated}f</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          </div>
          </div>
          <div className="mt-6 text-xs" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
            Punctuation folds into preceding chunk, hold follows · Ellipsis displays per-dot (3× reveal+hold) · "..." → ellipsis, "--" → em-dash
          </div>
        </div>
      </div>
    </>
  );
}
