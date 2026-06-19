const sighButton = document.querySelector("#sighButton");
const holdLabel = document.querySelector("#holdLabel");
const holdSeconds = document.querySelector("#holdSeconds");
const sighCount = document.querySelector("#sighCount");
const totalTime = document.querySelector("#totalTime");
const averageTime = document.querySelector("#averageTime");
const globalCount = document.querySelector("#globalCount");
const liveNow = document.querySelector("#liveNow");
const solutionText = document.querySelector("#solutionText");
const sighType = document.querySelector("#sighType");
const feedList = document.querySelector("#feedList");
const cardType = document.querySelector("#cardType");
const cardTotal = document.querySelector("#cardTotal");
const cardCount = document.querySelector("#cardCount");
const cardAverage = document.querySelector("#cardAverage");
const cardSolution = document.querySelector("#cardSolution");
const downloadCard = document.querySelector("#downloadCard");
const shareResult = document.querySelector("#shareResult");
const chatActions = document.querySelector("#chatActions");
const chatStatus = document.querySelector("#chatStatus");
const sighStage = document.querySelector(".sigh-stage");
const canvas = document.querySelector("#breathCanvas");
const ctx = canvas.getContext("2d");

const storageKey = "daily-sigh-report-v1";
const todayKey = new Date().toISOString().slice(0, 10);

const prescriptions = [
  {
    max: 0,
    type: "대기 중",
    text: "첫 한숨을 기록하면 오늘의 상태를 분석해드립니다.",
  },
  {
    max: 12,
    type: "가벼운 저기압형",
    text: "아직 회복 가능합니다. 물 한 잔 마시고 알림을 5분만 조용히 해두세요.",
  },
  {
    max: 35,
    type: "업무성 산소부족형",
    text: "단 커피 또는 차가운 물을 권장합니다. 다음 메시지는 한 박자 늦게 답해도 됩니다.",
  },
  {
    max: 70,
    type: "누적 피로형",
    text: "알림을 12분 끄고, 말 없는 산책 6분을 처방합니다. 오늘 회의록은 내일 다시 봐도 됩니다.",
  },
  {
    max: Infinity,
    type: "야근성 저기압형",
    text: "즉시 자리에서 일어나 조명을 멀리하세요. 오늘의 추가 검토는 내일의 나에게 위임합니다.",
  },
];

let state = loadState();
let isHolding = false;
let holdStartedAt = 0;
let holdDuration = 0;
let animationId = 0;
let particles = [];
let globalSighs = 12840 + Math.floor(Math.random() * 180);
let liveUsers = 32 + Math.floor(Math.random() * 18);
let ambientPulse = 0;
let ambientSpawnTick = 0;

