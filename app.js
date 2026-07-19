// ===================== 배경 파티클 (하트/꽃잎) =====================
function initParticles() {
  const layer = document.getElementById('particle-layer');
  if (!layer) return;

  const emojis = ['💗', '💕', '🌸', '🌷', '💮', '🩷'];
  const count = window.innerWidth < 480 ? 14 : 20;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 8;
    const delay = -Math.random() * duration;
    const size = 14 + Math.random() * 14;

    el.style.left = left + '%';
    el.style.fontSize = size + 'px';
    el.style.animationDuration = duration + 's';
    el.style.animationDelay = delay + 's';

    layer.appendChild(el);
  }
}

// ===================== 퀴즈 (index.html) =====================
let currentQuestion = 0;
let scores = {};

function initQuiz() {
  const startBtn = document.getElementById('start-btn');
  if (!startBtn) return; // index.html이 아니면 종료

  TYPE_IDS.forEach(id => { scores[id] = 0; });

  startBtn.addEventListener('click', () => {
    document.getElementById('intro-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');
    renderQuestion();
  });
}

function renderQuestion() {
  const q = QUESTIONS[currentQuestion];

  document.getElementById('question-text').textContent = q.text;
  document.getElementById('progress-current').textContent = currentQuestion + 1;
  document.getElementById('progress-fill').style.width = (currentQuestion / QUESTIONS.length * 100) + '%';

  const list = document.getElementById('options-list');
  list.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-key">${opt.key}</span><span>${opt.text}</span>`;
    btn.addEventListener('click', () => selectOption(btn, opt));
    list.appendChild(btn);
  });
}

function selectOption(btn, opt) {
  document.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; });
  btn.classList.add('selected');
  scores[opt.type]++;

  document.getElementById('progress-fill').style.width = ((currentQuestion + 1) / QUESTIONS.length * 100) + '%';

  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < QUESTIONS.length) {
      renderQuestion();
    } else {
      finishQuiz();
    }
  }, 320);
}

function finishQuiz() {
  let best = TYPE_IDS[0];
  TYPE_IDS.forEach(id => {
    if (scores[id] > scores[best]) best = id;
  });
  localStorage.setItem('heartTypeResult', best);
  window.location.href = './result.html';
}

// ===================== 결과 페이지 (result.html) =====================
const TOTAL_SLIDES = 6;
let currentSlide = 1;
let resultType = null;
let unlocked = false;
let coupangWindow = null;
let coupangCheckInterval = null;
let waitingForCoupang = false;

const CATEGORY_LABELS = {
  anxious: '불안 애착',
  avoidant: '회피 애착',
  secure: '안정 애착',
  chaotic: '혼란 애착'
};

function initResult() {
  const resultApp = document.getElementById('result-app');
  if (!resultApp) return; // result.html이 아니면 종료

  const typeId = localStorage.getItem('heartTypeResult');
  if (!typeId || !TYPES[typeId]) {
    window.location.href = './index.html';
    return;
  }

  resultType = TYPES[typeId];
  unlocked = sessionStorage.getItem('heartTypeUnlocked') === typeId;

  renderSlide1();
  renderSlide3();
  renderSlide4();
  renderSlide5();
  renderSlide6();
  updateSlideProgress();

  document.getElementById('unlock-btn').addEventListener('click', handleUnlockClick);
  document.querySelectorAll('.slide-next-btn').forEach(btn => {
    btn.addEventListener('click', () => goToSlide(currentSlide + 1));
  });
  document.getElementById('kakao-share-btn').addEventListener('click', shareKakao);
  document.getElementById('copy-link-btn').addEventListener('click', copyLink);
  document.getElementById('retry-btn').addEventListener('click', () => {
    localStorage.removeItem('heartTypeResult');
    sessionStorage.removeItem('heartTypeUnlocked');
    window.location.href = './index.html';
  });
}

function handleUnlockClick() {
  if (unlocked) {
    goToSlide(3);
    return;
  }
  goToSlide(2);
  openCoupangAndWait();
}

// 쿠팡 창을 열고 닫힘을 감지해서 나머지 결과를 공개한다
function openCoupangAndWait() {
  if (waitingForCoupang) {
    if (coupangWindow && !coupangWindow.closed) coupangWindow.focus();
    return;
  }
  const links = COUPANG_LINKS[resultType.id];
  attemptOpenCoupang(links.main, links.backup);
}

function attemptOpenCoupang(url, backupUrl) {
  let win = null;
  try {
    win = window.open(url, '_blank');
  } catch (e) {
    win = null;
  }

  if (!win) {
    if (backupUrl) {
      attemptOpenCoupang(backupUrl, null);
      return;
    }
    // 메인/백업 모두 팝업이 차단된 경우: 바로 결과 공개로 폴백
    unlockResult();
    goToSlide(3);
    return;
  }

  coupangWindow = win;
  waitingForCoupang = true;
  const hint = document.getElementById('lock-hint');
  if (hint) hint.textContent = '🪟 쿠팡 창을 닫으면 나머지 결과가 자동으로 공개돼요...';

  // 메인 링크가 열리자마자 곧바로 닫힌 경우 백업 링크로 자동 전환
  setTimeout(() => {
    if (coupangWindow && coupangWindow.closed && backupUrl) {
      waitingForCoupang = false;
      attemptOpenCoupang(backupUrl, null);
      return;
    }
    startCoupangWatch();
  }, 700);
}

function startCoupangWatch() {
  coupangCheckInterval = setInterval(() => {
    if (coupangWindow && coupangWindow.closed) {
      clearInterval(coupangCheckInterval);
      coupangCheckInterval = null;
      waitingForCoupang = false;
      unlockResult();
      goToSlide(3);
    }
  }, 500);
}

