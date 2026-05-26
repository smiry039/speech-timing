import { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { parseScript, framesToTimecode } from '../lib/parseScript';
import { buildSoundSchedule } from '../lib/soundSchedule';
import SettingNumber from './SettingNumber';
import SummaryCard from './SummaryCard';
import VisualTimeline from './VisualTimeline';

export default function TextTab({ script, setScript, settings, setSettings }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timelineView, setTimelineView] = useState('bar');

  const { rows, totalFrames, totalChars } = useMemo(
    () => parseScript(script, settings),
    [script, settings]
  );

  const indexedRows = useMemo(() => {
    const out = [];
    let running = 0;
    for (const r of rows) {
      const adds = r.type === 'chunk' || r.type === 'punct-reveal';
      const next = adds ? running + (r.chars || 0) : running;
      out.push({ ...r, cumChars: next, addsChars: adds });
      running = next;
    }
    return out;
  }, [rows]);

  const soundTriggers = useMemo(
    () => buildSoundSchedule(rows, settings.voice),
    [rows, settings.voice]
  );

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
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr] lg:items-start">
      <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
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
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SummaryCard label="Total" value={framesToTimecode(totalFrames, settings.fps)} sub={`${totalFrames} frames @ ${settings.fps}fps`}/>
          <SummaryCard label="Seconds" value={seconds} sub="duration"/>
          <SummaryCard label="Characters" value={totalChars} sub={settings.countSpaces ? "incl. spaces" : "excl. spaces"}/>
        </div>

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
          <VisualTimeline
            rows={rows}
            totalFrames={totalFrames}
            fps={settings.fps}
            view={timelineView}
            onViewChange={setTimelineView}
            soundTriggers={soundTriggers}
          />
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
  );
}
