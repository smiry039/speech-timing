export function buildSoundSchedule(rows, voice) {
  const everyN = Math.max(1, Math.round(voice?.everyNChars ?? 3));
  const triggerOnPunctReveal = voice?.triggerOnPunctReveal !== false;
  const triggers = [];
  let charsSinceLast = 0;
  let cumChars = 0;

  for (const row of rows) {
    if (row.type === 'chunk') {
      const start = row.accumulated - row.frames;
      const text = row.text || '';
      const countable = text.replace(/ /g, '');
      if (countable.length === 0) continue;
      const perChar = row.frames / countable.length;
      for (let i = 0; i < countable.length; i++) {
        cumChars += 1;
        charsSinceLast += 1;
        if (charsSinceLast >= everyN) {
          triggers.push({
            frame: Math.round(start + (i + 1) * perChar),
            charIndex: cumChars,
          });
          charsSinceLast = 0;
        }
      }
    } else if (row.type === 'punct-reveal') {
      cumChars += 1;
      charsSinceLast += 1;
      if (triggerOnPunctReveal && charsSinceLast >= everyN) {
        triggers.push({ frame: row.accumulated, charIndex: cumChars });
        charsSinceLast = 0;
      }
    }
  }
  return triggers;
}
