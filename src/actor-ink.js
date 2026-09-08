import { Vector3 } from "three";

export const ACTOR_INKS = {
  kael: "#a53030",
  lyra: "#2148b8",
  syl: "#25562e",
  shard: "#7a367b",
  warden: "#884b2b",
  wisp: "#3c5e8b",
};
export function inkVector(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  );
}

// Reserve alpha IDs in the opaque scene pass. OutputPass preserves alpha, so
// the final pass can ink only visible actor pixels after tone mapping.
export function applyActorInk(body, hex, index) {
  const ink = { value: inkVector(hex) },
    materials = new Set();
  body.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
  });
  for (const material of materials) {
    material.fog = false;
    material.transparent = false;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.actorMask = { value: (index + 1) / 10 };
      shader.fragmentShader = `uniform float actorMask;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\ngl_FragColor.a = actorMask;",
      );
    };
    material.customProgramCacheKey = () => "actor-mask-v2";
    material.needsUpdate = true;
  }
  return ink;
}
