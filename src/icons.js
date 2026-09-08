const paths = {
  sword: "M5 19 19 5M13 5h6v6M4 14l6 6M3 21l3-3",
  star: "m12 2 2.7 6.8L22 12l-7.3 3.2L12 22l-2.7-6.8L2 12l7.3-3.2Z",
  bow: "M5 3c17 0 17 18 0 18L14 12 5 3Zm0 9h17m-4-4 4 4-4 4",
  diamond: "m12 2 8 10-8 10L4 12Zm0 0v20M4 12h16",
  crown: "m3 6 4 5 5-8 5 8 4-5-2 14H5Z",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z",
  bolt: "m14 2-9 12h6l-1 8 9-13h-6Z",
  sound: "M11 4 5 9H2v6h3l6 5Zm5 3a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16",
  mute: "M11 4 5 9H2v6h3l6 5Zm5 5 6 6m0-6-6 6",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3v1",
  pause: "M8 4v16M16 4v16",
  play: "m7 4 13 8-13 8Z",
  chevron: "m9 5 7 7-7 7",
  cross: "m6 6 12 12M6 18 18 6",
  reset: "M4 10a8 8 0 1 1 1 8M4 3v7h7",
  spark: "m12 2 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  leaf: "M20 3C7 1 1 8 6 16s16 3 14-13ZM4 21 16 8",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.star}"/></svg>`;
