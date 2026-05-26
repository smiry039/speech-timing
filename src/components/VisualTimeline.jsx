import React from 'react';
import { framesToTimecode } from '../lib/parseScript';
import LegendItem from './LegendItem';

export default function VisualTimeline({ rows, totalFrames, fps, view, onViewChange, soundTriggers, playhead }) {
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
  const showHeader = !!onViewChange;
  const playheadPct = typeof playhead === 'number' ? (playhead / totalFrames) * 100 : null;

  return (
    <div className="px-4 py-4" style={{ borderBottom: '1px solid #3a302a' }}>
      {showHeader && (
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
      )}

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

        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
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

          {soundTriggers && soundTriggers.length > 0 && (view === 'bar' || view === 'keyframe') && (
            <div style={{ position: 'relative', height: '12px', marginTop: '4px' }}>
              {soundTriggers.map((t, i) => (
                <div
                  key={i}
                  title={`sound · ${framesToTimecode(t.frame, fps)} · after char ${t.charIndex}`}
                  style={{
                    position: 'absolute',
                    left: `${(t.frame / totalFrames) * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#d4b86a',
                    border: '1px solid #1c1714',
                  }}
                />
              ))}
            </div>
          )}

          {playheadPct !== null && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.max(0, Math.min(100, playheadPct))}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: '#f5ead8',
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
              }}
            />
          )}

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

      <div className="flex gap-4 mt-3 flex-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#7a6a5e' }}>
        {view === 'velocity' ? (
          <LegendItem color="#e89752" label="cumulative characters revealed" />
        ) : (
          <>
            <LegendItem color="#e89752" label="text reveal" />
            <LegendItem color="#d4b86a" label="ellipsis dot" />
            <LegendItem color="#5a4d44" label="hold" />
            <LegendItem color="rgba(58, 48, 42, 0.6)" label="initial delay" />
            {soundTriggers && soundTriggers.length > 0 && <LegendItem color="#d4b86a" label="sound trigger" />}
          </>
        )}
      </div>
    </div>
  );
}