function unlockResult() {
  unlocked = true;
  sessionStorage.setItem('heartTypeUnlocked', resultType.id);
}

function goToSlide(n) {
  if (n < 1 || n > TOTAL_SLIDES) return;
  if ((n === 3 || n === 4 || n === 5) && !unlocked) n = 1;

  currentSlide = n;

  document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.slide[data-slide="${n}"]`);
  if (target) {
    target.classList.remove('active');
    void target.offsetWidth; // 리플로우 강제 → 애니메이션 재생
    target.classList.add('active');
  }

  if (n === 3) animateStats();
  updateSlideProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSlideProgress() {
  const el = document.getElementById('slide-progress-text');
  if (el) el.textContent = `${currentSlide} / ${TOTAL_SLIDES}`;
}

function renderSlide1() {
  const t = resultType;
  document.getElementById('r1-emoji').textContent = t.emoji;
  document.getElementById('r1-category').textContent = CATEGORY_LABELS[t.category] || '';
  document.getElementById('r1-name').textContent = `${t.emoji} ${t.name}`;
  document.getElementById('r1-oneliner').textContent = t.oneLiner;

  const featuresEl = document.getElementById('r1-features');
  featuresEl.innerHTML = '';
  t.features.forEach(f => {
    const li = document.createElement('li');
    li.innerHTML = `<span>💗</span><span>${f}</span>`;
    featuresEl.appendChild(li);
  });
}

function renderSlide3() {
  const t = resultType;
  document.getElementById('r3-root').textContent = t.rootCause;
  document.getElementById('r3-pattern').textContent = t.pattern;

  const statsEl = document.getElementById('r3-stats');
  statsEl.innerHTML = '';
  Object.keys(t.stats).forEach(key => {
    const val = t.stats[key];
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <div class="stat-row-head"><span>${STAT_LABELS[key]}</span><span>${val}</span></div>
      <div class="stat-track"><div class="stat-bar" data-width="${val}"></div></div>
    `;
    statsEl.appendChild(row);
  });
}

function animateStats() {
  document.querySelectorAll('#r3-stats .stat-bar').forEach(bar => {
    const w = bar.dataset.width;
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.width = w + '%';
  });
}

function renderSlide4() {
  const t = resultType;

  const bestEl = document.getElementById('r4-best');
  bestEl.innerHTML = '';
  t.compat.best.forEach(id => {
    const bt = TYPES[id];
    const card = document.createElement('div');
    card.className = 'compat-card';
    card.innerHTML = `<div class="emoji">${bt.emoji}</div><div class="name">${bt.name}</div>`;
    bestEl.appendChild(card);
  });

  const cautionType = TYPES[t.compat.caution];
  document.getElementById('r4-caution').innerHTML =
    `<div class="emoji">${cautionType.emoji}</div><div class="name">${cautionType.name}</div>`;

  const cautionsEl = document.getElementById('r4-cautions');
  cautionsEl.innerHTML = '';
  t.cautions.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<span>📌</span><span>${c}</span>`;
    cautionsEl.appendChild(li);
  });
}

function renderSlide5() {
  const t = resultType;
  document.getElementById('r5-pros').textContent = t.pros;
  document.getElementById('r5-cons').textContent = t.cons;

  const growthEl = document.getElementById('r5-growth');
  growthEl.innerHTML = '';
  t.growth.forEach(g => {
    const li = document.createElement('li');
    li.innerHTML = `<span>🌱</span><span>${g}</span>`;
    growthEl.appendChild(li);
  });

  document.getElementById('r5-comfort').textContent = t.comfort;
}

function renderSlide6() {
  const t = resultType;
  document.getElementById('r6-emoji').textContent = t.emoji;
  document.getElementById('r6-name').textContent = `${t.emoji} ${t.name}`;
  document.getElementById('r6-oneliner').textContent = t.oneLiner;
}

// ===================== 공유 기능 =====================
function getIndexUrl() {
  return new URL('./index.html', window.location.href).href;
}

function shareKakao() {
  const t = resultType;
  const hasKakaoKey = typeof KAKAO_JS_KEY === 'string' && KAKAO_JS_KEY && KAKAO_JS_KEY !== 'YOUR_KAKAO_JAVASCRIPT_KEY';

  if (window.Kakao && hasKakaoKey) {
    try {
      if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `나의 애착유형은 [${t.name}] ${t.emoji}`,
          description: t.oneLiner,
          imageUrl: new URL('./heart-thumbnail.jpg', window.location.href).href,
          link: { mobileWebUrl: window.location.href, webUrl: window.location.href }
        },
        buttons: [
          { title: '나도 테스트하기', link: { mobileWebUrl: getIndexUrl(), webUrl: getIndexUrl() } }
        ]
      });
      return;
    } catch (e) {
      // 아래 링크 복사 폴백으로 이어짐
    }
  }

  copyLink();
  alert('카카오톡 공유 설정(KAKAO_JS_KEY)이 아직 완료되지 않아 링크를 복사했어요. 카카오톡에 붙여넣어 공유해보세요!');
}

function copyLink() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('링크가 복사되었어요! 📋')).catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('링크가 복사되었어요! 📋');
  } catch (e) {
    alert(text);
  }
  document.body.removeChild(ta);
}

function toast(msg) {
  const btn = document.getElementById('copy-link-btn');
  if (!btn) { alert(msg); return; }
  const original = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1600);
}

// ===================== 초기화 =====================
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initQuiz();
  initResult();
});
