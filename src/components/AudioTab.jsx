import { useRef, useState, useCallback } from 'react';
import { Upload, Trash2, Play } from 'lucide-react';
import { addSound, deleteSound } from '../lib/audioStore';
import { ensureContext, decodeLibrary, playRandom, forgetSound } from '../lib/audioEngine';
import SettingNumber from './SettingNumber';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AudioTab({ library, setLibrary, settings, setSettings }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const voice = settings.voice;
  const updateVoice = (key, val) => {
    setSettings(s => ({ ...s, voice: { ...s.voice, [key]: val } }));
  };

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added = [];
      for (const file of files) {
        if (!file.type.startsWith('audio/')) continue;
        const record = await addSound(file);
        added.push(record);
      }
      if (added.length > 0) setLibrary(prev => [...prev, ...added]);
    } finally {
      setBusy(false);
    }
  }, [setLibrary]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const onPickFiles = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const onDelete = async (id) => {
    await deleteSound(id);
    forgetSound(id);
    setLibrary(prev => prev.filter(s => s.id !== id));
  };

  const onPreview = async (sound) => {
    try {
      ensureContext();
      const buffers = await decodeLibrary([sound]);
      playRandom(buffers, {
        pitchJitter: voice.pitchJitter,
        volumeJitter: voice.volumeJitter,
        masterVolume: voice.masterVolume,
      });
    } catch (e) {
      console.warn('Preview failed', e);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(340px,440px)_1fr] lg:items-start">
      <div className="min-w-0">
        <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
          <div className="text-[10px] uppercase tracking-[0.12em] mb-3" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
            Voice settings
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <SettingNumber
              label="Every N chars"
              value={voice.everyNChars}
              onChange={v => updateVoice('everyNChars', Math.max(1, Number(v) || 1))}
              min="1"
              max="20"
            />
            <SettingNumber
              label="± Pitch (semitones)"
              value={voice.pitchJitter}
              onChange={v => updateVoice('pitchJitter', Math.max(0, Number(v) || 0))}
              step="0.5"
              min="0"
              max="12"
            />
            <SettingNumber
              label="± Volume"
              value={voice.volumeJitter}
              onChange={v => updateVoice('volumeJitter', Math.max(0, Number(v) || 0))}
              step="0.05"
              min="0"
              max="1"
            />
            <SettingNumber
              label="Master volume"
              value={voice.masterVolume}
              onChange={v => updateVoice('masterVolume', Math.max(0, Math.min(1, Number(v) || 0)))}
              step="0.05"
              min="0"
              max="1"
            />
            <label className="flex items-center gap-2 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={voice.triggerOnPunctReveal}
                onChange={e => updateVoice('triggerOnPunctReveal', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: '#e89752' }}
              />
              <span className="text-sm" style={{ color: '#b8a89a' }}>Trigger on ellipsis dots</span>
            </label>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a' }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #3a302a' }}>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: '1.1rem' }}>
              Sound library
            </h2>
            <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
              {library.length} {library.length === 1 ? 'sound' : 'sounds'}
            </span>
          </div>

          <div className="p-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              style={{
                minHeight: '120px',
                border: `2px dashed ${dragOver ? '#e89752' : '#3a302a'}`,
                backgroundColor: dragOver ? 'rgba(232, 151, 82, 0.05)' : '#1c1714',
                color: dragOver ? '#f5ead8' : '#b8a89a',
                padding: '24px',
              }}
            >
              <Upload size={20} />
              <div className="text-sm">{busy ? 'Uploading...' : 'Drop audio files here or click to browse'}</div>
              <div className="text-[10px]" style={{ color: '#7a6a5e', fontFamily: "'JetBrains Mono', monospace" }}>
                Short blips work best · .wav .mp3 .ogg
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={onPickFiles}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {library.length > 0 && (
            <div style={{ borderTop: '1px solid #3a302a' }}>
              {library.map((sound, i) => (
                <div
                  key={sound.id}
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    backgroundColor: i % 2 === 1 ? 'rgba(50, 42, 35, 0.4)' : 'transparent',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.85rem',
                  }}
                >
                  <button
                    onClick={() => onPreview(sound)}
                    className="rounded p-1.5 transition-colors flex items-center justify-center"
                    style={{ backgroundColor: '#322a23', border: '1px solid #3a302a', color: '#e89752' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1c1714'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#322a23'}
                    title="Preview"
                  >
                    <Play size={12} />
                  </button>
                  <div className="flex-1 truncate" style={{ color: '#f5ead8' }}>{sound.name}</div>
                  <div style={{ color: '#7a6a5e', fontVariantNumeric: 'tabular-nums' }}>{formatSize(sound.size)}</div>
                  <button
                    onClick={() => onDelete(sound.id)}
                    className="rounded p-1.5 transition-colors flex items-center justify-center"
                    style={{ backgroundColor: 'transparent', border: '1px solid #3a302a', color: '#7a6a5e' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f5ead8'; e.currentTarget.style.backgroundColor = '#322a23'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#7a6a5e'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
