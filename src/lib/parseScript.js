export const DEFAULT_SETTINGS = {
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
  voice: {
    everyNChars: 3,
    pitchJitter: 2,
    volumeJitter: 0.15,
    masterVolume: 0.8,
    triggerOnPunctReveal: true,
  },
};

export const DEFAULT_SCRIPT =
  "I've got an idea... Pick something yummy for me. No better time to start working on our goals now";

export function framesToTimecode(frames, fps) {
  const f = Math.max(0, Math.round(frames));
  const totalSeconds = Math.floor(f / fps);
  const frameRemainder = f % fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}:${String(frameRemainder).padStart(2, '0')}`;
}

export function parseScript(text, settings) {
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
      text: chunk,
      chars,
      frames: Math.round(chars * framesPerChar),
    });
    chunk = '';
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '…') {
      flushChunk();
      for (let dotIdx = 1; dotIdx <= 3; dotIdx++) {
        events.push({ type: 'punct-reveal', label: `ellipsis dot ${dotIdx}`, text: '.', chars: 1, frames: Math.round(framesPerChar) });
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

export function buildCharSchedule(rows) {
  const chars = [];
  for (const row of rows) {
    if (row.type === 'chunk') {
      const start = row.accumulated - row.frames;
      const text = row.text || '';
      const visible = text.split('');
      const countable = visible.filter(c => c !== ' ');
      if (countable.length === 0) continue;
      const perChar = row.frames / countable.length;
      let i = 0;
      for (const c of visible) {
        if (c === ' ') {
          const at = i === 0 ? start : start + i * perChar;
          chars.push({ char: c, frame: Math.round(at) });
        } else {
          i += 1;
          chars.push({ char: c, frame: Math.round(start + i * perChar) });
        }
      }
    } else if (row.type === 'punct-reveal') {
      chars.push({ char: row.text || '.', frame: row.accumulated });
    }
  }
  return chars;
}
