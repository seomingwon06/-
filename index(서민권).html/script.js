const themeToggle = document.getElementById("themeToggle");
const revealElements = document.querySelectorAll(".reveal");
const filterButtons = document.querySelectorAll(".filter-btn");
const projects = document.querySelectorAll(".project");

// Keep user's preferred theme.
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  themeToggle.innerHTML = "<span>☀️</span>";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  themeToggle.innerHTML = isLight ? "<span>☀️</span>" : "<span>🌙</span>";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

// Scroll reveal animation.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealElements.forEach((el) => observer.observe(el));

// Simple project category filter.
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    projects.forEach((project) => {
      const category = project.dataset.category;
      const visible = filter === "all" || filter === category;
      project.style.display = visible ? "block" : "none";
    });
  });
});

// Player circle + food game.
const minimap = document.getElementById("minimap");
const minimapDotsLayer = document.getElementById("minimapDots");
const minimapInfo = document.getElementById("minimapInfo");
const foodLayer = document.getElementById("foodLayer");
const playerLayer = document.getElementById("playerLayer");
const FOOD_COUNT = 54;
const EDGE_SCROLL_PADDING = 90;
const activeState = {
  player: null,
  score: 0,
  eatenElements: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const syncFoodLayerSize = () => {
  if (!foodLayer) return;
  const doc = document.documentElement;
  foodLayer.style.width = `${doc.scrollWidth}px`;
  foodLayer.style.height = `${doc.scrollHeight}px`;
};

const applyTransform = (target, x, y, scale = 1) => {
  target.dataset.moveX = String(x);
  target.dataset.moveY = String(y);
  target.dataset.scale = String(scale);
  target.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
};

const getState = (target) => ({
  x: Number(target.dataset.moveX || 0),
  y: Number(target.dataset.moveY || 0),
  scale: Number(target.dataset.scale || 1),
});

const createPlayer = () => {
  if (!playerLayer) return;
  const el = document.createElement("div");
  el.className = "player-circle active";
  el.dataset.playerId = "p1";
  el.style.setProperty("--player-color", "#72f0ff");
  applyTransform(el, 120, 120, 1);
  playerLayer.appendChild(el);
  activeState.player = el;
  updateMinimap();
};

const updateMinimap = () => {
  if (!minimapDotsLayer) return;
  minimapDotsLayer.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (activeState.player) {
    const player = activeState.player;
    const rect = player.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "minimap-dot active";

    const leftRatio = clamp((rect.left + rect.width / 2) / width, 0, 1);
    const topRatio = clamp((rect.top + rect.height / 2) / height, 0, 1);
    dot.style.left = `${leftRatio * 100}%`;
    dot.style.top = `${topRatio * 100}%`;
    minimapDotsLayer.appendChild(dot);
  }

  if (minimapInfo) {
    const activeName = activeState.player
      ? activeState.player.dataset.playerId.toUpperCase()
      : "없음";
    minimapInfo.textContent = `플레이어: ${activeName} | 점수: ${activeState.score} | 요소: ${activeState.eatenElements}`;
  }
};

const spawnOneFood = () => {
  if (!foodLayer) return null;
  syncFoodLayerSize();

  const doc = document.documentElement;
  const maxX = Math.max(20, doc.scrollWidth - 20);
  const maxY = Math.max(20, doc.scrollHeight - 20);

  const food = document.createElement("span");
  food.className = "neon-food";
  food.style.left = `${Math.random() * maxX}px`;
  food.style.top = `${Math.random() * maxY}px`;
  const size = 9 + Math.random() * 9;
  food.style.width = `${size}px`;
  food.style.height = `${size}px`;
  foodLayer.appendChild(food);
  return food;
};

const ensureFoods = () => {
  if (!foodLayer) return;
  while (foodLayer.children.length < FOOD_COUNT) {
    spawnOneFood();
  }
};

const isEdibleElement = (el) =>
  el.id !== "minimap" &&
  el.id !== "playerLayer" &&
  el.id !== "foodLayer" &&
  !el.classList.contains("player-circle") &&
  !el.classList.contains("neon-food") &&
  !el.classList.contains("minimap-dot") &&
  !el.classList.contains("minimap-info") &&
  !el.classList.contains("minimap-help") &&
  !el.classList.contains("minimap-title") &&
  !el.closest("#minimap") &&
  !el.closest("#playerLayer") &&
  !el.closest("#foodLayer");

const eatFoodIfCollide = (player) => {
  if (!foodLayer || !player) return;
  const playerRect = player.getBoundingClientRect();
  let eatenCount = 0;

  Array.from(foodLayer.children).forEach((food) => {
    const foodRect = food.getBoundingClientRect();
    const hit =
      playerRect.left < foodRect.right &&
      playerRect.right > foodRect.left &&
      playerRect.top < foodRect.bottom &&
      playerRect.bottom > foodRect.top;

    if (!hit) return;

    food.remove();
    eatenCount += 1;
  });

  if (eatenCount === 0) return;

  activeState.score += eatenCount;
  const current = getState(player);
  const nextScale = clamp(current.scale + eatenCount * 0.08, 0.6, 4.8);
  applyTransform(player, current.x, current.y, nextScale);

  // Eaten food count 만큼 즉시 재생성
  for (let i = 0; i < eatenCount; i += 1) {
    spawnOneFood();
  }
  updateMinimap();
};

const eatElementsIfCollide = (player) => {
  const { scale } = getState(player);
  if (scale < 1.5) return;

  const playerRect = player.getBoundingClientRect();
  const playerSize = Math.max(playerRect.width, playerRect.height);

  const edibleElements = Array.from(document.querySelectorAll("body *")).filter(
    (el) => isEdibleElement(el)
  );

  edibleElements.forEach((el) => {
    if (el.dataset.eaten === "1") return;
    const rect = el.getBoundingClientRect();
    const elementSize = Math.max(rect.width, rect.height);
    const hit =
      playerRect.left < rect.right &&
      playerRect.right > rect.left &&
      playerRect.top < rect.bottom &&
      playerRect.bottom > rect.top;

    if (!hit) return;
    if (playerSize < elementSize * 0.55) return;

    el.dataset.eaten = "1";
    el.classList.add("eaten-element");
    activeState.eatenElements += 1;

    const state = getState(player);
    applyTransform(player, state.x, state.y, clamp(state.scale + 0.14, 0.6, 5.2));

    // 일정 시간 뒤 요소를 다시 생성해 반복 섭취 가능하게 함.
    if (!el.dataset.respawnPending) {
      el.dataset.respawnPending = "1";
      const respawnDelay = 2500 + Math.floor(Math.random() * 3000);
      window.setTimeout(() => {
        el.dataset.eaten = "0";
        el.classList.remove("eaten-element");
        delete el.dataset.respawnPending;
      }, respawnDelay);
    }
  });
};

const keepPlayerInViewportWithScroll = (target, x, y, scale) => {
  const playerSize = 32 * scale;
  let nextX = x;
  let nextY = y;

  const maxScrollX = Math.max(
    0,
    document.documentElement.scrollWidth - window.innerWidth
  );
  const maxScrollY = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );

  if (nextX < EDGE_SCROLL_PADDING && window.scrollX > 0) {
    const scrollLeft = Math.min(window.scrollX, EDGE_SCROLL_PADDING - nextX);
    window.scrollBy({ left: -scrollLeft, top: 0, behavior: "auto" });
    nextX = EDGE_SCROLL_PADDING;
  }
  if (
    nextX > window.innerWidth - EDGE_SCROLL_PADDING - playerSize &&
    window.scrollX < maxScrollX
  ) {
    const over = nextX - (window.innerWidth - EDGE_SCROLL_PADDING - playerSize);
    const scrollRight = Math.min(maxScrollX - window.scrollX, over);
    window.scrollBy({ left: scrollRight, top: 0, behavior: "auto" });
    nextX = window.innerWidth - EDGE_SCROLL_PADDING - playerSize;
  }
  if (nextY < EDGE_SCROLL_PADDING && window.scrollY > 0) {
    const scrollUp = Math.min(window.scrollY, EDGE_SCROLL_PADDING - nextY);
    window.scrollBy({ top: -scrollUp, left: 0, behavior: "auto" });
    nextY = EDGE_SCROLL_PADDING;
  }
  if (
    nextY > window.innerHeight - EDGE_SCROLL_PADDING - playerSize &&
    window.scrollY < maxScrollY
  ) {
    const over = nextY - (window.innerHeight - EDGE_SCROLL_PADDING - playerSize);
    const scrollDown = Math.min(maxScrollY - window.scrollY, over);
    window.scrollBy({ top: scrollDown, left: 0, behavior: "auto" });
    nextY = window.innerHeight - EDGE_SCROLL_PADDING - playerSize;
  }

  nextX = clamp(nextX, 0, Math.max(0, window.innerWidth - playerSize));
  nextY = clamp(nextY, 0, Math.max(0, window.innerHeight - playerSize));
  return { x: nextX, y: nextY };
};

