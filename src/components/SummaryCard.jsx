export default function SummaryCard({ label, value, sub }) {
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
