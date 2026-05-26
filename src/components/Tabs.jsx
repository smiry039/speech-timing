export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden mb-6" style={{ backgroundColor: '#28211c', border: '1px solid #3a302a', width: 'fit-content' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            backgroundColor: active === t.id ? '#e89752' : 'transparent',
            color: active === t.id ? '#1c1714' : '#b8a89a',
            fontWeight: active === t.id ? 600 : 400,
            borderRight: t.id !== tabs[tabs.length - 1].id ? '1px solid #3a302a' : 'none',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