const movePlayerByKeyboard = (event) => {
  const target = activeState.player;
  if (!target) return;
  const step = event.shiftKey ? 20 : 8;
  const { x, y, scale } = getState(target);

  let nextX = x;
  let nextY = y;
  let nextScale = scale;

  const key = event.key;

  // 방향키 + WASD 이동
  if (key === "ArrowUp" || key === "w" || key === "W") nextY -= step;
  if (key === "ArrowDown" || key === "s" || key === "S") nextY += step;
  if (key === "ArrowLeft" || key === "a" || key === "A") nextX -= step;
  if (key === "ArrowRight" || key === "d" || key === "D") nextX += step;

  // 크기 조절(+/-)
  if (key === "+" || key === "=") nextScale = Math.min(scale + 0.1, 3);
  if (key === "-" || key === "_") nextScale = Math.max(scale - 0.1, 0.3);

  // R 키로 리셋
  if (key === "r" || key === "R") {
    event.preventDefault();
    applyTransform(target, 0, 0, 1);
    updateMinimap();
    return;
  }

  if (nextX === x && nextY === y && nextScale === scale) return;

  event.preventDefault();
  const position = keepPlayerInViewportWithScroll(target, nextX, nextY, nextScale);
  applyTransform(target, position.x, position.y, nextScale);
  eatFoodIfCollide(target);
  eatElementsIfCollide(target);
  updateMinimap();
};

if (minimap) {
  createPlayer();
  syncFoodLayerSize();
  ensureFoods();
  window.addEventListener("resize", syncFoodLayerSize);
  window.addEventListener("keydown", movePlayerByKeyboard);
  setInterval(() => {
    if (activeState.player) eatFoodIfCollide(activeState.player);
    if (activeState.player) eatElementsIfCollide(activeState.player);
    updateMinimap();
  }, 120);
}
