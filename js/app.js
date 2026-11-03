/* Норматив — сбор и обработка результатов моторных тестов на уроке физической культуры.
   Всё хранится в localStorage этого браузера; сеть не используется. */
'use strict';

/* ---------------- утилиты ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const num = s => { const v = parseFloat(String(s ?? '').replace(',', '.').replace(/\s/g, '')); return isFinite(v) ? v : null; };
const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toFixed(d).replace('.', ','));
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => (d ? new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- тесты (таблица 2 ВКР) ---------------- */
const TESTS = [
  { id: 'run30', name: 'Бег 30 м', quality: 'Быстрота', unit: 'с', dir: 'lower', tool: 'stopwatch', dec: 2 },
  { id: 'shuttle', name: 'Челночный бег 4×10 м', quality: 'Ловкость, быстрота', unit: 'с', dir: 'lower', tool: 'stopwatch', dec: 2 },
  { id: 'reach', name: 'Наклон вперёд сидя', quality: 'Гибкость', unit: 'см', dir: 'higher', tool: 'attempts', attempts: 2, dec: 0 },
  { id: 'ljump', name: 'Прыжок в длину с места', quality: 'Скоростно-силовые', unit: 'см', dir: 'higher', tool: 'attempts', attempts: 3, dec: 0 },
  { id: 'vjump', name: 'Вертикальный прыжок', quality: 'Скоростно-силовые', unit: 'см', dir: 'higher', tool: 'video', dec: 1 },
  { id: 'pull', name: 'Подтягивание (ю) / сгибание рук в упоре (д)', quality: 'Сила', unit: 'раз', dir: 'higher', tool: 'counter', limit: 0, dec: 0 },
  { id: 'situp', name: 'Поднимание туловища за 30 с', quality: 'Силовая выносливость', unit: 'раз', dir: 'higher', tool: 'counter', limit: 30, dec: 0 },
  { id: 'run6', name: '6-минутный бег', quality: 'Общая выносливость', unit: 'м', dir: 'higher', tool: 'laps', dec: 0 },
  { id: 'beep', name: 'Челночный бег 20 м (Леже)', quality: 'Аэробная выносливость', unit: 'отр.', dir: 'higher', tool: 'beep', dec: 0 },
];
const T = Object.fromEntries(TESTS.map((t, i) => [t.id, { ...t, order: i }]));
const TOOL_INFO = {
  stopwatch: ['А', 'Секундомер со звуковым стартом'],
  counter: ['Б', 'Счётчик повторений'],
  video: ['В', 'Замер по видео (время полёта)'],
  attempts: ['Д', 'Ввод попыток, лучшая в зачёт'],
  laps: ['А', 'Таймер и счёт кругов'],
  beep: ['А', 'Звуковые сигналы Леже'],
};

/* Ориентировочные нормативы: [результат на 10 баллов, на 1 балл] для 5 и 11 класса, между классами — линейно.
   Это демонстрационные значения: учитель заменяет их нормативами типовой учебной программы [2]. */
const NORM_ANCHORS = {
  run30: { М: [[5.1, 6.6], [4.4, 5.6]], Ж: [[5.3, 6.9], [4.8, 6.1]] },
  shuttle: { М: [[10.2, 12.2], [9.0, 10.8]], Ж: [[10.6, 12.8], [9.8, 11.8]] },
  reach: { М: [[10, 0], [15, 2]], Ж: [[14, 2], [20, 5]] },
  ljump: { М: [[180, 130], [240, 180]], Ж: [[170, 120], [205, 150]] },
  vjump: { М: [[40, 22], [60, 35]], Ж: [[36, 20], [48, 28]] },
  pull: { М: [[7, 1], [15, 4]], Ж: [[18, 5], [22, 7]] },
  situp: { М: [[22, 12], [30, 18]], Ж: [[20, 10], [26, 14]] },
  run6: { М: [[1300, 900], [1600, 1150]], Ж: [[1150, 800], [1350, 950]] },
  beep: { М: [[45, 12], [85, 25]], Ж: [[35, 10], [60, 18]] },
};
const GRADES = [5, 6, 7, 8, 9, 10, 11];
function defaultNorms() {
  const out = {};
  for (const t of TESTS) {
    out[t.id] = {};
    for (const sex of ['М', 'Ж']) {
      const [[b5, w5], [b11, w11]] = NORM_ANCHORS[t.id][sex];
      out[t.id][sex] = {};
      for (const g of GRADES) {
        const k = (g - 5) / 6, r = v => +v.toFixed(t.dec);
        out[t.id][sex][g] = [r(b5 + (b11 - b5) * k), r(w5 + (w11 - w5) * k)];
      }
    }
  }
  return out;
}

/* ---------------- хранилище ---------------- */
const KEY = 'normativ.v1';
function fresh() {
  return { v: 1, classes: [], students: [], sessions: [], results: [], survey: [], apps: [], norms: defaultNorms(), settings: { showNames: false, sound: true } };
}
let S = (() => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) return Object.assign(fresh(), d);
  } catch (e) { /* пустое или недоступное хранилище */ }
  return fresh();
})();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Браузер не даёт сохранить данные: экспортируйте их вручную'); }
}
const UI = { classId: null, sessionId: null, testId: null, jClass: null, jSession: null, aClass: null, aTest: 'run30', aStudent: null };

/* ---------------- модель ---------------- */
const cls = id => S.classes.find(c => c.id === id);
const session = id => S.sessions.find(s => s.id === id);
const student = id => S.students.find(s => s.id === id);
const roster = (classId, all = false) => S.students.filter(s => s.classId === classId && (all || s.group !== 'освобождён'))
  .sort((a, b) => a.code.localeCompare(b.code, 'ru', { numeric: true }));
const who = st => (S.settings.showNames && st.name ? `${st.code} · ${st.name}` : st.code);
const getRes = (sessionId, studentId, testId) => S.results.find(r => r.sessionId === sessionId && r.studentId === studentId && r.testId === testId);
function setRes(sessionId, studentId, testId, value, extra = {}) {
  let r = getRes(sessionId, studentId, testId);
  if (value == null) { if (r) S.results.splice(S.results.indexOf(r), 1); save(); return null; }
  if (!r) { r = { id: uid(), sessionId, studentId, testId }; S.results.push(r); }
  Object.assign(r, { value: +(+value).toFixed(T[testId].dec + 1), at: Date.now() }, extra);
  save();
  return r;
}
function normFor(testId, sex, grade) {
  const g = clamp(Math.round(grade || 7), 5, 11);
  return S.norms?.[testId]?.[sex]?.[g] || defaultNorms()[testId][sex][g];
}
/* перевод результата в балл 1–10 (Типовые правила [3]): линейно между результатами на 1 и на 10 баллов */
function score(testId, studentId, value) {
  if (value == null) return null;
  const st = student(studentId), c = st && cls(st.classId);
  if (!st || !c) return null;
  const [best, worst] = normFor(testId, st.sex, c.grade);
  if (best === worst) return null;
  return Math.round(clamp(1 + 9 * (value - worst) / (best - worst), 1, 10));
}
const scoreColor = s => (s == null ? '#b8b3a5' : s <= 3 ? '#d23f3f' : s <= 5 ? '#d68a00' : s <= 7 ? '#6aa84f' : '#1d7a45');
const scoreBadge = s => (s == null ? '' : `<span class="score" style="background:${scoreColor(s)}">${s}</span>`);
const sessionsOf = classId => S.sessions.filter(s => s.classId === classId).sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')));
function sessionStats(s) {
  const rs = S.results.filter(r => r.sessionId === s.id);
  const nStudents = s.method === 'manual' && s.nStudents ? s.nStudents : new Set(rs.map(r => r.studentId)).size;
  const nTests = s.method === 'manual' && s.nTests ? s.nTests : new Set(rs.map(r => r.testId)).size || (s.tests || []).length;
  const minutes = s.method === 'manual' ? s.durationMin : (s.endedAt && s.startedAt ? (s.endedAt - s.startedAt) / 60000 : null);
  const errors = s.method === 'manual' ? s.errors : s.corrections || 0;
  const units = nStudents * nTests;
  return { nStudents, nTests, minutes, errors, perUnit: minutes != null && units ? minutes / units : null, errPer100: units ? errors / units * 100 : null, records: rs.length };
}

/* ---------------- звук ---------------- */
let AC = null;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function beep(freq = 880, dur = 0.12, at = null, vol = 0.22) {
  if (!S.settings.sound) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t = at ?? a.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* без звука */ }
}
function countdownBeeps(at) { [0, 1, 2].forEach(i => beep(520, 0.12, at + i)); beep(1040, 0.35, at + 3); }

