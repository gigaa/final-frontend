/**
 * Returns a deterministic Tailwind gradient pair based on a user identifier
 * (email or name). Same string → same colours every time, across all sessions.
 */

const GRADIENTS = [
  'from-violet-500 to-pink-500',
  'from-blue-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-rose-500 to-red-400',
  'from-fuchsia-500 to-purple-400',
  'from-sky-500 to-indigo-400',
  'from-lime-500 to-green-400',
  'from-pink-500 to-rose-400',
  'from-amber-500 to-yellow-400',
  'from-cyan-500 to-blue-400',
  'from-teal-500 to-emerald-400',
];

/** Simple deterministic hash of a string → stable index into GRADIENTS */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function avatarGradient(identifier: string): string {
  const idx = hashString(identifier) % GRADIENTS.length;
  return `bg-gradient-to-br ${GRADIENTS[idx]}`;
}
