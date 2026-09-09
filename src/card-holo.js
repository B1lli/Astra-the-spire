import "./card-holo.css";

// Holo Card inspired view-dependent foil and parallax, adapted to flat card art.
// Keep the game's transform animations and all pointer/click handlers intact.
export function installCardHolo({ enabled = () => true } = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = null;
  let frame = 0;
  let pointer = null;
  const properties = [
    "--holo-x",
    "--holo-y",
    "--holo-dx",
    "--holo-dy",
    "--holo-axis-x",
    "--holo-axis-y",
    "--holo-angle",
  ];

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      active.classList.remove("holo-active");
      properties.forEach((name) => active.style.removeProperty(name));
    }
    active = null;
  }

  function paint() {
    frame = 0;
    if (
      !active?.isConnected ||
      active.disabled ||
      !enabled() ||
      reduced.matches
    )
      return reset();
    const rect = active.getBoundingClientRect();
    const x = Math.max(
      -1,
      Math.min(1, ((pointer.x - rect.left) / rect.width) * 2 - 1),
    );
    const y = Math.max(
      -1,
      Math.min(1, ((pointer.y - rect.top) / rect.height) * 2 - 1),
    );
    const values = [
      `${(x + 1) * 50}%`,
      `${(y + 1) * 50}%`,
      `${x * 5}px`,
      `${y * 5}px`,
      -y || 0.001,
      x || 0.001,
      `${Math.hypot(x, y) * 7}deg`,
    ];
    properties.forEach((name, i) => active.style.setProperty(name, values[i]));
  }

  function move(event) {
    if (
      event.pointerType === "touch" ||
      event.buttons ||
      reduced.matches ||
      !enabled()
    )
      return reset();
    const card = event.target.closest?.("button.game-card:not(:disabled)");
    if (!card || card.closest(".card-flight, .cutin-card")) return reset();
    if (card !== active) {
      reset();
      active = card;
      active.classList.add("holo-active");
    }
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  }

  document.addEventListener("pointerover", move);
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerout", (event) => {
    if (active && !active.contains(event.relatedTarget)) reset();
  });
  document.addEventListener("pointerdown", reset);
  document.addEventListener("pointercancel", reset);
  document.addEventListener("visibilitychange", reset);
  window.addEventListener("blur", reset);
  reduced.addEventListener("change", reset);
}
