/**
 * theme.js — Shared Design Tokens
 *
 * Single source of truth for all colors and font shorthands.
 * Import these instead of redefining them in every component.
 *
 * ── HOW TO CHANGE COLORS ─────────────────────────────────────────
 * Each key in `S` maps directly to a CSS color string.
 * Example: change the accent amber to orange:
 *   amber: '#f97316'   ← just update this line
 *
 * ── HOW TO CHANGE FONTS ──────────────────────────────────────────
 * `mono` and `inter` are React inline-style objects.
 * Example: swap JetBrains Mono for Fira Code:
 *   export const mono = { fontFamily: "'Fira Code', monospace" };
 * ─────────────────────────────────────────────────────────────────
 */

/** Color palette */
export const S = {
  bg:      '#09090b',   // page background
  panel:   '#18181b',   // panel / card background
  surface: '#0f0f10',   // deep inset surface
  border:  '#27272a',   // default border
  faint:   '#3f3f46',   // very muted text / dividers
  muted:   '#71717a',   // secondary text
  sub:     '#a1a1aa',   // supporting text
  text:    '#f4f4f5',   // primary text
  amber:   '#f59e0b',   // accent — warnings / processing
  green:   '#10b981',   // accent — success / confirmed
  red:     '#ef4444',   // accent — error / flagged
};

/** Monospace font — used for all terminal / data text */
export const mono = { fontFamily: "'JetBrains Mono', monospace" };

/** Sans-serif font — used for prose / descriptions */
export const inter = { fontFamily: "'Inter', sans-serif" };
