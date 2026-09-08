import { icon } from "./icons.js";

const $ = (selector) => document.querySelector(selector);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
function notice(text) {
  let el = $("#draw-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "draw-notice";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  el.hidden = !text;
}
async function fly(from, to, options, face) {
  const el = document.createElement("div");
  el.className = "card-flight";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="flight-back">${icon("spark")}<span>星 烬</span></div>`;
  if (face) {
    const clone = face.cloneNode(true);
    clone.removeAttribute("data-card");
    clone.removeAttribute("id");
    clone.style.visibility = "visible";
    clone.classList.remove("unavailable");
    el.append(clone);
  }
  el.style.left = `${to.x - 62}px`;
  el.style.top = `${to.y - 86}px`;
  document.body.append(el);
  const dx = from.x - to.x,
    dy = from.y - to.y;
  try {
    await el.animate(
      [
        {
          transform: `translate(${dx}px,${dy}px) rotate(-24deg) scale(.38)`,
          opacity: 0,
        },
        {
          transform: `translate(${dx * 0.45}px,${dy * 0.45 - 85}px) rotate(8deg) scale(.9)`,
          opacity: 1,
          offset: 0.48,
        },
        { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
      ],
      {
        duration: 420 / options.speed,
        easing: "cubic-bezier(.2,.7,.3,1)",
        fill: "both",
      },
    ).finished;
  } finally {
    el.remove();
  }
}
export async function dealCards(events, options, opening = false) {
  if (!events?.length) return;
  const cards = events.map((e) => $(`#hand [data-card="${e.uid}"]`));
  if (!options.motion) return;
  cards.forEach((card) => {
    if (card) card.style.visibility = "hidden";
  });
  const pending = [];
  try {
    $("#draw-pile b").textContent = events[0].reshuffled
      ? 0
      : events[0].remaining + 1;
    if (opening) {
      notice("洗牌 · 每一局，新的可能");
      const pile = $("#draw-pile");
      await pile.animate(
        [
          { transform: "rotate(0)" },
          { transform: "rotate(-12deg) scale(1.18)" },
          { transform: "rotate(10deg) scale(1.18)" },
          { transform: "rotate(0)" },
        ],
        { duration: 450 / options.speed },
      ).finished;
    }
    for (const [i, event] of events.entries()) {
      if (event.reshuffled) {
        notice(`牌库耗尽 · ${event.reshuffled} 张弃牌洗回抽牌堆`);
        await fly(center($("#discard-pile")), center($("#draw-pile")), options);
        $("#discard-pile b").textContent = 0;
      }
      notice(`${opening ? "开局抽牌" : "抽牌"} · ${i + 1} / ${events.length}`);
      $("#draw-pile b").textContent = event.remaining;
      $("#discard-pile b").textContent = event.discard;
      options.sound.tone(
        520 + i * 95,
        0.13,
        "triangle",
        0.045,
        0,
        950 + i * 80,
      );
      const card = cards[i];
      if (card) {
        const destination = center(card);
        destination.x = Math.max(65, Math.min(innerWidth - 65, destination.x));
        pending.push(
          fly(center($("#draw-pile")), destination, options, card).then(
            async () => {
              card.style.visibility = "visible";
              await card.animate(
                [
                  {
                    transform: "rotateY(-85deg) translateY(-12px)",
                    filter: "brightness(2)",
                  },
                  {
                    transform: "rotateY(0) translateY(0)",
                    filter: "brightness(1)",
                  },
                ],
                { duration: 240 / options.speed, easing: "ease-out" },
              ).finished;
            },
          ),
        );
      }
      await pause(160 / options.speed);
    }
    await Promise.all(pending);
    notice(`已抽取 ${events.length} 张 · 规划你的下一手`);
    await pause(250 / options.speed);
  } finally {
    cards.forEach((card) => {
      if (card) card.style.visibility = "visible";
    });
    notice("");
  }
}
export async function discardHand(options) {
  const cards = [...$("#hand").children];
  if (!cards.length || !options.motion) return;
  notice(`回合结束 · ${cards.length} 张手牌进入弃牌堆`);
  const target = center($("#discard-pile"));
  try {
    await Promise.all(
      cards.map(async (card, i) => {
        await pause((i * 45) / options.speed);
        const from = center(card);
        await card.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            {
              transform: `translate(${target.x - from.x}px,${target.y - from.y}px) scale(.15) rotate(20deg)`,
              opacity: 0,
            },
          ],
          { duration: 300 / options.speed, fill: "forwards" },
        ).finished;
      }),
    );
  } finally {
    notice("");
  }
}