/* ---------------- графики (SVG) ---------------- */
function lineChart(labels, series, { dec = 1, unit = '' } = {}) {
  const W = 640, H = 250, L = 46, R = 14, Tp = 14, B = 34;
  const all = series.flatMap(s => s.pts).filter(v => v != null);
  if (!all.length || labels.length === 0) return '<p class="muted small">Недостаточно данных для графика.</p>';
  let lo = Math.min(...all), hi = Math.max(...all);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => L + (labels.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (labels.length - 1));
  const y = v => Tp + (hi - v) / (hi - lo) * (H - Tp - B);
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const v = lo + (hi - lo) * k / 4, yy = y(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#ece8dc"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${fmt(v, dec)}</text>`;
  }
  labels.forEach((l, i) => { g += `<text x="${x(i)}" y="${H - 12}" text-anchor="middle">${esc(l)}</text>`; });
  for (const s of series) {
    const p = s.pts.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    if (p.length > 1) g += `<path class="draw" pathLength="1" d="M${p.map(q => q.join(',')).join('L')}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round"/>`;
    p.forEach((q, i) => { g += `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#fff" stroke="${s.color}" stroke-width="3"><title>${esc(s.name)}: ${fmt(s.pts.filter(v => v != null)[i], dec)} ${esc(unit)}</title></circle>`; });
  }
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График">${g}</svg>${legend}`;
}
function barChart(values, labels, colors) {
  const W = 640, H = 210, L = 30, B = 30, Tp = 12, max = Math.max(1, ...values);
  const bw = (W - L - 10) / values.length;
  let g = '';
  values.forEach((v, i) => {
    const h = (H - B - Tp) * v / max, xx = L + i * bw + 4;
    g += `<rect class="grow" style="animation-delay:${i * 40}ms" x="${xx}" y="${H - B - h}" width="${bw - 8}" height="${h}" rx="5" fill="${colors ? colors[i] : '#ff5a1f'}"/>`;
    if (v) g += `<text x="${xx + (bw - 8) / 2}" y="${H - B - h - 4}" text-anchor="middle">${v}</text>`;
    g += `<text x="${xx + (bw - 8) / 2}" y="${H - 10}" text-anchor="middle">${esc(labels[i])}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Диаграмма">${g}</svg>`;
}

/* ================= ВИДЫ ================= */
const VIEWS = {}, AFTER = {};
let cleanup = [];
const onCleanup = f => cleanup.push(f);

/* ---------- главная ---------- */
VIEWS.home = () => {
  const lanes = Array.from({ length: 9 }, (_, i) => {
    const y = 80 + i * 70;
    return `<path d="M-50 ${y} C 400 ${y - 120}, 900 ${y + 160}, 1700 ${y - 40}"/>`;
  }).join('');
  const h = hypothesis();
  return `
  <section class="hero on-dark">
    <svg class="lanes" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${lanes}</svg>
    <div class="hero-in">
      <div class="reveal">
        <p class="kicker">ВКР · физическая культура · Республика Казахстан</p>
        <h1>Моторные тесты <em>без бумажного</em> журнала</h1>
        <p class="lead">Норматив — рабочий инструмент к методике использования мобильных приложений для сбора и обработки результатов моторных тестов: секундомер со звуковым стартом, счётчик повторений, замер прыжка по видео, автоматический перевод в баллы 1–10 и динамика каждого ученика.</p>
        <div class="row">
          <a class="btn primary" href="#/test">Начать тестирование</a>
          ${S.classes.length ? '<a class="btn" href="#/journal">Открыть журнал</a>' : '<button class="btn" data-act="demo">Загрузить демо-класс</button>'}
        </div>
      </div>
      <div class="watch reveal" aria-hidden="true">
        <svg viewBox="0 0 200 200"><circle class="ring" cx="100" cy="100" r="86"/><circle class="arc" id="hw-arc" cx="100" cy="100" r="86" stroke-dasharray="540.4" stroke-dashoffset="540.4"/></svg>
        <div class="read"><b id="hw">0,00</b><span>бег 30 м</span></div>
      </div>
    </div>
  </section>

  <section class="sec wrap">
    <div class="page-head reveal"><div><h2>Задачи исследования → модули</h2><p>Каждая задача ВКР закрыта работающей частью сайта.</p></div></div>
    <div class="grid g4">
      <a class="card task reveal" href="#/method"><span class="n">01</span><h3>Анализ литературы</h3><p class="muted small">Нормативная база РК, метрологические требования, классификация приложений А–Ж и критерии отбора.</p><span class="go">Методика →</span></a>
      <a class="card task reveal" href="#/test"><span class="n">02</span><h3>Методика сбора и обработки</h3><p class="muted small">Протокол урока: класс по кодам, тесты в правильном порядке, инструмент под каждый показатель, баллы автоматически.</p><span class="go">Тестирование →</span></a>
      <a class="card task reveal" href="#/experiment"><span class="n">03</span><h3>Экспериментальная проверка</h3><p class="muted small">Время тестирования, точность (ICC, Блэнд–Альтман), интерес учащихся, сравнение ЭГ и КГ.</p><span class="go">Эксперимент →</span></a>
      <a class="card task reveal" href="#/method/recs"><span class="n">04</span><h3>Рекомендации учителям</h3><p class="muted small">Пошаговое внедрение: подготовка, проверка точности, проведение, обработка, обратная связь.</p><span class="go">Рекомендации →</span></a>
    </div>
  </section>

  <section class="sec wrap">
    <div class="page-head reveal"><div><h2>Гипотеза — по вашим данным</h2><p>Показатели считаются из журнала и раздела «Эксперимент». Метка «демо-данные» означает, что в расчёт попали сгенерированные записи, а не результаты эксперимента.</p></div></div>
    <div class="grid g3">
      <div class="card metric reveal"><span class="tag">Время</span>${h.time.demo ? ' <span class="tag demo">демо-данные</span>' : ''}<b>${h.time.value}</b><p class="muted small">${h.time.text}</p></div>
      <div class="card metric reveal"><span class="tag">Точность записи</span>${h.err.demo ? ' <span class="tag demo">демо-данные</span>' : ''}<b>${h.err.value}</b><p class="muted small">${h.err.text}</p></div>
      <div class="card metric reveal"><span class="tag">Интерес</span>${h.int.demo ? ' <span class="tag demo">демо-данные</span>' : ''}<b>${h.int.value}</b><p class="muted small">${h.int.text}</p></div>
    </div>
  </section>

  <section class="sec wrap">
    <div class="page-head reveal"><div><h2>Как проходит урок</h2></div></div>
    <ol class="steps">
      <li class="reveal"><b>Подготовка</b><p class="small muted">Класс заводится по кодам, отмечаются медицинские группы, выбираются тесты.</p></li>
      <li class="reveal"><b>Проверка точности</b><p class="small muted">Пилотные замеры приложения против эталона: ICC и границы согласия.</p></li>
      <li class="reveal"><b>Тестирование</b><p class="small muted">Быстрота → сила → выносливость. Устройство меряет, учитель смотрит за техникой.</p></li>
      <li class="reveal"><b>Обработка</b><p class="small muted">Баллы по нормативам, сводка класса, экспорт в таблицу для журнала.</p></li>
      <li class="reveal"><b>Обратная связь</b><p class="small muted">Карточка ученика с динамикой и подсказкой, что подтянуть.</p></li>
    </ol>
  </section>

  <section class="sec wrap">
    <div class="card note reveal"><b>Персональные данные.</b> Ученики хранятся под кодами (например, 7А-05), ФИО — по желанию и только на этом устройстве. Сайт не отправляет результаты в облако: всё лежит в памяти браузера, перенос — через экспорт файла.</div>
  </section>`;
};
AFTER.home = () => {
  const el = $('#hw'), arc = $('#hw-arc');
  if (!el) return;
  let t0 = performance.now(), raf;
  const loop = now => {
    const t = ((now - t0) / 1000) % 5.4;
    el.textContent = fmt(t, 2);
    arc.style.strokeDashoffset = 540.4 * (1 - t / 5.4);
    raf = requestAnimationFrame(loop);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(loop);
  onCleanup(() => cancelAnimationFrame(raf));
};

function hypothesis() {
  const st = S.sessions.map(s => ({ s, m: sessionStats(s) })).filter(x => x.m.perUnit != null && x.m.minutes >= 1);
  const demo = st.some(x => x.s.demo) || S.survey.some(r => r.demo);
  const app = st.filter(x => x.s.method === 'app'), man = st.filter(x => x.s.method === 'manual');
  const out = {
    time: { value: '—', text: 'Нужны завершённые сессии с приложением и записи ручного тестирования (раздел «Эксперимент»).' },
    err: { value: '—', text: 'Сравнение исправлений в журнале и ошибок ручной записи на 100 результатов.' },
    int: { value: '—', text: 'Анкета интереса «до» и «после» в экспериментальной группе.' },
  };
  if (app.length && man.length) {
    const a = Stat.mean(app.map(x => x.m.perUnit)), m = Stat.mean(man.map(x => x.m.perUnit));
    out.time = { demo, value: `${a < m ? '−' : '+'}${fmt(Math.abs(1 - a / m) * 100, 0)} %`, text: `Минут на ученика·тест: ${fmt(a, 2)} с приложением против ${fmt(m, 2)} вручную.` };
    const ea = Stat.mean(app.map(x => x.m.errPer100 || 0)), em = Stat.mean(man.map(x => x.m.errPer100 || 0));
    out.err = { demo, value: `${fmt(ea, 1)} / ${fmt(em, 1)}`, text: 'Исправлений на 100 записей: с приложением / вручную.' };
  }
  const eg = new Set(S.classes.filter(c => c.role === 'ЭГ').map(c => c.id));
  const sv = ph => S.survey.filter(r => eg.has(r.classId) && r.phase === ph).map(r => Stat.mean(r.answers));
  const pre = sv('до'), post = sv('после');
  if (pre.length && post.length) {
    out.int = { demo, value: `${fmt(Stat.mean(pre), 2)} → ${fmt(Stat.mean(post), 2)}`, text: `Средний балл анкеты (1–5) в ЭГ: ${pre.length} анкет до, ${post.length} после.` };
  }
  return out;
}

/* ---------- классы ---------- */
VIEWS.classes = () => {
  if (!UI.classId || !cls(UI.classId)) UI.classId = S.classes[0]?.id || null;
  const c = cls(UI.classId);
  const list = S.classes.map(k => `
    <div class="cls ${k.id === UI.classId ? 'on' : ''}" data-act="pick-class" data-id="${k.id}">
      <div><b>${esc(k.name)}</b> <span class="muted small">${k.grade} кл. · ${roster(k.id, true).length} уч.</span></div>
      <div class="row">${k.role && k.role !== '—' ? `<span class="tag ${k.role === 'ЭГ' ? 'eg' : 'kg'}">${k.role}</span>` : ''}${k.demo ? '<span class="tag demo">демо</span>' : ''}</div>
    </div>`).join('');
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Классы</h2><p>Ученики заводятся под кодами: ФИО не обязательны и не покидают это устройство. Медицинская группа «освобождён» исключает ученика из тестирования.</p></div>
      <label class="check"><input type="checkbox" data-act="names" ${S.settings.showNames ? 'checked' : ''}> Показывать ФИО</label></div>
    <div class="grid side">
      <div>
        <div class="card">
          <h3>Новый класс</h3>
          <form class="grid" data-form="add-class">
            <div class="grid g2">
              <label class="f">Название<input name="name" placeholder="7А" required maxlength="12"></label>
              <label class="f">Класс (параллель)<select name="grade">${[...Array(11)].map((_, i) => `<option ${i + 1 === 7 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
            </div>
            <label class="f">Группа в эксперименте<select name="role"><option>—</option><option value="ЭГ">Экспериментальная (ЭГ)</option><option value="КГ">Контрольная (КГ)</option></select></label>
            <button class="btn primary">Добавить класс</button>
          </form>
        </div>
        <div class="card">${list || '<p class="muted">Классов пока нет.</p>'}
          ${S.classes.length ? '' : '<button class="btn lime" data-act="demo" style="margin-top:12px">Загрузить демо-класс</button>'}</div>
      </div>
      <div>${c ? classPanel(c) : '<div class="card empty"><h3>Выберите или создайте класс</h3><p>Затем добавьте учеников — достаточно указать пол.</p></div>'}</div>
    </div>
  </section>`;
};
function classPanel(c) {
  const rs = roster(c.id, true);
  const rows = rs.map((s, i) => `<tr>
    <td class="num">${i + 1}</td><td><b>${esc(s.code)}</b></td>
    <td><select data-edit="sex" data-id="${s.id}"><option ${s.sex === 'М' ? 'selected' : ''}>М</option><option ${s.sex === 'Ж' ? 'selected' : ''}>Ж</option></select></td>
    ${S.settings.showNames ? `<td><input data-edit="name" data-id="${s.id}" value="${esc(s.name)}" placeholder="ФИО (необязательно)"></td>` : ''}
    <td><select data-edit="group" data-id="${s.id}">${['основная', 'подготовительная', 'специальная', 'освобождён'].map(g => `<option ${s.group === g ? 'selected' : ''}>${g}</option>`).join('')}</select></td>
    <td><button class="btn small ghost" data-act="del-student" data-id="${s.id}" aria-label="Удалить">✕</button></td></tr>`).join('');
  return `<div class="card">
    <div class="page-head" style="margin-bottom:12px"><div><h3 style="margin:0">${esc(c.name)} · ${c.grade} класс</h3>
      <p class="small">${rs.length} ${plural(rs.length, 'ученик', 'ученика', 'учеников')} · нормативы берутся для ${clamp(c.grade, 5, 11)} класса</p></div>
      <div class="row"><select data-act="role" data-id="${c.id}">${['—', 'ЭГ', 'КГ'].map(r => `<option ${c.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <button class="btn small danger" data-act="del-class" data-id="${c.id}">Удалить класс</button></div></div>
    <form class="row" data-form="add-students" style="margin-bottom:14px">
      <label class="f">Юношей<input name="m" type="number" min="0" max="40" value="0" style="width:90px"></label>
      <label class="f">Девушек<input name="f" type="number" min="0" max="40" value="0" style="width:90px"></label>
      <button class="btn primary" style="align-self:flex-end">Добавить учеников</button>
    </form>
    ${rs.length ? `<div class="tbl-wrap"><table><thead><tr><th class="num">№</th><th>Код</th><th>Пол</th>${S.settings.showNames ? '<th>ФИО</th>' : ''}<th>Мед. группа</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Учеников нет.</p>'}
    <details class="acc" style="margin-top:14px"><summary>Импорт списка (CSV)</summary><div class="in">
      <p class="small muted">По строке на ученика: <code>пол;ФИО</code>, например <code>Ж;Иванова А.</code> ФИО можно опустить.</p>
      <textarea id="csv-in" placeholder="М;&#10;Ж;&#10;М;Петров Б."></textarea>
      <button class="btn" data-act="import-csv" style="margin-top:10px">Импортировать</button></div></details>
  </div>`;
}
function addStudents(classId, list) {
  const c = cls(classId), have = roster(classId, true);
  let n = have.reduce((m, s) => Math.max(m, +s.code.split('-').pop() || 0), 0);
  for (const it of list) {
    n++;
    S.students.push({ id: uid(), classId, code: `${c.name}-${String(n).padStart(2, '0')}`, sex: it.sex, name: it.name || '', group: 'основная' });
  }
  save();
}

/* ---------- тестирование ---------- */
VIEWS.test = () => {
  if (!S.classes.length) return `<section class="page wrap"><div class="card empty"><h3>Сначала нужен класс</h3><p>Создайте класс и добавьте учеников или загрузите демо.</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/classes">К классам</a><button class="btn" data-act="demo">Демо-класс</button></div></div></section>`;
  const s = session(UI.sessionId);
  if (s && !s.endedAt && s.method === 'app') return sessionView(s);
  UI.sessionId = null;
  const open = S.sessions.filter(x => x.method === 'app' && !x.endedAt);
  const c = cls(UI.classId) || S.classes[0];
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Тестирование</h2><p>Выберите класс и тесты. Порядок выполнения выстроен автоматически: быстрота и координация → сила и скоростно-силовые → выносливость, чтобы утомление не искажало следующие испытания.</p></div></div>
    ${open.length ? `<div class="card" style="margin-bottom:16px"><h3>Незавершённые тестирования</h3><div class="row">${open.map(o => `<button class="btn" data-act="resume" data-id="${o.id}">${esc(cls(o.classId)?.name)} · ${esc(o.label)} · ${fmtDate(o.date)}</button>`).join('')}</div></div>` : ''}
    <form class="card grid" data-form="new-session">
      <div class="grid g3">
        <label class="f">Класс<select name="classId">${S.classes.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.name)} (${roster(k.id).length} уч.)</option>`).join('')}</select></label>
        <label class="f">Дата<input type="date" name="date" value="${today()}" required></label>
        <label class="f">Контроль<select name="label"><option>Входной контроль</option><option>Текущий контроль</option><option>Промежуточный контроль</option><option>Итоговый контроль</option></select></label>
      </div>
      <div><p class="small muted" style="margin:0 0 8px">Тесты (таблица 2 ВКР) и инструмент, которым фиксируется результат:</p>
        <div class="grid g3">${TESTS.map(t => `<label class="check ${['run30', 'ljump', 'situp'].includes(t.id) ? 'on' : ''}"><input type="checkbox" name="t" value="${t.id}" ${['run30', 'ljump', 'situp'].includes(t.id) ? 'checked' : ''}>
          <span><b>${esc(t.name)}</b><br><span class="small muted">${esc(t.quality)} · ${t.unit} · класс ${TOOL_INFO[t.tool][0]}: ${TOOL_INFO[t.tool][1].toLowerCase()}</span></span></label>`).join('')}</div></div>
      <div class="note">Перед началом: допуск по медицинской группе, единая разминка, инструктаж учеников, одно и то же устройство на весь класс. Время тестирования засекается автоматически — это данные для проверки гипотезы.</div>
      <div class="row end"><button class="btn primary">Начать тестирование</button></div>
    </form>
  </section>`;
};

function sessionView(s) {
  const c = cls(s.classId);
  if (!UI.testId || !s.tests.includes(UI.testId)) UI.testId = s.tests[0];
  const t = T[UI.testId];
  return `<section class="page wrap">
    <div class="sess-bar"><div><b>${esc(c.name)}</b> · ${esc(s.label)} · ${fmtDate(s.date)}<br><span class="small" style="color:#a9ad9f">идёт тестирование</span></div>
      <div class="row"><span class="clock" id="sess-clock">00:00</span><button class="btn lime small" data-act="end-session">Завершить</button></div></div>
    <div class="tabs" id="tabs">${tabsHTML(s)}</div>
    <div class="page-head" style="margin-bottom:12px"><div><h3 style="margin:0">${esc(t.name)}</h3><p class="small">${esc(t.quality)} · результат в ${t.unit} · ${TOOL_INFO[t.tool][1]} (класс ${TOOL_INFO[t.tool][0]})</p></div></div>
    <div id="tool">${TOOLS[t.tool].html(t, s)}</div>
  </section>`;
}
function tabsHTML(s) {
  const n = roster(s.classId).length;
  return s.tests.map((id, i) => {
    const done = S.results.filter(r => r.sessionId === s.id && r.testId === id).length;
    return `<button class="tab ${id === UI.testId ? 'on' : ''} ${done >= n && n ? 'done' : ''}" data-act="tab" data-id="${id}"><span>${i + 1}. ${esc(T[id].name)}</span><small>${done} из ${n}</small></button>`;
  }).join('');
}
AFTER.test = () => {
  const s = session(UI.sessionId);
  if (!s || s.endedAt) return;
  const clock = $('#sess-clock');
  const tick = () => { const m = Math.floor((Date.now() - s.startedAt) / 1000); clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  tick();
  const iv = setInterval(tick, 1000);
  onCleanup(() => clearInterval(iv));
  const off = TOOLS[T[UI.testId].tool].init(T[UI.testId], s);
  if (off) onCleanup(off);
};

/* общие части инструментов */
function chipsHTML(s, t, { sel = null, label } = {}) {
  return roster(s.classId).map(st => {
    const r = getRes(s.id, st.id, t.id);
    const sub = label ? label(st, r) : (r ? `${fmt(r.value, t.dec)} ${t.unit}` : '—');
    return `<button class="chip ${r ? 'has' : ''} ${sel === st.id ? 'sel' : ''}" data-sid="${st.id}">${esc(who(st))}<small>${sub}</small></button>`;
  }).join('');
}
function refreshChip(s, t, sid, label) {
  const el = $(`.chip[data-sid="${sid}"]`);
  if (!el) return;
  const r = getRes(s.id, sid, t.id);
  el.classList.toggle('has', !!r);
  $('small', el).textContent = label ? label(student(sid), r) : (r ? `${fmt(r.value, t.dec)} ${t.unit}` : '—');
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  $('#tabs').innerHTML = tabsHTML(s);
}
const nextWithout = (s, t, after) => {
  const rs = roster(s.classId), i = rs.findIndex(x => x.id === after);
  return [...rs.slice(i + 1), ...rs.slice(0, i + 1)].find(x => !getRes(s.id, x.id, t.id))?.id || null;
};

const TOOLS = {};

/* А. секундомер: групповой финиш или по одному, звуковой старт снимает ошибку реакции на старте */
TOOLS.stopwatch = {
  html: (t, s) => `<div class="card tool">
    <div class="row" style="justify-content:space-between">
      <div class="row"><button class="btn small" data-mode="group">Групповой финиш</button><button class="btn small" data-mode="single">По одному</button></div>
      <label class="check small"><input type="checkbox" id="sw-cd" checked> Отсчёт 3-2-1 и звуковой старт</label></div>
    <div class="big-display" id="sw-d">0,00</div>
    <div class="sub-display" id="sw-s"></div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="sw-start">Старт</button><button class="btn" id="sw-stop" disabled>Стоп</button><button class="btn ghost" id="sw-undo" disabled>Отменить последнюю отметку</button></div>
    <div class="chips" id="chips">${chipsHTML(s, t)}</div></div>`,
  init(t, s) {
    let mode = t.id === 'shuttle' ? 'single' : 'group', t0 = null, running = false, raf = 0, sel = null;
    const log = [], d = $('#sw-d'), msg = $('#sw-s'), bStart = $('#sw-start'), bStop = $('#sw-stop'), bUndo = $('#sw-undo');
    const hint = () => {
      msg.textContent = mode === 'group'
        ? 'Старт для всей группы; нажимайте на ученика в момент, когда он пересекает финиш.'
        : (sel ? `Бежит: ${who(student(sel))}. «Стоп» — на финише.` : 'Выберите ученика, затем «Старт».');
      $$('[data-mode]').forEach(b => b.classList.toggle('lime', b.dataset.mode === mode));
      $$('.chip').forEach(c => c.classList.toggle('sel', mode === 'single' && c.dataset.sid === sel));
    };
    const loop = () => {
      const e = performance.now() - t0;
      d.textContent = e < 0 ? String(Math.ceil(-e / 1000)) : fmt(e / 1000, 2);
      d.classList.toggle('run', e >= 0);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (mode === 'single' && !sel) return toast('Выберите ученика');
      const cd = $('#sw-cd').checked;
      if (cd) { const a = S.settings.sound ? ac() : null; if (a) countdownBeeps(a.currentTime + 0.05); }
      else beep(1040, 0.3);
      t0 = performance.now() + (cd ? 3050 : 0);
      running = true; bStart.disabled = true; bStop.disabled = false;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      const e = (performance.now() - t0) / 1000;
      running = false; cancelAnimationFrame(raf);
      bStart.disabled = false; bStop.disabled = true;
      d.classList.remove('run');
      if (mode === 'single' && sel && e > 0) {
        log.push({ sid: sel, prev: getRes(s.id, sel, t.id)?.value ?? null });
        setRes(s.id, sel, t.id, +e.toFixed(2), { source: 'секундомер' });
        refreshChip(s, t, sel); d.textContent = fmt(e, 2); bUndo.disabled = false;
        sel = nextWithout(s, t, sel); hint();
      }
    };
    const onChip = sid => {
      if (mode === 'single') { if (!running) { sel = sid; hint(); } return; }
      if (!running) return toast('Сначала «Старт»');
      const e = (performance.now() - t0) / 1000;
      if (e <= 0) return;
      log.push({ sid, prev: getRes(s.id, sid, t.id)?.value ?? null });
      setRes(s.id, sid, t.id, +e.toFixed(2), { source: 'секундомер' });
      refreshChip(s, t, sid); bUndo.disabled = false;
    };
    $('#tool').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip'), m = ev.target.closest('[data-mode]');
      if (chip) onChip(chip.dataset.sid);
      else if (m && !running) { mode = m.dataset.mode; sel = null; hint(); }
      else if (ev.target === bStart) start();
      else if (ev.target === bStop) stop();
      else if (ev.target === bUndo) {
        const l = log.pop(); if (!l) return;
        setRes(s.id, l.sid, t.id, l.prev, { source: 'секундомер' }); refreshChip(s, t, l.sid);
        bUndo.disabled = !log.length; toast('Последняя отметка отменена');
      }
    });
    hint();
    return () => cancelAnimationFrame(raf);
  },
};

/* Б. счётчик повторений: большая кнопка, таймер для тестов «за 30 с», пробел = +1 */
TOOLS.counter = {
  html: (t, s) => `<div class="card tool">
    <div class="chips" id="chips">${chipsHTML(s, t)}</div>
    <div class="sub-display" id="ct-who">Выберите ученика</div>
    <div class="big-display" id="ct-n">0</div>
    <div class="sub-display" id="ct-t">${t.limit ? `Время: ${t.limit} с — счёт идёт только после старта` : 'Без ограничения времени'}</div>
    <button class="tap" id="ct-tap" ${t.limit ? 'disabled' : ''}>+1</button>
    <div class="row" style="justify-content:center">
      ${t.limit ? `<button class="btn primary" id="ct-start">Старт ${t.limit} с</button>` : ''}
      <button class="btn" id="ct-minus">−1</button><button class="btn ghost" id="ct-reset">Сбросить</button><button class="btn lime" id="ct-save">Сохранить</button></div>
    <p class="small muted" style="text-align:center;margin:0">Засчитываются только повторения с правильной техникой — решение остаётся за учителем. Пробел: +1, Enter: сохранить.</p></div>`,
  init(t, s) {
    let sel = null, n = 0, running = false, endAt = 0, iv = 0;
    const nEl = $('#ct-n'), tEl = $('#ct-t'), tap = $('#ct-tap'), whoEl = $('#ct-who');
    const show = () => { nEl.textContent = n; nEl.classList.remove('pop'); void nEl.offsetWidth; nEl.classList.add('pop'); };
    const pick = sid => {
      if (running) return;
      sel = sid; n = getRes(s.id, sid, t.id)?.value ?? 0; show();
      whoEl.textContent = who(student(sid));
      $$('.chip').forEach(c => c.classList.toggle('sel', c.dataset.sid === sid));
      if (!t.limit) tap.disabled = false;
    };
    const store = () => {
      if (!sel) return toast('Выберите ученика');
      setRes(s.id, sel, t.id, n, { source: 'счётчик' }); refreshChip(s, t, sel);
      toast(`${who(student(sel))}: ${n} ${t.unit}`);
      const nx = nextWithout(s, t, sel);
      if (nx) pick(nx);
    };
    const add = k => {
      if (!sel || (t.limit && !running)) return;
      n = Math.max(0, n + k); show(); if (k > 0) beep(1400, 0.03, null, 0.08);
    };
    const finish = () => {
      clearInterval(iv); running = false; tap.disabled = true; tEl.textContent = 'Время вышло';
      beep(700, 0.6); store();
    };
    const startT = () => {
      if (!sel) return toast('Выберите ученика');
      n = 0; show(); running = true; tap.disabled = false; beep(1040, 0.3);
      endAt = performance.now() + t.limit * 1000;
      iv = setInterval(() => {
        const left = (endAt - performance.now()) / 1000;
        if (left <= 0) return finish();
        tEl.textContent = `Осталось ${fmt(left, 1)} с`;
      }, 50);
    };
    $('#tool').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip) return pick(chip.dataset.sid);
      const id = ev.target.id;
      if (id === 'ct-tap') add(1);
      if (id === 'ct-minus') add(-1);
      if (id === 'ct-reset' && !running) { n = 0; show(); }
      if (id === 'ct-save' && !running) store();
      if (id === 'ct-start' && !running) startT();
    });
    const key = ev => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      if (document.activeElement?.tagName === 'BUTTON') document.activeElement.blur();   // иначе пробел «нажмёт» выбранную карточку
      if (ev.code === 'Space') { ev.preventDefault(); add(1); }
      if (ev.code === 'Enter' && !running) { ev.preventDefault(); store(); }
    };
    document.addEventListener('keydown', key);
    return () => { clearInterval(iv); document.removeEventListener('keydown', key); };
  },
};

/* Д. попытки: ввод с рулетки/линейки, в зачёт лучшая */
TOOLS.attempts = {
  html: (t, s) => {
    const k = t.attempts || 3;
    const rows = roster(s.classId).map(st => {
      const r = getRes(s.id, st.id, t.id), a = r?.attempts || [];
      return `<tr data-sid="${st.id}"><td><b>${esc(who(st))}</b> <span class="muted small">${st.sex}</span></td>
        ${[...Array(k)].map((_, i) => `<td><input inputmode="decimal" data-i="${i}" value="${a[i] != null ? fmt(a[i], t.dec) : ''}" style="width:86px" aria-label="Попытка ${i + 1}"></td>`).join('')}
        <td class="num best"><b>${r ? fmt(r.value, t.dec) : '—'}</b></td><td class="num sc">${r ? scoreBadge(score(t.id, st.id, r.value)) : ''}</td></tr>`;
    }).join('');
    return `<div class="card tool"><p class="small muted" style="margin:0">Введите результаты попыток в ${t.unit}; в зачёт идёт лучшая, балл считается сразу. Enter — к следующему полю.</p>
      <div class="tbl-wrap"><table><thead><tr><th>Ученик</th>${[...Array(k)].map((_, i) => `<th>Попытка ${i + 1}</th>`).join('')}<th class="num">Лучшая</th><th class="num">Балл</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  },
  init(t, s) {
    const tool = $('#tool');
    const onChange = ev => {
      const tr = ev.target.closest('tr[data-sid]');
      if (!tr || ev.target.tagName !== 'INPUT') return;
      const sid = tr.dataset.sid, vals = $$('input', tr).map(i => num(i.value));
      const ok = vals.filter(v => v != null);
      const best = ok.length ? (t.dir === 'higher' ? Math.max(...ok) : Math.min(...ok)) : null;
      setRes(s.id, sid, t.id, best, { source: 'ввод', attempts: vals });
      $('.best', tr).innerHTML = `<b>${fmt(best, t.dec)}</b>`;
      $('.sc', tr).innerHTML = scoreBadge(score(t.id, sid, best));
      $('#tabs').innerHTML = tabsHTML(s);
    };
    const onKey = ev => {
      if (ev.key !== 'Enter' || ev.target.tagName !== 'INPUT') return;
      ev.preventDefault();
      const all = $$('input', tool), i = all.indexOf(ev.target);
      ev.target.dispatchEvent(new Event('change', { bubbles: true }));
      all[i + 1]?.focus();
    };
    tool.addEventListener('change', onChange);
    tool.addEventListener('keydown', onKey);
  },
};

/* В. вертикальный прыжок по видео: h = g·t²/8 по времени полёта (принцип My Jump, [8]) */
TOOLS.video = {
  html: (t, s) => `<div class="card tool"><div class="grid g2">
    <div class="grid">
      <label class="f">Видео прыжка (снимайте сбоку, камера на уровне стоп)<input type="file" accept="video/*" id="v-file"></label>
      <video class="vid" id="v-el" playsinline muted></video>
      <div class="row"><label class="f">Кадров/с в файле<select id="v-fps"><option>30</option><option>60</option><option>120</option><option>240</option></select></label>
        <label class="f">Замедление, ×<input id="v-slow" type="number" min="1" step="1" value="1" style="width:90px"></label></div>
      <div class="row"><button class="btn small" id="v-prev">◀ кадр</button><button class="btn small" id="v-play">▶ / ❚❚</button><button class="btn small" id="v-next">кадр ▶</button></div>
      <div class="row"><button class="btn" id="v-t1">Отметить отрыв</button><button class="btn" id="v-t2">Отметить приземление</button></div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="kpis"><div class="kpi"><span>Отрыв</span><b id="v-a">—</b></div><div class="kpi"><span>Приземление</span><b id="v-b">—</b></div>
        <div class="kpi"><span>Время полёта</span><b id="v-ft">—</b></div><div class="kpi"><span>Высота</span><b id="v-h">—</b></div></div>
      <label class="f">или время полёта вручную, мс<input id="v-ms" inputmode="decimal" placeholder="например 520"></label>
      <div class="chips" id="chips">${chipsHTML(s, t)}</div>
      <button class="btn lime" id="v-save">Сохранить попытку выбранному ученику</button>
      <p class="small muted" id="v-att"></p>
    </div></div>
    <div class="note">Высота считается по времени полёта: <b>h = g·t² / 8</b>. Точность ограничена частотой кадров: при 30 к/с шаг — 33 мс; замедленная съёмка 240 к/с даёт 4 мс. Для замедленного ролика укажите кадры/с файла и во сколько раз он замедлен. В зачёт — лучшая попытка.</div></div>`,
  init(t, s) {
    const v = $('#v-el');
    let a = null, b = null, sel = null, url = null;
    const fps = () => +$('#v-fps').value, slow = () => Math.max(1, num($('#v-slow').value) || 1);
    const flight = () => {
      const ms = num($('#v-ms').value);
      if (ms) return ms / 1000;
      return a != null && b != null && b > a ? (b - a) / slow() : null;
    };
    const upd = () => {
      $('#v-a').textContent = a == null ? '—' : fmt(a, 3) + ' с';
      $('#v-b').textContent = b == null ? '—' : fmt(b, 3) + ' с';
      const f = flight();
      $('#v-ft').textContent = f ? fmt(f * 1000, 0) + ' мс' : '—';
      $('#v-h').textContent = f ? fmt(9.81 * f * f / 8 * 100, 1) + ' см' : '—';
    };
    const showAtt = () => {
      const r = sel && getRes(s.id, sel, t.id);
      $('#v-att').textContent = sel ? `${who(student(sel))}: попытки ${r?.attempts?.map(x => fmt(x, 1)).join(' · ') || 'ещё нет'}` : 'Выберите ученика.';
    };
    $('#tool').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip) { sel = chip.dataset.sid; $$('.chip').forEach(c => c.classList.toggle('sel', c === chip)); return showAtt(); }
      const id = ev.target.id, step = 1 / fps();
      if (id === 'v-prev') { v.pause(); v.currentTime = Math.max(0, v.currentTime - step); }
      if (id === 'v-next') { v.pause(); v.currentTime = Math.min(v.duration || 0, v.currentTime + step); }
      if (id === 'v-play') v.paused ? v.play() : v.pause();
      if (id === 'v-t1') { a = v.currentTime; upd(); }
      if (id === 'v-t2') { b = v.currentTime; upd(); }
      if (id === 'v-save') {
        const f = flight();
        if (!sel) return toast('Выберите ученика');
        if (!f || f > 1.2) return toast('Нет корректного времени полёта');
        const h = +(9.81 * f * f / 8 * 100).toFixed(1);
        const r = getRes(s.id, sel, t.id), att = [...(r?.attempts || []), h];
        setRes(s.id, sel, t.id, Math.max(...att), { source: 'видео', attempts: att });
        refreshChip(s, t, sel); showAtt(); toast(`Попытка: ${fmt(h, 1)} см`);
        a = b = null; $('#v-ms').value = ''; upd();
      }
    });
    $('#tool').addEventListener('input', ev => { if (['v-ms', 'v-slow'].includes(ev.target.id)) upd(); });
    $('#v-file').addEventListener('change', ev => {
      const f = ev.target.files[0];
      if (!f) return;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(f); v.src = url; a = b = null; upd();
    });
    showAtt();
    return () => { if (url) URL.revokeObjectURL(url); };
  },
};

/* А. 6-минутный бег: обратный отсчёт, касание ученика = +1 круг, в конце — добавочные метры */
TOOLS.laps = {
  html: (t, s) => `<div class="card tool">
    <div class="row"><label class="f">Длина круга, м<input id="lp-len" type="number" min="20" step="10" value="200" style="width:110px"></label>
      <label class="f">Длительность, мин<input id="lp-min" type="number" min="1" max="20" value="6" style="width:90px"></label>
      <label class="check small" style="align-self:flex-end"><input type="checkbox" id="lp-fix"> Исправление: касание = −1 круг</label></div>
    <div class="big-display" id="lp-d">6:00</div><div class="sub-display">Касание ученика на линии круга добавляет круг.</div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="lp-start">Старт</button><button class="btn" id="lp-stop" disabled>Стоп</button></div>
    <div class="chips" id="chips">${chipsHTML(s, t, { label: lapLabel(s, t) })}</div>
    <div id="lp-end"></div></div>`,
  init(t, s) {
    let running = false, endAt = 0, iv = 0;
    const len = () => num($('#lp-len').value) || 200, lbl = lapLabel(s, t);
    const put = (sid, laps, extra) => {
      const L = len();
      setRes(s.id, sid, t.id, laps * L + extra, { source: 'круги', meta: { laps, extra, len: L } });
      refreshChip(s, t, sid, lbl);
    };
    const endTable = () => {
      $('#lp-end').innerHTML = `<h3 style="margin-top:14px">Добавочные метры последнего неполного круга</h3><div class="tbl-wrap"><table><thead><tr><th>Ученик</th><th class="num">Круги</th><th>+ метры</th><th class="num">Итого, м</th></tr></thead><tbody>${roster(s.classId).map(st => {
        const r = getRes(s.id, st.id, t.id), m = r?.meta || { laps: 0, extra: 0 };
        return `<tr data-sid="${st.id}"><td>${esc(who(st))}</td><td class="num">${m.laps}</td><td><input data-extra inputmode="numeric" value="${m.extra || ''}" style="width:90px"></td><td class="num tot">${r ? fmt(r.value, 0) : '—'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    };
    const stop = () => { clearInterval(iv); running = false; $('#lp-start').disabled = false; $('#lp-stop').disabled = true; beep(700, 0.8); endTable(); };
    $('#tool').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip) {
        const sid = chip.dataset.sid, m = getRes(s.id, sid, t.id)?.meta || { laps: 0, extra: 0 };
        const laps = Math.max(0, m.laps + ($('#lp-fix').checked ? -1 : 1));
        if (!running && !$('#lp-fix').checked) return toast('Круги считаются после «Старт»');
        put(sid, laps, m.extra || 0); beep(1300, 0.04, null, 0.1);
      }
      if (ev.target.id === 'lp-start') {
        running = true; $('#lp-start').disabled = true; $('#lp-stop').disabled = false; beep(1040, 0.35);
        endAt = performance.now() + (num($('#lp-min').value) || 6) * 60000;
        iv = setInterval(() => {
          const left = Math.max(0, (endAt - performance.now()) / 1000);
          $('#lp-d').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
          if (left <= 0) stop();
        }, 200);
      }
      if (ev.target.id === 'lp-stop') stop();
    });
    $('#tool').addEventListener('change', ev => {
      if (!ev.target.matches('[data-extra]')) return;
      const tr = ev.target.closest('tr'), sid = tr.dataset.sid, m = getRes(s.id, sid, t.id)?.meta || { laps: 0 };
      put(sid, m.laps, num(ev.target.value) || 0);
      $('.tot', tr).textContent = fmt(getRes(s.id, sid, t.id)?.value, 0);
    });
    if (S.results.some(r => r.sessionId === s.id && r.testId === t.id)) endTable();
    return () => clearInterval(iv);
  },
};
function lapLabel(s, t) {
  return (st, r) => (r ? `${r.meta?.laps ?? 0} кр. · ${fmt(r.value, 0)} м` : '0 кр.');
}

/* А. челночный бег 20 м с возрастающей скоростью (Леже): 8,5 км/ч, +0,5 км/ч каждую ступень ≈ 1 мин */
function beepSchedule(levels = 21) {
  const ev = [];
  let time = 0;
  for (let L = 1; L <= levels; L++) {
    const v = 8.5 + 0.5 * (L - 1), st = 20 / (v / 3.6), n = Math.round(60 / st);
    for (let i = 1; i <= n; i++) { time += st; ev.push({ t: time, L, i, n, st, last: i === n }); }
  }
  return ev;
}
TOOLS.beep = {
  html: (t, s) => `<div class="card tool">
    <div class="kpis"><div class="kpi"><span>Ступень</span><b id="bp-l">1</b></div><div class="kpi"><span>Отрезок в ступени</span><b id="bp-i">0</b></div>
      <div class="kpi"><span>Всего отрезков</span><b id="bp-n">0</b></div><div class="kpi"><span>Скорость</span><b id="bp-v">8,5 км/ч</b></div></div>
    <div class="bar"><i id="bp-bar"></i></div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="bp-start">Старт (3-2-1)</button><button class="btn" id="bp-stop" disabled>Стоп</button></div>
    <p class="small muted" style="text-align:center;margin:0">Сигнал — ученик должен быть на линии; тройной сигнал — новая ступень. Коснитесь ученика, когда он выбыл: запишется число пройденных отрезков.</p>
    <div class="chips" id="chips">${chipsHTML(s, t)}</div>
    ${S.settings.sound ? '' : '<div class="note warn">Звук выключен в настройках — для этого теста он обязателен.</div>'}</div>`,
  init(t, s) {
    const EV = beepSchedule();
    let t0 = null, next = 0, iv = 0, raf = 0, running = false;
    const done = () => { if (t0 == null) return 0; const now = ac().currentTime - t0; let k = 0; while (k < EV.length && EV[k].t <= now) k++; return k; };
    const sched = () => {
      const a = ac(), horizon = a.currentTime + 0.2;
      while (next < EV.length && t0 + EV[next].t <= horizon) {
        const e = EV[next], at = t0 + e.t;
        if (e.last) { beep(990, 0.1, at); beep(990, 0.1, at + 0.16); beep(990, 0.1, at + 0.32); } else beep(880, 0.16, at);
        next++;
      }
    };
    const draw = () => {
      const now = ac().currentTime - t0, k = done(), cur = EV[Math.min(k, EV.length - 1)];
      const prevT = k ? EV[k - 1].t : 0;
      $('#bp-l').textContent = now < 0 ? '—' : cur.L;
      $('#bp-i').textContent = now < 0 ? Math.ceil(-now) : `${k ? (EV[k - 1].L === cur.L ? EV[k - 1].i : 0) : 0} / ${cur.n}`;
      $('#bp-n').textContent = k;
      $('#bp-v').textContent = `${fmt(8.5 + 0.5 * (cur.L - 1), 1)} км/ч`;
      $('#bp-bar').style.width = now < 0 ? '0%' : `${clamp((now - prevT) / cur.st, 0, 1) * 100}%`;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => { running = false; clearInterval(iv); cancelAnimationFrame(raf); $('#bp-start').disabled = false; $('#bp-stop').disabled = true; };
    $('#tool').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip) {
        if (!running) return toast('Сначала «Старт»');
        const k = done(), sid = chip.dataset.sid;
        setRes(s.id, sid, t.id, k, { source: 'сигналы Леже', meta: { level: EV[Math.max(0, k - 1)]?.L || 1 } });
        refreshChip(s, t, sid); chip.classList.add('out');
        return;
      }
      if (ev.target.id === 'bp-start') {
        const a = ac(); t0 = a.currentTime + 3.1; next = 0; running = true;
        countdownBeeps(a.currentTime + 0.1);
        $('#bp-start').disabled = true; $('#bp-stop').disabled = false;
        iv = setInterval(sched, 25); raf = requestAnimationFrame(draw);
      }
      if (ev.target.id === 'bp-stop') stop();
    });
    return stop;
  },
};

/* ---------- журнал ---------- */
VIEWS.journal = () => {
  if (!S.classes.length) return `<section class="page wrap"><div class="card empty"><h3>Журнал пуст</h3><p>Создайте класс и проведите тестирование.</p><a class="btn primary" href="#/classes">К классам</a></div></section>`;
  if (!cls(UI.jClass)) UI.jClass = cls(UI.classId)?.id || S.classes[0].id;
  const ss = sessionsOf(UI.jClass).filter(s => s.method === 'app' || S.results.some(r => r.sessionId === s.id));
  if (!ss.find(s => s.id === UI.jSession)) UI.jSession = ss[ss.length - 1]?.id || null;
  const s = session(UI.jSession);
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Журнал</h2><p>Результат вводится один раз — балл 1–10 по нормативам считается автоматически. Нажмите на значение, чтобы исправить: исправления учитываются в эксперименте как ошибки фиксации.</p></div>
      <div class="row"><a class="btn ghost small" href="#/norms">Нормативы</a>${s ? '<button class="btn small" data-act="csv">Экспорт в Excel (CSV)</button>' : ''}</div></div>
    <div class="card row" style="margin-bottom:16px">
      <label class="f">Класс<select data-act="j-class">${S.classes.map(c => `<option value="${c.id}" ${c.id === UI.jClass ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f">Тестирование<select data-act="j-session">${ss.map(x => `<option value="${x.id}" ${x.id === UI.jSession ? 'selected' : ''}>${fmtDate(x.date)} · ${esc(x.label)}${x.method === 'manual' ? ' (вручную)' : ''}${x.endedAt || x.method === 'manual' ? '' : ' · идёт'}</option>`).join('')}</select></label>
      ${s ? sessionKpis(s) : ''}
    </div>
    ${s ? journalTable(s) : '<div class="card empty"><h3>Тестирований пока нет</h3><a class="btn primary" href="#/test">Провести тестирование</a></div>'}
  </section>`;
};
function sessionKpis(s) {
  const m = sessionStats(s);
  return `<div class="kpis" style="flex:1;min-width:280px">
    <div class="kpi"><span>Длительность</span><b>${m.minutes != null ? fmt(m.minutes, 0) + ' мин' : 'идёт'}</b></div>
    <div class="kpi"><span>Записей</span><b>${m.records}</b></div>
    <div class="kpi"><span>Исправлений</span><b>${m.errors ?? 0}</b></div></div>`;
}
function journalTable(s) {
  const tests = TESTS.filter(t => (s.tests || []).includes(t.id) || S.results.some(r => r.sessionId === s.id && r.testId === t.id));
  const rs = roster(s.classId);
  const body = rs.map(st => `<tr><td><b>${esc(who(st))}</b></td><td>${st.sex}</td>${tests.map(t => {
    const r = getRes(s.id, st.id, t.id);
    return `<td class="num"><span class="cell" data-act="edit" data-sid="${st.id}" data-tid="${t.id}" title="Источник: ${esc(r?.source || '—')}">${r ? fmt(r.value, t.dec) : '—'} ${r ? scoreBadge(score(t.id, st.id, r.value)) : ''}</span></td>`;
  }).join('')}<td class="num">${(() => { const sc = tests.map(t => { const r = getRes(s.id, st.id, t.id); return r ? score(t.id, st.id, r.value) : null; }).filter(x => x != null); return sc.length ? `<b>${fmt(Stat.mean(sc), 1)}</b>` : '—'; })()}</td></tr>`).join('');
  const foot = tests.map(t => {
    const v = rs.map(st => getRes(s.id, st.id, t.id)?.value).filter(x => x != null);
    return `<td class="num">${v.length ? fmt(Stat.mean(v), t.dec) : '—'}</td>`;
  }).join('');
  return `<div class="tbl-wrap"><table><thead><tr><th>Ученик</th><th>Пол</th>${tests.map(t => `<th class="num">${esc(t.name)}<br><span style="font-weight:400">${t.unit}</span></th>`).join('')}<th class="num">Средний балл</th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><td colspan="2">Среднее по классу</td>${foot}<td></td></tr></tfoot></table></div>`;
}
function exportCSV(s) {
  const c = cls(s.classId);
  const tests = TESTS.filter(t => (s.tests || []).includes(t.id) || S.results.some(r => r.sessionId === s.id && r.testId === t.id));
  const head = ['Код', 'Пол', ...(S.settings.showNames ? ['ФИО'] : []), ...tests.flatMap(t => [`${t.name}, ${t.unit}`, 'Балл'])];
  const lines = roster(s.classId).map(st => [st.code, st.sex, ...(S.settings.showNames ? [st.name] : []), ...tests.flatMap(t => {
    const r = getRes(s.id, st.id, t.id);
    return r ? [fmt(r.value, t.dec), score(t.id, st.id, r.value) ?? ''] : ['', ''];
  })]);
  const csv = '﻿' + [head, ...lines].map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(`${c.name}_${s.date}_${s.label}.csv`, csv, 'text/csv;charset=utf-8');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- нормативы ---------- */
VIEWS.norms = () => {
  const t = T[UI.aTest] || TESTS[0];
  const rows = GRADES.map(g => `<tr><td><b>${g} класс</b></td>${['М', 'Ж'].map(sex => normFor(t.id, sex, g).map((v, k) => `<td><input inputmode="decimal" data-norm="${sex}|${g}|${k}" value="${fmt(v, t.dec)}" style="width:90px"></td>`).join('')).join('')}</tr>`).join('');
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Нормативы</h2><p>Для каждого теста задаются результаты, которые соответствуют 10 и 1 баллу; между ними балл считается линейно (шкала 1–10 по Типовым правилам [3]).</p></div><a class="btn ghost small" href="#/journal">← Журнал</a></div>
    <div class="note warn" style="margin-bottom:16px">Значения по умолчанию — <b>ориентировочные, для демонстрации</b>. Перед использованием замените их нормативами типовой учебной программы по физической культуре для соответствующего класса [2].</div>
    <div class="card"><div class="row" style="margin-bottom:12px"><label class="f">Тест<select data-act="norm-test">${TESTS.map(x => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.name)} (${x.unit})</option>`).join('')}</select></label>
      <button class="btn small ghost" data-act="norm-reset" style="align-self:flex-end">Сбросить тест к ориентировочным</button></div>
    <div class="tbl-wrap"><table><thead><tr><th></th><th>Юноши: 10 баллов</th><th>Юноши: 1 балл</th><th>Девушки: 10 баллов</th><th>Девушки: 1 балл</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted" style="margin:10px 0 0">${t.dir === 'lower' ? 'Меньше — лучше (время).' : 'Больше — лучше.'} Для 1–4 классов применяется строка 5 класса.</p></div>
  </section>`;
};

/* ---------- аналитика ---------- */
const PALETTE = ['#ff5a1f', '#2f6fde', '#1d9a55', '#9b51e0', '#d68a00', '#0f9fb0', '#d23f3f', '#5b6b2f', '#8a5a44'];
VIEWS.analytics = () => {
  if (!S.classes.length) return `<section class="page wrap"><div class="card empty"><h3>Нет данных</h3><a class="btn primary" href="#/classes">К классам</a></div></section>`;
  if (!cls(UI.aClass)) UI.aClass = S.classes[0].id;
  const c = cls(UI.aClass), t = T[UI.aTest] || TESTS[0], rs = roster(c.id);
  if (!rs.find(x => x.id === UI.aStudent)) UI.aStudent = rs[0]?.id || null;
  const ss = sessionsOf(c.id).filter(s => S.results.some(r => r.sessionId === s.id && r.testId === t.id));
  const rows = ss.map(s => {
    const v = S.results.filter(r => r.sessionId === s.id && r.testId === t.id && student(r.studentId)?.classId === c.id);
    const vals = v.map(r => r.value), sc = v.map(r => score(t.id, r.studentId, r.value)).filter(x => x != null);
    return { s, n: vals.length, m: vals.length ? Stat.mean(vals) : null, sd: Stat.sd(vals), sc: sc.length ? Stat.mean(sc) : null, scores: sc };
  });
  const last = rows[rows.length - 1];
  const hist = Array(10).fill(0);
  (last?.scores || []).forEach(x => hist[x - 1]++);
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Аналитика</h2><p>Результат интерпретируется двояко: относительно нормативов и относительно собственных прошлых показателей ученика (индивидуальный мониторинг, [4]).</p></div></div>
    <div class="card row" style="margin-bottom:16px">
      <label class="f">Класс<select data-act="a-class">${S.classes.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <label class="f">Тест<select data-act="a-test">${TESTS.map(x => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>
    <div class="grid g2">
      <div class="card"><h3>Класс по тестированиям</h3>
        ${rows.length ? lineChart(rows.map(r => fmtDate(r.s.date)), [{ name: 'Среднее', color: '#ff5a1f', pts: rows.map(r => r.m) }], { dec: t.dec, unit: t.unit }) : '<p class="muted">По этому тесту результатов нет.</p>'}
        ${rows.length ? `<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Тестирование</th><th class="num">n</th><th class="num">M ± SD, ${t.unit}</th><th class="num">Средний балл</th></tr></thead><tbody>${rows.map(r => `<tr><td>${fmtDate(r.s.date)} · ${esc(r.s.label)}</td><td class="num">${r.n}</td><td class="num">${fmt(r.m, t.dec)} ± ${fmt(r.sd, t.dec)}</td><td class="num">${fmt(r.sc, 1)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </div>
      <div class="card"><h3>Распределение баллов${last ? ` · ${fmtDate(last.s.date)}` : ''}</h3>
        ${last ? barChart(hist, hist.map((_, i) => String(i + 1)), hist.map((_, i) => scoreColor(i + 1))) : '<p class="muted">Нет данных.</p>'}
        ${last ? `<p class="small muted">Ниже 4 баллов: <b>${hist.slice(0, 3).reduce((a, b) => a + b, 0)}</b> ${plural(hist.slice(0, 3).reduce((a, b) => a + b, 0), 'ученик', 'ученика', 'учеников')} — им нужна индивидуальная работа над качеством «${esc(t.quality.toLowerCase())}».</p>` : ''}
      </div>
    </div>
    <div class="print-only-card">${studentCard(c, rs)}</div>
  </section>`;
};
function studentCard(c, rs) {
  const st = student(UI.aStudent);
  if (!st) return '';
  const ss = sessionsOf(c.id).filter(s => S.results.some(r => r.sessionId === s.id && r.studentId === st.id));
  const lines = TESTS.map(t => {
    const pts = ss.map(s => getRes(s.id, st.id, t.id)?.value ?? null);
    const have = pts.filter(v => v != null);
    if (!have.length) return null;
    const lastV = have[have.length - 1], prevV = have.length > 1 ? have[have.length - 2] : null;
    const better = prevV == null ? null : (t.dir === 'higher' ? lastV > prevV : lastV < prevV);
    const delta = prevV == null ? '' : `<span class="${better ? 'up' : lastV === prevV ? '' : 'down'}">${lastV - prevV > 0 ? '+' : ''}${fmt(lastV - prevV, t.dec)}</span>`;
    return { t, pts, lastV, delta, better, sc: score(t.id, st.id, lastV) };
  }).filter(Boolean);
  const weak = lines.filter(l => l.sc != null).sort((a, b) => a.sc - b.sc)[0];
  const grow = lines.filter(l => l.better).length;
  return `<div class="card printable" style="margin-top:16px">
    <div class="page-head" style="margin-bottom:12px"><div><h3 style="margin:0">Карточка ученика</h3><p class="small">Обратная связь: результат, балл и изменение с прошлого тестирования.</p></div>
      <div class="row no-print"><select data-act="a-student">${rs.map(x => `<option value="${x.id}" ${x.id === st.id ? 'selected' : ''}>${esc(who(x))}</option>`).join('')}</select><button class="btn small" data-act="print">Печать</button></div></div>
    <h2 style="font-size:26px">${esc(who(st))} <span class="muted small" style="font-family:var(--font)">${st.sex === 'М' ? 'юноша' : 'девушка'} · ${esc(c.name)}</span></h2>
    ${lines.length ? `<div class="tbl-wrap"><table><thead><tr><th>Тест</th><th class="num">Результат</th><th class="num">Изменение</th><th class="num">Балл</th><th style="width:38%">Динамика</th></tr></thead><tbody>${lines.map((l, i) => `<tr><td>${esc(l.t.name)}</td><td class="num"><b>${fmt(l.lastV, l.t.dec)}</b> ${l.t.unit}</td><td class="num">${l.delta || '—'}</td><td class="num">${scoreBadge(l.sc)}</td><td>${spark(l.pts, PALETTE[i % PALETTE.length])}</td></tr>`).join('')}</tbody></table></div>
      <p style="margin-top:14px">${grow ? `Улучшено показателей: <b>${grow}</b> из ${lines.filter(l => l.better != null).length}. ` : ''}${weak && weak.sc < 7 ? `Главный резерв — <b>${esc(weak.t.quality.toLowerCase())}</b> (${esc(weak.t.name)}, ${weak.sc} б.).` : 'Все показатели на хорошем уровне — держите темп.'}</p>`
      : '<p class="muted">У ученика пока нет результатов.</p>'}
  </div>`;
}
function spark(pts, color) {
  const v = pts.filter(x => x != null);
  if (v.length < 2) return '<span class="muted small">одно измерение</span>';
  const W = 200, H = 34, lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
  const p = v.map((x, i) => `${(i * (W - 8) / (v.length - 1) + 4).toFixed(1)},${(H - 4 - (x - lo) / r * (H - 8)).toFixed(1)}`);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="max-width:200px"><path class="draw" pathLength="1" d="M${p.join('L')}" fill="none" stroke="${color}" stroke-width="2.5"/>${p.map(q => `<circle cx="${q.split(',')[0]}" cy="${q.split(',')[1]}" r="3" fill="${color}"/>`).join('')}</svg>`;
}

/* ---------- эксперимент ---------- */
const SURVEY = [
  'Мне интересно выполнять контрольные нормативы',
  'Я понимаю, как получен мой результат и балл',
  'Мне важно видеть, как меняются мои результаты',
  'Тестирование проходит быстро, без долгого ожидания',
  'Я хочу улучшить свои результаты к следующему тестированию',
];
const pStr = p => (p < 0.001 ? 'p < 0,001' : `p = ${fmt(p, 3)}`);
const sig = p => (p < 0.05 ? '<span class="up">различие статистически значимо (p < 0,05)</span>' : '<span class="muted">различие статистически не значимо</span>');
VIEWS.experiment = () => {
  const rows = S.sessions.map(s => ({ s, m: sessionStats(s) })).filter(x => x.m.minutes != null)
    .sort((a, b) => (a.s.date || '').localeCompare(b.s.date || ''));
  const grp = k => rows.filter(x => x.s.method === k && x.m.perUnit != null && x.m.minutes >= 1);   // короче минуты — прерванный запуск
  const A = grp('app'), M = grp('manual');
  let cmp = '<p class="muted small">Для сравнения нужно хотя бы по два тестирования каждого типа.</p>';
  if (A.length >= 2 && M.length >= 2) {
    const w = Stat.welch(A.map(x => x.m.perUnit), M.map(x => x.m.perUnit));
    const we = Stat.welch(A.map(x => x.m.errPer100), M.map(x => x.m.errPer100));
    cmp = `<p>Время на ученика·тест: <b>${fmt(w.ma, 2)}</b> мин с приложением против <b>${fmt(w.mb, 2)}</b> вручную (${w.ma < w.mb ? '−' : '+'}${fmt(Math.abs(1 - w.ma / w.mb) * 100, 0)} %). t = ${fmt(w.t, 2)}, ${pStr(w.p)}, d Коэна = ${fmt(w.d, 2)} — ${sig(w.p)}.</p>
      <p>Ошибки на 100 записей: <b>${fmt(we.ma, 1)}</b> против <b>${fmt(we.mb, 1)}</b>; ${pStr(we.p)} — ${sig(we.p)}.</p>`;
  }
  return `<section class="page wrap">
    <div class="page-head"><div><h2>Экспериментальная проверка</h2><p>Три проверяемых утверждения гипотезы: тестирование занимает меньше времени, результаты фиксируются точнее, интерес учащихся растёт. Классы распределяются в ЭГ и КГ в разделе «Классы».</p></div></div>

    <div class="card"><h3>1. Затраты времени и ошибки фиксации</h3>
      <p class="small muted">Тестирования с приложением засекаются автоматически, исправления в журнале считаются ошибками фиксации. Ручные (традиционные) тестирования внесите вручную: длительность урока(ов) на тестирование и обработку, число учеников и тестов, ошибки, найденные при перепроверке.</p>
      <form class="row" data-form="manual-session" style="margin-bottom:14px">
        <label class="f">Класс<select name="classId">${S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
        <label class="f">Дата<input type="date" name="date" value="${today()}"></label>
        <label class="f">Минут всего<input name="min" type="number" min="1" required style="width:100px"></label>
        <label class="f">Учеников<input name="n" type="number" min="1" required style="width:90px"></label>
        <label class="f">Тестов<input name="k" type="number" min="1" required style="width:80px"></label>
        <label class="f">Ошибок<input name="e" type="number" min="0" value="0" style="width:80px"></label>
        <button class="btn primary" style="align-self:flex-end" ${S.classes.length ? '' : 'disabled'}>Добавить ручное тестирование</button></form>
      ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Дата</th><th>Класс</th><th>Способ</th><th class="num">Минут</th><th class="num">Учеников × тестов</th><th class="num">Мин на ученика·тест</th><th class="num">Ошибок на 100</th><th></th></tr></thead><tbody>${rows.map(({ s, m }) => `<tr><td>${fmtDate(s.date)}</td><td>${esc(cls(s.classId)?.name)} ${cls(s.classId)?.role && cls(s.classId).role !== '—' ? `<span class="tag ${cls(s.classId).role === 'ЭГ' ? 'eg' : 'kg'}">${cls(s.classId).role}</span>` : ''}</td><td>${s.method === 'app' ? 'приложение' : 'вручную'}</td><td class="num">${fmt(m.minutes, 0)}</td><td class="num">${m.nStudents} × ${m.nTests}</td><td class="num">${fmt(m.perUnit, 2)}</td><td class="num">${fmt(m.errPer100, 1)}</td><td>${s.method === 'manual' ? `<button class="btn small ghost" data-act="del-session" data-id="${s.id}">✕</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Записей пока нет.</p>'}
      <div style="margin-top:12px">${cmp}</div></div>

    <div class="card"><h3>2. Точность приложения (до внедрения)</h3>
      <p class="small muted">Вставьте пары измерений одних и тех же попыток: «приложение; эталон» (ручной секундомер опытного судьи, рулетка, электронная система) или «тест; ретест». По строке на пару.</p>
      <div class="grid g2"><div><textarea id="acc-in" placeholder="5,21; 5,30&#10;5,64; 5,58&#10;4,98; 5,05"></textarea>
        <div class="row" style="margin-top:10px"><button class="btn primary" data-act="acc">Рассчитать</button><button class="btn ghost small" data-act="acc-demo">Пример</button></div></div>
        <div id="acc-out"><p class="muted small">ICC(2,1) — согласованность (абсолютное согласие): ниже 0,50 — слабая, 0,50–0,75 — умеренная, 0,75–0,90 — хорошая, выше 0,90 — отличная [7]. Также считаются r Пирсона, систематическая разница и границы согласия Блэнда–Альтмана.</p></div></div></div>

    <div class="card"><h3>3. Интерес обучающихся</h3>
      <p class="small muted">Анкета проводится до и после эксперимента в обеих группах — так виден эффект, а не новизна гаджета. Ответы: 1 — совсем не согласен … 5 — полностью согласен.</p>
      ${surveyForm()}
      <div id="sv-sum" style="margin-top:16px">${surveySummary()}</div></div>

    <div class="card"><h3>4. Сравнение двух выборок</h3>
      <p class="small muted">Любой показатель: результаты ЭГ и КГ после эксперимента, баллы до и после. Числа через пробел, точку с запятой или с новой строки; дробная часть — через запятую или точку.</p>
      <div class="grid g2"><label class="f">Выборка 1<textarea id="w-a" style="min-height:80px"></textarea></label><label class="f">Выборка 2<textarea id="w-b" style="min-height:80px"></textarea></label></div>
      <div class="row" style="margin-top:10px"><button class="btn primary" data-act="welch">t-критерий Уэлча</button><label class="check small"><input type="checkbox" id="w-paired"> Парные (одни и те же ученики)</label></div>
      <div id="w-out" style="margin-top:10px"></div></div>
  </section>`;
};
function surveyForm() {
  if (!S.classes.length) return '<p class="muted">Сначала создайте классы.</p>';
  const c = cls(UI.classId) || S.classes[0];
  return `<form class="grid" data-form="survey">
    <div class="row"><label class="f">Класс<select name="classId" data-act="sv-class">${S.classes.map(k => `<option value="${k.id}" ${k.id === c.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <label class="f">Ученик<select name="studentId">${roster(c.id, true).map(st => `<option value="${st.id}">${esc(who(st))}</option>`).join('')}</select></label>
      <label class="f">Этап<select name="phase"><option>до</option><option>после</option></select></label></div>
    <div class="likert">${SURVEY.map((q, i) => `<div class="q"><span>${i + 1}. ${esc(q)}</span><div class="opts">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="q${i}" value="${v}" required><span>${v}</span></label>`).join('')}</div></div>`).join('')}</div>
    <div class="row end"><button class="btn primary">Сохранить анкету</button></div></form>`;
}
function surveySummary() {
  if (!S.survey.length) return '<p class="muted small">Анкет пока нет.</p>';
  const roleOf = r => cls(r.classId)?.role || '—';
  const pick = (role, ph) => S.survey.filter(r => roleOf(r) === role && r.phase === ph).map(r => Stat.mean(r.answers));
  const cells = ['ЭГ', 'КГ', '—'].flatMap(role => ['до', 'после'].map(ph => ({ role, ph, v: pick(role, ph) }))).filter(x => x.v.length);
  let tests = '';
  const egPre = pick('ЭГ', 'до'), egPost = pick('ЭГ', 'после'), kgPost = pick('КГ', 'после');
  if (egPre.length >= 2 && egPost.length >= 2) { const w = Stat.welch(egPost, egPre); tests += `<p>ЭГ, после vs до: ${fmt(w.ma, 2)} vs ${fmt(w.mb, 2)}, t = ${fmt(w.t, 2)}, ${pStr(w.p)} — ${sig(w.p)}.</p>`; }
  if (egPost.length >= 2 && kgPost.length >= 2) { const w = Stat.welch(egPost, kgPost); tests += `<p>После эксперимента, ЭГ vs КГ: ${fmt(w.ma, 2)} vs ${fmt(w.mb, 2)}, t = ${fmt(w.t, 2)}, ${pStr(w.p)} — ${sig(w.p)}.</p>`; }
  const items = SURVEY.map((q, i) => ['до', 'после'].map(ph => { const a = S.survey.filter(r => roleOf(r) === 'ЭГ' && r.phase === ph).map(r => r.answers[i]); return a.length ? Stat.mean(a) : null; }));
  return `<div class="kpis">${cells.map(x => `<div class="kpi"><span>${x.role === '—' ? 'Без группы' : x.role} · ${x.ph} · n=${x.v.length}</span><b>${fmt(Stat.mean(x.v), 2)}</b></div>`).join('')}</div>
    ${tests}
    ${items.some(x => x[0] != null && x[1] != null) ? `<h3 style="margin-top:14px">ЭГ по пунктам анкеты</h3>${lineChart(SURVEY.map((_, i) => `П${i + 1}`), [{ name: 'до', color: '#9aa08f', pts: items.map(x => x[0]) }, { name: 'после', color: '#ff5a1f', pts: items.map(x => x[1]) }], { dec: 1 })}` : ''}`;
}
function parseNums(s) { return String(s).split(/[\s;]+/).map(x => num(x)).filter(x => x != null); }
function accuracy(text) {
  const pairs = text.split(/\n/).map(l => l.split(/[;\t]|\s{2,}|(?<=\d)\s+(?=[\d-])/).map(num)).filter(p => p.length >= 2 && p[0] != null && p[1] != null);
  if (pairs.length < 3) return '<p class="down">Нужно минимум 3 пары значений.</p>';
  const a = pairs.map(p => p[0]), b = pairs.map(p => p[1]);
  const icc = Stat.icc21(a, b), r = Stat.pearson(a, b), pt = Stat.paired(a, b);
  const lo = pt.md - 1.96 * pt.sd, hi = pt.md + 1.96 * pt.sd;
  const te = pt.sd / Math.SQRT2, cv = te / Stat.mean([...a, ...b]) * 100;
  const lvl = icc < 0.5 ? ['слабая', 'down'] : icc < 0.75 ? ['умеренная', ''] : icc < 0.9 ? ['хорошая', 'up'] : ['отличная', 'up'];
  const W = 420, H = 220, P = 34;
  const mx = a.map((x, i) => (x + b[i]) / 2), dx = a.map((x, i) => x - b[i]);
  const x0 = Math.min(...mx), x1 = Math.max(...mx), y0 = Math.min(lo, ...dx), y1 = Math.max(hi, ...dx);
  const X = v => P + (v - x0) / ((x1 - x0) || 1) * (W - 2 * P), Y = v => H - P - (v - y0) / ((y1 - y0) || 1) * (H - 2 * P);
  const hl = (v, c, lab) => `<line x1="${P}" x2="${W - P}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-dasharray="5 4"/><text x="${W - P}" y="${Y(v) - 4}" text-anchor="end">${lab} ${fmt(v, 3)}</text>`;
  const ba = `<svg class="chart" viewBox="0 0 ${W} ${H}">${hl(hi, '#d23f3f', '+1,96SD')}${hl(pt.md, '#11160f', 'среднее')}${hl(lo, '#d23f3f', '−1,96SD')}${mx.map((m, i) => `<circle cx="${X(m)}" cy="${Y(dx[i])}" r="4.5" fill="#ff5a1f" opacity=".85"/>`).join('')}<text x="${W / 2}" y="${H - 8}" text-anchor="middle">среднее двух измерений</text></svg>`;
  return `<div class="kpis"><div class="kpi"><span>ICC(2,1)</span><b class="${lvl[1]}">${fmt(icc, 3)}</b></div><div class="kpi"><span>r Пирсона</span><b>${fmt(r, 3)}</b></div>
    <div class="kpi"><span>Разница (сист.)</span><b>${fmt(pt.md, 3)}</b></div><div class="kpi"><span>CV, %</span><b>${fmt(cv, 1)}</b></div></div>
    <p style="margin-top:10px">Согласованность <b class="${lvl[1]}">${lvl[0]}</b> (n = ${pairs.length}). Границы согласия: от ${fmt(lo, 3)} до ${fmt(hi, 3)}. Систематическое смещение: ${pStr(pt.p)} — ${pt.p < 0.05 ? '<span class="down">есть, нужна поправка или другой способ замера</span>' : '<span class="up">не выявлено</span>'}.</p>
    <h3 style="margin-top:8px">График Блэнда–Альтмана</h3>${ba}`;
}

/* ---------- методика ---------- */
const CLASSES_AZ = [
  ['А', 'Хронометраж', 'Секундомеры, таймеры, звуковой старт и сигналы.', 'Бег, челночный бег, 6-минутный бег', 'Тестирование → секундомер, таймер кругов, сигналы Леже'],
  ['Б', 'Счётчики повторений', 'Ручной счётчик или подсчёт по датчикам и видео.', 'Подтягивание, поднимание туловища', 'Тестирование → счётчик с таймером'],
  ['В', 'Измерение по видео и датчикам', 'Расчёт по замедленной съёмке или акселерометру.', 'Прыжки', 'Тестирование → прыжок по времени полёта'],
  ['Г', 'Пульсометрия, носимые устройства', 'Регистрация ЧСС и нагрузки.', 'Контроль нагрузки, тест Купера', 'Внешний браслет; результаты — ручным вводом в журнал'],
  ['Д', 'Журналы и базы данных', 'Ввод, хранение, экспорт, списки класса.', 'Любые', 'Классы, журнал, экспорт CSV, резервная копия'],
  ['Е', 'Обработка и визуализация', 'Баллы, средние, динамика, графики.', 'Любые', 'Нормативы, аналитика, карточка ученика'],
  ['Ж', 'Приложения для учащихся', 'Самоконтроль и мотивация, не оценивание.', 'Подготовка', 'Карточка ученика как обратная связь'],
];
const CRITERIA = [
  ['Соответствие тесту', 'Измеряет именно тот показатель, который регистрируется в тесте', true],
  ['Допуск несовершеннолетних, бесплатность', 'Нет возрастных ограничений, обязательной регистрации учеников и платных функций', false],
  ['Отсутствие рекламы', 'Нет рекламных блоков, отвлекающих учеников', false],
  ['Защита данных', 'Понятно, что и где хранится; можно работать с кодами вместо ФИО', true],
  ['Экспорт данных', 'Выгрузка результатов в табличный формат', false],
  ['Автономная работа', 'Работает без подключения к интернету', false],
  ['Подтверждённая точность', 'Есть исследования валидности или результаты собственной проверки', true],
  ['Простота освоения', 'Понятный интерфейс, освоение за короткое время', false],
  ['Рейтинг и число оценок', 'Не ниже 4 при 100+ оценках — только предварительный фильтр', false],
];
VIEWS.method = args => `<section class="page wrap">
  <div class="page-head"><div><h2>Методика</h2><p>Приложение — не самостоятельное средство повышения качества контроля, а инструмент, эффективность которого определяется методикой: подбором приложения под тест, проверкой точности, стандартизацией процедуры и защитой данных.</p></div></div>

  <h3>Алгоритм работы учителя</h3>
  <ol class="steps" style="margin-bottom:28px">
    <li><b>Отбор</b><p class="small muted">Приложение подбирается под тест и учебную цель по 9 критериям (ниже).</p></li>
    <li><b>Проверка точности</b><p class="small muted">Пилотная группа: показания против эталона и ретест; ICC ≥ 0,75 — можно применять.</p></li>
    <li><b>Стандартизация</b><p class="small muted">Одно устройство и версия, фиксированное положение камеры, единые настройки, письменный протокол.</p></li>
    <li><b>Проведение</b><p class="small muted">Учитель — техника и безопасность; измерение — устройство или обученный помощник. Есть бумажный резерв.</p></li>
    <li><b>Обработка и связь</b><p class="small muted">Автоматические баллы, сводка, экспорт в журнал через разрешённые школой каналы, карточки учеников.</p></li>
  </ol>

  <h3>Классификация приложений по функции</h3>
  <div class="grid g4" style="margin-bottom:28px">${CLASSES_AZ.map(c => `<div class="card cls-card"><span class="letter">${c[0]}</span><h3>${esc(c[1])}</h3><p class="small">${esc(c[2])}</p><p class="small muted">Тесты: ${esc(c[3])}</p><p class="small"><b>В «Нормативе»:</b> ${esc(c[4])}</p></div>`).join('')}</div>

  <div class="grid g2" style="margin-bottom:28px">
    <div class="card"><h3>Оценка приложения перед уроком</h3>
      <form class="grid" data-form="app-eval">
        <label class="f">Название приложения<input name="name" required placeholder="например, секундомер на смартфоне"></label>
        ${CRITERIA.map((c, i) => `<label class="check"><input type="checkbox" name="c${i}"><span><b>${esc(c[0])}</b>${c[2] ? ' <span class="tag eg">обязательно</span>' : ''}<br><span class="small muted">${esc(c[1])}</span></span></label>`).join('')}
        <div class="row" style="justify-content:space-between"><span class="verdict" id="ae-v">0 / 9</span><button class="btn primary">Сохранить оценку</button></div>
      </form></div>
    <div class="card"><h3>Оценённые приложения</h3>${S.apps.length ? `<div class="tbl-wrap"><table><thead><tr><th>Приложение</th><th class="num">Баллы</th><th>Вывод</th><th></th></tr></thead><tbody>${S.apps.map(a => `<tr><td>${esc(a.name)}</td><td class="num">${a.score} / 9</td><td>${a.ok ? '<span class="up">допустимо</span>' : '<span class="down">не применять для оценивания</span>'}</td><td><button class="btn small ghost" data-act="del-app" data-id="${a.id}">✕</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Пока ничего не оценено. Обязательные критерии — соответствие тесту, защита данных и подтверждённая точность: без них результат приложения нельзя использовать для выставления оценки.</p>'}
      <p class="small muted" style="margin-top:12px">Рейтинг в магазине — лишь первичный фильтр и не свидетельствует о точности измерений.</p></div>
  </div>

  <h3>Метрологические требования — и к тесту, и к приложению</h3>
  ${[['Надёжность', 'Воспроизводимость при повторном измерении. Проверка: тест — ретест, ICC, коэффициент вариации. Проверять нужно и тест, и приложение.'],
     ['Информативность (валидность)', 'Тест измеряет нужное качество. Показания приложения сравнивают с эталонным прибором до внедрения.'],
     ['Объективность', 'Независимость от экспериментатора. Автоматизация снижает влияние реакции оператора, но не трактовку техники.'],
     ['Стандартность', 'Единые условия: одно устройство и версия приложения, фиксированная камера, письменный протокол.'],
     ['Нормируемость', 'Наличие шкал оценки: автоматический перевод результата в баллы по таблице норм.']]
    .map(([h, p]) => `<details class="acc"><summary>${h}</summary><div class="in"><p>${p}</p></div></details>`).join('')}

  <h3 style="margin-top:28px">Нормативная база (Республика Казахстан)</h3>
  <div class="tbl-wrap" style="margin-bottom:28px"><table><thead><tr><th>Документ</th><th>Значение для методики</th></tr></thead><tbody>
    <tr><td>Приказ МП РК от 03.08.2022 № 348 (ГОСО) [1]</td><td>Функциональная и цифровая грамотность; приложения допустимы как средство, но не заменяют требований к предмету.</td></tr>
    <tr><td>Приказ МП РК от 16.09.2022 № 399 (типовые учебные программы) [2]</td><td>Какие тесты и нормативы закладываются в приложение.</td></tr>
    <tr><td>Приказ МОН РК от 18.03.2008 № 125 (Типовые правила) [3]</td><td>Оценивание 1–10 баллов и фиксация в журнале — основание для автоматического пересчёта.</td></tr>
    <tr><td>Ланда Б. Х., 2011 [4]</td><td>Хранение истории результатов и анализ динамики.</td></tr>
    <tr><td>Законодательство РК о персональных данных</td><td>Обезличивание (коды), согласие законных представителей, без передачи в сторонние облака.</td></tr></tbody></table></div>

  <div class="card" id="recs"><h3>Методические рекомендации учителю</h3>
    <ol>
      <li>Начинайте с тестов с документированной надёжностью: прыжок в длину с места, челночный бег 4×10 м, челночный бег 20 м [6].</li>
      <li>До первого урока проверьте устройство на 10–15 учениках: два способа замера одних и тех же попыток → раздел «Эксперимент», ICC не ниже 0,75.</li>
      <li>Используйте звуковой старт из приложения: так исчезает ошибка реакции на старте; на финише отмечайте учеников касанием.</li>
      <li>Сохраняйте порядок: быстрота и координация → сила и скоростно-силовые → выносливость, с отдыхом между попытками.</li>
      <li>Распределите роли: вы следите за техникой и безопасностью, устройство (или обученный помощник) — за измерением.</li>
      <li>Заводите учеников по кодам; ФИО храните только на школьном устройстве, в журнал переносите через разрешённый школой канал.</li>
      <li>Держите бумажный протокол на случай разряда или отказа техники.</li>
      <li>Сразу после урока экспортируйте результаты и сделайте резервную копию в «Данных».</li>
      <li>Показывайте ученикам карточку с динамикой: прогресс относительно себя мотивирует сильнее таблицы норм.</li>
      <li>Мотивацию измеряйте анкетой до и после, а не однократно: интерес к гаджетам может быть эффектом новизны [7].</li>
    </ol></div>

  <details class="acc" style="margin-top:16px"><summary>Источники</summary><div class="in small"><ol>
    <li>Приказ Министра просвещения РК от 3 августа 2022 г. № 348 (ГОСО). adilet.zan.kz/rus/docs/V2200029031</li>
    <li>Приказ Министра просвещения РК от 16 сентября 2022 г. № 399 (типовые учебные программы).</li>
    <li>Приказ Министра образования и науки РК от 18 марта 2008 г. № 125 (Типовые правила текущего контроля и аттестации).</li>
    <li>Ланда Б. Х. Методика комплексной оценки физического развития и физической подготовленности. М.: Советский спорт, 2011.</li>
    <li>Castro-Piñero J. et al. Criterion-related validity of field-based fitness tests in youth // BJSM. 2010. 44(13). DOI 10.1136/bjsm.2009.058321</li>
    <li>Artero E. G. et al. Reliability of field-based fitness tests in youth // IJSM. 2011. 32(3). DOI 10.1055/s-0030-1268488</li>
    <li>Gil-Espinosa F. J. et al. Smartphone applications for physical activity promotion from physical education // EAIT. 2022. 27. DOI 10.1007/s10639-022-11108-2</li>
    <li>Balsalobre-Fernández C., Glaister M., Lockey R. A. The validity and reliability of an iPhone app for measuring vertical jump performance // J Sports Sci. 2015. 33(15). DOI 10.1080/02640414.2014.996184</li>
    <li>Клейменова М. Д. и др. Оптимизация оперативного контроля в физическом воспитании… // Человек. Спорт. Медицина. 2025. 25(2). DOI 10.14529/hsm250212</li>
    <li>Papastergiou M. et al. Introducing tablets and a mobile fitness application into primary school physical education // EAIT. 2021. 26(1). DOI 10.1007/s10639-020-10289-y</li>
  </ol></div></details>
</section>`;
AFTER.method = args => { if (args[0] === 'recs') setTimeout(() => $('#recs')?.scrollIntoView({ behavior: 'smooth' }), 80); };

/* ---------- данные ---------- */
VIEWS.data = () => `<section class="page wrap">
  <div class="page-head"><div><h2>Данные и настройки</h2><p>Всё хранится в памяти этого браузера (localStorage). Чтобы перенести данные на другое устройство или не потерять их, сохраните резервную копию.</p></div></div>
  <div class="grid g2">
    <div class="card"><h3>Настройки</h3>
      <label class="check"><input type="checkbox" data-act="names" ${S.settings.showNames ? 'checked' : ''}><span><b>Показывать ФИО</b><br><span class="small muted">По умолчанию видны только коды учеников.</span></span></label>
      <label class="check" style="margin-top:8px"><input type="checkbox" data-act="sound" ${S.settings.sound ? 'checked' : ''}><span><b>Звуковые сигналы</b><br><span class="small muted">Старт, окончание времени, сигналы теста Леже.</span></span></label></div>
    <div class="card"><h3>Резервная копия</h3>
      <div class="row"><button class="btn primary" data-act="backup">Скачать копию (JSON)</button><label class="btn">Загрузить копию<input type="file" accept=".json,application/json" data-act="restore" hidden></label></div>
      <p class="small muted" style="margin-top:12px">Классов: ${S.classes.length} · учеников: ${S.students.length} · тестирований: ${S.sessions.length} · результатов: ${S.results.length} · анкет: ${S.survey.length}</p></div>
    <div class="card"><h3>Демо-данные</h3><p class="small muted">Два класса (ЭГ и КГ) со случайно сгенерированными результатами, ручными тестированиями и анкетами — чтобы посмотреть все разделы. Это не данные эксперимента.</p>
      <div class="row"><button class="btn lime" data-act="demo">Загрузить демо</button><button class="btn ghost" data-act="demo-del">Удалить демо</button></div></div>
    <div class="card"><h3>Очистка</h3><p class="small muted">Удаляет все классы, результаты и анкеты на этом устройстве.</p><button class="btn danger" data-act="wipe">Удалить все данные</button></div>
  </div></section>`;

/* ---------- демо ---------- */
function loadDemo() {
  if (S.classes.some(c => c.demo)) return toast('Демо уже загружено');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const mk = (name, role) => {
    const c = { id: uid(), name, grade: 7, role, demo: true };
    S.classes.push(c);
    addStudents(c.id, Array.from({ length: 22 }, (_, i) => ({ sex: i % 2 ? 'Ж' : 'М' })));
    return c;
  };
  const eg = mk('7А', 'ЭГ'), kg = mk('7Б', 'КГ');
  const ability = {};
  S.students.filter(s => s.classId === eg.id || s.classId === kg.id).forEach(s => { ability[s.id] = clamp(0.55 + gauss() * 0.17, 0.08, 0.95); });
  const tests = ['run30', 'shuttle', 'reach', 'ljump', 'pull', 'situp', 'run6'];
  const day = (m, d) => `${new Date().getFullYear() - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const plan = [
    [eg, 'app', day(9, 15), 'Входной контроль', 0, 44, 4], [eg, 'app', day(12, 18), 'Итоговый контроль', 0.07, 37, 2],
    [kg, 'manual', day(9, 16), 'Входной контроль', 0, 78, 9], [kg, 'manual', day(12, 19), 'Итоговый контроль', 0.02, 74, 8],
    [eg, 'app', day(10, 20), 'Текущий контроль', 0.03, 18, 1], [kg, 'manual', day(10, 21), 'Текущий контроль', 0.01, 33, 3],
  ];
  for (const [c, method, date, label, gain, minutes, errs] of plan) {
    const ts = label === 'Текущий контроль' ? ['run30', 'ljump', 'situp'] : tests;
    const rs = roster(c.id);
    const s = { id: uid(), classId: c.id, date, label, method, tests: ts, demo: true };
    if (method === 'app') { s.startedAt = new Date(date + 'T09:00').getTime(); s.endedAt = s.startedAt + minutes * 60000; s.corrections = errs; }
    else Object.assign(s, { durationMin: minutes, nStudents: rs.length, nTests: ts.length, errors: errs });
    S.sessions.push(s);
    for (const st of rs) for (const tid of ts) {
      const [best, worst] = normFor(tid, st.sex, c.grade), t = T[tid];
      const q = clamp(ability[st.id] + gain + gauss() * 0.06, 0, 1.05);
      S.results.push({ id: uid(), sessionId: s.id, studentId: st.id, testId: tid, value: +(worst + (best - worst) * q).toFixed(t.dec), source: method === 'app' ? 'демо' : 'вручную (демо)', at: Date.now() });
    }
  }
  for (const [c, pre, post] of [[eg, 3.2, 4.1], [kg, 3.2, 3.35]]) for (const st of roster(c.id)) for (const [ph, m] of [['до', pre], ['после', post]]) {
    S.survey.push({ id: uid(), classId: c.id, studentId: st.id, phase: ph, answers: SURVEY.map(() => clamp(Math.round(m + gauss() * 0.8), 1, 5)), at: Date.now(), demo: true });
  }
  UI.classId = UI.jClass = UI.aClass = eg.id;
  save(); toast('Демо загружено: 7А (ЭГ) и 7Б (КГ)'); render();
}
function deleteClass(id) {
  const sids = new Set(S.sessions.filter(s => s.classId === id).map(s => s.id));
  S.results = S.results.filter(r => !sids.has(r.sessionId) && student(r.studentId)?.classId !== id);
  S.sessions = S.sessions.filter(s => s.classId !== id);
  S.survey = S.survey.filter(r => r.classId !== id);
  S.students = S.students.filter(s => s.classId !== id);
  S.classes = S.classes.filter(c => c.id !== id);
  save();
}

/* ================= маршрутизация и события ================= */
let lastRoute = null;
function render() {
  cleanup.forEach(f => { try { f(); } catch (e) { /* */ } });
  cleanup = [];
  const [r, ...args] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const route = VIEWS[r] ? r : 'home';
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  $('.nav').classList.remove('open');
  $('#view').innerHTML = VIEWS[route](args);
  AFTER[route]?.(args);
  if (route !== lastRoute) window.scrollTo(0, 0);
  lastRoute = route;
  reveal();
}
function reveal() {
  const els = $$('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  els.forEach((e, i) => { e.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(e); });
  onCleanup(() => io.disconnect());
}

const ACTS = {
  demo: loadDemo,
  'demo-del': () => { S.classes.filter(c => c.demo).forEach(c => deleteClass(c.id)); toast('Демо удалено'); render(); },
  'pick-class': el => { UI.classId = el.dataset.id; render(); },
  'del-class': el => { if (confirm('Удалить класс со всеми результатами?')) { deleteClass(el.dataset.id); UI.classId = null; render(); } },
  'del-student': el => { const st = student(el.dataset.id); if (confirm(`Удалить ${st.code} и его результаты?`)) { S.results = S.results.filter(r => r.studentId !== st.id); S.survey = S.survey.filter(r => r.studentId !== st.id); S.students = S.students.filter(s => s !== st); save(); render(); } },
  'import-csv': () => {
    const lines = $('#csv-in').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const list = lines.map(l => { const [sx, ...nm] = l.split(/[;,\t]/); const sex = /^[жfЖF]/.test(sx.trim()) ? 'Ж' : 'М'; return { sex, name: nm.join(' ').trim() }; });
    if (!list.length) return toast('Список пуст');
    addStudents(UI.classId, list); toast(`Добавлено: ${list.length}`); render();
  },
  resume: el => { UI.sessionId = el.dataset.id; UI.testId = null; render(); },
  tab: el => { UI.testId = el.dataset.id; render(); },
  'end-session': () => {
    const s = session(UI.sessionId);
    if (!confirm('Завершить тестирование? Время будет зафиксировано.')) return;
    s.endedAt = Date.now(); save(); UI.jClass = s.classId; UI.jSession = s.id; UI.sessionId = null;
    toast(`Тестирование заняло ${fmt((s.endedAt - s.startedAt) / 60000, 0)} мин`); location.hash = '#/journal';
  },
  edit: el => {
    if (el.querySelector('input')) return;
    const s = session(UI.jSession), t = T[el.dataset.tid], sid = el.dataset.sid, r = getRes(s.id, sid, t.id);
    el.innerHTML = `<input inputmode="decimal" value="${r ? fmt(r.value, t.dec) : ''}">`;
    const inp = $('input', el);
    inp.focus(); inp.select();
    const done = () => {
      const v = num(inp.value), prev = r?.value ?? null;
      if (v !== prev && !(v == null && prev == null)) {
        setRes(s.id, sid, t.id, v, { source: 'исправлено в журнале' });
        if (prev != null) { s.corrections = (s.corrections || 0) + 1; save(); }
      }
      render();
    };
    inp.addEventListener('blur', done, { once: true });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = r ? fmt(r.value, t.dec) : ''; inp.blur(); } });
  },
  csv: () => exportCSV(session(UI.jSession)),
  'norm-reset': () => { S.norms[UI.aTest || 'run30'] = defaultNorms()[UI.aTest || 'run30']; save(); render(); toast('Нормативы сброшены'); },
  print: () => window.print(),
  acc: () => { $('#acc-out').innerHTML = accuracy($('#acc-in').value); },
  'acc-demo': () => { $('#acc-in').value = '5,21; 5,30\n5,64; 5,58\n4,98; 5,05\n5,87; 5,95\n5,40; 5,46\n6,02; 5,96\n5,12; 5,22\n5,75; 5,81\n4,86; 4,95\n5,58; 5,61\n6,21; 6,30\n5,33; 5,29'; ACTS.acc(); },
  welch: () => {
    const a = parseNums($('#w-a').value), b = parseNums($('#w-b').value), pr = $('#w-paired').checked;
    if (a.length < 2 || b.length < 2) return ($('#w-out').innerHTML = '<p class="down">В каждой выборке нужно минимум 2 числа.</p>');
    if (pr && a.length !== b.length) return ($('#w-out').innerHTML = '<p class="down">Для парного критерия выборки должны быть одной длины.</p>');
    const w = pr ? Stat.paired(a, b) : Stat.welch(a, b);
    $('#w-out').innerHTML = `<div class="kpis"><div class="kpi"><span>M₁ ± SD</span><b>${fmt(Stat.mean(a), 2)} ± ${fmt(Stat.sd(a), 2)}</b></div><div class="kpi"><span>M₂ ± SD</span><b>${fmt(Stat.mean(b), 2)} ± ${fmt(Stat.sd(b), 2)}</b></div><div class="kpi"><span>t (df)</span><b>${fmt(w.t, 2)} (${fmt(w.df, 1)})</b></div><div class="kpi"><span>p</span><b>${fmt(w.p, 4)}</b></div></div><p style="margin-top:10px">${sig(w.p)}${pr ? '' : `; d Коэна = ${fmt(w.d, 2)}`}.</p>`;
  },
  'del-session': el => { S.results = S.results.filter(r => r.sessionId !== el.dataset.id); S.sessions = S.sessions.filter(s => s.id !== el.dataset.id); save(); render(); },
  'del-app': el => { S.apps = S.apps.filter(a => a.id !== el.dataset.id); save(); render(); },
  backup: () => download(`normativ-backup-${today()}.json`, JSON.stringify(S, null, 1), 'application/json'),
  wipe: () => { if (confirm('Удалить все данные на этом устройстве? Это нельзя отменить.')) { const keep = S.settings; S = fresh(); S.settings = keep; save(); render(); toast('Данные удалены'); } },
};
const CHANGES = {
  names: el => { S.settings.showNames = el.checked; save(); render(); },
  sound: el => { S.settings.sound = el.checked; save(); },
  role: el => { cls(el.dataset.id).role = el.value; save(); render(); },
  'j-class': el => { UI.jClass = el.value; UI.jSession = null; render(); },
  'j-session': el => { UI.jSession = el.value; render(); },
  'a-class': el => { UI.aClass = el.value; UI.aStudent = null; render(); },
  'a-test': el => { UI.aTest = el.value; render(); },
  'a-student': el => { UI.aStudent = el.value; render(); },
  'norm-test': el => { UI.aTest = el.value; render(); },
  'sv-class': el => { UI.classId = el.value; const f = el.form; f.studentId.innerHTML = roster(el.value, true).map(st => `<option value="${st.id}">${esc(who(st))}</option>`).join(''); },
  restore: el => {
    const f = el.files[0];
    if (!f) return;
    f.text().then(txt => {
      try {
        const d = JSON.parse(txt);
        if (d.v !== 1 || !Array.isArray(d.classes)) throw new Error();
        S = Object.assign(fresh(), d); save(); render(); toast('Копия загружена');
      } catch (e) { toast('Это не резервная копия «Норматива»'); }
    });
  },
};
const FORMS = {
  'add-class': f => {
    const name = f.name.value.trim().slice(0, 12);
    if (S.classes.some(c => c.name === name)) return toast('Класс с таким названием уже есть');
    const c = { id: uid(), name, grade: +f.grade.value, role: f.role.value };
    S.classes.push(c); UI.classId = c.id; save(); render();
  },
  'add-students': f => {
    const m = clamp(+f.m.value || 0, 0, 40), w = clamp(+f.f.value || 0, 0, 40);
    if (!m && !w) return toast('Укажите количество');
    addStudents(UI.classId, [...Array(m).fill({ sex: 'М' }), ...Array(w).fill({ sex: 'Ж' })]); render();
  },
  'new-session': f => {
    const tests = $$('input[name=t]:checked', f).map(i => i.value).sort((a, b) => T[a].order - T[b].order);
    if (!tests.length) return toast('Выберите хотя бы один тест');
    if (!roster(f.classId.value).length) return toast('В классе нет учеников, допущенных к тестированию');
    const s = { id: uid(), classId: f.classId.value, date: f.date.value, label: f.label.value, method: 'app', tests, startedAt: Date.now(), corrections: 0 };
    S.sessions.push(s); save(); UI.sessionId = s.id; UI.testId = tests[0]; UI.classId = s.classId; render();
  },
  'manual-session': f => {
    S.sessions.push({ id: uid(), classId: f.classId.value, date: f.date.value, label: 'Ручное тестирование', method: 'manual', durationMin: +f.min.value, nStudents: +f.n.value, nTests: +f.k.value, errors: +f.e.value || 0 });
    save(); render(); toast('Ручное тестирование добавлено');
  },
  survey: f => {
    const answers = SURVEY.map((_, i) => +f[`q${i}`].value);
    S.survey.push({ id: uid(), classId: f.classId.value, studentId: f.studentId.value, phase: f.phase.value, answers, at: Date.now() });
    save(); toast('Анкета сохранена');
    $$('input[type=radio]', f).forEach(i => { i.checked = false; });
    const sel = f.studentId; if (sel.selectedIndex < sel.options.length - 1) sel.selectedIndex++;
    $('#sv-sum').innerHTML = surveySummary();
  },
  'app-eval': f => {
    const marks = CRITERIA.map((_, i) => f[`c${i}`].checked);
    const ok = CRITERIA.every((c, i) => !c[2] || marks[i]);
    S.apps.push({ id: uid(), name: f.name.value.trim(), score: marks.filter(Boolean).length, ok });
    save(); render(); toast(ok ? 'Приложение допустимо' : 'Не выполнены обязательные критерии');
  },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (el && ACTS[el.dataset.act] && el.tagName !== 'SELECT' && !(el.tagName === 'INPUT' && el.type !== 'button')) { ev.preventDefault(); ACTS[el.dataset.act](el, ev); }
  if (ev.target.closest('.burger')) { const n = $('.nav'); n.classList.toggle('open'); $('.burger').setAttribute('aria-expanded', n.classList.contains('open')); }
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.act && CHANGES[el.dataset.act]) return CHANGES[el.dataset.act](el);
  if (el.dataset.edit) { const st = student(el.dataset.id); st[el.dataset.edit] = el.value; save(); if (el.dataset.edit !== 'name') render(); return; }
  if (el.dataset.norm) {
    const [sex, g, k] = el.dataset.norm.split('|'), t = UI.aTest || 'run30', v = num(el.value);
    if (v == null) return toast('Введите число');
    S.norms[t] = S.norms[t] || defaultNorms()[t];
    S.norms[t][sex][g][+k] = v; save(); toast('Норматив сохранён');
  }
  if (el.closest('.check')) el.closest('.check').classList.toggle('on', el.checked);
  if (el.form?.dataset.form === 'app-eval') $('#ae-v').textContent = `${$$('input[type=checkbox]:checked', el.form).length} / 9`;
});
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (FORMS[f.dataset.form]) { ev.preventDefault(); FORMS[f.dataset.form](f); }
});
window.addEventListener('hashchange', render);
window.addEventListener('beforeunload', ev => {
  if (S.sessions.some(s => s.method === 'app' && !s.endedAt) && lastRoute === 'test' && UI.sessionId) { ev.preventDefault(); ev.returnValue = ''; }
});
render();
