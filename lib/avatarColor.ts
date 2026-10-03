// /**
//  * Returns a deterministic Tailwind gradient pair based on a user identifier
//  * (email or name). Same string → same colours every time, across all sessions.
//  */

// const GRADIENTS = [
//   'from-violet-500 to-pink-500',
//   'from-blue-500 to-cyan-400',
//   'from-emerald-500 to-teal-400',
//   'from-orange-500 to-amber-400',
//   'from-rose-500 to-red-400',
//   'from-fuchsia-500 to-purple-400',
//   'from-sky-500 to-indigo-400',
//   'from-lime-500 to-green-400',
//   'from-pink-500 to-rose-400',
//   'from-amber-500 to-yellow-400',
//   'from-cyan-500 to-blue-400',
//   'from-teal-500 to-emerald-400',
// ];

// /** Simple deterministic hash of a string → stable index into GRADIENTS */
// function hashString(s: string): number {
//   let h = 0;
//   for (let i = 0; i < s.length; i++) {
//     h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
//   }
//   return h;
// }

// export function avatarGradient(identifier: string): string {
//   const idx = hashString(identifier) % GRADIENTS.length;
//   return `bg-gradient-to-br ${GRADIENTS[idx]}`;
// }

/**
 * Deterministic gradient from a user identifier (email or name).
 * Same string → same colours always; similar strings → very different colours.
 */

/** FNV-1a + murmur3 finalizer (avalanche): 1-char difference changes all bits */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function avatarGradient(identifier: string): {
  backgroundImage: string;
} {
  const h = hashString(identifier.trim().toLowerCase());

  const hue1 = h % 360; // 360 possible start hues
  const hue2 = (hue1 + 40 + ((h >>> 9) % 60)) % 360; // 60 possible offsets

  return {
    backgroundImage: `linear-gradient(to bottom right, hsl(${hue1} 80% 55%), hsl(${hue2} 80% 60%))`,
  };
}
