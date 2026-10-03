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
