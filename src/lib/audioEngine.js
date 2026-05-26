let ctx = null;
const bufferCache = new Map();
const activeSources = new Set();

export function ensureContext() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not supported');
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function getContext() {
  return ctx;
}

async function decodeOne(sound) {
  if (bufferCache.has(sound.id)) return bufferCache.get(sound.id);
  const arrayBuffer = await sound.blob.arrayBuffer();
  const audioCtx = ensureContext();
  const buf = await new Promise((resolve, reject) => {
    audioCtx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
  });
  bufferCache.set(sound.id, buf);
  return buf;
}

export async function decodeLibrary(sounds) {
  ensureContext();
  const results = [];
  for (const s of sounds) {
    try {
      results.push(await decodeOne(s));
    } catch (e) {
      console.warn('Failed to decode sound', s.name, e);
    }
  }
  return results;
}

export function forgetSound(id) {
  bufferCache.delete(id);
}

function rand(range) {
  return (Math.random() * 2 - 1) * range;
}

export function playRandom(buffers, opts = {}) {
  if (!buffers || buffers.length === 0) return;
  const audioCtx = ensureContext();
  const buf = buffers[Math.floor(Math.random() * buffers.length)];
  const src = audioCtx.createBufferSource();
  src.buffer = buf;

  const pitchJitter = opts.pitchJitter ?? 0;
  const volumeJitter = opts.volumeJitter ?? 0;
  const masterVolume = opts.masterVolume ?? 1;

  const semis = rand(pitchJitter);
  src.playbackRate.value = Math.pow(2, semis / 12);

  const gain = audioCtx.createGain();
  const vol = Math.max(0, masterVolume + rand(volumeJitter));
  gain.gain.value = vol;

  src.connect(gain).connect(audioCtx.destination);
  src.onended = () => activeSources.delete(src);
  activeSources.add(src);
  src.start();
}

export function stopAll() {
  for (const src of activeSources) {
    try { src.stop(); } catch { /* ignore */ }
  }
  activeSources.clear();
}
