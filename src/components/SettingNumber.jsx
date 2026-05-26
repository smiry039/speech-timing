export default function SettingNumber({ label, value, onChange, options, step, min, max }) {
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
