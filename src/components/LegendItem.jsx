export default function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '2px' }} />
      <span>{label}</span>
    </div>
  );
}
