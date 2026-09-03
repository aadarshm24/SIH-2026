/**
 * PanelHeader.jsx — Reusable panel title bar
 *
 * Props:
 *   label       {string}  — Uppercase panel title (always shown)
 *   icon        {string}  — Emoji icon shown before the label (optional)
 *   status      {string}  — Short status string shown on the right (optional)
 *   statusColor {string}  — CSS color for the status text (optional)
 *   tag         {string}  — Alternative right-side label, same slot as status (optional)
 */
import { S, mono } from '../theme';

export default function PanelHeader({ label, icon, status, statusColor, tag }) {
  const right = status ?? tag; // both props share the same right slot
  const rightColor = statusColor ?? S.faint;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.6rem 1rem', borderBottom: `1px solid ${S.border}`,
    }}>
      {/* Left — icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon && <span style={{ fontSize: '0.75rem' }}>{icon}</span>}
        <span style={{ ...mono, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: S.amber }}>
          {label}
        </span>
      </div>

      {/* Right — status / tag */}
      {right && (
        <span style={{ ...mono, fontSize: '0.52rem', color: rightColor, letterSpacing: '0.1em' }}>
          {right}
        </span>
      )}
    </div>
  );
}
