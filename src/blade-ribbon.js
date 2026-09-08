// A closed-width ribbon: both tips collapse to a point, with a convex cutting edge.
export function bladeRibbon(
  length = 4.4,
  width = 0.18,
  curve = 0.16,
  segments = 48,
) {
  const positions = [],
    indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const envelope = i === 0 || i === segments ? 0 : Math.sin(Math.PI * t);
    const halfWidth = (width * Math.pow(envelope, 1.65)) / 2;
    const x = (t - 0.5) * length,
      y = curve * envelope;
    positions.push(x, y - halfWidth, 0, x, y + halfWidth, 0);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return { positions, indices };
}