function loadState() {
  const fallback = { day: todayKey, sessions: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || parsed.day !== todayKey || !Array.isArray(parsed.sessions)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatSeconds(value) {
  return `${value.toFixed(1)}초`;
}

function getTotals() {
  const total = state.sessions.reduce((sum, item) => sum + item.duration, 0);
  const count = state.sessions.length;
  return {
    count,
    total,
    average: count ? total / count : 0,
  };
}

function getPrescription(total) {
  return prescriptions.find((item) => total <= item.max);
}

function updateStats() {
  const totals = getTotals();
  const prescription = getPrescription(totals.total);
  sighCount.textContent = totals.count;
  totalTime.textContent = formatSeconds(totals.total);
  averageTime.textContent = formatSeconds(totals.average);
  globalCount.textContent = globalSighs.toLocaleString("ko-KR");
  liveNow.textContent = `${liveUsers}명 한숨 중`;
  sighType.textContent = prescription.type;
  solutionText.textContent = prescription.text;
  cardType.textContent = prescription.type;
  cardTotal.textContent = formatSeconds(totals.total);
  cardCount.textContent = `${totals.count}회`;
  cardAverage.textContent = formatSeconds(totals.average);
  cardSolution.textContent = prescription.text;
}

function updateHoldReadout(seconds) {
  const length = Math.min(10, 2 + Math.floor(seconds * 2));
  holdLabel.textContent = `하${"아".repeat(Math.max(0, length - 2))}...`;
  holdSeconds.textContent = formatSeconds(seconds);
}

function startHold(event) {
  event.preventDefault();
  if (isHolding) return;
  isHolding = true;
  holdStartedAt = performance.now();
  holdDuration = 0;
  sighButton.classList.add("is-holding");
  sighButton.setPointerCapture?.(event.pointerId);
}

function endHold() {
  if (!isHolding) return;
  isHolding = false;
  sighButton.classList.remove("is-holding");

  const duration = Math.max(0.4, Math.min(18, holdDuration));
  state.sessions.push({
    duration,
    at: Date.now(),
  });
  globalSighs += 1 + Math.floor(duration);
  liveUsers = Math.max(12, liveUsers + Math.floor(Math.random() * 5) - 2);
  saveState();
  addFeed(`방금 당신이 ${formatSeconds(duration)}의 한숨을 배출했습니다`, "지금");
  updateStats();
  updateHoldReadout(0);
}

function addFeed(text, timeLabel) {
  const item = document.createElement("li");
  const span = document.createElement("span");
  const time = document.createElement("b");
  span.textContent = text;
  time.textContent = timeLabel;
  item.append(span, time);
  feedList.prepend(item);
  while (feedList.children.length > 5) {
    feedList.lastElementChild.remove();
  }
}

function getFeedDurationRange() {
  const hour = new Date().getHours();
  if (hour < 11) return [1.2, 4.8];
  if (hour < 14) return [1.6, 5.6];
  if (hour < 18) return [1.8, 7.2];
  if (hour < 22) return [2.4, 9.8];
  return [3.0, 11.5];
}

function randomFeedDuration() {
  const [min, max] = getFeedDurationRange();
  return min + Math.random() * (max - min);
}

function seedFeed() {
  feedList.textContent = "";
  for (let index = 0; index < 5; index += 1) {
    const seconds = 4 + index * 9 + Math.floor(Math.random() * 5);
    const duration = randomFeedDuration();
    addFeed(`누군가 ${formatSeconds(duration)}의 한숨을 쉬었습니다`, `${seconds}초 전`);
  }
}

function tickFeed() {
  const duration = randomFeedDuration();
  globalSighs += 1;
  liveUsers = Math.max(12, liveUsers + Math.floor(Math.random() * 3) - 1);
  ambientPulse = 1;
  liveNow.classList.add("is-live");
  window.setTimeout(() => liveNow.classList.remove("is-live"), 900);
  addFeed(`누군가 ${formatSeconds(duration)}의 한숨을 쉬었습니다`, "방금");
  updateStats();
}

function sendSilentBubble(message) {
  const bubble = document.createElement("span");
  const x = 20 + Math.random() * 60;
  const y = 18 + Math.random() * 46;
  bubble.className = "silent-bubble";
  bubble.textContent = message;
  bubble.style.setProperty("--bubble-x", `${x}%`);
  bubble.style.setProperty("--bubble-y", `${y}%`);
  sighStage.append(bubble);
  window.setTimeout(() => bubble.remove(), 2700);

  ambientPulse = 1;
  chatStatus.classList.add("is-live");
  window.setTimeout(() => chatStatus.classList.remove("is-live"), 900);
  addFeed(`누군가 말없이 ${message}를 남겼습니다`, "지금");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnParticle(intensity) {
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height * 0.56;
  particles.push({
    x: centerX + (Math.random() - 0.5) * 58,
    y: centerY + (Math.random() - 0.5) * 16,
    radius: 16 + Math.random() * 42 + intensity * 16,
    vx: (Math.random() - 0.5) * (0.28 + intensity * 0.35),
    vy: -0.28 - Math.random() * 0.58 - intensity * 0.18,
    life: 0,
    ttl: 110 + Math.random() * 90,
    alpha: 0.12 + Math.random() * 0.1 + intensity * 0.08,
  });
}

function spawnAmbientParticle() {
  const rect = canvas.getBoundingClientRect();
  particles.push({
    x: rect.width * (0.18 + Math.random() * 0.64),
    y: rect.height * (0.2 + Math.random() * 0.52),
    radius: 12 + Math.random() * 34,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.08 - Math.random() * 0.18,
    life: 0,
    ttl: 180 + Math.random() * 120,
    alpha: 0.035 + Math.random() * 0.04,
  });
}

function drawPresenceDots(rect, elapsed) {
  const dots = Math.min(18, Math.max(8, Math.round(liveUsers / 3)));
  const centerX = rect.width / 2;
  const centerY = rect.height * 0.54;
  for (let index = 0; index < dots; index += 1) {
    const angle = elapsed * (0.00008 + index * 0.000002) + index * 2.399;
    const orbitX = rect.width * (0.22 + (index % 4) * 0.035);
    const orbitY = rect.height * (0.18 + (index % 3) * 0.025);
    const x = centerX + Math.cos(angle) * orbitX;
    const y = centerY + Math.sin(angle * 1.3) * orbitY;
    const alpha = 0.18 + ambientPulse * 0.22 + (index % 3) * 0.035;
    ctx.fillStyle = `rgba(183, 230, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.4 + ambientPulse * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBreath() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const elapsed = performance.now();

  ambientSpawnTick += 1;
  if (!isHolding && ambientSpawnTick % 18 === 0) {
    spawnAmbientParticle();
  }

  drawPresenceDots(rect, elapsed);

  if (isHolding) {
    holdDuration = (performance.now() - holdStartedAt) / 1000;
    updateHoldReadout(holdDuration);
    const intensity = Math.min(1, holdDuration / 6);
    const spawnCount = 1 + Math.floor(intensity * 3);
    for (let i = 0; i < spawnCount; i += 1) {
      spawnParticle(intensity);
    }
  }

  particles = particles.filter((particle) => particle.life < particle.ttl);
  for (const particle of particles) {
    particle.life += 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.radius += 0.1;
    const fade = 1 - particle.life / particle.ttl;
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.radius,
    );
    gradient.addColorStop(0, `rgba(183, 230, 255, ${particle.alpha * fade})`);
    gradient.addColorStop(0.55, `rgba(143, 216, 255, ${particle.alpha * 0.5 * fade})`);
    gradient.addColorStop(1, "rgba(143, 216, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ambientPulse *= 0.94;
  animationId = requestAnimationFrame(drawBreath);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, currentY);
  return currentY + lineHeight;
}

function makeShareCanvas() {
  const totals = getTotals();
  const prescription = getPrescription(totals.total);
  const output = document.createElement("canvas");
  const width = 1080;
  const height = 1350;
  output.width = width;
  output.height = height;
  const card = output.getContext("2d");

  card.fillStyle = "#141414";
  card.fillRect(0, 0, width, height);

  const gradient = card.createRadialGradient(width / 2, 160, 0, width / 2, 160, 580);
  gradient.addColorStop(0, "rgba(143, 216, 255, 0.26)");
  gradient.addColorStop(1, "rgba(143, 216, 255, 0)");
  card.fillStyle = gradient;
  card.fillRect(0, 0, width, 680);

  card.strokeStyle = "#303030";
  card.lineWidth = 3;
  roundRect(card, 70, 86, 940, 1178, 32);
  card.stroke();

  card.fillStyle = "#9b9b9b";
  card.font = "38px system-ui, sans-serif";
  card.fillText("오늘의 한숨 리포트", 120, 170);

  card.fillStyle = "#ececec";
  card.font = "700 84px system-ui, sans-serif";
  card.fillText(prescription.type, 120, 290);

  card.font = "700 136px system-ui, sans-serif";
  card.fillStyle = "#b7e6ff";
  card.fillText(formatSeconds(totals.total), 120, 500);

  card.fillStyle = "#dcdcdc";
  card.font = "42px system-ui, sans-serif";
  card.fillText("동안 한숨을 배출했습니다.", 120, 570);

  const statY = 690;
  for (const [index, item] of [
    ["횟수", `${totals.count}회`],
    ["평균", formatSeconds(totals.average)],
  ].entries()) {
    const x = 120 + index * 430;
    card.fillStyle = "#202020";
    roundRect(card, x, statY, 380, 150, 24);
    card.fill();
    card.strokeStyle = "#303030";
    card.stroke();
    card.fillStyle = "#9b9b9b";
    card.font = "34px system-ui, sans-serif";
    card.fillText(item[0], x + 34, statY + 56);
    card.fillStyle = "#ececec";
    card.font = "700 50px system-ui, sans-serif";
    card.fillText(item[1], x + 34, statY + 116);
  }

  card.fillStyle = "#ececec";
  card.font = "700 42px system-ui, sans-serif";
  card.fillText("오늘의 처방", 120, 955);
  card.fillStyle = "#cfcfcf";
  card.font = "38px system-ui, sans-serif";
  wrapText(card, prescription.text, 120, 1026, 830, 58);

  card.fillStyle = "#6f6f6f";
  card.font = "32px system-ui, sans-serif";
  card.fillText("오늘의 한숨 · powered by 팀숨", 120, 1200);
  return output;
}

function downloadShareCard() {
  const output = makeShareCanvas();
  const link = document.createElement("a");
  link.download = "today-sigh-report.png";
  link.href = output.toDataURL("image/png");
  link.click();
}

async function shareCard() {
  const output = makeShareCanvas();
  const blob = await new Promise((resolve) => output.toBlob(resolve, "image/png"));
  const file = new File([blob], "today-sigh-report.png", { type: "image/png" });
  const text = `오늘 나는 총 ${cardTotal.textContent} 동안 한숨을 배출했습니다.`;

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "오늘의 한숨",
      text,
      files: [file],
    });
    return;
  }

  if (navigator.share) {
    await navigator.share({ title: "오늘의 한숨", text });
    return;
  }

  await navigator.clipboard.writeText(text);
  shareResult.textContent = "문구 복사됨";
  window.setTimeout(() => {
    shareResult.textContent = "공유하기";
  }, 1400);
}

sighButton.addEventListener("pointerdown", startHold);
sighButton.addEventListener("pointerup", endHold);
sighButton.addEventListener("pointercancel", endHold);
sighButton.addEventListener("lostpointercapture", endHold);
downloadCard.addEventListener("click", downloadShareCard);
chatActions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-bubble]");
  if (!button) return;
  sendSilentBubble(button.dataset.bubble);
});
shareResult.addEventListener("click", () => {
  shareCard().catch(() => {
    shareResult.textContent = "공유 실패";
    window.setTimeout(() => {
      shareResult.textContent = "공유하기";
    }, 1400);
  });
});
window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
  } else {
    animationId = requestAnimationFrame(drawBreath);
  }
});

resizeCanvas();
seedFeed();
updateStats();
drawBreath();
window.setInterval(tickFeed, 5200);
