import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_SCRIPT } from './lib/parseScript';
import { listSounds } from './lib/audioStore';
import Tabs from './components/Tabs';
import TextTab from './components/TextTab';
import AudioTab from './components/AudioTab';
import PreviewTab from './components/PreviewTab';

const TABS = [
  { id: 'text', label: 'Text' },
  { id: 'audio', label: 'Audio' },
  { id: 'preview', label: 'Preview' },
];

const TAB_KEY = 'speech-timing.activeTab';

export default function SpeechTimingCalculator() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [library, setLibrary] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'text';
    const saved = window.localStorage.getItem(TAB_KEY);
    return TABS.some(t => t.id === saved) ? saved : 'text';
  });

  useEffect(() => {
    listSounds().then(setLibrary).catch(e => console.warn('Could not load sound library', e));
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(TAB_KEY, activeTab); } catch { /* ignore */ }
  }, [activeTab]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .stc-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .stc-root h1, .stc-root h2 { font-family: 'Fraunces Variable', Georgia, serif; }
      `}</style>

      <div className="stc-root min-h-screen p-4 md:p-6 lg:p-8" style={{ backgroundColor: '#1c1714', color: '#f5ead8' }}>
        <div className="max-w-[1600px] mx-auto">
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

          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'text' && (
            <TextTab script={script} setScript={setScript} settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'audio' && (
            <AudioTab library={library} setLibrary={setLibrary} settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'preview' && (
            <PreviewTab script={script} settings={settings} library={library} />
          )}

          <div className="mt-6 text-xs" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
            Punctuation folds into preceding chunk, hold follows · Ellipsis displays per-dot (3× reveal+hold) · "..." → ellipsis, "--" → em-dash
          </div>
        </div>
      </div>
    </>
  );
}
