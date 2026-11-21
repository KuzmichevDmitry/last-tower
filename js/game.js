/* =========================================================
   LAST TOWER
   A mobile-first tower defense built with vanilla canvas.
   ========================================================= */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r = 0) {
      const radius = Math.min(Math.abs(r), Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + radius, y);
      this.lineTo(x + w - radius, y);
      this.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.lineTo(x + w, y + h - radius);
      this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.lineTo(x + radius, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      return this;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const $ = (id) => document.getElementById(id);

  /* ========================= Data ========================= */

  const DEF_TYPES = {
    archer: {
      id: 'archer',
      name: 'Стрелок',
      cost: 35,
      hp: 90,
      damage: 13,
      interval: 0.72,
      range: 168,
      color: '#67efff',
      soft: 'rgba(103,239,255,',
      desc: 'Быстрые одиночные выстрелы',
      maxLevel: 3
    },
    mortar: {
      id: 'mortar',
      name: 'Мортира',
      cost: 55,
      hp: 78,
      damage: 34,
      interval: 1.75,
      range: 214,
      splash: 56,
      color: '#ffbd63',
      soft: 'rgba(255,189,99,',
      desc: 'Тяжёлый снаряд по площади',
      maxLevel: 3
    },
    frost: {
      id: 'frost',
      name: 'Криос',
      cost: 45,
      hp: 82,
      damage: 6,
      interval: 1.05,
      range: 140,
      color: '#a99aff',
      soft: 'rgba(169,154,255,',
      desc: 'Замедляет всех врагов рядом',
      maxLevel: 3
    },
    banker: {
      id: 'banker',
      name: 'Банкир',
      cost: 60,
      hp: 100,
      damage: 0,
      interval: 1,
      range: 0,
      color: '#ffd166',
      soft: 'rgba(255,209,102,',
      desc: 'Приносит монеты за каждую отбитую волну',
      role: 'ДОХОД',
      support: true,
      income: 3,
      unlockCost: 180,
      maxLevel: 3
    },
    booster: {
      id: 'booster',
      name: 'Бустер',
      cost: 65,
      hp: 88,
      damage: 0,
      interval: 1,
      range: 0,
      color: '#7dfcc4',
      soft: 'rgba(125,252,196,',
      desc: 'Усиливает защитников в радиусе ауры',
      role: 'ПОДДЕРЖКА',
      support: true,
      auraRadius: 126,
      auraDamage: 0.18,
      auraRange: 0.08,
      auraSpeed: 0.1,
      unlockCost: 220,
      maxLevel: 3
    },
    god: {
      id: 'god',
      name: 'Бог',
      cost: 120,
      hp: 240,
      damage: 36,
      interval: 0.24,
      range: 185,
      splash: 40,
      color: '#ffe27a',
      soft: 'rgba(255,226,122,',
      desc: 'Божественный защитник: очень быстро бьёт тяжёлым светом, задевает врагов рядом и усиливает всех защитников в ауре.',
      role: 'БОГ',
      exclusive: 'god',
      auraRadius: 170,
      auraDamage: 0.22,
      auraRange: 0.1,
      auraSpeed: 0.12,
      maxLevel: 3
    }
  };

  const ENEMY_TYPES = {
    thrall: {
      id: 'thrall', name: 'Ползун', hp: 30, speed: 31, damage: 4,
      interval: 1.0, radius: 10, reward: 4, score: 10, color: '#ff5d86',
      desc: 'Базовый враг. Идёт к ближайшему защитнику или к ядру и бьёт вблизи.',
      modes: ['easy', 'medium', 'hard', 'endless'], unlock: 60, role: 'БАЗОВЫЙ'
    },
    runner: {
      id: 'runner', name: 'Бегун', hp: 20, speed: 55, damage: 3,
      interval: 0.72, radius: 8, reward: 5, score: 14, color: '#ff9b57',
      desc: 'Самый быстрый враг. Быстро сближается и старается прорваться к ядру.',
      modes: ['easy', 'medium', 'hard', 'endless'], unlock: 100, role: 'СКОРОСТЬ'
    },
    brute: {
      id: 'brute', name: 'Громила', hp: 106, speed: 20, damage: 9,
      interval: 1.24, radius: 16, reward: 10, score: 30, color: '#ffb04e',
      desc: 'Идёт только к ядру. Не останавливается перед защитниками и бьёт тех, кто оказался на пути.',
      modes: ['easy', 'medium', 'hard', 'endless'], unlock: 220, role: 'ТАРАН',
      towerOnly: true
    },
    spitter: {
      id: 'spitter', name: 'Плевун', hp: 40, speed: 24, damage: 4,
      interval: 1.55, radius: 11, reward: 8, score: 24, color: '#95ef76',
      ranged: 116,
      desc: 'Держится на дистанции и стреляет по защитникам или ядру.',
      modes: ['easy', 'medium', 'hard', 'endless'], unlock: 150, role: 'ДАЛЬНИЙ БОЙ'
    },
    healer: {
      id: 'healer', name: 'Лекарь', hp: 52, speed: 26, damage: 3,
      interval: 1.5, radius: 11, reward: 12, score: 40, color: '#7dfcc4',
      desc: 'Поддерживает врагов: каждые 2,2 секунды лечит до трёх раненых рядом, включая боссов.',
      modes: ['medium', 'hard', 'endless'], unlock: 300, role: 'ПОДДЕРЖКА',
      healer: true, healRadius: 130, healInterval: 2.2, healAmount: 8, healTargets: 3
    },
    kamikaze: {
      id: 'kamikaze', name: 'Камикадзе', hp: 24, speed: 66, damage: 44,
      interval: 1, radius: 9, reward: 9, score: 34, color: '#ff6b6b',
      desc: 'Бежит к ближайшему защитнику и взрывается большим уроном. Если убить его до взрыва, урона не будет.',
      modes: ['medium', 'hard', 'endless'], unlock: 400, role: 'СМЕРТНИК',
      kamikaze: true, aggro: Infinity
    },
    drummer: {
      id: 'drummer', name: 'Барабанщик', hp: 78, speed: 22, damage: 4,
      interval: 1.35, radius: 13, reward: 12, score: 44, color: '#ffcf6b',
      desc: 'Бьёт в барабан и усиливает ближайших союзников: они двигаются быстрее и наносят больше урона.',
      modes: ['hard'], unlock: 180, role: 'БАФФ',
      drummer: true, buffRadius: 150, buffSpeed: 0.24, buffDamage: 0.28
    },
    necromancer: {
      id: 'necromancer', name: 'Некромант', hp: 105, speed: 24, damage: 5,
      interval: 1.45, radius: 13, reward: 20, score: 70, color: '#b78cff',
      desc: 'Постепенно поднимает оставленные черепа в скелетов. Уничтожь его быстро, иначе армия мертвецов вырастет.',
      modes: ['hard'], unlock: 60, role: 'НЕКРОМАНТ',
      necromancer: true, reviveInterval: 2.4, reviveMax: 12
    },
    skeleton: {
      id: 'skeleton', name: 'Скелет', hp: 46, speed: 42, damage: 4,
      interval: 0.85, radius: 9, reward: 4, score: 18, color: '#d8d2b0',
      desc: 'Поднятый некромантом скелет. Быстрее ползуна и прочнее бегуна, но всё ещё хрупкий.',
      modes: ['hard'], unlock: 120, role: 'НЕЖИТЬ',
      summoned: true
    },
    boss: {
      id: 'boss', name: 'Разрушитель', hp: 330, speed: 15, damage: 16,
      interval: 1.35, radius: 27, reward: 52, score: 260, color: '#ff3d5c',
      boss: true,
      desc: 'Босс лёгкого режима. В бесконечном режиме появляется каждые 5 волн.',
      modes: ['easy', 'endless'], unlock: 30, role: 'БОСС',
      bossHint: 'Его нужно остановить любой ценой'
    },
    king: {
      id: 'king', name: 'Король', hp: 340, speed: 13, damage: 15,
      interval: 1.45, radius: 30, reward: 72, score: 360, color: '#ffd166',
      boss: true, summonType: 'guardian', summonInterval: 8, summonMax: 6,
      desc: 'Босс среднего режима. Каждые 8 секунд призывает к себе охранника.',
      modes: ['medium', 'hard'], unlock: 40, role: 'БОСС',
      bossHint: 'Король призывает охранников каждые 8 секунд'
    },
    guardian: {
      id: 'guardian', name: 'Охранник', hp: 84, speed: 23, damage: 8,
      interval: 1.2, radius: 15, reward: 8, score: 28, color: '#c9a7ff',
      desc: 'Охранник Короля. По характеристикам близок к громиле, но выбирает целью защитников.',
      modes: ['medium', 'hard'], unlock: 75, role: 'МИНЬОН',
      summoned: true
    },
    enemyTower: {
      id: 'enemyTower', name: 'Вражеская башня', hp: 820, speed: 0, damage: 0,
      interval: 1, radius: 38, reward: 180, score: 900, color: '#ff7a9e',
      desc: 'Финал сложного режима. Ворует монеты, копирует защитников, призывает боссов и бьёт по ядру молниями.',
      modes: ['hard'], unlock: 10, role: 'БОСС',
      boss: true, towerBoss: true,
      bossHint: 'Разрушь вражескую башню, пока она не уничтожила ядро'
    }
  };

  const ENEMY_ORDER = Object.freeze([
    'thrall', 'runner', 'spitter', 'brute', 'healer', 'kamikaze',
    'drummer', 'necromancer', 'skeleton', 'boss', 'king', 'guardian', 'enemyTower'
  ]);

  const MODE_NAMES = Object.freeze({
    easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', endless: 'Бесконечный'
  });

  // Current tower limits: 15 defenders total, no archer cap, 3 mortars,
  // 5 cryo, 1 banker, 2 boosters. Each tower level exposes its own limits, so
  // future towers and upgrade paths can change these numbers without touching
  // placement code.
  const DEFENDER_CAPS = Object.freeze({
    total: 15,
    archer: Infinity,
    mortar: 3,
    frost: 5,
    banker: 1,
    booster: 2,
    god: 1
  });

  const ABILITY_DEFS = {
    nova: { max: 14 },
    frost: { max: 19 },
    repair: { max: 28 }
  };

  const MODE_DEFS = {
    easy: {
      id: 'easy', name: 'ЛЕГКИЙ', tag: 'РАЗМИНКА', waves: 8, startEssence: 100,
      hpScale: 0.92, damageScale: 0.92, speedScale: 0.97, reward: 120,
      desc: 'Меньше эссенции на старт, но враги всё равно слабее. Ядро прощает ошибки.'
    },
    medium: {
      id: 'medium', name: 'СРЕДНИЙ', tag: 'ОСНОВНОЙ', waves: 12, startEssence: 78,
      hpScale: 1.15, damageScale: 1.1, speedScale: 1.02, reward: 260,
      desc: 'Плотные волны и злые враги. Придётся считать эссенцию и беречь ядро.'
    },
    hard: {
      id: 'hard', name: 'СЛОЖНЫЙ', tag: 'ИСПЫТАНИЕ', waves: 16, startEssence: 60,
      hpScale: 1.4, damageScale: 1.28, speedScale: 1.06, reward: 520,
      desc: 'Мало эссенции, очень злые враги и вражеская башня в финале. Только для настоящих защитников.'
    },
    endless: {
      id: 'endless', name: 'БЕСКОНЕЧНЫЙ', tag: 'ОСАДА', waves: Infinity, startEssence: 90,
      hpScale: 1.02, damageScale: 1.02, speedScale: 1, reward: 0,
      desc: 'Волны не заканчиваются. Каждые 5 волн — бонус монетами. Сколько продержишься?'
    }
  };

  const TOWER_LEVELS = [
    { level: 0, name: 'Базовая', hp: 245, power: 1.4, repair: 46, cost: 0, limits: { ...DEFENDER_CAPS } },
    { level: 1, name: 'Укреплённая', hp: 275, power: 1.48, repair: 49, cost: 120, limits: { ...DEFENDER_CAPS } },
    { level: 2, name: 'Рунная', hp: 310, power: 1.57, repair: 52, cost: 220, limits: { ...DEFENDER_CAPS } },
    { level: 3, name: 'Цитадель', hp: 350, power: 1.67, repair: 56, cost: 360, limits: { ...DEFENDER_CAPS } },
    { level: 4, name: 'Бастион', hp: 395, power: 1.78, repair: 60, cost: 520, limits: { ...DEFENDER_CAPS } }
  ];
  const MAX_TOWER_LEVEL = TOWER_LEVELS.length - 1;

  const TOWER_SPECS = Object.freeze({
    start: {
      id: 'start',
      name: 'Стартовая башня',
      shortName: 'Стартовая',
      slots: 3,
      unlockCost: 0,
      levels: TOWER_LEVELS,
      desc: 'Три типа защитников. «Починка» доступна сразу, «Импульс» — на максимальном уровне. «Оковы» недоступны.'
    },
    final: {
      id: 'final',
      name: 'Последняя башня',
      shortName: 'Последняя',
      slots: 5,
      unlockCost: 500,
      levels: TOWER_LEVELS,
      desc: 'Пять типов защитников и все три способности: «Импульс», «Оковы» и «Починка».'
    }
  });

  const STORAGE = {
    bestWave: 'lastTower.bestWave',
    bestScore: 'lastTower.bestScore',
    money: 'lastTower.money',
    towerLevel: 'lastTower.towerLevel',
    towers: 'lastTower.towers.v1',
    defendersOwned: 'lastTower.defendersOwned',
    muted: 'lastTower.muted',
    tutorial: 'lastTower.tutorialDone',
    bestEndless: 'lastTower.bestEndless',
    daily: 'lastTower.daily.v1',
    achievements: 'lastTower.achievements.v1',
    enemyKills: 'lastTower.enemyKills.v1'
  };

  /* ========================= Local accounts ========================= */

  const ACCOUNT_KEYS = Object.freeze({
    accounts: 'lastTower.accounts.v1',
    session: 'lastTower.session.v1',
    prompted: 'lastTower.authPrompted.v1'
  });

  const CLOUD_URL = 'https://tytatcbhqiusivhhncmh.supabase.co';
  const CLOUD_PUBLIC_KEY = 'sb_publishable_EnvwgkE96HVkAko3g2KN4A_25U8Tg2L';
  const CLOUD_EMAIL_DOMAIN = 'players.lasttower.local';
  const CLOUD_KEYS = Object.freeze({
    session: 'lastTower.cloud.session.v1',
    meta: 'lastTower.cloud.meta.v1',
    migration: 'lastTower.cloud.migration.v1'
  });
  const CLOUD_FORCE_LOCAL = /(?:\?|&)local=1(?:&|$)/.test(location.search);
  const CLOUD_ENABLED = !CLOUD_FORCE_LOCAL && !!CLOUD_URL && !!CLOUD_PUBLIC_KEY;

  const OWNER_ACCOUNT_ID = 'owner-dmitry';
  const OWNER_USERNAME = 'dmitry';
  const OWNER_SALT = '3c9f5a1e7b2d4860a4c6e8f0b1d23579';
  const OWNER_PASSWORD_HASH = '6c6d97dd714483c89b755f2c6030b88f51cd7245f42cff926e647d4dbe6bf8fb';
  const PASSWORD_ITERATIONS = 1800;

  function rawGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch { return fallback; }
  }

  function rawSet(key, value) {
    try { localStorage.setItem(key, String(value)); return true; } catch { return false; }
  }

  function rawRemove(key) {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
  }

  function toHex(bytes) {
    let out = '';
    for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
    return out;
  }

  function utf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(text));
    const bytes = [];
    const value = String(text);
    for (let i = 0; i < value.length; i++) {
      let code = value.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
        const next = value.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
          i++;
        }
      }
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
    return Uint8Array.from(bytes);
  }

  function concatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  function sha256Bytes(input) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

    const data = input instanceof Uint8Array ? input : Uint8Array.from(input);
    const bitLength = data.length * 8;
    const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const w = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
      for (let i = 16; i < 64; i++) {
        const x = w[i - 15];
        const y = w[i - 2];
        const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }

      let a = H[0];
      let b = H[1];
      let c = H[2];
      let d = H[3];
      let e = H[4];
      let f = H[5];
      let g = H[6];
      let h = H[7];

      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < H.length; i++) outView.setUint32(i * 4, H[i]);
    return out;
  }

  function hashPassword(password, salt, iterations = PASSWORD_ITERATIONS) {
    const saltBytes = utf8Bytes(salt);
    let digest = sha256Bytes(utf8Bytes(`${salt}:${password}`));
    for (let i = 1; i < iterations; i++) digest = sha256Bytes(concatBytes(digest, saltBytes));
    return toHex(digest);
  }

  function randomHex(byteCount = 16) {
    const bytes = new Uint8Array(byteCount);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return toHex(bytes);
  }

  function accountPrefix(accountId) {
    return `lastTower.account.${accountId}.`;
  }

  function normalizeAccountUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function loadAccountState() {
    let parsed = null;
    try { parsed = JSON.parse(rawGet(ACCOUNT_KEYS.accounts, 'null')); } catch { parsed = null; }
    if (!parsed || !Array.isArray(parsed.accounts)) return { version: 1, accounts: [] };
    const accounts = parsed.accounts.filter((account) => {
      if (!account || typeof account.id !== 'string' || typeof account.username !== 'string') return false;
      if (account.cloud) return typeof account.userId === 'string' && account.userId.length > 0;
      return typeof account.salt === 'string' && typeof account.hash === 'string';
    });
    return { version: 1, accounts };
  }

  function saveAccountState(state) {
    return rawSet(ACCOUNT_KEYS.accounts, JSON.stringify(state));
  }

  function guestProfileHasData() {
    return [STORAGE.money, STORAGE.bestWave, STORAGE.bestScore, STORAGE.towerLevel, STORAGE.towers, STORAGE.defendersOwned]
      .some((key) => rawGet(key, null) !== null);
  }

  function accountProfileHasData(accountId) {
    const prefix = accountPrefix(accountId);
    return Object.values(STORAGE).some((key) => rawGet(prefix + key, null) !== null);
  }

  function copyGuestProfileToAccount(accountId) {
    const prefix = accountPrefix(accountId);
    let copied = false;
    for (const key of Object.values(STORAGE)) {
      const value = rawGet(key, null);
      if (value === null) continue;
      rawSet(prefix + key, value);
      copied = true;
    }
    return copied;
  }

  function clearAccountProfile(accountId) {
    const prefix = accountPrefix(accountId);
    for (const key of Object.values(STORAGE)) rawRemove(prefix + key);
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) localStorage.removeItem(key);
      }
    } catch { /* private mode */ }
  }

  const AccountAuth = (() => {
    const state = loadAccountState();
    let owner = state.accounts.find((account) => account.id === OWNER_ACCOUNT_ID);
    if (!owner) {
      owner = {
        id: OWNER_ACCOUNT_ID,
        username: OWNER_USERNAME,
        displayName: 'Дмитрий',
        salt: OWNER_SALT,
        hash: OWNER_PASSWORD_HASH,
        iterations: PASSWORD_ITERATIONS,
        exclusive: 'god',
        owner: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: ''
      };
      state.accounts.push(owner);
      saveAccountState(state);
    } else if (!owner.owner || owner.exclusive !== 'god') {
      owner.owner = true;
      owner.exclusive = 'god';
      saveAccountState(state);
    }

    if (!accountProfileHasData(owner.id) && guestProfileHasData()) {
      copyGuestProfileToAccount(owner.id);
    }

    const sessionId = rawGet(ACCOUNT_KEYS.session, '');
    const current = state.accounts.find((account) => account.id === sessionId) || null;
    if (sessionId && !current) rawRemove(ACCOUNT_KEYS.session);

    return {
      state,
      current,
      prefix: current ? accountPrefix(current.id) : '',
      ownerId: OWNER_ACCOUNT_ID,
      isOwner: !!current && current.exclusive === 'god',
      prompted: rawGet(ACCOUNT_KEYS.prompted, '0') === '1',
      find(username) {
        const normalized = normalizeAccountUsername(username);
        return state.accounts.find((account) => account.username === normalized) || null;
      },
      add(account) {
        state.accounts.push(account);
        return saveAccountState(state);
      },
      save() {
        return saveAccountState(state);
      },
      setSession(accountId) {
        return rawSet(ACCOUNT_KEYS.session, accountId);
      },
      clearSession() {
        rawRemove(ACCOUNT_KEYS.session);
      },
      markPrompted() {
        rawSet(ACCOUNT_KEYS.prompted, '1');
        this.prompted = true;
      },
      clearPrompted() {
        rawRemove(ACCOUNT_KEYS.prompted);
        this.prompted = false;
      },
      deleteAccount(account) {
        if (!account || account.owner) return false;
        const index = state.accounts.findIndex((item) => item.id === account.id);
        if (index < 0) return false;
        state.accounts.splice(index, 1);
        clearAccountProfile(account.id);
        if (current && current.id === account.id) rawRemove(ACCOUNT_KEYS.session);
        saveAccountState(state);
        return true;
      },
      guestHasData: guestProfileHasData,
      accountHasData: accountProfileHasData,
      copyGuestProfile: copyGuestProfileToAccount
    };
  })();

  function hasGodAccess() {
    return !!(AccountAuth.current && AccountAuth.current.owner && AccountAuth.current.exclusive === 'god');
  }

  /* ========================= Supabase cloud ========================= */

  function cloudBaseUrl() {
    return String(CLOUD_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  }

  function cloudEmail(username) {
    return `${normalizeAccountUsername(username)}@${CLOUD_EMAIL_DOMAIN}`;
  }

  function loadCloudSession() {
    let parsed = null;
    try { parsed = JSON.parse(rawGet(CLOUD_KEYS.session, 'null')); } catch { parsed = null; }
    if (!parsed || typeof parsed.access_token !== 'string') return null;
    return parsed;
  }

  function normalizeCloudSave(save) {
    if (!save || typeof save !== 'object' || Array.isArray(save)) return { schema: 1, values: {} };
    if (save.values && typeof save.values === 'object' && !Array.isArray(save.values)) {
      return { schema: Number(save.schema) || 1, values: save.values };
    }
    return { schema: 1, values: save };
  }

  function cloudSaveHasData(save) {
    const values = normalizeCloudSave(save).values;
    return Object.keys(values).some((key) => Object.values(STORAGE).includes(key));
  }

  function cloudSavesEqual(a, b) {
    const left = normalizeCloudSave(a).values;
    const right = normalizeCloudSave(b).values;
    const allowed = new Set(Object.values(STORAGE));
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (!allowed.has(key)) continue;
      if (String(left[key] ?? '') !== String(right[key] ?? '')) return false;
    }
    return true;
  }

  function cloudSaveSignature(save) {
    const values = normalizeCloudSave(save).values;
    const allowed = new Set(Object.values(STORAGE));
    return Object.keys(values)
      .filter((key) => allowed.has(key))
      .sort()
      .map((key) => `${key}:${String(values[key] ?? '')}`)
      .join('|');
  }

  function exportSaveForPrefix(prefix) {
    const values = {};
    for (const key of Object.values(STORAGE)) {
      const value = rawGet(prefix + key, null);
      if (value !== null) values[key] = value;
    }
    return { schema: 1, values };
  }

  function importSaveToPrefix(save, prefix) {
    const normalized = normalizeCloudSave(save);
    for (const [key, value] of Object.entries(normalized.values)) {
      if (!Object.values(STORAGE).includes(key)) continue;
      rawSet(prefix + key, String(value));
    }
  }

  function readCloudMeta() {
    try {
      const parsed = JSON.parse(rawGet(CLOUD_KEYS.meta, '{}'));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  function writeCloudMeta(profile) {
    if (!profile) return;
    rawSet(CLOUD_KEYS.meta, JSON.stringify({
      userId: profile.user_id,
      updatedAt: profile.updated_at || '',
      saveVersion: Number(profile.save_version) || 1
    }));
  }

  const Cloud = {
    enabled: CLOUD_ENABLED,
    base: cloudBaseUrl(),
    key: CLOUD_PUBLIC_KEY,
    session: loadCloudSession(),
    profile: null,
    user: null,
    _refreshing: null,

    saveSession(data) {
      if (!data || typeof data.access_token !== 'string') return null;
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.session?.refresh_token || '',
        expires_at: data.expires_at
          ? Number(data.expires_at) * 1000
          : Date.now() + (Number(data.expires_in) || 3600) * 1000,
        user: data.user || this.session?.user || null
      };
      rawSet(CLOUD_KEYS.session, JSON.stringify(session));
      this.session = session;
      this.user = session.user;
      return session;
    },

    clearSession() {
      rawRemove(CLOUD_KEYS.session);
      this.session = null;
      this.user = null;
      this.profile = null;
    },

    async ensureSession() {
      if (!this.enabled) return false;
      if (!this.session) return false;
      if (Number(this.session.expires_at) > Date.now() + 30000) return true;
      if (!this.session.refresh_token) {
        this.clearSession();
        return false;
      }
      if (this._refreshing) return this._refreshing;
      this._refreshing = (async () => {
        try {
          const data = await this.request('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            auth: false,
            body: { refresh_token: this.session.refresh_token }
          });
          this.saveSession(data);
          return true;
        } catch {
          this.clearSession();
          return false;
        } finally {
          this._refreshing = null;
        }
      })();
      return this._refreshing;
    },

    async request(path, options = {}) {
      const method = options.method || 'GET';
      const headers = { apikey: this.key, ...(options.headers || {}) };
      const token = this.session?.access_token;
      if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';

      let response;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        response = await fetch(`${this.base}${path}`, {
          method,
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          keepalive: !!options.keepalive,
          signal: controller.signal
        });
      } catch (cause) {
        const error = new Error(
          cause?.name === 'AbortError'
            ? 'Облако не ответило за 15 секунд. Проверь интернет и попробуй ещё раз.'
            : 'Нет связи с облаком. Проверь интернет.'
        );
        error.cause = cause;
        throw error;
      } finally {
        clearTimeout(timer);
      }

      const text = await response.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
      }

      if (response.status === 401 && options.auth !== false && !options._retried) {
        const refreshed = await this.ensureSession();
        if (refreshed) {
          return this.request(path, { ...options, _retried: true });
        }
      }

      if (!response.ok) {
        const message = data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${response.status}`;
        const error = new Error(String(message));
        error.status = response.status;
        error.code = String(data?.code || data?.error_code || '');
        throw error;
      }
      return data;
    },

    async usernameAvailable(username) {
      const result = await this.request('/rest/v1/rpc/username_available', {
        method: 'POST',
        auth: false,
        body: { p_username: normalizeAccountUsername(username) }
      });
      return result === true;
    },

    async signUp(username, password, displayName) {
      const login = normalizeAccountUsername(username);
      const available = await this.usernameAvailable(login);
      if (!available) throw new Error('Этот логин уже занят. Попробуй войти.');
      const data = await this.request('/auth/v1/signup', {
        method: 'POST',
        auth: false,
        body: {
          email: cloudEmail(login),
          password,
          data: {
            username: login,
            display_name: displayName || login
          }
        }
      });
      if (!data || !data.access_token) {
        throw new Error('Supabase не выдал сессию. Проверь, что Confirm email выключен.');
      }
      this.saveSession(data);
      return this.ensureProfile();
    },

    async signIn(username, password) {
      const data = await this.request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        auth: false,
        body: {
          email: cloudEmail(username),
          password
        }
      });
      this.saveSession(data);
      return this.ensureProfile();
    },

    async ensureProfile() {
      if (!this.session?.user?.id) throw new Error('Нет активной облачной сессии.');
      const id = this.session.user.id;
      const select = 'user_id,username,display_name,is_owner,save,save_version,updated_at';
      const rows = await this.request(
        `/rest/v1/profiles?select=${select}&user_id=eq.${encodeURIComponent(id)}`,
        { method: 'GET' }
      );
      if (Array.isArray(rows) && rows.length > 0) {
        this.profile = rows[0];
        this.user = this.session.user;
        return this.profile;
      }

      const created = await this.request('/rest/v1/rpc/ensure_profile', {
        method: 'POST',
        body: {}
      });
      const row = Array.isArray(created) ? created[0] : created;
      if (!row || !row.user_id) throw new Error('Не удалось создать облачный профиль.');
      this.profile = row;
      this.user = this.session.user;
      return this.profile;
    },

    async saveProfile(save, version, keepalive = false) {
      const result = await this.request('/rest/v1/rpc/save_profile', {
        method: 'POST',
        body: { p_save: save, p_version: version },
        keepalive
      });
      if (!result || typeof result.save_version !== 'number') {
        throw new Error('Облако не подтвердило сохранение.');
      }
      if (this.profile) {
        this.profile.save_version = result.save_version;
        this.profile.updated_at = result.updated_at;
      }
      return result;
    },

    async submitScore(mode, wave, score) {
      await this.request('/rest/v1/rpc/submit_score', {
        method: 'POST',
        body: {
          p_mode: mode,
          p_wave: Math.max(0, Math.floor(wave)),
          p_score: Math.max(0, Math.floor(score))
        }
      });
    },

    async fetchLeaderboard(mode) {
      const fields = 'username,display_name,is_owner,mode,wave,score,updated_at';
      return this.request(
        `/rest/v1/leaderboard?select=${fields}&mode=eq.${encodeURIComponent(mode)}`
        + '&is_owner=eq.false&order=wave.desc,score.desc,updated_at.asc&limit=50',
        { method: 'GET' }
      );
    },

    async fetchMyScore(mode) {
      if (!this.session?.user?.id) return null;
      const fields = 'username,display_name,is_owner,mode,wave,score,updated_at';
      const rows = await this.request(
        `/rest/v1/leaderboard?select=${fields}&mode=eq.${encodeURIComponent(mode)}`
        + `&user_id=eq.${encodeURIComponent(this.session.user.id)}&limit=1`,
        { method: 'GET' }
      );
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    },

    async signOut() {
      if (!this.enabled || !this.session?.access_token) {
        this.clearSession();
        return;
      }
      try {
        await this.request('/auth/v1/logout', { method: 'POST', body: {} });
      } catch { /* local sign-out is enough */ }
      finally { this.clearSession(); }
    },

    async deleteProfile() {
      await this.request('/rest/v1/rpc/delete_my_profile', { method: 'POST', body: {} });
      this.clearSession();
    }
  };

  function cloudErrorMessage(error) {
    const message = String(error?.message || '');
    const code = String(error?.code || '');
    if (error?.status === 400 && /invalid login credentials/i.test(message)) {
      return 'Неверный логин или пароль.';
    }
    if (/email not confirmed/i.test(message)) {
      return 'Подтверждение email включено. Выключи Confirm email в Supabase.';
    }
    if (/user already registered/i.test(message) || /already been registered/i.test(message)) {
      return 'Этот логин уже занят. Попробуй войти.';
    }
    if (/database error saving new user/i.test(message) && /duplicate|unique/i.test(message)) {
      return 'Этот логин уже занят. Попробуй войти.';
    }
    if (/relation .* does not exist/i.test(message) || /could not find the (table|function)/i.test(message)) {
      return 'Схема Supabase не установлена. Выполни supabase/schema.sql в SQL Editor.';
    }
    if (/save_conflict/i.test(message) || code === '40001') {
      return 'Прогресс уже обновлён на другом устройстве. Сейчас подтянем свежую версию.';
    }
    if (/rate limit|too many requests/i.test(message) || error?.status === 429) {
      return 'Слишком много попыток. Подожди минуту и попробуй снова.';
    }
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return 'Нет связи с облаком. Проверь интернет.';
    }
    if (/not_authenticated/i.test(message)) {
      return 'Сессия истекла. Войди заново.';
    }
    if (error?.status === 401) {
      return 'Сессия истекла. Войди заново.';
    }
    return message || 'Не удалось связаться с облаком.';
  }

  function cloudAccountId(userId) {
    return `cloud-${userId}`;
  }

  function cloudAccountFor(userId) {
    return AccountAuth.state.accounts.find((account) => account.cloud && account.userId === userId) || null;
  }

  function upsertCloudAccount(profile) {
    const id = cloudAccountId(profile.user_id);
    const owner = !!profile.is_owner;
    let account = cloudAccountFor(profile.user_id);
    if (!account) {
      account = {
        id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        owner,
        exclusive: owner ? 'god' : '',
        cloud: true,
        userId: profile.user_id,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      AccountAuth.add(account);
    } else {
      account.username = profile.username;
      account.displayName = profile.display_name || profile.username;
      account.owner = owner;
      account.exclusive = owner ? 'god' : '';
      account.cloud = true;
      account.userId = profile.user_id;
      account.lastLoginAt = new Date().toISOString();
      AccountAuth.save();
    }
    return account;
  }

  function cloudSaveProgressScore(save) {
    const values = normalizeCloudSave(save).values;
    let score = 0;
    for (const key of [
      STORAGE.money, STORAGE.bestWave, STORAGE.bestScore, STORAGE.bestEndless,
      STORAGE.towerLevel, STORAGE.towers, STORAGE.defendersOwned, STORAGE.achievements
    ]) {
      if (values[key] === undefined || values[key] === null) continue;
      score += 1;
      if (key === STORAGE.money || key === STORAGE.bestWave || key === STORAGE.bestEndless) {
        score += Math.min(1000, Math.max(0, Number(values[key]) || 0));
      }
    }
    return score;
  }

  function chooseInitialCloudSave(profile, carry) {
    const cloudId = cloudAccountId(profile.user_id);
    if (accountProfileHasData(cloudId)) {
      return exportSaveForPrefix(accountPrefix(cloudId));
    }

    const guestSave = guestProfileHasData() ? exportSaveForPrefix('') : null;
    if (profile.username === OWNER_USERNAME && accountProfileHasData(OWNER_ACCOUNT_ID)) {
      const ownerSave = exportSaveForPrefix(accountPrefix(OWNER_ACCOUNT_ID));
      if (guestSave && cloudSaveProgressScore(guestSave) > cloudSaveProgressScore(ownerSave)) {
        return guestSave;
      }
      return ownerSave;
    }

    if (carry && guestSave) return guestSave;
    return null;
  }

  async function finishCloudAuth(profile, options = {}) {
    const accountId = cloudAccountId(profile.user_id);
    const serverSave = normalizeCloudSave(profile.save);
    const hasServerSave = cloudSaveHasData(serverSave);
    const initialSave = chooseInitialCloudSave(profile, !!options.carry);
    const save = hasServerSave ? serverSave : initialSave;
    const account = upsertCloudAccount(profile);

    clearAccountProfile(accountId);
    if (save && cloudSaveHasData(save)) importSaveToPrefix(save, accountPrefix(accountId));

    AccountAuth.setSession(account.id);
    AccountAuth.clearPrompted();
    writeCloudMeta(profile);

    if (!hasServerSave && save && cloudSaveHasData(save)) {
      try {
        const result = await Cloud.saveProfile(save, profile.save_version);
        profile.save_version = result.save_version;
        profile.updated_at = result.updated_at;
        writeCloudMeta(profile);
      } catch (error) {
        console.warn('Cloud initial save failed', error);
      }
    }

    location.reload();
  }

  let cloudSyncEnabled = false;

  function queueCloudPush() {
    if (!cloudSyncEnabled) return;
    CloudSync.markDirty();
  }

  const CloudSync = {
    ready: false,
    timer: 0,
    pushing: false,
    pending: false,
    dirty: false,
    lastSaved: null,

    markDirty() {
      if (!this.ready || !Cloud.profile) return;
      this.dirty = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 1200);
    },

    async start() {
      if (!Cloud.enabled || !AccountAuth.current?.cloud) return;
      const sessionOk = await Cloud.ensureSession();
      if (!sessionOk) {
        AccountAuth.clearSession();
        AccountAuth.clearPrompted();
        location.reload();
        return;
      }

      try {
        const profile = await Cloud.ensureProfile();
        Cloud.profile = profile;
        const account = AccountAuth.current;
        const owner = !!profile.is_owner;
        if (
          account.owner !== owner
          || account.username !== profile.username
          || account.displayName !== (profile.display_name || profile.username)
        ) {
          account.owner = owner;
          account.exclusive = owner ? 'god' : '';
          account.username = profile.username;
          account.displayName = profile.display_name || profile.username;
          AccountAuth.save();
          location.reload();
          return;
        }

        this.ready = true;
        cloudSyncEnabled = true;

        const meta = readCloudMeta();
        const remote = normalizeCloudSave(profile.save);
        const local = exportSaveForPrefix(AccountAuth.prefix);

        if (cloudSaveHasData(remote)) {
          if (!meta.updatedAt || meta.updatedAt !== profile.updated_at) {
            if (cloudSaveHasData(local) && cloudSavesEqual(remote, local)) {
              // The save payload is already identical; refresh metadata without a reload.
            } else {
              this.ready = false;
              clearAccountProfile(account.id);
              importSaveToPrefix(remote, AccountAuth.prefix);
              writeCloudMeta(profile);
              this.dirty = false;
              location.reload();
              return;
            }
          }
        } else if (cloudSaveHasData(local)) {
          await this.flush(true);
          return;
        }

        clearTimeout(this.timer);
        this.timer = 0;
        this.dirty = false;
        writeCloudMeta(profile);
        this.lastSaved = cloudSaveSignature(exportSaveForPrefix(AccountAuth.prefix));
      } catch (error) {
        console.warn('Cloud sync start failed', error);
      }
    },

    async flush(force = false, keepalive = false) {
      if (!this.ready || !Cloud.profile) return;
      if (!force && !this.dirty) return;
      if (this.pushing) {
        this.pending = true;
        return;
      }
      const save = exportSaveForPrefix(AccountAuth.prefix);
      const signature = cloudSaveSignature(save);
      if (!force && !cloudSaveHasData(save)) return;
      if (this.lastSaved !== null && signature === this.lastSaved) {
        this.dirty = false;
        this.pending = false;
        return;
      }

      this.pushing = true;
      try {
        const result = await Cloud.saveProfile(save, Cloud.profile.save_version, keepalive);
        Cloud.profile.save_version = result.save_version;
        Cloud.profile.updated_at = result.updated_at;
        writeCloudMeta(Cloud.profile);
        this.lastSaved = signature;
        this.dirty = false;
        this.pending = false;
      } catch (error) {
        if (error?.code === '40001' || /save_conflict/i.test(String(error?.message || ''))) {
          this.dirty = false;
          await this.resolveConflict();
        } else {
          console.warn('Cloud save failed', error);
        }
      } finally {
        this.pushing = false;
        if (this.pending) {
          this.pending = false;
          this.markDirty();
        }
      }
    },

    async resolveConflict() {
      try {
        const profile = await Cloud.ensureProfile();
        Cloud.profile = profile;
        const remote = normalizeCloudSave(profile.save);
        if (cloudSaveHasData(remote)) {
          this.ready = false;
          clearAccountProfile(AccountAuth.current.id);
          importSaveToPrefix(remote, AccountAuth.prefix);
          writeCloudMeta(profile);
          this.lastSaved = cloudSaveSignature(remote);
          location.reload();
          return;
        }
        const result = await Cloud.saveProfile(
          exportSaveForPrefix(AccountAuth.prefix),
          profile.save_version
        );
        Cloud.profile.save_version = result.save_version;
        Cloud.profile.updated_at = result.updated_at;
        writeCloudMeta(Cloud.profile);
        toast('Облачное сохранение обновлено', '#7dfcc4');
      } catch (error) {
        console.warn('Cloud conflict resolution failed', error);
      }
    }
  };

  function maybeMigrateLocalSessionToCloud() {
    if (!Cloud.enabled) return false;
    if (!AccountAuth.current || AccountAuth.current.cloud) return false;
    AccountAuth.clearSession();
    AccountAuth.clearPrompted();
    location.reload();
    return true;
  }

  function submitCloudRun(mode, wave, score) {
    if (!Cloud.enabled || !AccountAuth.current?.cloud) return;
    Cloud.submitScore(mode, wave, score).catch((error) => {
      console.warn('Cloud score submit failed', error);
    });
  }

  /* ========================= Storage / sound ========================= */

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(`${AccountAuth.prefix}${key}`);
        return raw === null ? fallback : raw;
      } catch { return fallback; }
    },
    set(key, value) {
      try {
        localStorage.setItem(`${AccountAuth.prefix}${key}`, String(value));
        if (cloudSyncEnabled) queueCloudPush();
      } catch { /* private mode */ }
    }
  };

  const BASE_DEFENDERS = Object.freeze(['archer', 'mortar', 'frost']);
  const REGULAR_DEFENDERS = Object.freeze(['archer', 'mortar', 'frost', 'banker', 'booster']);

  function loadOwnedDefenders() {
    const owned = new Set(BASE_DEFENDERS);
    const raw = Store.get(STORAGE.defendersOwned, '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const typeId of parsed) {
            if (!DEF_TYPES[typeId]) continue;
            if (typeId === 'god' && !hasGodAccess()) continue;
            owned.add(typeId);
          }
        }
      } catch { /* corrupted storage falls back to the starting roster */ }
    }
    if (hasGodAccess()) owned.add('god');
    return owned;
  }

  function clampTowerLevel(value) {
    return Math.max(0, Math.min(MAX_TOWER_LEVEL, Math.floor(Number(value) || 0)));
  }

  function sanitizeLoadout(list, slots, fallback = BASE_DEFENDERS) {
    const result = [];
    const source = Array.isArray(list) ? list : [];
    for (const typeId of source) {
      if (!DEF_TYPES[typeId] || typeId === 'god') continue;
      if (!result.includes(typeId)) result.push(typeId);
      if (result.length >= slots) break;
    }
    if (!result.length) {
      for (const typeId of fallback) {
        if (!DEF_TYPES[typeId] || typeId === 'god') continue;
        if (!result.includes(typeId)) result.push(typeId);
        if (result.length >= slots) break;
      }
    }
    return result;
  }

  function loadTowerState() {
    const legacyLevel = clampTowerLevel(Store.get(STORAGE.towerLevel, 0));
    let parsed = null;
    try {
      const raw = Store.get(STORAGE.towers, '');
      parsed = raw ? JSON.parse(raw) : null;
    } catch { parsed = null; }

    const data = parsed && typeof parsed === 'object' ? parsed : {};
    const levels = {
      start: clampTowerLevel(data.levels && data.levels.start !== undefined ? data.levels.start : legacyLevel),
      final: clampTowerLevel(data.levels && data.levels.final)
    };
    const owned = ['start'];
    if (Array.isArray(data.owned) && data.owned.includes('final')) owned.push('final');
    const active = data.active === 'final' && owned.includes('final') ? 'final' : 'start';
    const loadouts = {
      start: sanitizeLoadout(data.loadouts && data.loadouts.start, TOWER_SPECS.start.slots, BASE_DEFENDERS),
      final: sanitizeLoadout(data.loadouts && data.loadouts.final, TOWER_SPECS.final.slots, BASE_DEFENDERS)
    };
    return { active, owned, levels, loadouts };
  }

  function saveTowerState() {
    Store.set(STORAGE.towers, JSON.stringify({
      active: G.towerId,
      owned: [...G.towerOwned],
      levels: { ...G.towerLevels },
      loadouts: {
        start: [...(G.towerLoadouts.start || [])],
        final: [...(G.towerLoadouts.final || [])]
      }
    }));
  }

  /* ========================= Daily quests / achievements ========================= */

  const ACHIEVEMENT_DEFS = Object.freeze([
    {
      id: 'win_easy', name: 'Маленькая победоносная война', desc: 'Победи в Легком режиме',
      reward: 120, target: 1, metric: 'win_easy', icon: 'I'
    },
    {
      id: 'win_medium', name: 'Их слабость', desc: 'Победи в Среднем режиме',
      reward: 250, target: 1, metric: 'win_medium', icon: 'II'
    },
    {
      id: 'win_hard', name: 'Последний рубеж', desc: 'Победи в Сложном режиме',
      reward: 400, target: 1, metric: 'win_hard', icon: 'III'
    },
    {
      id: 'daily_once', name: 'Наемник', desc: 'Выполни все ежедневные квесты 1 раз',
      reward: 300, target: 1, metric: 'daily_once', icon: '★'
    },
    {
      id: 'daily_seven', name: 'Как на работу', desc: 'Выполни все ежедневные квесты 7 раз',
      reward: 700, target: 7, metric: 'daily_seven', icon: '7'
    }
  ]);

  const DAILY_QUEST_GROUPS = [
    [
      { id: 'waves8', name: 'Боевая смена', desc: 'Отбей 8 волн за сегодня', metric: 'waves', target: 8, reward: 30 },
      { id: 'waves15', name: 'Долгая вахта', desc: 'Отбей 15 волн за сегодня', metric: 'waves', target: 15, reward: 45 }
    ],
    [
      { id: 'kills100', name: 'Зачистка', desc: 'Уничтожь 100 врагов за сегодня', metric: 'kills', target: 100, reward: 30 },
      { id: 'kills180', name: 'Мясорубка', desc: 'Уничтожь 180 врагов за сегодня', metric: 'kills', target: 180, reward: 45 }
    ],
    [
      { id: 'win1', name: 'Победный рубеж', desc: 'Победи в любом режиме', metric: 'win', target: 1, reward: 60 },
      { id: 'endless8', name: 'Глубокая осада', desc: 'Дойди до 8-й волны в Бесконечном режиме', metric: 'endless', target: 8, reward: 50 },
      { id: 'boss2', name: 'Охотник', desc: 'Уничтожь 2 боссов за сегодня', metric: 'boss', target: 2, reward: 45 },
      { id: 'place12', name: 'Строитель', desc: 'Поставь 12 защитников за сегодня', metric: 'place', target: 12, reward: 25 }
    ]
  ];

  const DAILY_QUEST_DEFS = new Map(
    DAILY_QUEST_GROUPS.flat().map((quest) => [quest.id, quest])
  );

  function dayKey(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function next() {
      value = (value + 0x6D2B79F5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateDailyQuests(seed) {
    const random = seededRandom(seed);
    return DAILY_QUEST_GROUPS.map((group) => {
      const pick = group[Math.floor(random() * group.length)];
      return { id: pick.id, progress: 0, done: false };
    });
  }

  function makeFreshDailyState(key) {
    const seed = hashText(`last-tower:${key}`);
    return {
      day: key,
      seed,
      quests: generateDailyQuests(seed),
      allDone: false,
      allDoneDays: 0
    };
  }

  function normalizeDailyState(raw, key) {
    const carriedDays = Math.max(0, Math.min(9999, Math.floor(Number(raw && raw.allDoneDays) || 0)));
    if (!raw || raw.day !== key || !Array.isArray(raw.quests) || raw.quests.length !== 3) {
      const fresh = makeFreshDailyState(key);
      fresh.allDoneDays = carriedDays;
      return fresh;
    }

    const quests = [];
    for (const saved of raw.quests) {
      const def = saved && DAILY_QUEST_DEFS.get(saved.id);
      if (!def) return makeFreshDailyState(key);
      const progress = Math.max(0, Math.min(def.target, Math.floor(Number(saved.progress) || 0)));
      quests.push({ id: def.id, progress, done: progress >= def.target });
    }

    let allDone = quests.every((quest) => quest.done);
    let allDoneDays = carriedDays;
    if (allDone && !raw.allDone) allDoneDays += 1;

    return {
      day: key,
      seed: Number(raw.seed) || hashText(`last-tower:${key}`),
      quests,
      allDone,
      allDoneDays
    };
  }

  function loadDailyState() {
    const key = dayKey();
    let raw = null;
    try {
      raw = JSON.parse(Store.get(STORAGE.daily, 'null'));
    } catch { raw = null; }
    return normalizeDailyState(raw, key);
  }

  function loadAchievements() {
    const unlocked = new Set();
    try {
      const raw = JSON.parse(Store.get(STORAGE.achievements, '[]'));
      if (Array.isArray(raw)) {
        for (const id of raw) {
          if (ACHIEVEMENT_DEFS.some((def) => def.id === id)) unlocked.add(id);
        }
      }
    } catch { /* corrupted achievements are ignored */ }
    return unlocked;
  }

  function makeEnemyKillState() {
    const types = {};
    for (const id of ENEMY_ORDER) types[id] = { kills: 0, hpSum: 0 };
    return { total: 0, types };
  }

  function normalizeEnemyKillState(raw) {
    const state = makeEnemyKillState();
    if (!raw || typeof raw !== 'object' || !raw.types || typeof raw.types !== 'object') return state;

    let total = 0;
    for (const id of ENEMY_ORDER) {
      const saved = raw.types[id];
      if (!saved || typeof saved !== 'object') continue;
      const kills = Math.max(0, Math.min(9999999, Math.floor(Number(saved.kills) || 0)));
      const hpSum = Math.max(0, Math.round(Number(saved.hpSum) || 0));
      state.types[id] = { kills, hpSum };
      total += kills;
    }
    state.total = total;
    return state;
  }

  function loadEnemyKills() {
    try {
      return normalizeEnemyKillState(JSON.parse(Store.get(STORAGE.enemyKills, 'null')));
    } catch {
      return makeEnemyKillState();
    }
  }

  function enemyKillRecord(id) {
    if (!G.enemyKills.types[id]) G.enemyKills.types[id] = { kills: 0, hpSum: 0 };
    return G.enemyKills.types[id];
  }

  function enemyUnlocked(id) {
    const def = ENEMY_TYPES[id];
    if (!def) return false;
    return enemyKillRecord(id).kills >= def.unlock;
  }

  function enemyUnlockedCount() {
    return ENEMY_ORDER.reduce((count, id) => count + (enemyUnlocked(id) ? 1 : 0), 0);
  }

  function enemyAverageHp(id) {
    const record = enemyKillRecord(id);
    return record.kills > 0 ? Math.round(record.hpSum / record.kills) : null;
  }

  function queueEnemyKillsSave() {
    if (G.enemyKillsSaveTimer) clearTimeout(G.enemyKillsSaveTimer);
    G.enemyKillsSaveTimer = setTimeout(() => {
      G.enemyKillsSaveTimer = 0;
      saveEnemyKills();
    }, 450);
  }

  function saveEnemyKills() {
    if (G.enemyKillsSaveTimer) {
      clearTimeout(G.enemyKillsSaveTimer);
      G.enemyKillsSaveTimer = 0;
    }
    Store.set(STORAGE.enemyKills, JSON.stringify(G.enemyKills));
  }

  function recordEnemyKill(enemy) {
    if (!enemy || !ENEMY_TYPES[enemy.type]) return;
    const record = enemyKillRecord(enemy.type);
    const before = record.kills;
    record.kills += 1;
    record.hpSum += Math.max(1, Math.round(enemy.maxHp));
    G.enemyKills.total += 1;
    queueEnemyKillsSave();

    const def = ENEMY_TYPES[enemy.type];
    if (before < def.unlock && record.kills >= def.unlock) {
      showToast(`Бестиарий: открыт «${def.name}»`, 'gold', 3600);
    }
    if (G.progressOpen && G.progressTab === 'enemies') renderEnemies();
    syncEnemyBadge();
  }

  const Sound = (() => {
    let actx = null;
    let master = null;
    let noiseBuffer = null;
    let muted = Store.get(STORAGE.muted, '0') === '1';
    const last = {};

    function init() {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
          actx = new AC();
          master = actx.createGain();
          master.gain.value = muted ? 0 : 0.55;
          master.connect(actx.destination);

          const len = Math.floor(actx.sampleRate * 0.35);
          noiseBuffer = actx.createBuffer(1, len, actx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        } catch {
          actx = null;
          master = null;
          return;
        }
      }
      if (actx.state === 'suspended') actx.resume().catch(() => {});
    }

    function gate(key, ms) {
      const t = performance.now();
      if (last[key] && t - last[key] < ms) return false;
      last[key] = t;
      return true;
    }

    function tone(freq, dur, type = 'sine', vol = 0.08, slide = 0, delay = 0) {
      if (!actx || muted) return;
      const t = actx.currentTime + delay;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    function noise(dur = 0.08, vol = 0.04, freq = 900, q = 0.8) {
      if (!actx || muted || !noiseBuffer) return;
      const t = actx.currentTime;
      const src = actx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = actx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(t + dur);
    }

    return {
      init,
      get muted() { return muted; },
      setMuted(value) {
        muted = !!value;
        Store.set(STORAGE.muted, muted ? '1' : '0');
        if (master && actx) {
          master.gain.cancelScheduledValues(actx.currentTime);
          master.gain.setTargetAtTime(muted ? 0 : 0.55, actx.currentTime, 0.02);
        }
      },
      click() { tone(720, 0.045, 'triangle', 0.022, 920); },
      select() { tone(410, 0.07, 'triangle', 0.035, 620); tone(820, 0.06, 'sine', 0.02, 980, 0.03); },
      error() { tone(150, 0.11, 'square', 0.025, 110); },
      build() {
        tone(180, 0.16, 'triangle', 0.05, 90);
        tone(520, 0.12, 'sine', 0.035, 760, 0.07);
        noise(0.12, 0.025, 600, 1.1);
      },
      upgrade() {
        tone(330, 0.12, 'triangle', 0.04, 500);
        tone(660, 0.16, 'sine', 0.04, 990, 0.09);
      },
      sell() { tone(440, 0.12, 'triangle', 0.035, 240); },
      zap() {
        if (!gate('zap', 40)) return;
        noise(0.09, 0.04, 1800, 0.7);
        tone(960, 0.12, 'sawtooth', 0.025, 180);
      },
      arrow() {
        if (!gate('arrow', 65)) return;
        noise(0.045, 0.014, 2200, 1.4);
      },
      mortar() {
        if (!gate('mortar', 90)) return;
        tone(92, 0.18, 'sine', 0.055, 55);
        noise(0.12, 0.025, 380, 0.8);
      },
      boom() {
        if (!gate('boom', 55)) return;
        noise(0.17, 0.055, 220, 0.55);
        tone(72, 0.18, 'sine', 0.05, 40);
      },
      hit() {
        if (!gate('hit', 45)) return;
        noise(0.035, 0.018, 1400, 1.1);
      },
      kill() {
        if (!gate('kill', 55)) return;
        tone(260, 0.08, 'triangle', 0.018, 180);
      },
      heal() {
        if (!gate('heal', 120)) return;
        tone(620, 0.16, 'sine', 0.018, 880);
        tone(930, 0.18, 'sine', 0.012, 1240, 0.05);
      },
      summon() {
        if (!gate('summon', 220)) return;
        tone(160, 0.24, 'triangle', 0.028, 260);
        tone(320, 0.2, 'sine', 0.018, 480, 0.08);
      },
      hurt() {
        noise(0.18, 0.06, 160, 0.5);
        tone(110, 0.28, 'sawtooth', 0.035, 55);
      },
      wave() {
        tone(170, 0.32, 'sine', 0.05, 240);
        tone(340, 0.26, 'triangle', 0.035, 460, 0.12);
      },
      victory() {
        [392, 523, 659, 784].forEach((f, i) => tone(f, 0.24, 'sine', 0.035, 0, i * 0.09));
      },
      boss() {
        tone(58, 0.9, 'sawtooth', 0.055, 39);
        noise(0.6, 0.035, 120, 0.5);
      },
      gameover() {
        [220, 174, 146, 110].forEach((f, i) => tone(f, 0.5, 'sine', 0.045, 0, i * 0.16));
        noise(0.7, 0.04, 160, 0.4);
      },
      ability(kind) {
        if (kind === 'repair') {
          [330, 440, 660].forEach((f, i) => tone(f, 0.3, 'sine', 0.032, 0, i * 0.06));
        } else if (kind === 'frost') {
          tone(880, 0.4, 'sine', 0.035, 220);
          noise(0.3, 0.025, 2600, 0.8);
        } else {
          tone(180, 0.35, 'sawtooth', 0.045, 70);
          noise(0.22, 0.045, 900, 0.7);
        }
      }
    };
  })();

  /* ========================= DOM ========================= */

  const app = $('app');
  const stage = $('stage');
  const ctx = stage.getContext('2d', { alpha: false, desynchronized: true });
  const backdropCache = document.createElement('canvas');
  const FORCE_HQ = new URLSearchParams(location.search).has('hq');

  const dom = {
    app,
    stage,
    hud: $('hud'),
    controls: $('controls'),
    waveValue: $('waveValue'),
    hpValue: $('hpValue'),
    hpFill: $('hpFill'),
    hpTrack: $('hpTrack'),
    coreMeter: $('coreMeter'),
    essenceValue: $('essenceValue'),
    currencyPill: $('currencyPill'),
    killValue: $('killValue'),
    soundBtn: $('soundBtn'),
    pauseBtn: $('pauseBtn'),
    inventoryBtn: $('inventoryBtn'),
    menuInventoryBtn: $('menuInventoryBtn'),

    phaseBar: $('phaseBar'),
    phaseText: $('phaseText'),
    phaseBonus: $('phaseBonus'),
    startWaveBtn: $('startWaveBtn'),
    bossBar: $('bossBar'),
    bossName: $('bossName'),
    bossFill: $('bossFill'),
    bossHpText: $('bossHpText'),
    bossCast: $('bossCast'),

    waveBanner: $('waveBanner'),
    bannerKicker: $('bannerKicker'),
    bannerTitle: $('bannerTitle'),
    bannerSub: $('bannerSub'),
    toast: $('toast'),
    toastText: $('toastText'),
    toastIcon: $('toastIcon'),

    inspector: $('inspector'),
    inspectorClose: $('inspectorClose'),
    inspectorIcon: $('inspectorIcon'),
    inspectorName: $('inspectorName'),
    inspectorMeta: $('inspectorMeta'),
    upgradeBtn: $('upgradeBtn'),
    upgradeCost: $('upgradeCost'),
    sellBtn: $('sellBtn'),
    sellValue: $('sellValue'),
    shopHint: $('shopHint'),
    defTotal: $('defTotal'),
    defLimitArcher: $('defLimitArcher'),
    defLimitMortar: $('defLimitMortar'),
    defLimitFrost: $('defLimitFrost'),
    defLimitBanker: $('defLimitBanker'),
    defLimitBooster: $('defLimitBooster'),
    cards: document.querySelector('.cards'),

    zoomWidget: $('zoomWidget'),
    zoomInBtn: $('zoomInBtn'),
    zoomOutBtn: $('zoomOutBtn'),
    zoomResetBtn: $('zoomResetBtn'),
    zoomLabel: $('zoomLabel'),

    abilityNova: $('abilityNova'),
    abilityFrost: $('abilityFrost'),
    abilityRepair: $('abilityRepair'),

    menu: $('menu'),
    bestBadge: $('bestBadge'),
    bestValue: $('bestValue'),
    menuWalletValue: $('menuWalletValue'),
    startBtn: $('startBtn'),
    menuProgressBtn: $('menuProgressBtn'),
    progressBadge: $('progressBadge'),

    instructionsBtn: $('instructionsBtn'),
    instructions: $('instructions'),
    instructionsClose: $('instructionsClose'),
    instructionsDoneBtn: $('instructionsDoneBtn'),

    accountBtn: $('accountBtn'),
    accountChipStatus: $('accountChipStatus'),
    account: $('account'),
    accountClose: $('accountClose'),
    accountKicker: $('accountKicker'),
    accountSub: $('accountSub'),
    accountNote: $('accountNote'),
    accountGuestView: $('accountGuestView'),
    accountProfileView: $('accountProfileView'),
    accountLoginTab: $('accountLoginTab'),
    accountRegisterTab: $('accountRegisterTab'),
    accountLoginForm: $('accountLoginForm'),
    accountRegisterForm: $('accountRegisterForm'),
    accountLoginUsername: $('accountLoginUsername'),
    accountLoginPassword: $('accountLoginPassword'),
    accountRegisterUsername: $('accountRegisterUsername'),
    accountRegisterName: $('accountRegisterName'),
    accountRegisterPassword: $('accountRegisterPassword'),
    accountRegisterConfirm: $('accountRegisterConfirm'),
    accountCarryRow: $('accountCarryRow'),
    accountCarryProgress: $('accountCarryProgress'),
    accountLoginError: $('accountLoginError'),
    accountRegisterError: $('accountRegisterError'),
    accountLoginBtn: $('accountLoginBtn'),
    accountRegisterBtn: $('accountRegisterBtn'),
    accountGuestBtn: $('accountGuestBtn'),
    accountProfileName: $('accountProfileName'),
    accountProfileLogin: $('accountProfileLogin'),
    accountAvatar: $('accountAvatar'),
    accountExclusiveBadge: $('accountExclusiveBadge'),
    accountStatMoney: $('accountStatMoney'),
    accountStatBest: $('accountStatBest'),
    accountStatTower: $('accountStatTower'),
    accountStatAch: $('accountStatAch'),
    accountProfileNote: $('accountProfileNote'),
    accountLogoutBtn: $('accountLogoutBtn'),
    accountDeleteBtn: $('accountDeleteBtn'),
    defLimitGod: $('defLimitGod'),
    invCardGod: $('invCardGod'),
    invGodStatus: $('invGodStatus'),
    invGodLimit: $('invGodLimit'),
    invGodDamage: $('invGodDamage'),
    invGodInterval: $('invGodInterval'),
    invGodAura: $('invGodAura'),

    modeSelect: $('modeSelect'),
    modeClose: $('modeClose'),
    modeBackBtn: $('modeBackBtn'),
    modeWalletValue: $('modeWalletValue'),
    endlessBest: $('endlessBest'),
    modeCards: Array.from(document.querySelectorAll('[data-mode]')),

    progress: $('progress'),
    progressClose: $('progressClose'),
    progressDoneBtn: $('progressDoneBtn'),
    progressWalletValue: $('progressWalletValue'),
    progressTabs: Array.from(document.querySelectorAll('[data-progress-tab]')),
    progressViewDaily: $('progressViewDaily'),
    progressViewAchievements: $('progressViewAchievements'),
    progressViewEnemies: $('progressViewEnemies'),
    progressViewLeaderboard: $('progressViewLeaderboard'),
    leaderboardModes: $('leaderboardModes'),
    leaderboardList: $('leaderboardList'),
    leaderboardStatus: $('leaderboardStatus'),
    leaderboardNote: $('leaderboardNote'),
    leaderTabCount: $('leaderTabCount'),
    dailyTabCount: $('dailyTabCount'),
    achTabCount: $('achTabCount'),
    enemyTabCount: $('enemyTabCount'),
    dailyReset: $('dailyReset'),
    dailyAllDone: $('dailyAllDone'),
    dailyQuestList: $('dailyQuestList'),
    achCount: $('achCount'),
    achList: $('achList'),
    enemyKillTotal: $('enemyKillTotal'),
    enemyList: $('enemyList'),

    gameover: $('gameover'),
    resultWave: $('resultWave'),
    resultMode: $('resultMode'),
    resultKills: $('resultKills'),
    resultScore: $('resultScore'),
    resultEssence: $('resultEssence'),
    newRecord: $('newRecord'),
    restartBtn: $('restartBtn'),
    toMenuBtn: $('toMenuBtn'),

    victory: $('victory'),
    victoryMode: $('victoryMode'),
    victoryWave: $('victoryWave'),
    victoryKills: $('victoryKills'),
    victoryScore: $('victoryScore'),
    victoryReward: $('victoryReward'),
    victoryWallet: $('victoryWallet'),
    victoryRecord: $('victoryRecord'),
    victoryRestartBtn: $('victoryRestartBtn'),
    victoryMenuBtn: $('victoryMenuBtn'),

    pause: $('pause'),
    pauseWave: $('pauseWave'),
    pauseHp: $('pauseHp'),
    pauseEssence: $('pauseEssence'),
    resumeBtn: $('resumeBtn'),
    pauseRestartBtn: $('pauseRestartBtn'),
    pauseSoundBtn: $('pauseSoundBtn'),
    pauseMenuBtn: $('pauseMenuBtn'),

    inventory: $('inventory'),
    inventoryClose: $('inventoryClose'),
    inventoryDoneBtn: $('inventoryDoneBtn'),
    invWalletValue: $('invWalletValue'),
    invTabs: Array.from(document.querySelectorAll('[data-inv-tab]')),
    invViewDefenders: $('invViewDefenders'),
    invViewTower: $('invViewTower'),
    invDefCount: $('invDefCount'),
    invArcherDmg: $('invArcherDmg'),
    invArcherRange: $('invArcherRange'),
    invMortarDmg: $('invMortarDmg'),
    invMortarSplash: $('invMortarSplash'),
    invFrostDmg: $('invFrostDmg'),
    invFrostRange: $('invFrostRange'),
    invCardBanker: $('invCardBanker'),
    invCardBooster: $('invCardBooster'),
    invBankerStatus: $('invBankerStatus'),
    invBoosterStatus: $('invBoosterStatus'),
    invBankerIncome: $('invBankerIncome'),
    invBankerLimit: $('invBankerLimit'),
    invBoosterDamage: $('invBoosterDamage'),
    invBoosterRange: $('invBoosterRange'),
    invBoosterLimit: $('invBoosterLimit'),
    invBuyBanker: $('invBuyBanker'),
    invBuyBooster: $('invBuyBooster'),
    invDefenderHint: $('invDefenderHint'),
    invTowerCard: $('invTowerCard'),
    invTowerSelector: $('invTowerSelector'),
    invTowerStatus: $('invTowerStatus'),
    invTowerName: $('invTowerName'),
    invTowerDesc: $('invTowerDesc'),
    invTowerAbilities: $('invTowerAbilities'),
    invTowerSlots: $('invTowerSlots'),
    invTowerUnlock: $('invTowerUnlock'),
    invTowerUnlockBtn: $('invTowerUnlockBtn'),
    invTowerTag: $('invTowerTag'),
    invTowerHp: $('invTowerHp'),
    invTowerPower: $('invTowerPower'),
    invTowerRepair: $('invTowerRepair'),
    invTowerLimit: $('invTowerLimit'),
    invTowerLimitNote: $('invTowerLimitNote'),
    invLoadoutLine: $('invLoadoutLine'),
    invTowerLevel: $('invTowerLevel'),
    invTowerPips: $('invTowerPips'),
    invTowerNext: $('invTowerNext'),
    invTowerCost: $('invTowerCost'),
    invTowerHint: $('invTowerHint'),
    invTowerUpgradeBtn: $('invTowerUpgradeBtn'),

    rotateNotice: $('rotateNotice')
  };

  /* ========================= Layout / state ========================= */

  const layout = {
    w: 390, h: 844, cx: 195, cy: 380, r: 172, scale: 1,
    top: 110, bottom: 640
  };

  const camera = {
    scale: 1,
    x: 0,
    y: 0,
    min: 1,
    max: 3
  };

  let stars = [];
  let motes = [];
  let cracks = [];
  let dpr = 1;
  let qualityScale = 1;
  let perfTime = 0;
  let perfFrames = 0;

  const initialTowerState = loadTowerState();

  const G = {
    state: 'menu',
    prevState: 'prep',
    mode: 'medium',
    targetWave: MODE_DEFS.medium.waves,
    money: Number(Store.get(STORAGE.money, 0)) || 0,
    moneyEarned: 0,
    bankerEarned: 0,
    ownedDefenders: loadOwnedDefenders(),
    towerId: initialTowerState.active,
    towerOwned: new Set(initialTowerState.owned),
    towerLevels: { ...initialTowerState.levels },
    towerLoadouts: {
      start: [...initialTowerState.loadouts.start],
      final: [...initialTowerState.loadouts.final]
    },
    towerLevel: initialTowerState.levels[initialTowerState.active],
    wave: 0,
    hp: TOWER_LEVELS[initialTowerState.levels[initialTowerState.active]].hp,
    maxHp: TOWER_LEVELS[initialTowerState.levels[initialTowerState.active]].hp,
    essence: 90,
    kills: 0,
    score: 0,
    time: 0,
    visual: 0,
    hudTimer: 0,
    incomeTimer: 0,
    prepTimer: 0,
    prepTotal: 8,
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 1,
    combatTime: 0,

    enemies: [],
    defenders: [],
    projectiles: [],
    particles: [],
    rings: [],
    beams: [],
    floats: [],
    skulls: [],

    selected: null,
    inspectedDef: null,
    hoverDefender: null,
    pointer: null,

    inventoryOpen: false,
    inventoryPaused: false,
    inventoryReturnState: 'menu',
    inventoryTab: 'defenders',
    inventoryTowerId: initialTowerState.active,
    inventoryFocus: null,

    progressOpen: false,
    progressTab: 'daily',
    progressFocus: null,
    leaderMode: 'medium',
    leaderboardLoading: false,
    leaderboardRows: [],
    leaderboardOwn: null,
    leaderboardError: '',

    guideOpen: false,
    guideFocus: null,

    authOpen: false,
    authFocus: null,
    authTab: 'login',
    authBusy: false,

    daily: loadDailyState(),
    achievements: loadAchievements(),
    enemyKills: loadEnemyKills(),
    enemyKillsSaveTimer: 0,
    dailySaveTimer: 0,

    modeOpen: false,
    modeFocus: null,

    abilities: {
      nova: { cd: 0, max: ABILITY_DEFS.nova.max },
      frost: { cd: 0, max: ABILITY_DEFS.frost.max },
      repair: { cd: 0, max: ABILITY_DEFS.repair.max }
    },

    manualCd: 0,
    towerCd: 0,
    towerFreeze: 0,
    towerFlash: 0,
    shake: 0,
    flash: 0,
    flashColor: '#67efff',
    reticle: null,

    toastTimer: 0,
    bannerTimer: 0,
    resultTimer: 0,
    waveSaved: false,
    tutorialDone: Store.get(STORAGE.tutorial, '0') === '1',
    upgradeTipShown: false,

    bestAtStart: 0,
    bestScoreAtStart: 0,
    sessionBestSaved: 0,

    lastEssence: 90,
    pulseCd: 0,
    deniedCd: 0,
    hoverFine: false,
    orientationPaused: false
  };

  /* ========================= Canvas / resize ========================= */

  function screenToWorld(x, y) {
    return {
      x: (x - camera.x) / camera.scale,
      y: (y - camera.y) / camera.scale
    };
  }

  function clampCamera() {
    if (camera.scale <= 1.001) {
      camera.scale = 1;
      camera.x = 0;
      camera.y = 0;
      return;
    }
    const s = camera.scale;
    const left = (layout.cx - layout.r) * s;
    const right = (layout.cx + layout.r) * s;
    const top = (layout.cy - layout.r) * s;
    const bottom = (layout.cy + layout.r) * s;
    const minX = layout.w * 0.15 - right;
    const maxX = layout.w * 0.85 - left;
    const minY = layout.h * 0.15 - bottom;
    const maxY = layout.h * 0.85 - top;
    camera.x = clamp(camera.x, minX, maxX);
    camera.y = clamp(camera.y, minY, maxY);
  }

  function updateZoomUi() {
    if (!dom.zoomLabel) return;
    dom.zoomLabel.textContent = `${camera.scale.toFixed(1).replace('.', ',')}×`;
    dom.zoomOutBtn.disabled = camera.scale <= 1.001;
    dom.zoomInBtn.disabled = camera.scale >= camera.max - 0.001;
    dom.zoomWidget.classList.toggle('is-zoomed', camera.scale > 1.001);
  }

  function zoomAt(screenX, screenY, targetScale) {
    const next = clamp(targetScale, camera.min, camera.max);
    if (Math.abs(next - camera.scale) < 0.001) return;
    const ratio = next / camera.scale;
    camera.x = screenX - (screenX - camera.x) * ratio;
    camera.y = screenY - (screenY - camera.y) * ratio;
    camera.scale = next;
    clampCamera();
    updateZoomUi();
    G.hoverDefender = null;
  }

  function resetCamera() {
    camera.scale = 1;
    camera.x = 0;
    camera.y = 0;
    updateZoomUi();
    G.hoverDefender = null;
  }

  function zoomStep(factor) {
    const cx = clamp(layout.cx * camera.scale + camera.x, layout.w * 0.2, layout.w * 0.8);
    const cy = clamp(layout.cy * camera.scale + camera.y, layout.h * 0.2, layout.h * 0.8);
    zoomAt(cx, cy, camera.scale * factor);
  }

  function sizeStage() {
    stage.width = Math.max(1, Math.round(layout.w * dpr));
    stage.height = Math.max(1, Math.round(layout.h * dpr));
    stage.style.width = layout.w + 'px';
    stage.style.height = layout.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function applyCanvasScale() {
    dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 1.5) * qualityScale);
    sizeStage();
    buildBackdropCache();
  }

  function resize() {
    const rect = app.getBoundingClientRect();
    const originY = rect.top + app.clientTop;
    const old = { cx: layout.cx, cy: layout.cy, r: layout.r };
    const hadLayout = old.r > 0;

    layout.w = Math.round(app.clientWidth);
    layout.h = Math.round(app.clientHeight);
    dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 1.5) * qualityScale);
    sizeStage();

    const hudRect = dom.hud.getBoundingClientRect();
    const ctrlRect = dom.controls.getBoundingClientRect();
    const top = Math.max(76, hudRect.bottom - originY + 4);
    const bottom = Math.max(top + 132, ctrlRect.top - originY - 2);
    const availH = bottom - top;

    layout.top = top;
    layout.bottom = bottom;
    layout.cx = layout.w / 2;
    layout.cy = top + availH * 0.5;
    layout.r = clamp(Math.min(layout.w * 0.455, availH * 0.42), Math.min(100, Math.max(64, availH * 0.42)), 250);
    layout.scale = clamp(layout.r / 178, 0.76, 1.28);

    app.style.setProperty('--hud-h', Math.round(hudRect.height) + 'px');
    app.style.setProperty('--controls-h', Math.round(ctrlRect.height) + 'px');

    if (hadLayout) remapWorld(old);

    clampCamera();
    updateZoomUi();

    stars = Array.from({ length: 56 }, () => ({
      x: Math.random() * layout.w,
      y: Math.random() * layout.h,
      r: rand(0.4, 1.5),
      phase: rand(0, TAU),
      gold: Math.random() < 0.18
    }));

    motes = Array.from({ length: 28 }, () => ({
      x: rand(0, layout.w),
      y: rand(0, layout.h),
      r: rand(0.5, 2),
      speed: rand(3, 12),
      drift: rand(-5, 5),
      phase: rand(0, TAU),
      alpha: rand(0.12, 0.4)
    }));

    cracks = Array.from({ length: 13 }, () => {
      const a = rand(0, TAU);
      const start = rand(layout.r * 0.24, layout.r * 0.5);
      const len = rand(layout.r * 0.12, layout.r * 0.34);
      return {
        x: Math.cos(a) * start,
        y: Math.sin(a) * start,
        a: a + rand(-0.4, 0.4),
        len,
        width: rand(0.5, 1.2)
      };
    });

    buildBackdropCache();
    updateUi();
  }

  function remapWorld(old) {
    const ratio = layout.r / Math.max(1, old.r);
    const mapPoint = (p) => {
      p.x = layout.cx + (p.x - old.cx) * ratio;
      p.y = layout.cy + (p.y - old.cy) * ratio;
    };
    const mapProjectile = (p) => {
      mapPoint(p);
      if (p.prevX !== undefined) p.prevX = layout.cx + (p.prevX - old.cx) * ratio;
      if (p.prevY !== undefined) p.prevY = layout.cy + (p.prevY - old.cy) * ratio;
      if (p.tx !== undefined) p.tx = layout.cx + (p.tx - old.cx) * ratio;
      if (p.ty !== undefined) p.ty = layout.cy + (p.ty - old.cy) * ratio;
      if (p.x0 !== undefined) p.x0 = layout.cx + (p.x0 - old.cx) * ratio;
      if (p.y0 !== undefined) p.y0 = layout.cy + (p.y0 - old.cy) * ratio;
    };

    G.defenders.forEach((d) => {
      mapPoint(d);
      d.radius = 14 * layout.scale;
    });
    G.enemies.forEach((e) => {
      mapPoint(e);
      e.spawnX = layout.cx + (e.spawnX - old.cx) * ratio;
      e.spawnY = layout.cy + (e.spawnY - old.cy) * ratio;
      e.radius = e.base.radius * layout.scale;
    });
    G.projectiles.forEach(mapProjectile);
    G.particles.forEach(mapPoint);
    G.rings.forEach(mapPoint);
    G.beams.forEach((b) => b.points.forEach(mapPoint));
    G.floats.forEach(mapPoint);
    G.hoverDefender = null;
    G.reticle = null;
  }

  /* ========================= Reset / flow ========================= */

  function resetWorld() {
    clearTimeout(G.toastTimer);
    clearTimeout(G.bannerTimer);
    clearTimeout(G.resultTimer);

    G.wave = 0;
    const tower = towerStats();
    G.hp = tower.hp;
    G.maxHp = tower.hp;
    G.essence = 90;
    G.kills = 0;
    G.score = 0;
    G.moneyEarned = 0;
    G.bankerEarned = 0;
    G.targetWave = modeDef().waves;
    G.combatTime = 0;
    G.prepTimer = 0;
    G.prepTotal = 8;
    G.spawnQueue = [];
    G.spawnTimer = 0;
    G.spawnInterval = 1;
    G.incomeTimer = 0;

    G.enemies = [];
    G.defenders = [];
    G.projectiles = [];
    G.particles = [];
    G.rings = [];
    G.beams = [];
    G.floats = [];
    G.skulls = [];

    G.selected = null;
    G.inspectedDef = null;
    G.hoverDefender = null;

    G.abilities = {
      nova: { cd: 0, max: ABILITY_DEFS.nova.max },
      frost: { cd: 0, max: ABILITY_DEFS.frost.max },
      repair: { cd: 0, max: ABILITY_DEFS.repair.max }
    };

    G.manualCd = 0;
    G.towerCd = 0;
    G.towerFreeze = 0;
    G.towerFlash = 0;
    G.shake = 0;
    G.flash = 0;
    G.reticle = null;
    G.deniedCd = 0;
    G.lastEssence = G.essence;
    G.waveSaved = false;
    G.orientationPaused = false;
    G.sessionBestSaved = 0;
    G.upgradeTipShown = false;

    resetCamera();
    closeInspector();
    hidePhaseBar();
    hideBossBar();
    dom.waveBanner.classList.remove('is-showing', 'is-danger', 'is-victory');
    dom.toast.classList.remove('is-visible');
    dom.gameover.classList.remove('is-open');
    dom.victory.classList.remove('is-open');
    dom.victory.setAttribute('aria-hidden', 'true');
    dom.pause.classList.remove('is-open');
    hideModeSelect();
    hideInventory();
    hideProgress();
    hideGuide();
    hideAccount();
  }

  function modeDef(id = G.mode) {
    return MODE_DEFS[id] || MODE_DEFS.medium;
  }

  function waveTargetLabel(mode = modeDef()) {
    return mode.id === 'endless' ? '∞' : String(mode.waves);
  }

  function isEndlessMode() {
    return G.mode === 'endless';
  }

  function towerSpec(towerId = G.towerId) {
    return TOWER_SPECS[towerId] || TOWER_SPECS.start;
  }

  function towerLevelFor(towerId = G.towerId) {
    return clampTowerLevel(G.towerLevels[towerId]);
  }

  function towerStats(level = G.towerLevels[G.towerId], towerId = G.towerId) {
    const spec = towerSpec(towerId);
    const safe = Math.max(0, Math.min(MAX_TOWER_LEVEL, Math.floor(Number(level) || 0)));
    return spec.levels[safe];
  }

  function towerSlots(towerId = G.towerId) {
    return towerSpec(towerId).slots;
  }

  function towerAbilities(towerId = G.towerId) {
    if (towerId === 'final') return ['nova', 'frost', 'repair'];
    const abilities = ['repair'];
    if (towerLevelFor(towerId) >= MAX_TOWER_LEVEL) abilities.unshift('nova');
    return abilities;
  }

  function isTowerOwned(towerId = G.towerId) {
    return G.towerOwned.has(towerId);
  }

  function syncWallet() {
    const value = String(Math.max(0, Math.floor(G.money)));
    if (dom.menuWalletValue) dom.menuWalletValue.textContent = value;
    if (dom.modeWalletValue) dom.modeWalletValue.textContent = value;
    if (dom.invWalletValue) dom.invWalletValue.textContent = value;
    if (dom.progressWalletValue) dom.progressWalletValue.textContent = value;
    if (dom.victoryWallet) dom.victoryWallet.textContent = value;
  }

  /* ========================= Daily quests / achievements state ========================= */

  function saveDailyState() {
    if (G.dailySaveTimer) {
      clearTimeout(G.dailySaveTimer);
      G.dailySaveTimer = 0;
    }
    Store.set(STORAGE.daily, JSON.stringify(G.daily));
  }

  function queueDailySave() {
    if (G.dailySaveTimer) clearTimeout(G.dailySaveTimer);
    G.dailySaveTimer = setTimeout(() => {
      G.dailySaveTimer = 0;
      Store.set(STORAGE.daily, JSON.stringify(G.daily));
    }, 450);
  }

  function saveAchievements() {
    Store.set(STORAGE.achievements, JSON.stringify([...G.achievements]));
  }

  function ensureDailyState() {
    const key = dayKey();
    if (!G.daily || G.daily.day !== key) {
      G.daily = normalizeDailyState(G.daily, key);
      saveDailyState();
      syncProgressBadge();
      if (G.progressOpen) renderProgress();
      return true;
    }
    return false;
  }

  function dailyDoneCount() {
    if (!G.daily || !Array.isArray(G.daily.quests)) return 0;
    return G.daily.quests.reduce((sum, quest) => sum + (quest.done ? 1 : 0), 0);
  }

  function achievementUnlocked(id) {
    return G.achievements.has(id);
  }

  function achievementProgress(def) {
    if (achievementUnlocked(def.id)) return def.target;
    if (def.metric === 'daily_once' || def.metric === 'daily_seven') {
      return Math.min(def.target, Math.max(0, Number(G.daily.allDoneDays) || 0));
    }
    return 0;
  }

  function syncProgressBadge() {
    const done = dailyDoneCount();
    if (dom.progressBadge) {
      dom.progressBadge.textContent = done >= 3 ? 'ГОТОВО' : `${done} / 3`;
    }
    if (dom.menuProgressBtn) {
      dom.menuProgressBtn.classList.toggle('is-complete', done >= 3);
    }
    if (dom.dailyTabCount) dom.dailyTabCount.textContent = `${done} / 3`;
    if (dom.achTabCount) {
      dom.achTabCount.textContent = `${G.achievements.size} / ${ACHIEVEMENT_DEFS.length}`;
    }
    syncEnemyBadge();
  }

  function syncEnemyBadge() {
    if (dom.enemyTabCount) {
      dom.enemyTabCount.textContent = `${enemyUnlockedCount()} / ${ENEMY_ORDER.length}`;
    }
    if (dom.enemyKillTotal) {
      dom.enemyKillTotal.textContent = String(G.enemyKills.total);
    }
  }

  function grantAchievements(ids, announce = true) {
    const unlocked = [];
    let reward = 0;
    for (const id of ids) {
      const def = ACHIEVEMENT_DEFS.find((item) => item.id === id);
      if (!def || G.achievements.has(id)) continue;
      G.achievements.add(id);
      unlocked.push(def);
      reward += def.reward;
    }
    if (!unlocked.length) return 0;

    saveAchievements();
    G.money = Math.max(0, Math.floor(G.money)) + reward;
    Store.set(STORAGE.money, G.money);
    syncWallet();
    syncProgressBadge();
    if (G.progressOpen) renderProgress();

    if (announce) {
      if (unlocked.length === 1) {
        const def = unlocked[0];
        showToast(`Достижение «${def.name}» · +${def.reward} монет`, 'gold', 4400);
      } else {
        showToast(`Достижения: ${unlocked.map((def) => `«${def.name}»`).join(', ')} · +${reward} монет`, 'gold', 4800);
      }
    }
    return unlocked.length;
  }

  function checkDailyAchievements(announce = true) {
    const ids = [];
    if (G.daily.allDoneDays >= 1) ids.push('daily_once');
    if (G.daily.allDoneDays >= 7) ids.push('daily_seven');
    return grantAchievements(ids, announce);
  }

  function checkVictoryAchievements(modeId) {
    const map = { easy: 'win_easy', medium: 'win_medium', hard: 'win_hard' };
    if (map[modeId]) grantAchievements([map[modeId]], true);
  }

  function checkDailyAllDone() {
    if (!G.daily || G.daily.allDone) return;
    if (!G.daily.quests.every((quest) => quest.done)) return;
    G.daily.allDone = true;
    G.daily.allDoneDays = Math.max(0, Number(G.daily.allDoneDays) || 0) + 1;
    saveDailyState();
    syncProgressBadge();
    const unlocked = checkDailyAchievements(true);
    if (!unlocked) {
      showToast('Все ежедневные квесты выполнены!', 'gold', 4000);
    }
    if (G.progressOpen) renderProgress();
  }

  function advanceDaily(metric, value = 1) {
    ensureDailyState();
    let changed = false;
    const completed = [];
    for (const quest of G.daily.quests) {
      const def = DAILY_QUEST_DEFS.get(quest.id);
      if (!def || def.metric !== metric || quest.done) continue;
      const before = quest.progress;
      if (metric === 'win') {
        quest.progress = Math.max(quest.progress, 1);
      } else if (metric === 'endless') {
        quest.progress = Math.max(quest.progress, Math.floor(Number(value) || 0));
      } else {
        quest.progress = Math.min(def.target, quest.progress + Math.max(1, Math.floor(Number(value) || 1)));
      }
      if (quest.progress !== before) changed = true;
      if (quest.progress >= def.target) {
        quest.progress = def.target;
        quest.done = true;
        completed.push(def);
      }
    }
    if (!changed) return;

    if (completed.length) {
      const reward = completed.reduce((sum, def) => sum + def.reward, 0);
      G.money = Math.max(0, Math.floor(G.money)) + reward;
      Store.set(STORAGE.money, G.money);
      syncWallet();
      saveDailyState();
      syncProgressBadge();
      showToast(
        completed.length === 1
          ? `Квест «${completed[0].name}» выполнен · +${completed[0].reward} монет`
          : `Выполнено квестов: ${completed.length} · +${reward} монет`,
        'gold',
        3800
      );
    } else {
      queueDailySave();
    }

    checkDailyAllDone();
    if (G.progressOpen) renderProgress();
  }

  /* ========================= Mode / menu ========================= */

  function startGame(modeId = G.mode || 'medium') {
    const mode = MODE_DEFS[modeId] || MODE_DEFS[G.mode] || MODE_DEFS.medium;
    Sound.init();
    Sound.click();
    G.mode = mode.id;
    G.targetWave = mode.waves;
    resetWorld();
    G.essence = mode.startEssence;
    G.state = 'prep';
    G.prepTimer = 8;
    G.prepTotal = 8;
    G.bestAtStart = mode.id === 'endless'
      ? Math.max(0, Number(Store.get(STORAGE.bestEndless, 0)) || 0)
      : Math.max(0, Number(Store.get(STORAGE.bestWave, 0)) || 0);
    G.bestScoreAtStart = mode.id === 'endless'
      ? 0
      : Math.max(0, Number(Store.get(STORAGE.bestScore, 0)) || 0);
    G.lastEssence = G.essence;

    dom.menu.classList.remove('is-open');
    dom.gameover.classList.remove('is-open');
    dom.victory.classList.remove('is-open');
    dom.pause.classList.remove('is-open');
    dom.startBtn.blur();
    hideBossBar();
    showPhaseBar();
    syncWallet();
    updateUi();
    updateShopHint();

    if (!G.tutorialDone) {
      setTimeout(() => {
        if ((G.state === 'prep' || G.state === 'combat') && !G.tutorialDone) {
          showToast('Выбери защитника внизу и поставь его в любом месте арены', 'info', 4200);
        }
      }, 550);
    } else if (mode.id === 'endless') {
      showBanner('ОСАДА', 'БЕСКОНЕЧНЫЙ РЕЖИМ', 'Волны не заканчиваются · каждые 5 волн — бонус монетами');
    } else {
      showBanner('ПОСЛЕДНИЙ РУБЕЖ', `${mode.name} · ${mode.waves} ВОЛН`, 'Расставь защитников до начала волны');
    }
  }

  function showMenu() {
    Sound.click();
    resetWorld();
    G.state = 'menu';
    G.wave = 0;
    dom.menu.classList.add('is-open');
    dom.gameover.classList.remove('is-open');
    dom.victory.classList.remove('is-open');
    dom.pause.classList.remove('is-open');
    updateMenuBest();
    syncAccountUi();
    syncWallet();
    updateUi();
  }

  function updateMenuBest() {
    const best = Number(Store.get(STORAGE.bestWave, 0)) || 0;
    if (best > 0) {
      dom.bestBadge.hidden = false;
      dom.bestValue.textContent = `волна ${best}`;
    } else {
      dom.bestBadge.hidden = true;
    }
  }

  function startNextWave(manual = false) {
    if (G.state !== 'prep') return;

    if (manual) {
      const bonus = startBonus();
      addEssence(bonus, false);
      addFloat(layout.cx, layout.cy - 40 * layout.scale, `+${bonus}`, '#ffd88f', 12, 0.9);
      Sound.click();
    }

    G.wave++;
    G.state = 'combat';
    G.combatTime = 0;
    G.spawnQueue = buildWave(G.wave);
    G.spawnInterval = Math.max(0.18, 0.92 - G.wave * 0.036);
    G.spawnTimer = 0.35;
    G.incomeTimer = 3.2;
    G.prepTimer = 0;

    hidePhaseBar();
    hideBossBar();
    updateUi();

    const danger = !!bossTypeForWave(G.wave);
    const bossName = bossNameForWave(G.wave);
    showBanner(
      danger ? 'ОБНАРУЖЕН БОСС' : 'ПРИБЛИЖАЕТСЯ',
      `ВОЛНА ${G.wave} / ${waveTargetLabel()}`,
      danger
        ? (bossTypeForWave(G.wave) === 'enemyTower'
          ? 'Финальный босс вышел на арену'
          : `${bossName} идёт за ядром`)
        : (isEndlessMode() ? 'Осада продолжается — волны не закончатся' : waveSubtitle(G.wave)),
      danger
    );
    Sound.wave();

    if (isNecromancerWave(G.wave)) {
      showToast('НЕКРОМАНТ: уничтожь его, пока он не поднял всех скелетов', 'warn', 4400);
    } else if (G.mode === 'hard' && G.wave === G.targetWave) {
      showToast('ВРАЖЕСКАЯ БАШНЯ: сорви молнию и разрушь её до последних сил', 'warn', 4600);
    }

    if (G.wave === 1 && !G.tutorialDone) {
      setTimeout(() => {
        if (G.state === 'combat' && G.wave === 1 && !G.tutorialDone) {
          showToast('Тапни по врагу — башня выстрелит тяжёлым лучом', 'info', 3600);
        }
      }, 2600);
    }
  }

  function waveSubtitle(wave) {
    if (wave < 3) return 'Держи строй';
    if (wave < 6) return 'Враги ускоряются';
    if (wave < 10) return 'Не дай пробить ядро';
    return 'Продержись ещё немного';
  }

  function completeWave() {
    if (G.state !== 'combat') return;

    const mode = modeDef();
    const endless = mode.id === 'endless';
    const finalWave = !endless && G.wave >= G.targetWave;
    const reward = 15 + G.wave * 3;
    addEssence(reward, false);
    const heal = Math.min(2, G.maxHp - G.hp);
    if (heal > 0) {
      G.hp += heal;
      addFloat(layout.cx, layout.cy - 52 * layout.scale, `+${Math.round(heal)} ядро`, '#8fffc2', 9, 1.2);
    }

    const coinBonus = bankerIncome();
    if (coinBonus > 0) {
      G.money = Math.max(0, Math.floor(G.money)) + coinBonus;
      G.bankerEarned += coinBonus;
      Store.set(STORAGE.money, G.money);
      syncWallet();
      const banker = G.defenders.find((d) => d.type === 'banker');
      if (banker) addFloat(banker.x, banker.y - 32, `+${coinBonus} ✦`, '#ffd166', 10, 1.4);
      addFloat(layout.cx, layout.cy - 94 * layout.scale, `Банкир: +${coinBonus} монет`, '#ffd166', 8, 1.4);
    }

    if (!finalWave) {
      G.state = 'prep';
      G.prepTimer = 12;
      G.prepTotal = 12;
      G.spawnQueue = [];
      G.selected = null;
      closeInspector();
      hideBossBar();
      showPhaseBar();
    } else {
      G.spawnQueue = [];
      G.selected = null;
      closeInspector();
      hideBossBar();
      hidePhaseBar();
    }

    G.score += 180;
    G.sessionBestSaved = Math.max(G.sessionBestSaved, G.wave);
    if (endless) {
      if (G.wave > (Number(Store.get(STORAGE.bestEndless, 0)) || 0)) {
        Store.set(STORAGE.bestEndless, G.wave);
      }
    } else if (G.wave > (Number(Store.get(STORAGE.bestWave, 0)) || 0)) {
      Store.set(STORAGE.bestWave, G.wave);
    }

    if (endless && G.wave % 5 === 0) {
      const siegeBonus = 10;
      G.money = Math.max(0, Math.floor(G.money)) + siegeBonus;
      G.moneyEarned += siegeBonus;
      Store.set(STORAGE.money, G.money);
      syncWallet();
      addFloat(layout.cx, layout.cy - 118 * layout.scale, `Рубеж ${G.wave}: +${siegeBonus} монет`, '#ffd88f', 10, 1.8);
    }

    advanceDaily('waves', 1);
    if (endless) advanceDaily('endless', G.wave);

    addFloat(layout.cx, layout.cy - 72 * layout.scale, `+${reward} эссенции`, '#ffd88f', 11, 1.5);
    burst(layout.cx, layout.cy, '#79efff', 28, 110, 0.8);
    addRing(layout.cx, layout.cy, layout.r * 0.12, layout.r * 1.02, '#79efff', 0.8, 2.2);

    if (finalWave) {
      showBanner('РУБЕЖ УДЕРЖАН', 'ПОБЕДА', `${mode.name} · все ${G.targetWave} волн отбиты`, false, true);
      victory();
      return;
    }

    if (endless) {
      showBanner('ОСАДА', `ВОЛНА ${G.wave} ОТБИТА`, `+${reward} эссенции${coinBonus ? ` · +${coinBonus} монет` : ''} · передышка 12 секунд · каждые 5 волн бонус`, false, true);
    } else {
      showBanner('СЕКТОР ЧИСТ', 'ВОЛНА ОТБИТА', `+${reward} эссенции${coinBonus ? ` · +${coinBonus} монет` : ''} · передышка 12 секунд`, false, true);
    }
    Sound.victory();

    if (G.wave === 1 && !G.upgradeTipShown) {
      G.upgradeTipShown = true;
      setTimeout(() => {
        if (G.state === 'prep') {
          showToast('Коснись постройки, чтобы улучшить или продать её', 'gold', 3600);
        }
      }, 2100);
    }

    updateUi();
  }

  function victory() {
    if (G.state === 'victory') return;
    const mode = modeDef();
    G.state = 'victory';
    G.selected = null;
    G.inspectedDef = null;
    closeInspector();
    hidePhaseBar();
    hideBossBar();
    dom.pause.classList.remove('is-open');
    dom.gameover.classList.remove('is-open');

    G.moneyEarned = mode.reward + G.bankerEarned;
    G.money = Math.max(0, Math.floor(G.money)) + mode.reward;
    Store.set(STORAGE.money, G.money);

    const score = G.kills * 12 + Math.max(0, G.wave - 1) * 180 + G.essence;
    G.score = score;

    const prevWave = G.bestAtStart;
    const prevScore = G.bestScoreAtStart;
    const isRecord = G.wave > prevWave || score > prevScore;

    if (G.wave > prevWave) Store.set(STORAGE.bestWave, G.wave);
    if (score > prevScore) Store.set(STORAGE.bestScore, score);
    submitCloudRun(mode.id, G.wave, score);

    dom.victoryMode.textContent = `${mode.name} · ${mode.waves} ВОЛН`;
    dom.victoryWave.textContent = String(G.wave);
    dom.victoryKills.textContent = String(G.kills);
    dom.victoryScore.textContent = String(score);
    dom.victoryReward.textContent = String(G.moneyEarned);
    dom.victoryRecord.hidden = !isRecord;
    syncWallet();
    updateMenuBest();
    updateUi();

    advanceDaily('win', 1);
    checkVictoryAchievements(mode.id);
    saveDailyState();

    G.flash = 0.28;
    G.flashColor = '#ffcf76';
    G.shake = Math.max(G.shake, 10);
    burst(layout.cx, layout.cy, '#ffcf76', 46, 145, 1.1);
    addRing(layout.cx, layout.cy, layout.r * 0.15, layout.r * 1.1, '#ffcf76', 0.9, 2.6);
    Sound.victory();

    G.resultTimer = setTimeout(() => {
      if (G.state === 'victory') {
        dom.victory.classList.add('is-open');
        dom.victory.setAttribute('aria-hidden', 'false');
      }
    }, 1000);
  }

  function gameOver() {
    if (G.state === 'gameover') return;
    G.state = 'gameover';
    G.hp = 0;
    G.selected = null;
    G.inspectedDef = null;
    closeInspector();
    hidePhaseBar();
    hideBossBar();
    dom.pause.classList.remove('is-open');
    dom.victory.classList.remove('is-open');
    dom.victory.setAttribute('aria-hidden', 'true');
    Sound.gameover();

    G.moneyEarned = 0;
    G.shake = 18;
    G.flash = 0.5;
    G.flashColor = '#ff405c';
    burst(layout.cx, layout.cy, '#ff6e87', 70, 210, 1.4, 0.18);
    addRing(layout.cx, layout.cy, 20, layout.r * 1.4, '#ff617c', 1.1, 4);

    if (navigator.vibrate) {
      try { navigator.vibrate([30, 60, 90]); } catch { /* ignore */ }
    }

    const score = G.kills * 12 + Math.max(0, G.wave - 1) * 180 + G.essence;
    G.score = score;

    const mode = modeDef();
    const endless = mode.id === 'endless';
    const prevWave = G.bestAtStart;
    const prevScore = endless ? 0 : G.bestScoreAtStart;
    const isRecord = endless ? G.wave > prevWave : (G.wave > prevWave || score > prevScore);

    if (endless) {
      if (G.wave > prevWave) Store.set(STORAGE.bestEndless, G.wave);
    } else {
      if (G.wave > prevWave) Store.set(STORAGE.bestWave, G.wave);
      if (score > prevScore) Store.set(STORAGE.bestScore, score);
    }
    submitCloudRun(mode.id, G.wave, score);

    if (endless) advanceDaily('endless', G.wave);
    saveDailyState();

    dom.resultWave.textContent = String(G.wave);
    dom.resultMode.textContent = endless
      ? `БЕСКОНЕЧНЫЙ · ВОЛНА ${G.wave}`
      : `${mode.name} · ЦЕЛЬ ${mode.waves} ВОЛН`;
    dom.resultKills.textContent = String(G.kills);
    dom.resultScore.textContent = String(score);
    dom.resultEssence.textContent = String(Math.floor(G.essence));
    dom.newRecord.hidden = !isRecord;

    G.resultTimer = setTimeout(() => {
      if (G.state === 'gameover') {
        dom.gameover.classList.add('is-open');
        updateMenuBest();
      }
    }, 900);

    updateUi();
  }

  /* ========================= Waves ========================= */

  function bossTypeForWave(n) {
    if (G.mode === 'hard' && n >= modeDef().waves) return 'enemyTower';
    if (n % 5 !== 0) return null;
    return G.mode === 'easy' || G.mode === 'endless' ? 'boss' : 'king';
  }

  function isNecromancerWave(n) {
    return G.mode === 'hard' && (n === 10 || n === 14);
  }

  function isSkullDropWave(n) {
    return G.mode === 'hard' && (n === 9 || n === 13);
  }

  function bossNameForWave(n) {
    const type = bossTypeForWave(n);
    return type ? ENEMY_TYPES[type].name : '';
  }

  function buildWave(n) {
    const count = Math.min(7 + Math.floor(n * 1.95), 48);
    const mode = modeDef();
    const pool = [['thrall', 100]];
    if (n >= 2) pool.push(['runner', 28 + n * 2]);
    if (n >= 4) pool.push(['spitter', 18 + n * 1.2]);
    if (n >= 6) pool.push(['brute', 16 + n * 1.9]);

    // Поддержка и смертники доступны только со среднего режима.
    if (mode.id !== 'easy' && n >= 4) pool.push(['healer', 9 + n * 0.6]);
    if (mode.id !== 'easy' && n >= 5) pool.push(['kamikaze', 10 + n * 0.9]);
    if (mode.id === 'hard' && n >= 7) pool.push(['drummer', 8 + n * 0.55]);

    const totalWeight = pool.reduce((sum, item) => sum + item[1], 0);
    const list = [];
    for (let i = 0; i < count; i++) {
      let roll = Math.random() * totalWeight;
      let type = 'thrall';
      for (const [id, weight] of pool) {
        roll -= weight;
        if (roll <= 0) { type = id; break; }
      }
      list.push(type);
    }

    // Keep a little breathing room at the start of each wave.
    list.sort(() => Math.random() - 0.5);
    if (n >= 3) {
      const safe = Math.min(2, list.length);
      for (let i = 0; i < safe; i++) list[i] = 'thrall';
    }

    if (isNecromancerWave(n)) {
      list.splice(Math.min(2, list.length), 0, 'necromancer');
    }

    const bossType = bossTypeForWave(n);
    if (bossType === 'enemyTower') list.unshift(bossType);
    else if (bossType) list.push(bossType);
    return list;
  }

  function spawnEnemy(typeId, opts = {}) {
    const base = ENEMY_TYPES[typeId];
    if (!base) return null;

    let x;
    let y;
    if (Number.isFinite(opts.x) && Number.isFinite(opts.y)) {
      x = opts.x;
      y = opts.y;
    } else if (base.towerBoss) {
      x = layout.cx;
      y = layout.cy - layout.r * 0.62;
    } else {
      const angle = rand(0, TAU);
      const spawnR = layout.r * 1.15;
      x = layout.cx + Math.cos(angle) * spawnR;
      y = layout.cy + Math.sin(angle) * spawnR;
    }

    const mode = modeDef();
    const hpScale = (1 + (G.wave - 1) * 0.24) * mode.hpScale;
    const dmgScale = (1 + (G.wave - 1) * 0.085) * mode.damageScale;
    const speedScale = (1 + Math.min(0.42, (G.wave - 1) * 0.018)) * mode.speedScale;

    const e = new Enemy(typeId, x, y, base, hpScale, dmgScale, speedScale);
    e.summoner = opts.summoner || null;
    G.enemies.push(e);

    addRing(x, y, 2, base.boss ? 65 : (opts.summoner ? 34 : 28), base.color, 0.45, 2);
    burst(x, y, base.color, base.boss ? 24 : (opts.summoner ? 12 : 7), base.boss ? 90 : 32, 0.55);

    if (base.boss && !opts.silentBoss) {
      G.shake = Math.max(G.shake, 10);
      showBanner('ОПАСНОСТЬ', base.name.toUpperCase(), base.bossHint || 'Его нужно остановить любой ценой', true);
      showToast(`${base.name} приближается! Береги ядро`, 'warn', 3400);
      Sound.boss();
      updateUi();
    }
    return e;
  }

  function updateWave(dt) {
    if (G.state !== 'combat') return;

    G.combatTime += dt;
    G.incomeTimer -= dt;
    if (G.incomeTimer <= 0) {
      G.incomeTimer = 3.6;
      addEssence(1, true);
    }

    if (G.spawnQueue.length > 0) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        spawnEnemy(G.spawnQueue.shift());
        G.spawnTimer = G.spawnInterval * rand(0.78, 1.2);
      }
    }

    updateEnemies(dt);
    updateDefenders(dt);
    updateTower(dt);
    updateProjectiles(dt);

    G.enemies = G.enemies.filter((e) => !e.dead);

    if (G.spawnQueue.length === 0 && G.enemies.length === 0) {
      completeWave();
    }
  }

  function prepTick(dt) {
    if (G.state !== 'prep') return;
    G.prepTimer -= dt;
    if (G.prepTimer <= 0) startNextWave(false);
  }

  function startBonus() {
    return 4 + Math.min(8, Math.floor(G.wave / 2));
  }

  /* ========================= Defender ========================= */

  class Defender {
    constructor(typeId, x, y) {
      this.type = typeId;
      this.def = DEF_TYPES[typeId];
      this.x = x;
      this.y = y;
      this.level = 1;
      this.invested = this.def.cost;
      this.aim = -Math.PI / 2;
      this.cooldown = rand(0.1, 0.45);
      this.recoil = 0;
      this.hitFlash = 0;
      this.pulse = 0;
      this.freeze = 0;
      this.dead = false;
      this.radius = 14 * layout.scale;
      this.applyStats(true);
    }

    applyStats(fullHeal = false) {
      const k = this.level - 1;
      const d = this.def;
      const oldMax = this.maxHp || 0;
      this.maxHp = Math.round(d.hp * (1 + 0.42 * k));
      this.baseDamage = d.damage * (1 + 0.52 * k);
      this.baseInterval = d.interval * (1 - 0.065 * k);
      this.baseRange = d.range + 11 * k;
      this.baseSplash = (d.splash || 0) + (d.splash ? 4 * k : 0);
      this.income = d.income ? d.income + k : 0;
      this.auraRadius = (d.auraRadius || 0) + 10 * k;
      this.auraDamage = (d.auraDamage || 0) + 0.06 * k;
      this.auraRange = (d.auraRange || 0) + 0.03 * k;
      this.auraSpeed = (d.auraSpeed || 0) + 0.04 * k;
      this.damage = this.baseDamage;
      this.interval = this.baseInterval;
      this.range = this.baseRange;
      this.splash = this.baseSplash;
      this.refreshAura();
      if (fullHeal || !this.hp) this.hp = this.maxHp;
      else if (this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
      this.hp = Math.min(this.hp, this.maxHp);
    }

    refreshAura() {
      if (this.def.support) {
        this.aura = null;
        return;
      }
      let damage = 1;
      let range = 1;
      let speed = 1;
      for (const b of G.defenders) {
        if (b.dead || b === this) continue;
        if (b.type !== 'booster' && b.type !== 'god') continue;
        if (dist(this.x, this.y, b.x, b.y) > b.auraRadius) continue;
        damage += b.auraDamage;
        range += b.auraRange;
        speed += b.auraSpeed;
      }
      this.damage = this.baseDamage * damage;
      this.range = this.baseRange * range;
      this.interval = this.baseInterval / speed;
      this.splash = this.baseSplash;
      this.aura = damage > 1.001 ? { damage, range, speed } : null;
    }

    upgrade() {
      this.level++;
      this.applyStats();
    }

    update(dt) {
      this.recoil = Math.max(0, this.recoil - dt * 4.6);
      this.hitFlash = Math.max(0, this.hitFlash - dt * 5);
      this.pulse = Math.max(0, this.pulse - dt * 2.4);

      if (this.freeze > 0) {
        this.freeze -= dt;
        return;
      }
      if (this.def.support) return;

      let target = null;
      let best = Infinity;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d > this.range + e.radius) continue;
        const towardTower = dist(e.x, e.y, layout.cx, layout.cy);
        const score = towardTower * 0.85 + d * 0.15;
        if (score < best) { best = score; target = e; }
      }

      if (target) {
        const desired = angleTo(this.x, this.y, target.x, target.y);
        let delta = ((desired - this.aim + Math.PI * 3) % TAU) - Math.PI;
        this.aim += delta * Math.min(1, dt * 12);
      }

      this.cooldown -= dt;
      if (target && this.cooldown <= 0) {
        this.attack(target);
      }
    }

    attack(target) {
      if (this.dead || this.def.support || target.dead) return;
      this.cooldown = this.interval;
      this.recoil = 1;

      if (this.type === 'archer') {
        const a = this.aim;
        G.projectiles.push({
          kind: 'arrow',
          x: this.x + Math.cos(a) * 13 * layout.scale,
          y: this.y + Math.sin(a) * 13 * layout.scale,
          target,
          speed: 680,
          damage: this.damage,
          color: this.def.color,
          life: 2.1
        });
        Sound.arrow();
      } else if (this.type === 'mortar') {
        G.projectiles.push({
          kind: 'shell',
          x: this.x,
          y: this.y,
          x0: this.x,
          y0: this.y,
          tx: target.x,
          ty: target.y,
          t: 0,
          duration: clamp(dist(this.x, this.y, target.x, target.y) / 290, 0.35, 0.85),
          damage: this.damage,
          splash: this.splash,
          color: this.def.color
        });
        Sound.mortar();
      } else if (this.type === 'god') {
        const beam = [
          { x: this.x, y: this.y - 4 * layout.scale },
          { x: target.x, y: target.y }
        ];
        addBeam(beam, '#ffe89a', 0.14, 2.4);
        addRing(target.x, target.y, 2, this.splash * 0.9, this.def.color, 0.28, 2);
        burst(target.x, target.y, '#fff4bf', 7, 46, 0.3);
        damageEnemy(target, this.damage, { text: false, color: '#fff6c7' });
        if (this.splash > 0) {
          for (const e of G.enemies) {
            if (e.dead || e === target) continue;
            if (dist(target.x, target.y, e.x, e.y) <= this.splash + e.radius) {
              damageEnemy(e, this.damage * 0.5, { text: false, color: '#ffe89a' });
            }
          }
        }
        Sound.arrow();
      } else {
        this.frostPulse();
      }
    }

    frostPulse() {
      this.pulse = 1;
      const radius = this.range;
      addRing(this.x, this.y, 4, radius, this.def.color, 0.55, 2.2);
      burst(this.x, this.y, this.def.color, 12, 42, 0.55);

      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(this.x, this.y, e.x, e.y) <= radius + e.radius) {
          damageEnemy(e, this.damage, { text: false, color: this.def.color });
          e.applySlow(1.45, 0.56);
          if (Math.random() < 0.35) {
            addParticle(e.x + rand(-7, 7), e.y + rand(-7, 7), rand(-8, 8), rand(-22, -5), this.def.color, rand(1, 2.4), 0.6);
          }
        }
      }
      Sound.arrow();
    }

    takeDamage(amount) {
      if (this.dead) return;
      this.hp -= amount;
      this.hitFlash = 1;
      addFloat(this.x, this.y - 20 * layout.scale, `-${Math.round(amount)}`, '#ff9aa9', 8, 0.7);
      if (this.hp <= 0) this.destroy();
      else Sound.hit();
    }

    destroy() {
      if (this.dead) return;
      this.dead = true;
      this.hp = 0;
      const idx = G.defenders.indexOf(this);
      if (idx >= 0) G.defenders.splice(idx, 1);
      refreshAuras();
      burst(this.x, this.y, this.def.color, 22, 90, 0.8);
      addRing(this.x, this.y, 5, 35, this.def.color, 0.5, 2.4);
      if (G.inspectedDef === this) closeInspector();
      Sound.sell();
      showToast(`${this.def.name} потерян`, 'warn', 1600);
      updateUi();
    }
  }

  function refreshAuras() {
    for (const d of G.defenders) {
      if (!d.dead) d.refreshAura();
    }
  }

  function updateDefenders(dt) {
    refreshAuras();
    for (const d of G.defenders) d.update(dt);
  }

  /* ========================= Enemy ========================= */

  class Enemy {
    constructor(typeId, x, y, base, hpScale, dmgScale, speedScale) {
      this.type = typeId;
      this.base = base;
      this.x = x;
      this.y = y;
      this.spawnX = x;
      this.spawnY = y;
      this.maxHp = Math.round(base.hp * hpScale);
      this.hp = this.maxHp;
      this.damage = base.damage * dmgScale;
      this.speed = base.speed * speedScale;
      this.radius = base.radius * layout.scale;
      this.reward = Math.round(base.reward * (1 + Math.min(1.2, G.wave * 0.018)));
      this.isBoss = !!base.boss;
      this.target = null;
      this.retarget = rand(0.2, 0.5);
      this.attackTimer = rand(0.15, 0.55);
      this.freeze = 0;
      this.slow = 0;
      this.slowPower = 0.58;
      this.flash = 0;
      this.lunge = 0;
      this.dead = false;
      this.spawnT = 0;
      this.facing = angleTo(x, y, layout.cx, layout.cy);
      this.seed = rand(0, 100);
      this.zig = rand(-1, 1);
      this.contactTimer = rand(0.15, 0.45);
      this.healTimer = rand(0.4, 1.0);
      this.healAmount = (base.healAmount || 0) + Math.max(0, G.wave - 1) * 0.45;
      this.summonTimer = base.summonInterval || 0;
      this.summoner = null;
      this.reviveTimer = base.necromancer ? rand(0.7, 1.4) : 0;
      this.buffSpeed = 1;
      this.buffDamage = 1;
      this.empower = 0;

      if (base.towerBoss) {
        this.lightningTimer = 8;
        this.lightningCast = null;
        this.summonBossTimer = 13;
        this.stealTimer = 6;
        this.copyTimer = 7;
        this.buffTimer = 9;
        this.stolenFunds = 0;
        this.phasePulse = false;
        this.phaseFreeze = false;
        this.lastStand = false;
        this.lastStandTimer = 0;
        this.lastStandUsed = false;
      }
    }

    applySlow(duration, power) {
      this.slow = Math.max(this.slow, duration);
      this.slowPower = Math.min(this.slowPower, power);
    }

    refreshBuffs() {
      let speed = this.empower > 0 ? 1.18 : 1;
      let damage = this.empower > 0 ? 1.22 : 1;
      if (!this.base.drummer) {
        for (const ally of G.enemies) {
          if (ally === this || ally.dead || !ally.base.drummer) continue;
          if (dist(this.x, this.y, ally.x, ally.y) <= ally.base.buffRadius) {
            speed = Math.max(speed, 1 + ally.base.buffSpeed);
            damage = Math.max(damage, 1 + ally.base.buffDamage);
          }
        }
      }
      this.buffSpeed = speed;
      this.buffDamage = damage;
    }

    getAttackDamage() {
      return this.damage * (this.buffDamage || 1);
    }

    update(dt) {
      if (this.dead) return;
      this.flash = Math.max(0, this.flash - dt * 6);
      this.lunge = Math.max(0, this.lunge - dt * 7);
      this.spawnT = Math.min(1, this.spawnT + dt * 3.4);

      if (this.freeze > 0) {
        this.freeze -= dt;
        this.updateFacing(dt);
        return;
      }

      if (this.empower > 0) this.empower = Math.max(0, this.empower - dt);

      if (this.base.towerBoss) {
        this.updateEnemyTower(dt);
        return;
      }

      if (this.slow > 0) {
        this.slow -= dt;
        if (this.slow <= 0) this.slowPower = 0.58;
      }

      this.refreshBuffs();

      if (this.base.kamikaze) {
        this.updateKamikaze(dt);
        return;
      }

      if (this.base.towerOnly) {
        // Громила не выбирает защитников: его цель — только ядро.
        this.target = null;
        this.retarget = Math.min(this.retarget, 0.4);
      } else if (this.retarget <= 0 || (this.target && this.target.dead)) {
        this.target = this.pickTarget();
        this.retarget = rand(0.45, 0.8);
      }
      this.retarget -= dt;

      const target = this.target;
      const tx = target ? target.x : layout.cx;
      const ty = target ? target.y : layout.cy;
      const targetRadius = target ? target.radius : 36 * layout.scale;
      const desired = this.base.ranged
        ? this.base.ranged + (target ? 22 : 0)
        : this.radius + targetRadius + 4;

      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.updateFacing(dt);

      if (d > desired) {
        const slowFactor = this.slow > 0 ? this.slowPower : 1;
        const speed = this.speed * slowFactor * this.buffSpeed;
        const wobble = Math.sin(G.visual * 2.6 + this.seed) * (this.isBoss ? 0.05 : 0.16);
        const ang = Math.atan2(dy, dx) + wobble;
        this.x += Math.cos(ang) * speed * dt;
        this.y += Math.sin(ang) * speed * dt;
        this.attackTimer = Math.max(this.attackTimer, 0.12);
      } else {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attack(target);
          this.attackTimer = this.base.interval * rand(0.9, 1.15);
        }
      }

      if (this.base.towerOnly) this.updateContactDamage(dt);
      this.updateHeal(dt);
      this.updateSummon(dt);
      this.updateNecromancy(dt);
      this.separate(dt);
    }

    updateKamikaze(dt) {
      if (this.retarget <= 0 || !this.target || this.target.dead) {
        this.target = this.pickTarget(this.base.aggro || 320);
        this.retarget = rand(0.35, 0.7);
      }
      this.retarget -= dt;

      const target = this.target;
      const tx = target ? target.x : layout.cx;
      const ty = target ? target.y : layout.cy;
      const targetRadius = target ? target.radius : 36 * layout.scale;
      const desired = target
        ? this.radius + targetRadius + 4
        : this.radius + targetRadius + 4;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.updateFacing(dt);

      if (d > desired) {
        const slowFactor = this.slow > 0 ? this.slowPower : 1;
        const speed = this.speed * slowFactor * this.buffSpeed;
        const ang = Math.atan2(dy, dx) + Math.sin(G.visual * 6 + this.seed) * 0.08;
        this.x += Math.cos(ang) * speed * dt;
        this.y += Math.sin(ang) * speed * dt;
        this.separate(dt);
        return;
      }

      this.explode();
    }

    updateContactDamage(dt) {
      this.contactTimer -= dt;
      if (this.contactTimer > 0) return;

      let hits = 0;
      for (const d of [...G.defenders]) {
        if (d.dead) continue;
        if (dist(this.x, this.y, d.x, d.y) > this.radius + d.radius + 3) continue;
        d.takeDamage(this.getAttackDamage());
        hits++;
        addRing(d.x, d.y, 2, d.radius * 1.4, this.base.color, 0.25, 2);
        burst(d.x, d.y, this.base.color, 4, 28, 0.3);
      }
      if (hits > 0) {
        this.contactTimer = this.base.interval * rand(0.9, 1.15);
        Sound.hit();
      }
    }

    updateHeal(dt) {
      if (!this.base.healer || this.dead) return;
      this.healTimer -= dt;
      if (this.healTimer > 0) return;
      this.healTimer = this.base.healInterval;

      const candidates = [];
      for (const other of G.enemies) {
        if (other === this || other.dead || other.hp >= other.maxHp) continue;
        const dd = dist(this.x, this.y, other.x, other.y);
        if (dd <= this.base.healRadius + other.radius) {
          candidates.push({ other, dd });
        }
      }
      candidates.sort((a, b) => a.dd - b.dd);
      const targets = candidates.slice(0, this.base.healTargets || 3);
      if (!targets.length) return;

      let healed = 0;
      for (const { other } of targets) {
        const amount = Math.min(other.maxHp - other.hp, this.healAmount);
        if (amount < 1) continue;
        other.hp += amount;
        healed++;
        addFloat(other.x, other.y - other.radius - 7, `+${Math.round(amount)}`, '#8dffd2', 8, 0.85);
        addRing(other.x, other.y, 2, other.radius * 1.5, '#7dfcc4', 0.35, 1.8);
      }
      if (!healed) return;

      addRing(this.x, this.y, 6, this.base.healRadius, '#7dfcc4', 0.55, 2);
      addFloat(this.x, this.y - this.radius - 12, 'ЛЕЧЕНИЕ', '#8dffd2', 7, 0.9);
      Sound.heal();
    }

    updateSummon(dt) {
      if (!this.base.summonType || this.dead) return;
      this.summonTimer -= dt;
      if (this.summonTimer > 0) return;
      this.summonTimer = this.base.summonInterval || 8;

      const max = this.base.summonMax || Infinity;
      const active = G.enemies.filter((e) => !e.dead && e.summoner === this).length;
      if (active >= max) return;

      const angle = rand(0, TAU);
      const orbit = this.radius + 18 * layout.scale;
      const x = clamp(this.x + Math.cos(angle) * orbit, layout.cx - layout.r * 0.94, layout.cx + layout.r * 0.94);
      const y = clamp(this.y + Math.sin(angle) * orbit, layout.cy - layout.r * 0.94, layout.cy + layout.r * 0.94);
      const guard = spawnEnemy(this.base.summonType, { x, y, summoner: this });
      if (!guard) return;

      addRing(this.x, this.y, 8, this.radius * 1.9, '#ffd166', 0.55, 2.2);
      addFloat(this.x, this.y - this.radius - 12, 'ОХРАННИК', '#ffd166', 8, 1.0);
      Sound.summon();
    }

    updateNecromancy(dt) {
      if (!this.base.necromancer || this.dead) return;
      this.reviveTimer -= dt;
      if (this.reviveTimer > 0) return;
      this.reviveTimer = this.base.reviveInterval || 2.4;
      if (!G.skulls.length) return;

      const active = G.enemies.filter((e) => !e.dead && e.summoner === this).length;
      if (active >= (this.base.reviveMax || 12)) return;

      const skull = G.skulls.shift();
      if (!skull) return;
      const raised = spawnEnemy('skeleton', { x: skull.x, y: skull.y, summoner: this });
      if (!raised) return;

      addRing(skull.x, skull.y, 3, 30 * layout.scale, '#b78cff', 0.55, 2.5);
      burst(skull.x, skull.y, '#d9c7ff', 12, 55, 0.55);
      addFloat(skull.x, skull.y - 18 * layout.scale, 'ПОДЪЁМ', '#c9a7ff', 7, 0.9);
      this.reviveTimer = (this.base.reviveInterval || 2.4) * 0.9;
      Sound.summon();
    }

    updateEnemyTower(dt) {
      this.facing = angleTo(this.x, this.y, layout.cx, layout.cy);

      if (this.lastStandTimer > 0) {
        this.lastStandTimer -= dt;
        if (this.lastStandTimer <= 0) {
          this.lastStandTimer = 0;
          if (!this.dead) {
            const heal = this.maxHp * 0.35;
            this.hp = Math.min(this.maxHp, this.hp + heal);
            addFloat(this.x, this.y - this.radius - 16, `+${Math.round(heal)}`, '#ff8fbd', 11, 1.2);
            addRing(this.x, this.y, 8, 110 * layout.scale, '#ff6f9e', 0.7, 4);
            burst(this.x, this.y, '#ff8eb8', 30, 100, 0.8);
            showToast('ПОСЛЕДНИЕ СИЛЫ: башня восстановила 35% HP', 'warn', 3000);
            Sound.boss();
          }
        }
      }

      if (!this.phasePulse && this.hp <= this.maxHp * 0.66) {
        this.phasePulse = true;
        this.towerPulse();
      }
      if (!this.phaseFreeze && this.hp <= this.maxHp * 0.33) {
        this.phaseFreeze = true;
        this.towerFreeze();
      }
      if (!this.lastStandUsed && this.hp <= this.maxHp * 0.15) {
        this.triggerLastStand();
      }

      if (this.lightningCast) {
        this.lightningCast.remaining -= dt;
        const dealt = this.lightningCast.startHp - this.hp;
        if (dealt >= this.lightningCast.threshold) {
          this.lightningCast = null;
          this.lightningTimer = 11;
          showToast('МОЛНИЯ СОРВАНА — башня не успела ударить', 'gold', 2300);
          addFloat(this.x, this.y - this.radius - 10, 'СОРВАНО', '#8dffd2', 9, 1.0);
          addRing(this.x, this.y, 4, 72 * layout.scale, '#8dffd2', 0.45, 2.5);
          Sound.heal();
        } else if (this.lightningCast.remaining <= 0) {
          this.lightningCast = null;
          this.lightningTimer = 12;
          this.fireLightning();
        }
      } else {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) this.startLightning();
      }

      this.summonBossTimer -= dt;
      if (this.summonBossTimer <= 0) {
        this.summonBossTimer = 14;
        const active = G.enemies.filter((e) => !e.dead && e.summoner === this && e.type === 'boss').length;
        if (active < 2) {
          spawnEnemy('boss', {
            x: this.x + rand(-22, 22) * layout.scale,
            y: this.y + 44 * layout.scale,
            summoner: this,
            silentBoss: true
          });
          addRing(this.x, this.y, 7, 62 * layout.scale, '#ff5d86', 0.6, 2.8);
          showToast('Вражеская башня призвала Разрушителя', 'warn', 2200);
          Sound.summon();
        }
      }

      this.stealTimer -= dt;
      if (this.stealTimer <= 0) {
        this.stealTimer = 7;
        this.stealMoney();
      }

      this.copyTimer -= dt;
      if (this.copyTimer <= 0) {
        this.copyTimer = 8;
        this.spawnCopy();
      }

      this.buffTimer -= dt;
      if (this.buffTimer <= 0) {
        this.buffTimer = 10;
        this.buffEnemies();
      }
    }

    startLightning() {
      const threshold = Math.max(60, this.maxHp * 0.075);
      this.lightningCast = { startHp: this.hp, threshold, remaining: 6, total: 6 };
      addRing(this.x, this.y, 6, 88 * layout.scale, '#ff8edb', 0.55, 3);
      showToast('ВРАЖЕСКАЯ БАШНЯ КОПИТ МОЛНИЮ — БЕЙ ЕЁ', 'warn', 3200);
      Sound.boss();
    }

    fireLightning() {
      const damage = Math.max(16, G.maxHp * 0.14);
      const points = lightningPath(this.x, this.y, layout.cx, layout.cy, 10, 16);
      addBeam(points, '#ff8edb', 0.32, 4.2);
      addBeam([{ x: layout.cx, y: layout.cy }, { x: layout.cx + rand(-5, 5), y: layout.cy + rand(-5, 5) }], '#ffffff', 0.16, 9);
      addRing(layout.cx, layout.cy, 4, 64 * layout.scale, '#ff8edb', 0.55, 3.5);
      burst(layout.cx, layout.cy, '#ff9ecf', 24, 100, 0.7);
      damageTower(damage);
      G.shake = Math.max(G.shake, 9);
      G.flash = Math.max(G.flash, 0.25);
      G.flashColor = '#ff8edb';
      addFloat(layout.cx, layout.cy - 26, `-${Math.round(damage)}`, '#ff9eb9', 12, 1.0);
      showToast('МОЛНИЯ ВРАЖЕСКОЙ БАШНИ УДАРИЛА ПО ЯДРУ', 'warn', 2600);
      Sound.boss();
    }

    towerPulse() {
      addRing(this.x, this.y, 10, 150 * layout.scale, '#ff8fbd', 0.8, 5);
      for (const d of [...G.defenders]) {
        if (d.dead) continue;
        addRing(d.x, d.y, 4, 38 * layout.scale, '#ff8fbd', 0.4, 2);
        d.takeDamage(d.maxHp / 3);
      }
      damageTower(G.maxHp / 3);
      G.shake = Math.max(G.shake, 11);
      G.flash = Math.max(G.flash, 0.2);
      G.flashColor = '#ff8fbd';
      showToast('ИМПУЛЬС: вражеская башня сняла треть здоровья со всех', 'warn', 3200);
      Sound.boom();
    }

    towerFreeze() {
      for (const d of G.defenders) {
        if (!d.dead) d.freeze = Math.max(d.freeze || 0, 5);
      }
      G.towerFreeze = Math.max(G.towerFreeze, 5);
      addRing(this.x, this.y, 8, 140 * layout.scale, '#9bdfff', 0.8, 4);
      burst(layout.cx, layout.cy, '#a8e9ff', 26, 100, 0.8);
      G.flash = Math.max(G.flash, 0.22);
      G.flashColor = '#9bdfff';
      showToast('ЗАМОРОЗКА: защитники и башня скованы льдом', 'warn', 3000);
      Sound.ability('frost');
    }

    triggerLastStand() {
      this.lastStandUsed = true;
      this.lastStand = true;
      this.lightningCast = null;
      this.lightningTimer = 12;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5);
      this.lastStandTimer = 12;
      addFloat(this.x, this.y - this.radius - 18, 'ПОСЛЕДНИЕ СИЛЫ', '#ff8fbd', 12, 1.4);
      addRing(this.x, this.y, 10, 130 * layout.scale, '#ff6f9e', 0.8, 4);
      burst(this.x, this.y, '#ff8eb8', 40, 120, 0.9);
      G.shake = Math.max(G.shake, 12);
      showToast('ПОСЛЕДНИЕ СИЛЫ: у башни 12 секунд, чтобы восстановить 35% HP', 'warn', 4200);
      spawnEnemy('king', {
        x: this.x - 34 * layout.scale,
        y: this.y + 46 * layout.scale,
        summoner: this,
        silentBoss: true
      });
      spawnEnemy('boss', {
        x: this.x + 34 * layout.scale,
        y: this.y + 46 * layout.scale,
        summoner: this,
        silentBoss: true
      });
      Sound.boss();
    }

    stealMoney() {
      const amount = Math.min(6, Math.max(0, Math.floor(G.money)));
      if (amount <= 0) {
        addFloat(this.x, this.y - this.radius - 8, 'ПУСТО', '#9aa9b2', 7, 0.8);
        return;
      }
      G.money = Math.max(0, G.money - amount);
      this.stolenFunds += amount;
      Store.set(STORAGE.money, G.money);
      syncWallet();
      addFloat(this.x, this.y - this.radius - 10, `-${amount} ✦`, '#ffcf76', 10, 1.1);
      showToast(`Вражеская башня украла ${amount} монет`, 'warn', 2100);
    }

    spawnCopy() {
      const cost = 10;
      if (this.stolenFunds < cost) return;
      const sources = G.defenders.filter((d) => !d.dead && !d.def.support);
      if (!sources.length) return;
      const copies = G.enemies.filter((e) => !e.dead && e.base.copy).length;
      if (copies >= 3) return;

      this.stolenFunds -= cost;
      const source = pick(sources);
      spawnDefenderCopy(source, this);
      addRing(this.x, this.y, 6, 54 * layout.scale, source.def.color, 0.55, 2.5);
      showToast(`Вражеская башня создала копию: ${source.def.name}`, 'warn', 2400);
      Sound.summon();
    }

    buffEnemies() {
      let count = 0;
      for (const e of G.enemies) {
        if (e.dead || e === this) continue;
        e.empower = Math.max(e.empower, 7);
        if (dist(this.x, this.y, e.x, e.y) < 190 * layout.scale) count++;
      }
      addRing(this.x, this.y, 7, 130 * layout.scale, '#ffcf6b', 0.6, 3);
      if (count > 0) showToast('Вражеская башня усилила своих слуг', 'warn', 2000);
      Sound.summon();
    }

    explode() {
      if (this.dead) return;
      this.dead = true;
      const target = this.target;
      if (target) {
        if (!target.dead) target.takeDamage(this.getAttackDamage());
      } else {
        damageTower(this.getAttackDamage());
      }

      addRing(this.x, this.y, 4, 52, '#ff8a5c', 0.5, 3);
      addRing(this.x, this.y, 2, 30, '#ffe3a3', 0.3, 2);
      burst(this.x, this.y, '#ff7d5c', 26, 120, 0.65);
      burst(this.x, this.y, '#ffe0a0', 10, 70, 0.45);
      G.shake = Math.max(G.shake, 7);
      addFloat(this.x, this.y - this.radius - 10, 'ВЗРЫВ', '#ffb36b', 10, 1.0);
      Sound.boom();
    }

    updateFacing(dt) {
      const tx = this.target ? this.target.x : layout.cx;
      const ty = this.target ? this.target.y : layout.cy;
      const desired = angleTo(this.x, this.y, tx, ty);
      let delta = ((desired - this.facing + Math.PI * 3) % TAU) - Math.PI;
      this.facing += delta * Math.min(1, dt * 8);
    }

    pickTarget(aggroOverride) {
      if (this.base.towerOnly) return null;
      let best = null;
      let bestDist = Infinity;
      const aggro = aggroOverride || this.base.aggro || (this.isBoss ? 130 : (this.base.ranged ? 180 : 84));
      for (const d of G.defenders) {
        if (d.dead) continue;
        const dd = dist(this.x, this.y, d.x, d.y);
        if (dd < aggro + d.radius && dd < bestDist) {
          bestDist = dd;
          best = d;
        }
      }
      return best;
    }

    attack(target) {
      if (this.dead) return;
      this.lunge = 1;

      if (this.base.ranged) {
        G.projectiles.push({
          kind: 'enemy',
          x: this.x,
          y: this.y,
          target,
          targetTower: !target,
          speed: 235,
          damage: this.getAttackDamage(),
          color: this.base.color,
          life: 3.2,
          radius: 4
        });
        if (target) target.hitFlash = 0.5;
        Sound.hit();
        return;
      }

      if (target) {
        target.takeDamage(this.getAttackDamage());
      } else {
        damageTower(this.getAttackDamage());
      }

      const hitX = target ? target.x : layout.cx + Math.cos(this.facing) * 36 * layout.scale;
      const hitY = target ? target.y : layout.cy + Math.sin(this.facing) * 36 * layout.scale;
      addRing(hitX, hitY, 2, this.isBoss ? 34 : 14, this.base.color, 0.25, 2);
      burst(hitX, hitY, this.base.color, this.isBoss ? 10 : 4, this.isBoss ? 60 : 30, 0.35);
      Sound.hit();

      if (this.isBoss) {
        G.shake = Math.max(G.shake, 5);
        addRing(this.x, this.y, 4, 44, this.base.color, 0.35, 2);
      }
    }

    separate(dt) {
      for (const other of G.enemies) {
        if (other === this || other.dead) continue;
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const d = Math.hypot(dx, dy);
        const minD = (this.radius + other.radius) * 0.78;
        if (d > 0 && d < minD) {
          const force = (minD - d) / minD * 24 * dt;
          this.x += (dx / d) * force;
          this.y += (dy / d) * force;
        }
      }
    }
  }

  function updateEnemies(dt) {
    for (const e of G.enemies) e.update(dt);
  }

  function spawnDefenderCopy(source, tower) {
    if (!source || source.dead) return null;
    const base = {
      id: 'copy',
      name: `Копия: ${source.def.name}`,
      hp: Math.max(48, Math.round(source.maxHp * 0.85)),
      speed: 31,
      damage: Math.max(5, source.damage * 0.62),
      interval: Math.max(0.8, source.def.interval * 1.15),
      radius: 12,
      reward: 4,
      score: 10,
      color: source.def.color,
      copy: true,
      aggro: Infinity
    };
    const x = clamp(tower.x + rand(-46, 46) * layout.scale, layout.cx - layout.r * 0.85, layout.cx + layout.r * 0.85);
    const y = clamp(tower.y + rand(38, 62) * layout.scale, layout.cy - layout.r * 0.85, layout.cy + layout.r * 0.85);
    const copy = new Enemy('copy', x, y, base, 1, 1, 1);
    copy.summoner = tower;
    copy.copyOf = source.type;
    G.enemies.push(copy);
    addRing(x, y, 3, 32 * layout.scale, base.color, 0.45, 2);
    burst(x, y, base.color, 10, 40, 0.45);
    return copy;
  }

  /* ========================= Tower ========================= */

  function updateTower(dt) {
    if (G.towerFreeze > 0) {
      G.towerFreeze = Math.max(0, G.towerFreeze - dt);
      G.towerCd = Math.max(G.towerCd, 0.18);
      return;
    }
    G.towerCd -= dt;
    if (G.towerCd > 0) return;

    let target = null;
    let best = Infinity;
    const range = layout.r * 1.62;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = dist(layout.cx, layout.cy, e.x, e.y);
      if (d <= range && d < best) { best = d; target = e; }
    }

    if (!target) {
      G.towerCd = 0;
      return;
    }

    G.towerCd = 1.02;
    const damage = (8 + G.wave * 0.75) * towerStats().power;
    const origin = towerMuzzle();
    const points = lightningPath(origin.x, origin.y, target.x, target.y, 8, 7);
    addBeam(points, '#8df7ff', 0.18, 2.2);
    damageEnemy(target, damage, { text: false, color: '#bffaff' });
    burst(target.x, target.y, '#9ff8ff', 4, 30, 0.3);
    Sound.zap();
  }

  function towerMuzzle() {
    return {
      x: layout.cx,
      y: layout.cy - 51 * layout.scale
    };
  }

  function damageTower(amount) {
    if (G.state !== 'combat' && G.state !== 'prep') return;
    if (G.state === 'gameover' || G.hp <= 0) return;

    G.hp = Math.max(0, G.hp - amount);
    G.towerFlash = 0.5;
    G.shake = Math.min(16, G.shake + 5);
    G.flash = 0.055;
    G.flashColor = '#ff4e68';
    addFloat(layout.cx + rand(-10, 10), layout.cy - 62 * layout.scale, `-${Math.round(amount)}`, '#ff91a3', 10, 0.8);
    addRing(layout.cx, layout.cy, 20, 62 * layout.scale, '#ff5b75', 0.4, 2.2);
    Sound.hurt();

    if (navigator.vibrate) {
      try { navigator.vibrate(22); } catch { /* ignore */ }
    }

    if (G.hp <= 0) gameOver();
  }

  /* ========================= Combat damage ========================= */

  function damageEnemy(enemy, amount, opts = {}) {
    if (!enemy || enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 1;
    if (opts.text !== false) {
      addFloat(
        enemy.x + rand(-4, 4),
        enemy.y - enemy.radius - 8,
        `${Math.round(amount)}`,
        opts.color || '#d9fbff',
        opts.big ? 13 : 9,
        0.55
      );
    }
    if (opts.spark !== false) {
      burst(enemy.x, enemy.y, opts.color || '#ffd88f', 3, 28, 0.25);
    }
    Sound.hit();
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    recordEnemyKill(enemy);
    G.kills++;
    advanceDaily('kills', 1);
    if (enemy.isBoss) advanceDaily('boss', 1);
    addEssence(enemy.reward, true);
    addFloat(enemy.x, enemy.y - enemy.radius - 6, `+${enemy.reward}`, '#ffd88f', 9, 0.9);

    const color = enemy.base.color;
    burst(enemy.x, enemy.y, color, enemy.isBoss ? 55 : 10, enemy.isBoss ? 170 : 55, enemy.isBoss ? 1.2 : 0.5);
    addRing(enemy.x, enemy.y, 2, enemy.isBoss ? 120 : 24 + enemy.radius * 2, color, enemy.isBoss ? 0.9 : 0.35, 2.5);

    if (isSkullDropWave(G.wave) && !enemy.isBoss && !enemy.base.copy && G.skulls.length < 14 && Math.random() < 0.42) {
      G.skulls.push({ x: enemy.x + rand(-5, 5), y: enemy.y + rand(-3, 3) });
      addRing(enemy.x, enemy.y, 1, 13 * layout.scale, '#d8d2b0', 0.35, 1.5);
    }

    if (enemy.isBoss) {
      G.shake = 14;
      G.flash = 0.12;
      G.flashColor = color;
      addFloat(enemy.x, enemy.y - 40, 'ПОВЕРЖЕН', '#ffd88f', 14, 1.6);
      Sound.boom();
    } else {
      Sound.kill();
    }
  }

  function addEssence(amount, silent = false) {
    if (!amount) return;
    G.essence += amount;
    if (!silent && amount >= 4) pulseCurrency();
  }

  function pulseCurrency() {
    if (G.pulseCd > 0) return;
    G.pulseCd = 0.45;
    dom.currencyPill.classList.remove('is-pulsing');
    void dom.currencyPill.offsetWidth;
    dom.currencyPill.classList.add('is-pulsing');
    setTimeout(() => dom.currencyPill.classList.remove('is-pulsing'), 380);
  }

  /* ========================= Projectiles ========================= */

  function updateProjectiles(dt) {
    const alive = [];
    for (const p of G.projectiles) {
      if (p.kind === 'arrow') {
        if (!p.target || p.target.dead) continue;
        const a = angleTo(p.x, p.y, p.target.x, p.target.y);
        p.x += Math.cos(a) * p.speed * dt;
        p.y += Math.sin(a) * p.speed * dt;
        p.angle = a;
        if (dist(p.x, p.y, p.target.x, p.target.y) <= p.target.radius + 7) {
          damageEnemy(p.target, p.damage, { text: false, color: p.color });
          burst(p.x, p.y, p.color, 4, 30, 0.25);
          continue;
        }
        p.life -= dt;
        if (p.life > 0) alive.push(p);
      } else if (p.kind === 'shell') {
        p.t += dt / p.duration;
        if (p.t >= 1) {
          explodeShell(p);
          continue;
        }
        alive.push(p);
      } else if (p.kind === 'enemy') {
        const target = p.target;
        if (!target && !p.targetTower) continue;
        const tx = target ? target.x : layout.cx;
        const ty = target ? target.y : layout.cy;
        const a = angleTo(p.x, p.y, tx, ty);
        p.x += Math.cos(a) * p.speed * dt;
        p.y += Math.sin(a) * p.speed * dt;
        p.angle = a;
        if (dist(p.x, p.y, tx, ty) <= (target ? target.radius + 6 : 34 * layout.scale)) {
          if (target) target.takeDamage(p.damage);
          else damageTower(p.damage);
          addRing(p.x, p.y, 2, 18, p.color, 0.3, 2);
          burst(p.x, p.y, p.color, 7, 40, 0.35);
          continue;
        }
        p.life -= dt;
        if (p.life > 0) alive.push(p);
      }
    }
    G.projectiles = alive;
  }

  function explodeShell(p) {
    addRing(p.tx, p.ty, 4, p.splash * 1.25, p.color, 0.5, 2.6);
    addRing(p.tx, p.ty, 2, p.splash * 0.7, '#fff2c2', 0.3, 2);
    burst(p.tx, p.ty, p.color, 22, 90, 0.65);
    burst(p.tx, p.ty, '#fff0c0', 8, 50, 0.4);
    G.shake = Math.max(G.shake, 3);
    Sound.boom();

    let hits = 0;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = dist(p.tx, p.ty, e.x, e.y);
      if (d <= p.splash + e.radius) {
        const falloff = clamp(1 - d / (p.splash + e.radius) * 0.42, 0.55, 1);
        damageEnemy(e, p.damage * falloff, { text: true, big: false, color: p.color });
        hits++;
      }
    }
    if (!hits) {
      addFloat(p.tx, p.ty - 8, 'мимо', 'rgba(255,255,255,.5)', 8, 0.5);
    }
  }

  /* ========================= Player attacks / abilities ========================= */

  function manualStrike(tx, ty) {
    if (G.state !== 'combat' && G.state !== 'prep') return;

    if (G.manualCd > 0) {
      G.reticle = { x: tx, y: ty, life: 0.35, denied: true };
      Sound.error();
      return;
    }

    G.manualCd = 0.62;

    let target = null;
    let best = (42 * layout.scale) / camera.scale;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = dist(tx, ty, e.x, e.y);
      if (d < best) { best = d; target = e; }
    }
    const px = target ? target.x : tx;
    const py = target ? target.y : ty;
    const damage = (17 + G.wave * 2.15) * towerStats().power;
    const radius = (35 * layout.scale) / camera.scale;
    const origin = towerMuzzle();
    const points = lightningPath(origin.x, origin.y, px, py, 9, 9);
    addBeam(points, '#b8fbff', 0.22, 3.4);
    addBeam([{ x: px, y: py }, { x: px + rand(-2, 2), y: py + rand(-2, 2) }], '#ffffff', 0.13, 7);

    addRing(px, py, 4, radius * 1.8, '#9ef7ff', 0.38, 2.8);
    burst(px, py, '#c5fdff', 15, 95, 0.55);
    G.shake = Math.max(G.shake, 2.2);
    G.reticle = { x: px, y: py, life: 0.4, denied: false };

    let hits = 0;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist(px, py, e.x, e.y) <= radius + e.radius) {
        damageEnemy(e, damage, { text: true, color: '#eaffff', big: true });
        const a = angleTo(px, py, e.x, e.y);
        e.x += Math.cos(a) * 8;
        e.y += Math.sin(a) * 8;
        hits++;
      }
    }

    Sound.zap();
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch { /* ignore */ }
    }
    if (!hits && G.state === 'combat') {
      addFloat(px, py - 10, 'промах', 'rgba(210,245,255,.55)', 8, 0.45);
    }
  }

  function useAbility(kind) {
    if (G.state !== 'prep' && G.state !== 'combat') return;
    if (!towerAbilities().includes(kind)) {
      const name = kind === 'nova' ? 'Импульс' : (kind === 'frost' ? 'Оковы' : 'Починка');
      const hint = G.towerId === 'start' && kind === 'nova'
        ? '«Импульс» откроется на максимальном уровне стартовой башни'
        : `«${name}» недоступна для этой башни`;
      showToast(hint, 'warn', 2000);
      Sound.error();
      return;
    }
    const ability = G.abilities[kind];
    if (!ability || ability.cd > 0) return;

    if (kind === 'repair' && G.hp >= G.maxHp) {
      showToast('Ядро не повреждено', 'info', 1400);
      Sound.error();
      return;
    }

    ability.cd = ability.max;
    Sound.ability(kind);

    if (kind === 'nova') {
      const radius = layout.r * 1.13;
      const damage = (38 + G.wave * 4.2) * towerStats().power;
      addBeam([{ x: layout.cx, y: layout.cy - 60 * layout.scale }, { x: layout.cx, y: layout.cy - layout.r * 1.05 }], '#9df8ff', 0.35, 6);
      addRing(layout.cx, layout.cy, 20, radius, '#8df7ff', 0.75, 4);
      addRing(layout.cx, layout.cy, 10, radius * 0.7, '#ffffff', 0.5, 2);
      burst(layout.cx, layout.cy, '#9cf7ff', 40, 160, 0.9);
      G.flash = 0.16;
      G.flashColor = '#a9fbff';
      G.shake = Math.max(G.shake, 9);

      for (const e of G.enemies) {
        if (e.dead) continue;
        const d = dist(layout.cx, layout.cy, e.x, e.y);
        if (d <= radius) {
          damageEnemy(e, damage, { text: true, color: '#c8fdff', big: true });
          const a = angleTo(layout.cx, layout.cy, e.x, e.y);
          e.x += Math.cos(a) * 30;
          e.y += Math.sin(a) * 30;
        }
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch { /* ignore */ }
      }
    } else if (kind === 'frost') {
      addRing(layout.cx, layout.cy, 16, layout.r * 1.35, '#b6aaff', 1.1, 3.2);
      addRing(layout.cx, layout.cy, 4, layout.r * 1.05, '#e1ddff', 0.8, 2);
      burst(layout.cx, layout.cy, '#c6bcff', 36, 130, 1);
      G.flash = 0.11;
      G.flashColor = '#b3a5ff';
      G.shake = Math.max(G.shake, 4);

      for (const e of G.enemies) {
        if (e.dead) continue;
        e.freeze = Math.max(e.freeze, 2.4);
        e.applySlow(5, 0.5);
        damageEnemy(e, (5 + G.wave * 0.8) * towerStats().power, { text: false, color: '#d8d1ff', spark: false });
        burst(e.x, e.y, '#bbb0ff', 5, 28, 0.5);
      }
      if (navigator.vibrate) {
        try { navigator.vibrate([12, 35, 18]); } catch { /* ignore */ }
      }
    } else if (kind === 'repair') {
      const heal = Math.min(towerStats().repair, G.maxHp - G.hp);
      G.hp += heal;
      addRing(layout.cx, layout.cy, 10, 90 * layout.scale, '#8fffc2', 0.8, 3);
      burst(layout.cx, layout.cy, '#a9ffd0', 30, 90, 1);
      addFloat(layout.cx, layout.cy - 60 * layout.scale, `+${Math.round(heal)}`, '#a9ffc8', 14, 1.2);
      G.flash = 0.08;
      G.flashColor = '#8fffc2';
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch { /* ignore */ }
      }
    }

    updateUi();
  }

  /* ========================= Build / inspector ========================= */

  function defenderLimits() {
    return towerStats().limits || DEFENDER_CAPS;
  }

  function limitText(limit) {
    return Number.isFinite(limit) ? String(limit) : '∞';
  }

  function isDefenderOwned(typeId) {
    if (typeId === 'god' && !hasGodAccess()) return false;
    return G.ownedDefenders.has(typeId);
  }

  function towerLoadout(towerId = G.towerId) {
    return G.towerLoadouts[towerId] || [];
  }

  function availableDefenderTypes(towerId = G.towerId) {
    const types = towerLoadout(towerId)
      .filter((typeId) => typeId !== 'god' && DEF_TYPES[typeId] && isDefenderOwned(typeId))
      .slice(0, towerSlots(towerId));
    if (hasGodAccess() && isDefenderOwned('god')) types.push('god');
    return types;
  }

  function isDefenderAvailable(typeId) {
    if (!isDefenderOwned(typeId)) return false;
    if (typeId === 'god') return hasGodAccess();
    return towerLoadout().includes(typeId);
  }

  function persistOwnedDefenders() {
    Store.set(STORAGE.defendersOwned, JSON.stringify([...G.ownedDefenders]));
  }

  function bankerIncome() {
    let total = 0;
    for (const d of G.defenders) {
      if (!d.dead && d.type === 'banker') total += d.income || 0;
    }
    return total;
  }

  function defenderCount(typeId = null) {
    if (!typeId) return G.defenders.length;
    let count = 0;
    for (const d of G.defenders) {
      if (!d.dead && d.type === typeId) count++;
    }
    return count;
  }

  function selectDefender(typeId) {
    if (G.state !== 'prep' && G.state !== 'combat') return;
    if (!DEF_TYPES[typeId] || !isDefenderAvailable(typeId)) return;
    closeInspector();

    if (G.selected === typeId) {
      G.selected = null;
      updateShopHint();
      updateUi();
      Sound.click();
      return;
    }

    const limits = defenderLimits();
    if (G.defenders.length >= limits.total) {
      showToast(`На арене уже ${limits.total} защитников — общий лимит`, 'warn', 1800);
      denyCard(typeId);
      Sound.error();
      return;
    }
    const typeLimit = limits[typeId] ?? Infinity;
    if (defenderCount(typeId) >= typeLimit) {
      showToast(`Лимит «${DEF_TYPES[typeId].name}»: ${typeLimit}`, 'warn', 1800);
      denyCard(typeId);
      Sound.error();
      return;
    }

    if (G.essence < DEF_TYPES[typeId].cost) {
      showToast(`Нужно ещё ${DEF_TYPES[typeId].cost - G.essence} эссенции`, 'warn', 1800);
      denyCard(typeId);
      Sound.error();
      return;
    }

    G.selected = typeId;
    G.inspectedDef = null;
    updateShopHint();
    Sound.select();
    updateUi();
  }

  function denyCard(typeId) {
    if (G.deniedCd > 0) return;
    G.deniedCd = 0.4;
    const card = document.querySelector(`.def-card[data-def="${typeId}"]`);
    if (!card) return;
    card.classList.remove('is-flash');
    void card.offsetWidth;
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 400);
  }

  function buildAt(typeId, wx, wy) {
    const def = DEF_TYPES[typeId];
    if (!def || !isDefenderAvailable(typeId)) return false;

    const error = placementError(typeId, wx, wy);
    if (error) {
      showToast(error, 'warn', 1700);
      denyCard(typeId);
      Sound.error();
      return false;
    }

    G.essence -= def.cost;
    const d = new Defender(typeId, wx, wy);
    G.defenders.push(d);
    advanceDaily('place', 1);
    refreshAuras();
    G.selected = null;
    G.inspectedDef = null;
    updateShopHint();
    updateUi();

    addRing(wx, wy, 6, 36, def.color, 0.55, 2.4);
    burst(wx, wy, def.color, 18, 65, 0.7);
    addFloat(wx, wy - 28, def.name, def.color, 9, 0.9);
    G.shake = Math.max(G.shake, 1.6);
    Sound.build();

    if (!G.tutorialDone) {
      G.tutorialDone = true;
      Store.set(STORAGE.tutorial, '1');
      setTimeout(() => {
        if (G.state === 'prep' || G.state === 'combat') {
          showToast('Отлично! Коснись врага — башня ударит лучом', 'info', 3000);
        }
      }, 500);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch { /* ignore */ }
    }

    return true;
  }

  function defenderAt(x, y) {
    const hitR = Math.max(18, 22 * layout.scale);
    let best = null;
    let bestD = hitR;
    for (const d of G.defenders) {
      if (d.dead) continue;
      const distance = dist(x, y, d.x, d.y);
      if (distance < bestD) { bestD = distance; best = d; }
    }
    return best;
  }

  function openInspector(defender) {
    if (!defender || defender.dead) return;
    G.inspectedDef = defender;
    G.selected = null;
    updateShopHint();
    dom.inspector.classList.add('is-open');
    dom.inspector.setAttribute('aria-hidden', 'false');
    updateInspector();
    Sound.select();
  }

  function closeInspector() {
    G.inspectedDef = null;
    dom.inspector.classList.remove('is-open');
    dom.inspector.setAttribute('aria-hidden', 'true');
    updateShopHint();
  }

  function updateShopHint() {
    if (!dom.shopHint) return;
    if (G.state !== 'prep' && G.state !== 'combat') return;
    let text = 'выбери защитника';
    let active = false;
    if (G.inspectedDef) {
      text = 'управление';
    } else if (G.selected) {
      text = 'тапни по арене';
      active = true;
    }
    dom.shopHint.textContent = text;
    dom.shopHint.classList.toggle('is-active', active);
  }

  function cancelPlacement(notify = false) {
    if (!G.selected) return false;
    G.selected = null;
    updateShopHint();
    updateUi();
    if (notify) showToast('Постановка отменена', 'info', 1400);
    return true;
  }

  function placementClearance() {
    return Math.max(58 * layout.scale, layout.r * 0.24);
  }

  function placementError(typeId, wx, wy) {
    const def = DEF_TYPES[typeId];
    if (!def) return 'Неизвестный защитник';
    if (!isDefenderAvailable(typeId)) return 'Этот защитник не входит в состав активной башни';
    const limits = defenderLimits();
    if (G.defenders.length >= limits.total) {
      return `На арене уже ${limits.total} защитников — общий лимит`;
    }
    const typeLimit = limits[typeId] ?? Infinity;
    if (defenderCount(typeId) >= typeLimit) {
      return `Лимит «${def.name}»: ${limitText(typeLimit)}`;
    }
    if (G.essence < def.cost) {
      return `Не хватает ${def.cost - Math.floor(G.essence)} эссенции`;
    }

    const radius = 14 * layout.scale;
    const dx = wx - layout.cx;
    const dy = wy - layout.cy;
    const fromTower = Math.hypot(dx, dy);
    const towerClearance = placementClearance();
    if (fromTower < towerClearance) return 'Слишком близко к башне';
    if (fromTower > layout.r * 0.93) return 'За пределами арены';

    const minDistance = Math.max(30 * layout.scale, 22);
    for (const d of G.defenders) {
      if (d.dead) continue;
      if (dist(wx, wy, d.x, d.y) < minDistance) return 'Слишком близко к другому защитнику';
    }
    for (const e of G.enemies) {
      if (!e.dead && dist(wx, wy, e.x, e.y) < e.radius + radius + 4 * layout.scale) return 'Здесь враг';
    }
    return '';
  }

  function upgradeCost(d) {
    if (!d) return 0;
    const costs = [Math.round(d.def.cost * 0.8 / 5) * 5, Math.round(d.def.cost * 1.35 / 5) * 5];
    return costs[clamp(d.level - 1, 0, 1)];
  }

  function sellValue(d) {
    return Math.max(5, Math.round(d.invested * 0.6));
  }

  function updateInspector() {
    const d = G.inspectedDef;
    if (!d || d.dead) {
      closeInspector();
      return;
    }
    const cardIcon = document.querySelector(`.def-card[data-def="${d.type}"] .def-icon`);
    dom.inspectorIcon.innerHTML = cardIcon ? cardIcon.innerHTML : '';
    dom.inspectorIcon.style.color = d.def.color;
    dom.inspectorName.textContent = `${d.def.name} · УР. ${d.level}`;
    if (d.type === 'banker') {
      dom.inspectorMeta.textContent = `Доход +${d.income} монет/волна · HP ${Math.ceil(d.hp)}/${d.maxHp}`;
    } else if (d.type === 'booster') {
      dom.inspectorMeta.textContent = `Аура +${Math.round(d.auraDamage * 100)}% урона · +${Math.round(d.auraRange * 100)}% дальности · HP ${Math.ceil(d.hp)}/${d.maxHp}`;
    } else if (d.type === 'god') {
      dom.inspectorMeta.textContent = `Урон ${Math.round(d.damage)} · Интервал ${d.interval.toFixed(2)} с · Аура +${Math.round(d.auraDamage * 100)}% урона · HP ${Math.ceil(d.hp)}/${d.maxHp}`;
    } else {
      const boost = d.aura ? ` · БУСТ +${Math.round((d.aura.damage - 1) * 100)}%` : '';
      dom.inspectorMeta.textContent = `Урон ${Math.round(d.damage)} · Дальность ${Math.round(d.range)} · HP ${Math.ceil(d.hp)}/${d.maxHp}${boost}`;
    }

    if (d.level >= d.def.maxLevel) {
      dom.upgradeBtn.classList.add('is-maxed');
      dom.upgradeBtn.disabled = true;
      dom.upgradeCost.textContent = 'МАКС';
    } else {
      const cost = upgradeCost(d);
      dom.upgradeBtn.disabled = false;
      dom.upgradeBtn.classList.toggle('is-poor', G.essence < cost);
      dom.upgradeBtn.classList.remove('is-maxed');
      dom.upgradeCost.textContent = `✦ ${cost}`;
    }

    dom.sellValue.textContent = `+${sellValue(d)}`;
    dom.sellBtn.disabled = false;
  }

  function upgradeSelected() {
    const d = G.inspectedDef;
    if (!d || d.dead) return;
    if (d.level >= d.def.maxLevel) return;
    const cost = upgradeCost(d);
    if (G.essence < cost) {
      showToast(`Не хватает ${cost - G.essence} эссенции`, 'warn', 1600);
      denyCard(d.type);
      Sound.error();
      return;
    }

    G.essence -= cost;
    d.invested += cost;
    d.upgrade();
    refreshAuras();
    addRing(d.x, d.y, 4, 46, d.def.color, 0.65, 2.8);
    burst(d.x, d.y, d.def.color, 22, 75, 0.8);
    addFloat(d.x, d.y - 30, `УР. ${d.level}`, d.def.color, 11, 1);
    Sound.upgrade();
    if (navigator.vibrate) {
      try { navigator.vibrate([10, 30, 12]); } catch { /* ignore */ }
    }
    updateInspector();
    updateUi();
  }

  function sellSelected() {
    const d = G.inspectedDef;
    if (!d || d.dead) return;
    const refund = sellValue(d);
    addEssence(refund, false);
    addFloat(d.x, d.y - 28, `+${refund}`, '#ffd88f', 10, 0.9);
    burst(d.x, d.y, d.def.color, 12, 50, 0.5);
    d.dead = true;
    const idx = G.defenders.indexOf(d);
    if (idx >= 0) G.defenders.splice(idx, 1);
    refreshAuras();
    closeInspector();
    Sound.sell();
    updateUi();
  }

  /* ========================= Effects ========================= */

  function addParticle(x, y, vx, vy, color, size, life, opts = {}) {
    if (G.particles.length > 620) G.particles.shift();
    G.particles.push({
      x, y, vx, vy,
      color,
      size,
      life,
      maxLife: life,
      gravity: opts.gravity || 0,
      drag: opts.drag === undefined ? 0.98 : opts.drag,
      glow: opts.glow !== false,
      line: !!opts.line
    });
  }

  function burst(x, y, color, count, speed, life, size = 2.6) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.25, speed);
      addParticle(
        x + rand(-2, 2), y + rand(-2, 2),
        Math.cos(a) * s, Math.sin(a) * s,
        color,
        rand(0.8, size),
        life * rand(0.55, 1.15),
        { drag: 0.975, gravity: 8 }
      );
    }
  }

  function addRing(x, y, startR, endR, color, life, width = 2) {
    G.rings.push({ x, y, startR, endR, color, life, maxLife: life, width });
  }

  function addBeam(points, color, life, width) {
    G.beams.push({ points, color, life, maxLife: life, width });
  }

  function addFloat(x, y, text, color, size, life) {
    G.floats.push({ x, y, text, color, size, life, maxLife: life, vy: -18 });
  }

  function lightningPath(x1, y1, x2, y2, segments = 8, spread = 6) {
    const points = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const off = rand(-spread, spread) * Math.sin(t * Math.PI);
      points.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    points.push({ x: x2, y: y2 });
    return points;
  }

  function updateEffects(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
    G.particles = G.particles.filter((p) => p.life > 0);

    for (const r of G.rings) r.life -= dt;
    G.rings = G.rings.filter((r) => r.life > 0);

    for (const b of G.beams) b.life -= dt;
    G.beams = G.beams.filter((b) => b.life > 0);

    for (const f of G.floats) {
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.97;
    }
    G.floats = G.floats.filter((f) => f.life > 0);
  }

  /* ========================= UI ========================= */

  function showPhaseBar() {
    dom.phaseBar.hidden = false;
    dom.phaseText.textContent = `Волна ${G.wave + 1} · ${Math.ceil(G.prepTimer)}с`;
    dom.phaseBonus.textContent = `+${startBonus()}`;
  }

  function hidePhaseBar() {
    dom.phaseBar.hidden = true;
  }

  function hideBossBar() {
    dom.bossBar.hidden = true;
    if (dom.bossCast) dom.bossCast.hidden = true;
  }

  function showBanner(kicker, title, sub, danger = false, victory = false) {
    clearTimeout(G.bannerTimer);
    dom.bannerKicker.textContent = kicker;
    dom.bannerTitle.textContent = title;
    dom.bannerSub.textContent = sub;
    dom.waveBanner.classList.remove('is-showing', 'is-danger', 'is-victory');
    void dom.waveBanner.offsetWidth;
    dom.waveBanner.classList.toggle('is-danger', danger);
    dom.waveBanner.classList.toggle('is-victory', victory);
    dom.waveBanner.classList.add('is-showing');
    G.bannerTimer = setTimeout(() => {
      dom.waveBanner.classList.remove('is-showing');
    }, 2400);
  }

  function showToast(text, mood = 'info', duration = 2600) {
    clearTimeout(G.toastTimer);
    dom.toastText.textContent = text;
    dom.toast.classList.remove('is-visible', 'is-warn', 'is-gold');
    dom.toast.classList.toggle('is-warn', mood === 'warn');
    dom.toast.classList.toggle('is-gold', mood === 'gold');
    dom.toastIcon.textContent = mood === 'warn' ? '!' : (mood === 'gold' ? '◆' : '✦');
    void dom.toast.offsetWidth;
    dom.toast.classList.add('is-visible');
    G.toastTimer = setTimeout(() => dom.toast.classList.remove('is-visible'), duration);
  }

  function updateUi() {
    if (!dom.waveValue) return;
    const stateForWave = G.state === 'paused' ? G.prevState : G.state;
    const displayWave = stateForWave === 'prep' || stateForWave === 'menu' ? G.wave + 1 : Math.max(1, G.wave);
    const targetLabel = waveTargetLabel();

    dom.waveValue.textContent = `${String(displayWave).padStart(2, '0')}/${targetLabel}`;
    dom.essenceValue.textContent = String(Math.max(0, Math.floor(G.essence)));
    dom.killValue.textContent = String(G.kills);

    const hpPct = clamp(G.hp / G.maxHp, 0, 1);
    dom.hpFill.style.width = (hpPct * 100).toFixed(2) + '%';
    dom.hpValue.textContent = `${Math.ceil(G.hp)} / ${G.maxHp}`;
    dom.hpTrack.setAttribute('aria-valuenow', String(Math.ceil(G.hp)));
    dom.coreMeter.classList.toggle('is-low', hpPct <= 0.34);

    if (G.essence > G.lastEssence) {
      if (G.essence - G.lastEssence >= 5) pulseCurrency();
    }
    G.lastEssence = G.essence;

    if (G.state === 'prep') {
      dom.phaseBar.hidden = false;
      dom.phaseText.textContent = isEndlessMode()
        ? `Волна ${G.wave + 1} / ∞ · ${Math.ceil(Math.max(0, G.prepTimer))}с`
        : `Волна ${G.wave + 1} / ${G.targetWave} · ${Math.ceil(Math.max(0, G.prepTimer))}с`;
      dom.phaseBonus.textContent = `+${startBonus()}`;
    } else {
      dom.phaseBar.hidden = true;
    }

    const boss = G.state === 'combat' ? G.enemies.find((e) => e.isBoss && !e.dead) : null;
    if (boss) {
      dom.bossBar.hidden = false;
      if (dom.bossName) dom.bossName.textContent = boss.base.name.toUpperCase();
      const pct = clamp(boss.hp / boss.maxHp, 0, 1);
      dom.bossFill.style.width = (pct * 100).toFixed(1) + '%';
      dom.bossHpText.textContent = Math.ceil(pct * 100) + '%';

      if (dom.bossCast) {
        let castText = '';
        let danger = false;
        if (boss.base.towerBoss) {
          if (boss.lightningCast) {
            castText = `МОЛНИЯ: ${Math.ceil(boss.lightningCast.remaining)} с · сорви удар`;
            danger = true;
          } else if (boss.lastStandTimer > 0) {
            castText = `ПОСЛЕДНИЕ СИЛЫ: ${Math.ceil(boss.lastStandTimer)} с до +35% HP`;
            danger = true;
          } else {
            castText = 'УНИЧТОЖЬ БАШНЮ — ОНА ВОРУЁТ МОНЕТЫ';
          }
        }
        dom.bossCast.hidden = !castText;
        dom.bossCast.textContent = castText;
        dom.bossCast.classList.toggle('is-danger', danger);
      }
    } else {
      dom.bossBar.hidden = true;
      if (dom.bossCast) dom.bossCast.hidden = true;
    }

    updateAbilityButtons();
    updateCards();
    updateDefenderLimitsUi();

    const showZoom = G.state === 'prep' || G.state === 'combat';
    if (dom.zoomWidget.hidden !== !showZoom) dom.zoomWidget.hidden = !showZoom;
    if (showZoom) updateZoomUi();

    if (G.state === 'paused') updatePauseStats();
  }

  function updateAbilityButtons() {
    const unlocked = new Set(towerAbilities());
    for (const key of ['nova', 'frost', 'repair']) {
      const btn = key === 'nova' ? dom.abilityNova : (key === 'frost' ? dom.abilityFrost : dom.abilityRepair);
      const ability = G.abilities[key];
      const remaining = Math.max(0, ability.cd);
      const ratio = remaining / ability.max;
      const available = unlocked.has(key);
      btn.hidden = key === 'frost' && !available;
      btn.disabled = !available;
      btn.classList.toggle('is-locked', !available);
      btn.setAttribute('aria-disabled', available ? 'false' : 'true');
      btn.style.setProperty('--cd', `${ratio}turn`);
      const timer = btn.querySelector('.ability-time');
      if (timer) timer.textContent = remaining > 0.05 ? String(Math.ceil(remaining)) : '';
      btn.classList.toggle('is-cooling', remaining > 0.05);
      const unavailable = !available || (key === 'repair' && G.hp >= G.maxHp);
      btn.classList.toggle('is-unavailable', unavailable);
      if (!available && key === 'nova' && G.towerId === 'start') {
        btn.title = '«Импульс» откроется на максимальном уровне стартовой башни';
      } else {
        btn.removeAttribute('title');
      }
    }
  }

  function syncDefenderCards() {
    const available = new Set(availableDefenderTypes());
    let supportOwned = false;
    document.querySelectorAll('.def-card').forEach((card) => {
      const typeId = card.dataset.def;
      const visible = available.has(typeId);
      card.hidden = !visible;
      if (visible && (typeId === 'banker' || typeId === 'booster')) supportOwned = true;
    });
    if (dom.cards) {
      dom.cards.classList.toggle('has-support', supportOwned);
      dom.cards.classList.toggle('has-god', available.has('god'));
    }
    updateCardHotkeys();
  }

  function visibleDefenderCards() {
    return [...document.querySelectorAll('.def-card')].filter((card) => !card.hidden);
  }

  function updateCardHotkeys() {
    visibleDefenderCards().forEach((card, index) => {
      const label = card.querySelector('.card-hotkey');
      if (label) label.textContent = String(index + 1);
    });
  }

  function updateCards() {
    syncDefenderCards();
    const limits = defenderLimits();
    document.querySelectorAll('.def-card').forEach((card) => {
      const type = card.dataset.def;
      const def = DEF_TYPES[type];
      const cost = def.cost;
      const count = defenderCount(type);
      const typeLimit = limits[type] ?? Infinity;
      const totalFull = G.defenders.length >= limits.total;
      const typeFull = count >= typeLimit;
      const poor = G.essence < cost;
      card.classList.toggle('is-selected', G.selected === type);
      card.classList.toggle('is-poor', poor);
      card.classList.toggle('is-full', totalFull || typeFull);
      card.setAttribute('aria-disabled', poor || totalFull || typeFull ? 'true' : 'false');
      card.setAttribute('aria-label', `${def.name}: поставить за ${cost} эссенции. Сейчас ${count} из ${limitText(typeLimit)}.`);
    });
  }

  function updateDefenderLimitsUi() {
    const limits = defenderLimits();
    if (dom.defTotal) dom.defTotal.textContent = `${G.defenders.length} / ${limitText(limits.total)}`;
    const pairs = [
      [dom.defLimitArcher, 'archer'],
      [dom.defLimitMortar, 'mortar'],
      [dom.defLimitFrost, 'frost'],
      [dom.defLimitBanker, 'banker'],
      [dom.defLimitBooster, 'booster'],
      [dom.defLimitGod, 'god']
    ];
    for (const [el, type] of pairs) {
      if (!el) continue;
      const limit = limits[type] ?? Infinity;
      el.textContent = `${defenderCount(type)} / ${limitText(limit)}`;
      el.classList.toggle('is-capped', defenderCount(type) >= limit);
    }
  }

  function updatePauseStats() {
    dom.pauseWave.textContent = String(Math.max(1, G.wave));
    dom.pauseHp.textContent = String(Math.ceil(G.hp));
    dom.pauseEssence.textContent = String(Math.floor(G.essence));
  }

  function syncSoundUi() {
    const muted = Sound.muted;
    dom.soundBtn.classList.toggle('is-muted', muted);
    dom.soundBtn.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    dom.pauseSoundBtn.textContent = muted ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ';
  }

  /* ========================= Pause / orientation ========================= */

  /* ========================= Mode select ========================= */

  function setModeExpanded(open) {
    if (dom.startBtn) dom.startBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function syncModeCards() {
    for (const card of dom.modeCards) {
      card.classList.toggle('is-current', card.dataset.mode === G.mode);
    }
    if (dom.endlessBest) {
      const best = Math.max(0, Number(Store.get(STORAGE.bestEndless, 0)) || 0);
      dom.endlessBest.textContent = best > 0 ? `рекорд: ${best}` : 'рекорд: —';
    }
  }

  function hideModeSelect() {
    G.modeOpen = false;
    if (!dom.modeSelect) return;
    dom.modeSelect.classList.remove('is-open');
    dom.modeSelect.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mode-open');
    setModeExpanded(false);
  }

  function openModeSelect() {
    if (!dom.modeSelect || G.modeOpen) return;
    if (G.state !== 'menu') return;
    Sound.init();
    Sound.click();
    G.modeOpen = true;
    G.modeFocus = dom.startBtn;
    syncWallet();
    syncModeCards();
    dom.modeSelect.classList.add('is-open');
    dom.modeSelect.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mode-open');
    setModeExpanded(true);
    requestAnimationFrame(() => {
      if (G.modeOpen) dom.modeClose.focus({ preventScroll: true });
    });
  }

  function closeModeSelect() {
    if (!G.modeOpen) return;
    hideModeSelect();
    Sound.click();
    const focus = G.modeFocus;
    G.modeFocus = null;
    if (focus && typeof focus.focus === 'function' && document.contains(focus)) {
      requestAnimationFrame(() => focus.focus({ preventScroll: true }));
    }
  }

  /* ========================= Progress overlay ========================= */

  function setProgressExpanded(open) {
    if (dom.menuProgressBtn) dom.menuProgressBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setProgressTab(tab) {
    const next = (tab === 'achievements' || tab === 'enemies' || tab === 'leaderboard') ? tab : 'daily';
    G.progressTab = next;
    for (const btn of dom.progressTabs) {
      const active = btn.dataset.progressTab === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
    if (dom.progressViewDaily) dom.progressViewDaily.hidden = next !== 'daily';
    if (dom.progressViewAchievements) dom.progressViewAchievements.hidden = next !== 'achievements';
    if (dom.progressViewEnemies) dom.progressViewEnemies.hidden = next !== 'enemies';
    if (dom.progressViewLeaderboard) dom.progressViewLeaderboard.hidden = next !== 'leaderboard';
    if (next === 'leaderboard') loadLeaderboard();
  }

  function dailyResetLabel() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const minutes = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} ч ${rest} мин` : `${rest} мин`;
  }

  function updateDailyResetLabel() {
    if (dom.dailyReset) dom.dailyReset.textContent = dailyResetLabel();
  }

  function progressNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderDailyQuests() {
    if (!dom.dailyQuestList || !G.daily) return;
    dom.dailyQuestList.textContent = '';
    const fragment = document.createDocumentFragment();

    G.daily.quests.forEach((quest, index) => {
      const def = DAILY_QUEST_DEFS.get(quest.id);
      if (!def) return;
      const progress = Math.min(def.target, Math.max(0, quest.progress));
      const row = progressNode('article', 'daily-quest');
      row.classList.toggle('is-done', quest.done);

      const number = progressNode('span', 'daily-quest-num', String(index + 1).padStart(2, '0'));
      const body = progressNode('div', 'daily-quest-body');
      const top = progressNode('div', 'daily-quest-top');
      top.append(progressNode('strong', '', def.name), progressNode('span', 'daily-quest-reward', `+${def.reward} ✦`));

      const bar = progressNode('div', 'daily-quest-bar');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', def.desc);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(def.target));
      bar.setAttribute('aria-valuenow', String(progress));
      const fill = progressNode('i');
      fill.style.width = `${Math.round((progress / def.target) * 100)}%`;
      bar.append(fill);

      const progressText = progressNode('span', 'daily-quest-progress', quest.done ? 'ВЫПОЛНЕНО' : `${progress} / ${def.target}`);
      body.append(top, progressNode('p', 'daily-quest-desc', def.desc), bar, progressText);
      row.append(number, body, progressNode('span', 'daily-quest-check', quest.done ? '✓' : ''));
      fragment.append(row);
    });

    dom.dailyQuestList.append(fragment);
    if (dom.dailyAllDone) dom.dailyAllDone.hidden = !G.daily.allDone;
    updateDailyResetLabel();
    syncProgressBadge();
  }

  function renderAchievements() {
    if (!dom.achList) return;
    dom.achList.textContent = '';
    const fragment = document.createDocumentFragment();

    for (const def of ACHIEVEMENT_DEFS) {
      const unlocked = achievementUnlocked(def.id);
      const progress = achievementProgress(def);
      const card = progressNode('article', 'ach-card');
      card.classList.toggle('is-unlocked', unlocked);

      const icon = progressNode('span', 'ach-icon', def.icon);
      const body = progressNode('div', 'ach-body');
      const top = progressNode('div', 'ach-top');
      top.append(progressNode('strong', '', def.name), progressNode('span', 'ach-reward', `+${def.reward} ✦`));
      const bar = progressNode('div', 'ach-bar');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', def.desc);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(def.target));
      bar.setAttribute('aria-valuenow', String(progress));
      const fill = progressNode('i');
      fill.style.width = `${Math.round((progress / def.target) * 100)}%`;
      bar.append(fill);

      const bottom = progressNode('div', 'ach-bottom');
      bottom.append(
        progressNode('span', 'ach-progress', unlocked ? 'ПОЛУЧЕНО' : `${progress} / ${def.target}`),
        progressNode('span', 'ach-state', unlocked ? 'ОТКРЫТО' : (progress > 0 ? 'В ПРОЦЕССЕ' : 'НЕ ОТКРЫТО'))
      );
      body.append(top, progressNode('p', 'ach-desc', def.desc), bar, bottom);
      card.append(icon, body);
      fragment.append(card);
    }

    dom.achList.append(fragment);
    if (dom.achCount) dom.achCount.textContent = `${G.achievements.size} / ${ACHIEVEMENT_DEFS.length}`;
    syncProgressBadge();
  }

  function enemyTraitText(def) {
    if (def.towerBoss) return 'Финал сложного режима: молнии, импульс, заморозка, кража монет, копии защитников и последние силы.';
    if (def.drummer) return `Усиливает союзников в радиусе ${def.buffRadius}: +${Math.round(def.buffSpeed * 100)}% скорости и +${Math.round(def.buffDamage * 100)}% урона.`;
    if (def.necromancer) return `Поднимает черепа в скелетов каждые ${def.reviveInterval} с. Убей его, чтобы остановить ритуал.`;
    if (def.summoned && def.id === 'skeleton') return 'Поднимается некромантом из черепа. Быстрый и более живучий, чем ползун.';
    if (def.towerOnly) return 'Цель — только ядро. Бьёт защитников, оказавшихся на пути.';
    if (def.kamikaze) return 'Взрывается при контакте. Убийство до взрыва отменяет урон.';
    if (def.healer) return `Лечит до ${def.healTargets} целей в радиусе ${def.healRadius} каждые ${def.healInterval} с.`;
    if (def.summonType) return `Призывает охранника каждые ${def.summonInterval} с (не больше ${def.summonMax} сразу).`;
    if (def.summoned) return 'Призывается Королём. Целится в защитников.';
    if (def.ranged) return `Дальний бой: ${def.ranged} от ядра, 138 от защитника.`;
    if (def.boss) return 'Босс. Имеет отдельную полосу HP.';
    return '';
  }

  function renderEnemies() {
    if (!dom.enemyList) return;
    dom.enemyList.textContent = '';
    const fragment = document.createDocumentFragment();

    for (const id of ENEMY_ORDER) {
      const def = ENEMY_TYPES[id];
      if (!def) continue;
      const unlocked = enemyUnlocked(id);
      const record = enemyKillRecord(id);
      const card = progressNode('article', 'enemy-card');
      card.style.setProperty('--enemy-color', def.color);
      card.classList.toggle('is-unlocked', unlocked);
      card.classList.toggle('is-locked', !unlocked);

      const head = progressNode('div', 'enemy-card-head');
      const sigil = progressNode('span', 'enemy-sigil', unlocked ? def.name.charAt(0) : '?');
      const heading = progressNode('div', 'enemy-heading');
      const top = progressNode('div', 'enemy-card-top');
      top.append(
        progressNode('strong', '', unlocked ? def.name : '???'),
        progressNode('span', 'enemy-kills', unlocked ? `${record.kills} убито` : `${record.kills} / ${def.unlock}`)
      );
      heading.append(top, progressNode('span', 'enemy-role', unlocked ? def.role : 'НЕ ОТКРЫТ'));
      head.append(sigil, heading);
      card.append(head);

      if (!unlocked) {
        const progress = Math.min(def.unlock, Math.max(0, record.kills));
        const bar = progressNode('div', 'enemy-unlock-bar');
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-label', `Открыть врага ${def.name}`);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', String(def.unlock));
        bar.setAttribute('aria-valuenow', String(progress));
        const fill = progressNode('i');
        fill.style.width = `${Math.round((progress / def.unlock) * 100)}%`;
        bar.append(fill);
        card.append(
          progressNode('p', 'enemy-desc enemy-desc--locked', 'Характеристики скрыты. Продолжай уничтожать врагов.'),
          bar,
          progressNode('span', 'enemy-unlock-text', `ОТКРОЕТСЯ ПОСЛЕ ${def.unlock} УБИЙСТВ ЭТОГО ВРАГА`)
        );
        fragment.append(card);
        continue;
      }

      const avg = enemyAverageHp(id);
      const stats = progressNode('div', 'enemy-stats');
      const items = [
        ['БАЗА HP', String(def.hp)],
        ['СР. HP', avg === null ? '—' : String(avg)],
        ['УРОН', String(def.damage).replace('.', ',')],
        ['СКОРОСТЬ', String(def.speed)],
        ['ЭССЕНЦИЯ', String(def.reward)],
        ['ИНТЕРВАЛ', `${String(def.interval).replace('.', ',')} с`]
      ];
      for (const [label, value] of items) {
        const stat = progressNode('span', 'enemy-stat');
        stat.append(progressNode('small', '', label), progressNode('b', '', value));
        stats.append(stat);
      }

      const modes = def.modes.map((mode) => MODE_NAMES[mode] || mode).join(' · ');
      const trait = enemyTraitText(def);
      card.append(
        progressNode('p', 'enemy-desc', def.desc),
        stats,
        progressNode('span', 'enemy-modes', `РЕЖИМЫ: ${modes}`)
      );
      if (trait) card.append(progressNode('span', 'enemy-trait', trait));
      fragment.append(card);
    }

    dom.enemyList.append(fragment);
    syncEnemyBadge();
  }

  function setLeaderMode(mode) {
    G.leaderMode = ['easy', 'medium', 'hard', 'endless'].includes(mode) ? mode : 'medium';
    if (dom.leaderboardModes) {
      for (const btn of dom.leaderboardModes.querySelectorAll('[data-leader-mode]')) {
        const active = btn.dataset.leaderMode === G.leaderMode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      }
    }
    loadLeaderboard();
  }

  function leaderboardRow(row, index, own = false) {
    const article = progressNode('article', `leader-row${own ? ' is-own' : ''}`);
    const rank = progressNode('span', 'leader-rank', own ? '—' : String(index + 1).padStart(2, '0'));
    const who = progressNode('div', 'leader-who');
    who.append(
      progressNode('strong', '', row.display_name || row.username || 'Игрок'),
      progressNode('small', '', `@${row.username || 'player'}`)
    );
    const wave = progressNode('span', 'leader-wave', 'ВОЛНА');
    wave.append(progressNode('b', '', String(Math.max(0, Number(row.wave) || 0))));
    const score = progressNode('span', 'leader-score', (Math.max(0, Number(row.score) || 0)).toLocaleString('ru-RU'));
    article.append(rank, who, wave, score);
    return article;
  }

  function renderLeaderboardList() {
    if (!dom.leaderboardList) return;
    dom.leaderboardList.textContent = '';
    if (G.leaderboardLoading) {
      dom.leaderboardList.append(progressNode('p', 'leader-empty', 'Загружаем рейтинг…'));
      return;
    }
    if (G.leaderboardError) {
      dom.leaderboardList.append(progressNode('p', 'leader-empty is-error', G.leaderboardError));
      return;
    }
    if (!G.leaderboardRows.length) {
      dom.leaderboardList.append(progressNode('p', 'leader-empty', 'Пока никто не вошёл в рейтинг этого режима.'));
      return;
    }

    const fragment = document.createDocumentFragment();
    G.leaderboardRows.forEach((row, index) => fragment.append(leaderboardRow(row, index)));
    const own = G.leaderboardOwn;
    const inTop = own && G.leaderboardRows.some((row) => row.username === own.username);
    if (own && !inTop) {
      fragment.append(progressNode('div', 'leader-divider', 'ТВОЙ РЕЗУЛЬТАТ'));
      fragment.append(leaderboardRow(own, 0, true));
    }
    dom.leaderboardList.append(fragment);
  }

  async function loadLeaderboard() {
    if (!dom.leaderboardList) return;
    const mode = G.leaderMode;
    if (dom.leaderboardStatus) dom.leaderboardStatus.textContent = (MODE_NAMES[mode] || mode).toUpperCase();
    if (dom.leaderTabCount) dom.leaderTabCount.textContent = 'ТОП';

    if (!Cloud.enabled) {
      G.leaderboardRows = [];
      G.leaderboardOwn = null;
      G.leaderboardError = 'Облачный рейтинг отключён в локальном режиме.';
      if (dom.leaderboardNote) {
        dom.leaderboardNote.textContent = 'Локальный режим: прогресс хранится только в браузере, общего рейтинга нет.';
      }
      renderLeaderboardList();
      return;
    }
    if (!AccountAuth.current?.cloud) {
      G.leaderboardRows = [];
      G.leaderboardOwn = null;
      G.leaderboardError = 'Войди в облачный аккаунт, чтобы видеть рейтинг и попасть в него.';
      renderLeaderboardList();
      if (dom.leaderboardNote) {
        dom.leaderboardNote.textContent = 'Рейтинг общий для всех устройств. Для участия нужен облачный аккаунт.';
      }
      return;
    }

    G.leaderboardLoading = true;
    G.leaderboardError = '';
    renderLeaderboardList();
    if (dom.leaderboardNote) {
      dom.leaderboardNote.textContent = AccountAuth.current.owner
        ? 'Ты основатель: твои забеги сохраняются, но не попадают в общий рейтинг, чтобы «Бог» не ломал таблицу.'
        : 'Лучшая волна и счёт в каждом режиме. Рейтинг общий для всех устройств.';
    }

    try {
      const isOwner = !!AccountAuth.current.owner;
      const [rows, own] = await Promise.all([
        Cloud.fetchLeaderboard(mode),
        isOwner ? Promise.resolve(null) : Cloud.fetchMyScore(mode)
      ]);
      if (mode !== G.leaderMode) return;
      G.leaderboardRows = Array.isArray(rows) ? rows : [];
      G.leaderboardOwn = isOwner ? null : (own || null);
      G.leaderboardError = '';
    } catch (error) {
      if (mode !== G.leaderMode) return;
      G.leaderboardRows = [];
      G.leaderboardOwn = null;
      G.leaderboardError = cloudErrorMessage(error);
    } finally {
      if (mode === G.leaderMode) {
        G.leaderboardLoading = false;
        renderLeaderboardList();
      }
    }
  }

  function renderProgress() {
    if (!dom.dailyQuestList) return;
    syncWallet();
    setProgressTab(G.progressTab);
    renderDailyQuests();
    renderAchievements();
    renderEnemies();
    syncProgressBadge();
  }

  function openProgress() {
    if (!dom.progress || G.progressOpen) return;
    if (G.state !== 'menu') return;
    Sound.init();
    Sound.click();
    ensureDailyState();
    G.progressOpen = true;
    G.progressFocus = dom.menuProgressBtn;
    setProgressExpanded(true);
    renderProgress();
    dom.progress.classList.add('is-open');
    dom.progress.setAttribute('aria-hidden', 'false');
    document.body.classList.add('progress-open');
    requestAnimationFrame(() => {
      if (G.progressOpen) dom.progressClose.focus({ preventScroll: true });
    });
  }

  function hideProgress() {
    G.progressOpen = false;
    setProgressExpanded(false);
    if (!dom.progress) return;
    dom.progress.classList.remove('is-open');
    dom.progress.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('progress-open');
  }

  function closeProgress() {
    if (!G.progressOpen) return;
    const focus = G.progressFocus;
    G.progressFocus = null;
    hideProgress();
    Sound.click();
    if (focus && typeof focus.focus === 'function' && document.contains(focus)) {
      requestAnimationFrame(() => focus.focus({ preventScroll: true }));
    }
  }

  /* ========================= Instructions overlay ========================= */

  function setGuideExpanded(open) {
    if (dom.instructionsBtn) dom.instructionsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openGuide() {
    if (!dom.instructions || G.guideOpen) return;
    if (G.state !== 'menu') return;
    Sound.init();
    Sound.click();
    G.guideOpen = true;
    G.guideFocus = dom.instructionsBtn;
    setGuideExpanded(true);
    dom.instructions.classList.add('is-open');
    dom.instructions.setAttribute('aria-hidden', 'false');
    document.body.classList.add('guide-open');
    requestAnimationFrame(() => {
      if (G.guideOpen && dom.instructionsClose) dom.instructionsClose.focus({ preventScroll: true });
    });
    setTimeout(() => {
      if (G.guideOpen && dom.instructionsClose) dom.instructionsClose.focus({ preventScroll: true });
    }, 60);
  }

  function hideGuide() {
    G.guideOpen = false;
    setGuideExpanded(false);
    if (!dom.instructions) return;
    dom.instructions.classList.remove('is-open');
    dom.instructions.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('guide-open');
  }

  function closeGuide() {
    if (!G.guideOpen) return;
    const focus = G.guideFocus;
    G.guideFocus = null;
    hideGuide();
    Sound.click();
    if (focus && typeof focus.focus === 'function' && document.contains(focus)) {
      requestAnimationFrame(() => focus.focus({ preventScroll: true }));
    }
  }

  /* ========================= Account / auth ========================= */

  function accountDisplayName(account) {
    if (!account) return 'гость';
    return account.displayName || account.username;
  }

  function syncAccountUi() {
    const account = AccountAuth.current;
    if (dom.accountChipStatus) {
      dom.accountChipStatus.textContent = account ? accountDisplayName(account) : 'гость';
    }
    if (dom.accountBtn) {
      dom.accountBtn.classList.toggle('is-signed-in', !!account);
      dom.accountBtn.classList.toggle('is-owner', !!(account && account.owner));
      dom.accountBtn.setAttribute(
        'aria-label',
        account ? `Аккаунт: ${accountDisplayName(account)}` : 'Аккаунт: войти или создать'
      );
    }
  }

  function setAccountTab(tab) {
    const next = tab === 'register' ? 'register' : 'login';
    G.authTab = next;
    if (dom.accountLoginTab) {
      const active = next === 'login';
      dom.accountLoginTab.classList.toggle('is-active', active);
      dom.accountLoginTab.setAttribute('aria-selected', active ? 'true' : 'false');
      dom.accountLoginTab.tabIndex = active ? 0 : -1;
    }
    if (dom.accountRegisterTab) {
      const active = next === 'register';
      dom.accountRegisterTab.classList.toggle('is-active', active);
      dom.accountRegisterTab.setAttribute('aria-selected', active ? 'true' : 'false');
      dom.accountRegisterTab.tabIndex = active ? 0 : -1;
    }
    if (dom.accountLoginForm) dom.accountLoginForm.hidden = next !== 'login';
    if (dom.accountRegisterForm) dom.accountRegisterForm.hidden = next !== 'register';
    clearAccountErrors();
  }

  function clearAccountErrors() {
    for (const element of [dom.accountLoginError, dom.accountRegisterError]) {
      if (!element) continue;
      element.hidden = true;
      element.textContent = '';
    }
  }

  function setAccountError(which, text) {
    const element = which === 'register' ? dom.accountRegisterError : dom.accountLoginError;
    if (!element) return;
    element.textContent = text;
    element.hidden = !text;
  }

  function setAccountBusy(busy) {
    G.authBusy = busy;
    for (const button of [dom.accountLoginBtn, dom.accountRegisterBtn]) {
      if (!button) continue;
      button.disabled = busy;
      if (busy) button.classList.add('is-busy');
      else button.classList.remove('is-busy');
    }
    if (dom.accountLoginBtn) dom.accountLoginBtn.textContent = busy && G.authTab === 'login' ? 'ПРОВЕРЯЕМ...' : 'ВОЙТИ';
    if (dom.accountRegisterBtn) dom.accountRegisterBtn.textContent = busy && G.authTab === 'register' ? 'СОЗДАЁМ...' : 'СОЗДАТЬ АККАУНТ';
  }

  function renderAccountView() {
    const account = AccountAuth.current;
    if (!dom.accountGuestView || !dom.accountProfileView) return;
    if (dom.accountKicker) {
      dom.accountKicker.textContent = Cloud.enabled ? 'ОБЛАКО · SUPABASE' : 'СОХРАНЕНИЕ ПРОГРЕССА';
    }
    if (dom.accountSub) {
      dom.accountSub.textContent = Cloud.enabled
        ? 'Войди или создай облачный аккаунт: прогресс, монеты и достижения будут доступны на других устройствах.'
        : 'Войди или создай локальный аккаунт, чтобы прогресс, монеты и достижения сохранялись отдельно.';
    }
    if (dom.accountNote) {
      dom.accountNote.textContent = Cloud.enabled
        ? 'Облачный аккаунт Supabase: прогресс, монеты и достижения доступны на других устройствах. Пароль хранится только в виде защищённого хеша на сервере. Восстановления пароля пока нет — запиши его.'
        : 'Аккаунт хранится в этом браузере. Пароль сохраняется только в виде хеша. Восстановления пароля нет — запиши его.';
    }
    if (!account) {
      dom.accountGuestView.hidden = false;
      dom.accountProfileView.hidden = true;
      setAccountTab(G.authTab || 'login');
      if (dom.accountCarryRow) {
        dom.accountCarryRow.hidden = !AccountAuth.guestHasData();
      }
      return;
    }

    dom.accountGuestView.hidden = true;
    dom.accountProfileView.hidden = false;
    const name = accountDisplayName(account);
    if (dom.accountProfileName) dom.accountProfileName.textContent = name;
    if (dom.accountProfileLogin) {
      dom.accountProfileLogin.textContent = `@${account.username}${account.cloud ? ' · ОБЛАКО' : ''}`;
    }
    if (dom.accountAvatar) dom.accountAvatar.textContent = Array.from(name)[0]?.toUpperCase() || 'Б';

    if (dom.accountExclusiveBadge) {
      dom.accountExclusiveBadge.hidden = !(account.exclusive === 'god');
    }
    if (dom.accountDeleteBtn) {
      dom.accountDeleteBtn.hidden = !!account.owner || !!account.cloud;
    }

    if (dom.accountStatMoney) dom.accountStatMoney.textContent = String(Math.max(0, Math.floor(G.money)));
    if (dom.accountStatBest) {
      const bestWave = Math.max(
        0,
        Number(Store.get(STORAGE.bestWave, 0)) || 0,
        Number(Store.get(STORAGE.bestEndless, 0)) || 0
      );
      dom.accountStatBest.textContent = bestWave > 0 ? String(bestWave) : '—';
    }
    if (dom.accountStatTower) dom.accountStatTower.textContent = `${G.towerLevel + 1} / ${TOWER_LEVELS.length}`;
    if (dom.accountStatAch) dom.accountStatAch.textContent = `${G.achievements.size} / ${ACHIEVEMENT_DEFS.length}`;
    if (dom.accountProfileNote) {
      if (account.exclusive === 'god') {
        dom.accountProfileNote.textContent = account.cloud
          ? 'Облачный аккаунт основателя. Прогресс синхронизируется, защитник «Бог» доступен только этому аккаунту.'
          : 'Аккаунт основателя. Защитник «Бог» доступен только здесь.';
      } else if (account.cloud) {
        dom.accountProfileNote.textContent = 'Облачный аккаунт Supabase. Прогресс синхронизируется между устройствами.';
      } else {
        dom.accountProfileNote.textContent = 'Локальный аккаунт. Прогресс сохраняется только в этом браузере.';
      }
    }
  }

  function clearAccountSecrets() {
    if (dom.accountLoginPassword) dom.accountLoginPassword.value = '';
    if (dom.accountRegisterPassword) dom.accountRegisterPassword.value = '';
    if (dom.accountRegisterConfirm) dom.accountRegisterConfirm.value = '';
  }

  function openAccount(options = {}) {
    if (!dom.account || G.authOpen) return;
    if (G.state !== 'menu') return;
    Sound.init();
    Sound.click();
    G.authOpen = true;
    G.authFocus = options.from === 'auto' ? dom.startBtn : document.activeElement;
    clearAccountErrors();
    clearAccountSecrets();
    setAccountBusy(false);
    G.authTab = AccountAuth.current ? 'login' : (G.authTab || 'login');
    renderAccountView();
    dom.account.classList.add('is-open');
    dom.account.setAttribute('aria-hidden', 'false');
    if (dom.accountBtn) dom.accountBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('account-open');
    requestAnimationFrame(() => {
      if (!G.authOpen) return;
      const focusTarget = AccountAuth.current
        ? (dom.accountClose || dom.accountLogoutBtn)
        : (dom.accountLoginTab || dom.accountClose);
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    });
  }

  function hideAccount() {
    if (!dom.account) return;
    G.authOpen = false;
    dom.account.classList.remove('is-open');
    dom.account.setAttribute('aria-hidden', 'true');
    if (dom.accountBtn) dom.accountBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('account-open');
  }

  function closeAccount() {
    if (!G.authOpen) return;
    const focus = G.authFocus;
    G.authFocus = null;
    hideAccount();
    clearAccountSecrets();
    if (!AccountAuth.current) AccountAuth.markPrompted();
    Sound.click();
    if (focus && typeof focus.focus === 'function' && document.contains(focus)) {
      requestAnimationFrame(() => focus.focus({ preventScroll: true }));
    }
  }

  function finishAccountAuth(account) {
    AccountAuth.setSession(account.id);
    AccountAuth.clearPrompted();
    account.lastLoginAt = new Date().toISOString();
    AccountAuth.save();
    location.reload();
  }

  async function handleAccountLogin(event) {
    if (event) event.preventDefault();
    if (G.authBusy) return;
    clearAccountErrors();
    const username = normalizeAccountUsername(dom.accountLoginUsername?.value);
    const password = String(dom.accountLoginPassword?.value || '');
    if (!username || !password) {
      setAccountError('login', 'Введи логин и пароль.');
      Sound.error();
      return;
    }

    if (Cloud.enabled) {
      setAccountBusy(true);
      try {
        const profile = await Cloud.signIn(username, password);
        await finishCloudAuth(profile);
      } catch (error) {
        setAccountError('login', cloudErrorMessage(error));
        Sound.error();
      } finally {
        if (G.authBusy) setAccountBusy(false);
      }
      return;
    }

    const account = AccountAuth.find(username);
    if (!account) {
      setAccountError('login', 'Аккаунт с таким логином не найден.');
      Sound.error();
      return;
    }

    setAccountBusy(true);
    try {
      const hash = hashPassword(password, account.salt, Number(account.iterations) || PASSWORD_ITERATIONS);
      if (hash !== account.hash) {
        setAccountError('login', 'Неверный логин или пароль.');
        Sound.error();
        return;
      }
      if (account.owner && !AccountAuth.accountHasData(account.id) && AccountAuth.guestHasData()) {
        AccountAuth.copyGuestProfile(account.id);
      }
      finishAccountAuth(account);
    } finally {
      if (G.authBusy) setAccountBusy(false);
    }
  }

  async function handleAccountRegister(event) {
    if (event) event.preventDefault();
    if (G.authBusy) return;
    clearAccountErrors();
    const username = normalizeAccountUsername(dom.accountRegisterUsername?.value);
    const displayName = String(dom.accountRegisterName?.value || '').trim().slice(0, 24);
    const password = String(dom.accountRegisterPassword?.value || '');
    const confirm = String(dom.accountRegisterConfirm?.value || '');

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setAccountError('register', 'Логин: 3–20 символов, только латиница, цифры и _.');
      Sound.error();
      return;
    }
    if (password.length < 8) {
      setAccountError('register', 'Пароль должен быть не короче 8 символов.');
      Sound.error();
      return;
    }
    if (password !== confirm) {
      setAccountError('register', 'Пароли не совпадают.');
      Sound.error();
      return;
    }

    if (Cloud.enabled) {
      setAccountBusy(true);
      try {
        const profile = await Cloud.signUp(username, password, displayName || username);
        await finishCloudAuth(profile, { carry: !!dom.accountCarryProgress?.checked });
      } catch (error) {
        setAccountError('register', cloudErrorMessage(error));
        Sound.error();
      } finally {
        if (G.authBusy) setAccountBusy(false);
      }
      return;
    }

    if (AccountAuth.find(username)) {
      setAccountError('register', 'Этот логин уже занят. Попробуй войти.');
      Sound.error();
      return;
    }

    setAccountBusy(true);
    try {
      const salt = randomHex(16);
      const account = {
        id: `acc-${Date.now().toString(36)}-${randomHex(4)}`,
        username,
        displayName: displayName || username,
        salt,
        hash: hashPassword(password, salt, PASSWORD_ITERATIONS),
        iterations: PASSWORD_ITERATIONS,
        exclusive: '',
        owner: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      AccountAuth.add(account);
      if (dom.accountCarryProgress?.checked && AccountAuth.guestHasData()) {
        AccountAuth.copyGuestProfile(account.id);
      }
      finishAccountAuth(account);
    } finally {
      if (G.authBusy) setAccountBusy(false);
    }
  }

  function logoutAccount() {
    if (AccountAuth.current?.cloud) {
      Cloud.signOut().catch(() => {});
    }
    AccountAuth.clearSession();
    AccountAuth.clearPrompted();
    location.reload();
  }

  function deleteCurrentAccount() {
    const account = AccountAuth.current;
    if (!account || account.owner) return;
    if (!window.confirm(`Удалить аккаунт «${accountDisplayName(account)}» вместе с его локальным прогрессом?`)) return;
    AccountAuth.deleteAccount(account);
    AccountAuth.clearPrompted();
    location.reload();
  }

  /* ========================= Inventory ========================= */

  function setInventoryExpanded(open) {
    for (const btn of [dom.inventoryBtn, dom.menuInventoryBtn]) {
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function setInventoryTab(tab) {
    const next = tab === 'tower' ? 'tower' : 'defenders';
    G.inventoryTab = next;
    for (const btn of dom.invTabs) {
      const active = btn.dataset.invTab === next;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
    dom.invViewDefenders.hidden = next !== 'defenders';
    dom.invViewTower.hidden = next !== 'tower';
  }

  function setTowerHint(text, tone = '') {
    if (!dom.invTowerHint) return;
    dom.invTowerHint.textContent = text;
    dom.invTowerHint.classList.toggle('is-good', tone === 'good');
    dom.invTowerHint.classList.toggle('is-error', tone === 'error');
  }

  function applyTowerLevel(level, towerId = G.towerId) {
    const spec = towerSpec(towerId);
    const safe = Math.max(0, Math.min(MAX_TOWER_LEVEL, Math.floor(Number(level) || 0)));
    const next = spec.levels[safe];
    G.towerLevels[towerId] = next.level;
    if (towerId !== G.towerId) return;
    const oldMax = G.maxHp;
    G.towerLevel = next.level;
    G.maxHp = next.hp;
    if (G.state === 'menu' || G.state === 'gameover' || G.state === 'victory') {
      G.hp = G.maxHp;
    } else if (G.hp > 0) {
      G.hp = Math.min(G.maxHp, G.hp + Math.max(0, G.maxHp - oldMax));
    }
  }

  function buyTowerUpgrade() {
    Sound.init();
    const towerId = G.inventoryTowerId;
    const spec = towerSpec(towerId);
    if (!isTowerOwned(towerId)) {
      setTowerHint(`Сначала купи башню «${spec.shortName}».`, 'error');
      Sound.error();
      return;
    }
    const level = towerLevelFor(towerId);
    const current = towerStats(level, towerId);
    const next = spec.levels[level + 1];

    if (!next) {
      setTowerHint('Все улучшения уже куплены. Башня на максимальном уровне.', 'good');
      Sound.error();
      return;
    }

    if (G.money < next.cost) {
      setTowerHint(`Не хватает ${next.cost - Math.floor(G.money)} монет. Побеждай в режимах, чтобы заработать.`, 'error');
      Sound.error();
      return;
    }

    G.money = Math.max(0, Math.floor(G.money) - next.cost);
    Store.set(STORAGE.money, G.money);
    applyTowerLevel(next.level, towerId);
    saveTowerState();
    syncWallet();
    syncInventoryStats();
    updateUi();

    if (dom.invTowerCard) {
      dom.invTowerCard.classList.remove('is-upgraded');
      void dom.invTowerCard.offsetWidth;
      dom.invTowerCard.classList.add('is-upgraded');
      setTimeout(() => dom.invTowerCard?.classList.remove('is-upgraded'), 500);
    }

    Sound.ability('repair');
    setTowerHint(`«${spec.shortName}»: «${next.name}» куплена. Ядро ${current.hp} → ${next.hp}, мощь ${Math.round(current.power * 100)}% → ${Math.round(next.power * 100)}%.`, 'good');
    if (towerId === 'start' && next.level >= MAX_TOWER_LEVEL) {
      showToast('Максимальный уровень стартовой башни: открыт «Импульс»', '#7dfcc4', 3200);
    }
  }

  function selectTower(towerId) {
    if (!TOWER_SPECS[towerId]) return false;
    if (!isTowerOwned(towerId)) {
      G.inventoryTowerId = towerId;
      syncInventoryTower();
      return false;
    }
    if (G.towerId === towerId) {
      G.inventoryTowerId = towerId;
      syncInventoryTower();
      return true;
    }
    G.towerId = towerId;
    G.inventoryTowerId = towerId;
    G.selected = null;
    closeInspector();
    applyTowerLevel(towerLevelFor(towerId), towerId);
    saveTowerState();
    syncDefenderCards();
    syncInventoryTower();
    syncInventoryDefenders();
    updateUi();
    Sound.select();
    return true;
  }

  function buyFinalTower() {
    const spec = TOWER_SPECS.final;
    if (isTowerOwned('final')) {
      selectTower('final');
      return;
    }
    if (G.money < spec.unlockCost) {
      setTowerHint(`Не хватает ${spec.unlockCost - Math.floor(G.money)} монет на башню «${spec.shortName}».`, 'error');
      Sound.error();
      return;
    }
    G.money = Math.max(0, Math.floor(G.money) - spec.unlockCost);
    Store.set(STORAGE.money, G.money);
    G.towerOwned.add('final');
    const ownedRegular = REGULAR_DEFENDERS.filter((typeId) => isDefenderOwned(typeId));
    G.towerLoadouts.final = sanitizeLoadout(ownedRegular, spec.slots, BASE_DEFENDERS);
    G.towerLevels.final = G.towerLevels.final || 0;
    saveTowerState();
    G.inventoryTowerId = 'final';
    selectTower('final');
    syncWallet();
    syncInventoryStats();
    updateUi();
    Sound.ability('repair');
    setTowerHint(`«${spec.name}» куплена. Можно выбрать до ${spec.slots} типов защитников.`, 'good');
    showToast('Последняя башня куплена', '#7dfcc4', 3000);
  }

  function setDefenderBuyHint(text, tone = '') {
    if (!dom.invDefenderHint) return;
    dom.invDefenderHint.textContent = text;
    dom.invDefenderHint.classList.toggle('is-good', tone === 'good');
    dom.invDefenderHint.classList.toggle('is-error', tone === 'error');
  }

  function ensureInventoryLoadoutControls() {
    document.querySelectorAll('.inv-card[data-def]').forEach((card) => {
      const typeId = card.dataset.def;
      if (typeId === 'god' || card.querySelector('.inv-loadout-btn')) return;
      const row = document.createElement('div');
      row.className = 'inv-loadout-row';
      const button = document.createElement('button');
      button.className = 'inv-loadout-btn';
      button.type = 'button';
      button.dataset.loadoutDef = typeId;
      button.textContent = 'ВЗЯТЬ В СОСТАВ';
      row.append(button);
      const buyRow = card.querySelector('.inv-buy-row');
      if (buyRow) card.insertBefore(row, buyRow);
      else card.append(row);
    });
  }

  function toggleLoadoutDefender(typeId) {
    const spec = towerSpec();
    if (typeId === 'god') {
      showToast('Бог доступен основателю вне состава башни', 'info', 2200);
      return;
    }
    if (!isDefenderOwned(typeId)) {
      setDefenderBuyHint(`Сначала открой «${DEF_TYPES[typeId]?.name || typeId}» за монеты.`, 'error');
      Sound.error();
      return;
    }
    const list = towerLoadout();
    const index = list.indexOf(typeId);
    if (index >= 0) {
      list.splice(index, 1);
      if (G.selected === typeId) {
        G.selected = null;
        updateShopHint();
      }
    } else {
      if (list.length >= spec.slots) {
        const slotsLabel = spec.slots === 3 ? '3 типа' : `${spec.slots} типов`;
        setDefenderBuyHint(`В башню «${spec.shortName}» можно взять только ${slotsLabel}. Убери один из выбранных.`, 'error');
        Sound.error();
        return;
      }
      list.push(typeId);
    }
    G.towerLoadouts[G.towerId] = list;
    saveTowerState();
    syncDefenderCards();
    syncInventoryDefenders();
    updateUi();
    Sound.select();
  }

  function syncInventoryLoadout() {
    ensureInventoryLoadoutControls();
    const spec = towerSpec();
    const list = towerLoadout();
    const activeNames = list.map((typeId) => DEF_TYPES[typeId]?.name || typeId);
    if (dom.invLoadoutLine) {
      const godNote = hasGodAccess() ? ' · Бог вне состава' : '';
      dom.invLoadoutLine.textContent = `СОСТАВ «${spec.shortName.toUpperCase()}»: ${list.length} / ${spec.slots} ТИПОВ${godNote}`;
    }
    if (dom.invDefenderHint) {
      dom.invDefenderHint.classList.toggle('is-good', list.length >= spec.slots);
      dom.invDefenderHint.classList.toggle('is-error', false);
      dom.invDefenderHint.textContent = list.length
        ? `В составе: ${activeNames.join(', ')}. Нажми «Взять в состав» или «Убрать».`
        : `Состав пуст. Возьми до ${spec.slots} типов защитников.`;
    }
    document.querySelectorAll('.inv-card[data-def]').forEach((card) => {
      const typeId = card.dataset.def;
      const selected = list.includes(typeId);
      const owned = isDefenderOwned(typeId);
      card.classList.toggle('is-in-loadout', selected);
      const button = card.querySelector('.inv-loadout-btn');
      if (!button) return;
      button.disabled = !owned;
      button.classList.toggle('is-selected', selected);
      button.textContent = !owned ? 'СНАЧАЛА КУПИ' : (selected ? 'УБРАТЬ ИЗ СОСТАВА' : 'ВЗЯТЬ В СОСТАВ');
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const note = dom.invTowerLimitNote;
    if (note) {
      note.innerHTML = `<span aria-hidden="true">✦</span> «${spec.name}»: ${spec.slots} типов в составе, ${defenderLimits().total} защитников всего. Улучшения башни покупаются за монеты.`;
    }
  }

  function syncInventoryDefenders() {
    if (dom.invDefCount) dom.invDefCount.textContent = String(G.ownedDefenders.size);
    const limits = defenderLimits();

    if (dom.invBankerIncome) dom.invBankerIncome.textContent = `+${DEF_TYPES.banker.income}`;
    if (dom.invBankerLimit) dom.invBankerLimit.textContent = limitText(limits.banker);
    if (dom.invBoosterDamage) dom.invBoosterDamage.textContent = `+${Math.round(DEF_TYPES.booster.auraDamage * 100)}%`;
    if (dom.invBoosterRange) dom.invBoosterRange.textContent = `+${Math.round(DEF_TYPES.booster.auraRange * 100)}%`;
    if (dom.invBoosterLimit) dom.invBoosterLimit.textContent = limitText(limits.booster);

    const godOwned = isDefenderOwned('god');
    if (dom.invCardGod) dom.invCardGod.hidden = !godOwned;
    if (dom.invGodLimit) dom.invGodLimit.textContent = limitText(limits.god);
    if (dom.invGodDamage) dom.invGodDamage.textContent = String(DEF_TYPES.god.damage);
    if (dom.invGodInterval) dom.invGodInterval.textContent = `${DEF_TYPES.god.interval.toFixed(2).replace('.', ',')} с`;
    if (dom.invGodAura) dom.invGodAura.textContent = `+${Math.round(DEF_TYPES.god.auraDamage * 100)}%`;

    for (const typeId of ['banker', 'booster']) {
      const def = DEF_TYPES[typeId];
      const owned = isDefenderOwned(typeId);
      const card = typeId === 'banker' ? dom.invCardBanker : dom.invCardBooster;
      const status = typeId === 'banker' ? dom.invBankerStatus : dom.invBoosterStatus;
      const button = typeId === 'banker' ? dom.invBuyBanker : dom.invBuyBooster;
      if (card) {
        card.classList.toggle('is-owned', owned);
        card.classList.toggle('is-buyable', !owned);
      }
      if (status) {
        status.textContent = owned ? 'ДОСТУПЕН' : 'НЕ КУПЛЕН';
        status.classList.toggle('is-owned', owned);
      }
      if (!button) continue;
      const label = button.querySelector('.inv-buy-label');
      const price = button.querySelector('.inv-buy-price');
      if (label) label.textContent = owned ? 'КУПЛЕНО' : 'КУПИТЬ';
      if (price) price.textContent = String(def.unlockCost);
      button.disabled = owned;
      button.classList.toggle('is-owned', owned);
      button.classList.toggle('is-short', !owned && G.money < def.unlockCost);
      button.setAttribute('aria-label', owned
        ? `${def.name} уже открыт`
        : `Открыть ${def.name} за ${def.unlockCost} монет`);
    }
    syncInventoryLoadout();
  }

  function buyDefender(typeId) {
    const def = DEF_TYPES[typeId];
    if (!def || !def.unlockCost || isDefenderOwned(typeId)) return;
    if (G.money < def.unlockCost) {
      setDefenderBuyHint(`Не хватает ${def.unlockCost - Math.floor(G.money)} монет. Побеждай в режимах, чтобы заработать.`, 'error');
      Sound.error();
      return;
    }

    G.money = Math.max(0, Math.floor(G.money) - def.unlockCost);
    Store.set(STORAGE.money, G.money);
    G.ownedDefenders.add(typeId);
    persistOwnedDefenders();
    syncWallet();
    syncInventoryDefenders();
    syncDefenderCards();
    updateUi();
    setDefenderBuyHint(`«${def.name}» открыт! Добавь его в состав активной башни.`, 'good');
    Sound.upgrade();
    requestAnimationFrame(() => {
      const card = document.querySelector(`.def-card[data-def="${typeId}"]`);
      const strip = card?.parentElement;
      if (!card || card.hidden || !strip) return;
      if (strip.scrollWidth <= strip.clientWidth + 1) return;
      const cardRect = card.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      const centered = cardRect.left - stripRect.left - (strip.clientWidth - cardRect.width) / 2;
      strip.scrollLeft = Math.max(0, strip.scrollLeft + centered);
    });

    if (dom.inventory) {
      dom.inventory.classList.remove('is-unlocked');
      void dom.inventory.offsetWidth;
      dom.inventory.classList.add('is-unlocked');
      setTimeout(() => dom.inventory?.classList.remove('is-unlocked'), 500);
    }
  }

  function syncInventoryStats() {
    syncInventoryDefenders();
    dom.invArcherDmg.textContent = String(DEF_TYPES.archer.damage);
    dom.invArcherRange.textContent = String(DEF_TYPES.archer.range);
    dom.invMortarDmg.textContent = String(DEF_TYPES.mortar.damage);
    dom.invMortarSplash.textContent = String(DEF_TYPES.mortar.splash);
    dom.invFrostDmg.textContent = String(DEF_TYPES.frost.damage);
    dom.invFrostRange.textContent = String(DEF_TYPES.frost.range);
    syncInventoryTower();
  }

  function syncInventoryTower() {
    const towerId = G.inventoryTowerId;
    const spec = towerSpec(towerId);
    const owned = isTowerOwned(towerId);
    const active = towerId === G.towerId;
    const level = towerLevelFor(towerId);
    const stats = towerStats(level, towerId);
    const next = spec.levels[level + 1];

    if (dom.invTowerName) dom.invTowerName.textContent = spec.name;
    if (dom.invTowerDesc) dom.invTowerDesc.textContent = spec.desc;
    if (dom.invTowerStatus) {
      dom.invTowerStatus.textContent = active ? 'АКТИВНА' : (owned ? 'ДОСТУПНА' : 'НЕ КУПЛЕНА');
      dom.invTowerStatus.classList.toggle('is-owned', active);
    }
    if (dom.invTowerTag) dom.invTowerTag.textContent = stats.name.toUpperCase();
    if (dom.invTowerHp) dom.invTowerHp.textContent = String(stats.hp);
    if (dom.invTowerPower) dom.invTowerPower.textContent = `${Math.round(stats.power * 100)}%`;
    if (dom.invTowerRepair) dom.invTowerRepair.textContent = String(stats.repair);
    if (dom.invTowerSlots) dom.invTowerSlots.textContent = String(spec.slots);
    if (dom.invTowerLimit) dom.invTowerLimit.textContent = String((stats.limits || DEFENDER_CAPS).total);
    if (dom.invTowerLimitNote) {
      dom.invTowerLimitNote.innerHTML = `<span aria-hidden="true">✦</span> «${spec.name}»: ${spec.slots} типов в составе, ${(stats.limits || DEFENDER_CAPS).total} защитников всего. Улучшения башни покупаются за монеты.`;
    }
    if (dom.invTowerLevel) dom.invTowerLevel.textContent = `УР. ${level + 1} / ${spec.levels.length}`;

    const abilities = towerAbilities(towerId);
    const abilityNames = {
      nova: 'Импульс',
      frost: 'Оковы',
      repair: 'Починка'
    };
    if (dom.invTowerAbilities) {
      const unlocked = abilities.map((key) => abilityNames[key]).join(', ');
      const locked = towerId === 'start' && level < MAX_TOWER_LEVEL
        ? ' · «Импульс» откроется на максимуме'
        : '';
      dom.invTowerAbilities.textContent = `Способности: ${unlocked}${locked}`;
    }

    if (dom.invTowerPips) {
      dom.invTowerPips.innerHTML = spec.levels
        .map((_, index) => {
          const classes = [];
          if (index <= level) classes.push('is-on');
          if (index === level + 1) classes.push('is-next');
          return `<i class="${classes.join(' ')}"></i>`;
        })
        .join('');
    }

    if (dom.invTowerSelector) {
      dom.invTowerSelector.querySelectorAll('[data-tower]').forEach((button) => {
        const id = button.dataset.tower;
        button.classList.toggle('is-active', id === towerId);
        button.classList.toggle('is-locked', !isTowerOwned(id));
        button.setAttribute('aria-pressed', id === towerId ? 'true' : 'false');
      });
    }
    if (dom.invTowerCard) dom.invTowerCard.classList.toggle('is-locked', !owned);

    if (dom.invTowerUnlock) dom.invTowerUnlock.hidden = owned;
    if (dom.invTowerUnlockBtn) {
      dom.invTowerUnlockBtn.disabled = owned || G.money < spec.unlockCost;
      dom.invTowerUnlockBtn.classList.toggle('is-short', !owned && G.money < spec.unlockCost);
      dom.invTowerUnlockBtn.textContent = `КУПИТЬ ЗА ${spec.unlockCost}`;
    }

    const button = dom.invTowerUpgradeBtn;
    if (!owned) {
      if (dom.invTowerNext) dom.invTowerNext.textContent = 'Сначала купи башню';
      if (dom.invTowerCost) dom.invTowerCost.textContent = '—';
      if (button) {
        button.textContent = 'НЕ КУПЛЕНА';
        button.disabled = true;
        button.classList.add('is-max');
        button.classList.remove('is-short');
      }
      setTowerHint('Купи «Последнюю» башню, чтобы открыть её улучшения и состав.', '');
      return;
    }

    if (!next) {
      if (dom.invTowerNext) dom.invTowerNext.textContent = 'Максимальный уровень — «Бастион»';
      if (dom.invTowerCost) dom.invTowerCost.textContent = '—';
      if (button) {
        button.textContent = 'МАКС';
        button.disabled = true;
        button.classList.add('is-max');
        button.classList.remove('is-short');
        button.setAttribute('aria-label', 'Башня улучшена до максимального уровня');
      }
      setTowerHint('Все улучшения куплены. Башня на пике формы.', 'good');
      return;
    }

    const hpGain = next.hp - stats.hp;
    const powerGain = Math.round((next.power - stats.power) * 100);
    const repairGain = next.repair - stats.repair;
    if (dom.invTowerNext) dom.invTowerNext.textContent = `«${next.name}» · +${hpGain} ядра · +${powerGain}% мощи · +${repairGain} ремонта`;
    if (dom.invTowerCost) dom.invTowerCost.textContent = String(next.cost);
    if (button) {
      button.textContent = 'УЛУЧШИТЬ';
      button.disabled = false;
      button.classList.remove('is-max');
      button.classList.toggle('is-short', G.money < next.cost);
      button.setAttribute('aria-label', `Улучшить башню до уровня ${next.level + 1} за ${next.cost} монет`);
    }

    if (G.money < next.cost) {
      setTowerHint(`Не хватает ${next.cost - Math.floor(G.money)} монет. Побеждай в режимах, чтобы заработать.`);
    } else {
      setTowerHint('Покупка применится сразу и сохранится между забегами.');
    }
  }

  function hideInventory() {
    G.inventoryOpen = false;
    G.inventoryPaused = false;
    if (!dom.inventory) return;
    dom.inventory.classList.remove('is-open');
    dom.inventory.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('inventory-open');
    setInventoryExpanded(false);
  }

  function openInventory() {
    if (!dom.inventory || G.inventoryOpen) return;
    if (G.modeOpen) hideModeSelect();
    Sound.init();
    Sound.click();

    G.inventoryFocus = document.activeElement;
    G.selected = null;
    closeInspector();
    G.pointer = null;
    G.hoverDefender = null;
    activePointers.clear();
    gesture.pinch = false;
    gesture.blockTap = false;
    gesture.mousePan = false;

    G.inventoryOpen = true;
    G.inventoryReturnState = G.state;
    G.inventoryPaused = G.state === 'prep' || G.state === 'combat';
    G.inventoryTowerId = G.towerId;

    if (G.inventoryPaused) {
      G.prevState = G.state;
      G.state = 'paused';
      G.orientationPaused = false;
      hidePhaseBar();
      hideBossBar();
    }

    syncInventoryStats();
    syncWallet();
    setInventoryTab(G.inventoryTab);
    dom.inventory.classList.add('is-open');
    dom.inventory.setAttribute('aria-hidden', 'false');
    document.body.classList.add('inventory-open');
    setInventoryExpanded(true);
    updateUi();

    requestAnimationFrame(() => {
      if (G.inventoryOpen) dom.inventoryClose.focus({ preventScroll: true });
    });
  }

  function closeInventory() {
    if (!G.inventoryOpen) return;
    G.inventoryOpen = false;
    dom.inventory.classList.remove('is-open');
    dom.inventory.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('inventory-open');
    setInventoryExpanded(false);

    const returnState = G.inventoryReturnState;
    const wasPaused = G.inventoryPaused;
    G.inventoryPaused = false;

    if (wasPaused) {
      G.state = returnState === 'combat' ? 'combat' : 'prep';
      G.prevState = G.state;
      if (G.state === 'prep') showPhaseBar();
      else hidePhaseBar();
      updateShopHint();
    }

    updateUi();
    Sound.click();

    const focus = G.inventoryFocus;
    G.inventoryFocus = null;
    if (focus && typeof focus.focus === 'function' && document.contains(focus)) {
      requestAnimationFrame(() => focus.focus({ preventScroll: true }));
    }
  }

  function pauseGame(fromOrientation = false) {
    if (G.state !== 'prep' && G.state !== 'combat') return;
    G.prevState = G.state;
    G.state = 'paused';
    G.orientationPaused = fromOrientation;
    updatePauseStats();
    dom.pause.classList.add('is-open');
    hidePhaseBar();
    closeInspector();
    Sound.click();
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = G.prevState;
    G.orientationPaused = false;
    dom.pause.classList.remove('is-open');
    if (G.state === 'prep') dom.phaseBar.hidden = false;
    updateShopHint();
    updateUi();
    Sound.click();
  }

  function checkOrientation() {
    const landscapeSmall = window.innerWidth > window.innerHeight && window.innerHeight < 560;
    if (landscapeSmall) {
      dom.rotateNotice.setAttribute('aria-hidden', 'false');
      if ((G.state === 'prep' || G.state === 'combat') && !G.orientationPaused) {
        pauseGame(true);
      }
    } else {
      dom.rotateNotice.setAttribute('aria-hidden', 'true');
      if (G.state === 'paused' && G.orientationPaused) {
        resumeGame();
      }
    }
  }

  /* ========================= Input ========================= */

  function pointFromEvent(e) {
    const rect = stage.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const activePointers = new Map();
  const gesture = {
    pinch: false,
    blockTap: false,
    mousePan: false,
    lastX: 0,
    lastY: 0,
    startDist: 1,
    startScale: 1,
    startCamX: 0,
    startCamY: 0,
    startMidX: 0,
    startMidY: 0
  };

  function beginPinch() {
    const pts = [...activePointers.values()].slice(0, 2);
    if (pts.length < 2) return;
    const [a, b] = pts;
    gesture.pinch = true;
    gesture.blockTap = true;
    gesture.startDist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    gesture.startScale = camera.scale;
    gesture.startCamX = camera.x;
    gesture.startCamY = camera.y;
    gesture.startMidX = (a.x + b.x) * 0.5;
    gesture.startMidY = (a.y + b.y) * 0.5;
    G.hoverDefender = null;
  }

  function updatePinch() {
    const pts = [...activePointers.values()].slice(0, 2);
    if (pts.length < 2) return;
    const [a, b] = pts;
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const next = clamp(gesture.startScale * (distance / gesture.startDist), camera.min, camera.max);
    const ratio = next / gesture.startScale;
    camera.scale = next;
    camera.x = midX - (gesture.startMidX - gesture.startCamX) * ratio;
    camera.y = midY - (gesture.startMidY - gesture.startCamY) * ratio;
    clampCamera();
    updateZoomUi();
    G.hoverDefender = null;
  }

  function onPointerDown(e) {
    Sound.init();
    if (G.state === 'menu' || G.state === 'gameover' || G.state === 'paused') return;

    const { x, y } = pointFromEvent(e);

    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2)) {
      if (e.cancelable) e.preventDefault();
      gesture.mousePan = true;
      gesture.blockTap = true;
      gesture.lastX = x;
      gesture.lastY = y;
      try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    activePointers.set(e.pointerId, {
      x, y, startX: x, startY: y, travel: 0, down: performance.now()
    });
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    const world = screenToWorld(x, y);
    G.pointer = { x, y, wx: world.x, wy: world.y, inside: true };

    if (activePointers.size >= 2) {
      beginPinch();
    } else {
      gesture.blockTap = false;
    }
  }

  function onPointerMove(e) {
    const { x, y } = pointFromEvent(e);

    if (gesture.mousePan) {
      camera.x += x - gesture.lastX;
      camera.y += y - gesture.lastY;
      gesture.lastX = x;
      gesture.lastY = y;
      clampCamera();
      updateZoomUi();
      G.hoverDefender = null;
      return;
    }

    const p = activePointers.get(e.pointerId);
    if (!p) {
      if (!G.hoverFine) return;
      const world = screenToWorld(x, y);
      G.pointer = { x, y, wx: world.x, wy: world.y, inside: true };
      G.hoverDefender = defenderAt(world.x, world.y);
      return;
    }

    p.travel += Math.hypot(x - p.x, y - p.y);
    p.x = x;
    p.y = y;
    const world = screenToWorld(x, y);
    G.pointer = { x, y, wx: world.x, wy: world.y, inside: true };

    if (activePointers.size >= 2) {
      if (!gesture.pinch) beginPinch();
      updatePinch();
      return;
    }

    if (gesture.pinch) return;
    if (G.hoverFine) G.hoverDefender = defenderAt(world.x, world.y);
  }

  function onPointerUp(e) {
    if (gesture.mousePan) {
      gesture.mousePan = false;
      gesture.blockTap = false;
      try { stage.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }

    const p = activePointers.get(e.pointerId);
    if (!p) return;
    const { x, y } = pointFromEvent(e);
    const wasPinch = gesture.pinch || gesture.blockTap;
    activePointers.delete(e.pointerId);

    if (wasPinch) {
      if (activePointers.size >= 2) beginPinch();
      else gesture.pinch = false;
      if (activePointers.size === 0) {
        gesture.blockTap = false;
        G.pointer = null;
      }
      try { stage.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }

    try { stage.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const isTap = p.travel < 12 && performance.now() - p.down < 800;
    if (isTap) handleTap(x, y);
    if (activePointers.size === 0) {
      gesture.blockTap = false;
      G.pointer = null;
    }
  }

  function onPointerCancel(e) {
    try { stage.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    activePointers.delete(e.pointerId);
    gesture.mousePan = false;
    gesture.pinch = false;
    if (activePointers.size === 0) {
      gesture.blockTap = false;
      G.pointer = null;
    }
  }

  function onPointerLeave() {
    if (activePointers.size || gesture.mousePan) return;
    G.pointer = null;
    G.hoverDefender = null;
  }

  function onWheel(e) {
    if (G.state !== 'prep' && G.state !== 'combat') return;
    e.preventDefault();
    const { x, y } = pointFromEvent(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    const factor = Math.exp(-delta * 0.0012);
    zoomAt(x, y, camera.scale * factor);
  }

  function handleTap(screenX, screenY) {
    if (G.state !== 'prep' && G.state !== 'combat') return;
    if (screenX < 0 || screenX > layout.w || screenY < 0 || screenY > layout.h) return;
    if (screenY < layout.top - 8 || screenY > layout.bottom + 4) return;

    const world = screenToWorld(screenX, screenY);
    const hit = defenderAt(world.x, world.y);
    G.reticle = { x: world.x, y: world.y, life: 0.5, denied: false };

    if (G.inspectedDef) {
      if (hit) {
        openInspector(hit);
      } else {
        closeInspector();
        manualStrike(world.x, world.y);
      }
      return;
    }

    if (G.selected) {
      if (hit) {
        openInspector(hit);
      } else if (!buildAt(G.selected, world.x, world.y)) {
        G.reticle.denied = true;
      }
      return;
    }

    if (hit) {
      openInspector(hit);
      return;
    }

    manualStrike(world.x, world.y);
  }

  function selectByKey(code) {
    const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (!match) return false;
    const index = Number(match[1]) - 1;
    const card = visibleDefenderCards()[index];
    if (!card) return false;
    selectDefender(card.dataset.def);
    return true;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      if (G.authOpen) closeAccount();
      else if (G.inventoryOpen) closeInventory();
      else if (G.guideOpen) closeGuide();
      else if (G.progressOpen) closeProgress();
      else if (G.modeOpen) closeModeSelect();
      else if (G.inspectedDef) closeInspector();
      else if (G.selected) cancelPlacement(true);
      else if (G.state === 'paused') resumeGame();
      else if (G.state === 'prep' || G.state === 'combat') pauseGame();
      return;
    }
    if (e.code === 'Space') {
      if (G.state === 'prep') {
        e.preventDefault();
        startNextWave(true);
      }
      return;
    }
    if (G.state !== 'prep' && G.state !== 'combat') return;
    const abilityKey = { KeyQ: 'nova', KeyW: 'frost', KeyE: 'repair' }[e.code];
    if (abilityKey) {
      e.preventDefault();
      useAbility(abilityKey);
      return;
    }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      zoomStep(1.22);
      return;
    }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      zoomStep(1 / 1.22);
      return;
    }
    if (e.code === 'Digit0' || e.code === 'Numpad0') {
      e.preventDefault();
      resetCamera();
      return;
    }
    if (selectByKey(e.code)) e.preventDefault();
  }

  /* ========================= Drawing ========================= */

  function draw() {
    const w = layout.w;
    const h = layout.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    drawBackdrop();
    drawAmbient();

    ctx.save();
    const shakeX = G.shake > 0.15 ? (Math.random() - 0.5) * G.shake : 0;
    const shakeY = G.shake > 0.15 ? (Math.random() - 0.5) * G.shake : 0;
    ctx.translate(camera.x + shakeX, camera.y + shakeY);
    ctx.scale(camera.scale, camera.scale);

    drawArena();

    if (G.state !== 'menu') {
      drawPlacementPreview();
    }

    drawTower();

    if (G.state !== 'menu') {
      drawDefenders();
      drawSkulls();
      drawEnemies();
      drawProjectiles();
      drawEffects();
      drawReticle();
      drawFloats();
    }

    ctx.restore();
    drawFlash();

    if (G.state === 'menu') {
      drawMenuDust();
    }
  }

  function buildBackdropCache() {
    const { w, h, cx, cy } = layout;
    if (w < 2 || h < 2) return;

    backdropCache.width = stage.width;
    backdropCache.height = stage.height;
    const b = backdropCache.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = b.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#07141c');
    bg.addColorStop(0.46, '#050b12');
    bg.addColorStop(1, '#02050a');
    b.fillStyle = bg;
    b.fillRect(-30, -30, w + 60, h + 60);

    const nebula = b.createRadialGradient(cx, cy - 20, 0, cx, cy - 20, Math.max(w, h) * 0.62);
    nebula.addColorStop(0, 'rgba(24, 86, 100, 0.17)');
    nebula.addColorStop(0.45, 'rgba(17, 47, 62, 0.09)');
    nebula.addColorStop(1, 'rgba(2, 6, 10, 0)');
    b.fillStyle = nebula;
    b.fillRect(0, 0, w, h);

    // distant monolithic ruins
    b.fillStyle = 'rgba(4, 12, 18, 0.65)';
    b.beginPath();
    b.moveTo(0, h * 0.3);
    b.lineTo(w * 0.05, h * 0.24);
    b.lineTo(w * 0.09, h * 0.38);
    b.lineTo(w * 0.07, h * 0.7);
    b.lineTo(0, h * 0.74);
    b.closePath();
    b.fill();

    b.beginPath();
    b.moveTo(w, h * 0.22);
    b.lineTo(w * 0.94, h * 0.17);
    b.lineTo(w * 0.9, h * 0.28);
    b.lineTo(w * 0.92, h * 0.65);
    b.lineTo(w, h * 0.7);
    b.closePath();
    b.fill();
  }

  function drawBackdrop() {
    ctx.drawImage(backdropCache, 0, 0, stage.width / dpr, stage.height / dpr);

    for (const s of stars) {
      const twinkle = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(G.visual * 1.8 + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = s.gold ? '#ffd88f' : '#8feaf7';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawArena() {
    const { cx, cy, r } = layout;
    const t = G.visual;

    ctx.save();
    ctx.translate(cx, cy);

    const ground = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r * 1.16);
    ground.addColorStop(0, 'rgba(19, 56, 65, 0.42)');
    ground.addColorStop(0.46, 'rgba(11, 34, 43, 0.34)');
    ground.addColorStop(0.78, 'rgba(7, 20, 27, 0.2)');
    ground.addColorStop(1, 'rgba(3, 8, 12, 0)');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.16, 0, TAU);
    ctx.fill();

    // central pool of light
    const coreGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 0.72);
    coreGlow.addColorStop(0, 'rgba(45, 170, 184, 0.12)');
    coreGlow.addColorStop(0.55, 'rgba(25, 88, 103, 0.055)');
    coreGlow.addColorStop(1, 'rgba(9, 26, 33, 0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, 0, TAU);
    ctx.fill();

    // polar grid
    ctx.strokeStyle = 'rgba(104, 229, 247, 0.07)';
    ctx.lineWidth = 1;
    for (const k of [0.31, 0.55, 0.79, 1.01]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, TAU);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(104, 229, 247, 0.045)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.17, Math.sin(a) * r * 0.17);
      ctx.lineTo(Math.cos(a) * r * 1.01, Math.sin(a) * r * 1.01);
      ctx.stroke();
    }

    // cracks
    ctx.strokeStyle = 'rgba(96, 208, 226, 0.09)';
    for (const c of cracks) {
      ctx.lineWidth = c.width;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      const mx = c.x + Math.cos(c.a) * c.len * 0.55 + Math.cos(c.a + 0.7) * 4;
      const my = c.y + Math.sin(c.a) * c.len * 0.55 + Math.sin(c.a + 0.7) * 4;
      ctx.lineTo(mx, my);
      ctx.lineTo(c.x + Math.cos(c.a) * c.len, c.y + Math.sin(c.a) * c.len);
      ctx.stroke();
    }

    // outer ring
    ctx.strokeStyle = 'rgba(102, 232, 250, 0.18)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.04, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(102, 232, 250, 0.055)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.065, 0, TAU);
    ctx.stroke();

    // rotating rune arcs
    ctx.save();
    ctx.rotate(t * 0.025);
    ctx.strokeStyle = 'rgba(115, 242, 255, 0.22)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([r * 0.06, r * 0.11]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.965, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-t * 0.018);
    ctx.strokeStyle = 'rgba(255, 205, 118, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, r * 0.13]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.89, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // cardinal notches
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = 'rgba(141, 247, 255, 0.25)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 1.02, -5);
      ctx.lineTo(r * 1.06, 0);
      ctx.lineTo(r * 1.02, 5);
      ctx.stroke();
      ctx.restore();
    }

    // rune glyphs
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.018;
      const rr = r * 0.87;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.rotate(a + Math.PI / 2);
      ctx.strokeStyle = 'rgba(111, 234, 250, 0.13)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -4);
      ctx.lineTo(3, 0);
      ctx.lineTo(-3, 4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawAmbient() {
    for (const m of motes) {
      const alpha = m.alpha * (0.55 + 0.45 * Math.sin(G.visual * 2 + m.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.phase % 2 > 1 ? '#ffd88f' : '#7fe8f7';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMenuDust() {
    // soft golden dust drifting over the title screen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const x = layout.w * 0.18 + (i / 8) * layout.w * 0.64 + Math.sin(G.visual * 0.6 + i * 1.7) * 12;
      const y = layout.h * 0.28 + ((G.visual * 9 + i * 47) % (layout.h * 0.4));
      const a = 0.12 + 0.1 * Math.sin(G.visual + i);
      ctx.fillStyle = `rgba(255, 220, 150, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!G.selected) return;
    const def = DEF_TYPES[G.selected];
    const color = def.color;
    const pulse = 0.5 + 0.5 * Math.sin(G.visual * 2.2);

    ctx.save();
    ctx.translate(layout.cx, layout.cy);
    ctx.strokeStyle = hexAlpha(color, 0.18 + pulse * 0.08);
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, layout.r * 0.93, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 125, 142, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, placementClearance(), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (!G.pointer || !G.hoverFine) return;
    const world = screenToWorld(G.pointer.x, G.pointer.y);
    const reason = placementError(G.selected, world.x, world.y);
    const ghostColor = reason ? '#ff6f86' : color;
    const radius = 14 * layout.scale;

    ctx.save();
    ctx.translate(world.x, world.y);
    if (def.support) {
      const auraR = def.auraRadius || 42 * layout.scale;
      ctx.strokeStyle = hexAlpha(ghostColor, 0.28);
      ctx.fillStyle = hexAlpha(ghostColor, 0.035);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = hexAlpha(ghostColor, 0.7);
    ctx.fillStyle = hexAlpha(ghostColor, 0.1);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.35, 0);
    ctx.lineTo(radius * 0.35, 0);
    ctx.moveTo(0, -radius * 0.35);
    ctx.lineTo(0, radius * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  function drawTower() {
    const { cx, cy, scale } = layout;
    const t = G.visual;
    const hpFrac = clamp(G.hp / G.maxHp, 0, 1);
    const low = hpFrac < 0.35;
    const flash = G.towerFlash;

    ctx.save();
    ctx.translate(cx, cy);

    // aura
    const aura = ctx.createRadialGradient(0, -18 * scale, 2, 0, -18 * scale, 86 * scale);
    const auraColor = low ? '255, 74, 102' : '72, 226, 246';
    aura.addColorStop(0, `rgba(${auraColor}, ${0.18 + Math.sin(t * 2) * 0.03})`);
    aura.addColorStop(0.45, `rgba(${auraColor}, 0.07)`);
    aura.addColorStop(1, `rgba(${auraColor}, 0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -18 * scale, 86 * scale, 0, TAU);
    ctx.fill();

    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, 36 * scale, 49 * scale, 16 * scale, 0, 0, TAU);
    ctx.fill();

    // floor glyph
    ctx.strokeStyle = low ? 'rgba(255, 95, 118, 0.28)' : 'rgba(105, 238, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(0, 4 * scale, 55 * scale, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // base steps
    drawPolygon(ctx, 0, 23 * scale, 47 * scale, 8, 'rgba(7, 18, 24, 0.98)', 'rgba(94, 196, 215, 0.35)', 1.2);
    drawPolygon(ctx, 0, 18 * scale, 38 * scale, 8, 'rgba(11, 27, 34, 0.98)', 'rgba(104, 217, 234, 0.25)', 1);

    // health arc
    ctx.strokeStyle = low ? '#ff5c76' : '#ffcf76';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 50 * scale, -Math.PI / 2, -Math.PI / 2 + TAU * hpFrac);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // rotating outer ring
    ctx.save();
    ctx.rotate(t * 0.32);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rr = 59 * scale;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 207, 118, 0.55)' : 'rgba(103, 239, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // hovering shards
    for (let i = 0; i < 3; i++) {
      const a = t * 0.75 + i * TAU / 3;
      const sx = Math.cos(a) * 30 * scale;
      const sy = -22 * scale + Math.sin(a) * 9 * scale;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + t);
      ctx.fillStyle = 'rgba(157, 249, 255, 0.8)';
      ctx.shadowColor = '#67efff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -3.4 * scale);
      ctx.lineTo(2.4 * scale, 0);
      ctx.lineTo(0, 3.4 * scale);
      ctx.lineTo(-2.4 * scale, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // tower body
    const bodyGrad = ctx.createLinearGradient(-16 * scale, 0, 16 * scale, 0);
    bodyGrad.addColorStop(0, '#142c38');
    bodyGrad.addColorStop(0.28, '#2b5260');
    bodyGrad.addColorStop(0.52, '#0a1920');
    bodyGrad.addColorStop(0.78, '#1e3d48');
    bodyGrad.addColorStop(1, '#071118');

    ctx.beginPath();
    ctx.moveTo(-17 * scale, 17 * scale);
    ctx.lineTo(-12 * scale, -15 * scale);
    ctx.lineTo(-7 * scale, -23 * scale);
    ctx.lineTo(-4.5 * scale, -42 * scale);
    ctx.lineTo(0, -51 * scale);
    ctx.lineTo(4.5 * scale, -42 * scale);
    ctx.lineTo(7 * scale, -23 * scale);
    ctx.lineTo(12 * scale, -15 * scale);
    ctx.lineTo(17 * scale, 17 * scale);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(104, 227, 243, 0.36)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // body detail
    ctx.strokeStyle = 'rgba(117, 242, 255, 0.18)';
    ctx.lineWidth = 1;
    for (const y of [-10, 4]) {
      ctx.beginPath();
      ctx.moveTo(-11 * scale, y * scale);
      ctx.lineTo(11 * scale, y * scale);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(3, 11, 15, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-5 * scale, 16 * scale);
    ctx.lineTo(-3 * scale, -18 * scale);
    ctx.lineTo(3 * scale, -18 * scale);
    ctx.lineTo(5 * scale, 16 * scale);
    ctx.closePath();
    ctx.fill();

    // crystal
    const pulse = 1 + Math.sin(t * 2.4) * 0.05;
    ctx.save();
    ctx.translate(0, -49 * scale);
    ctx.scale(pulse, pulse);
    const crystal = ctx.createLinearGradient(0, -16 * scale, 0, 15 * scale);
    crystal.addColorStop(0, '#ffffff');
    crystal.addColorStop(0.36, '#bdfbff');
    crystal.addColorStop(0.7, '#5ae7f8');
    crystal.addColorStop(1, '#1689a4');
    ctx.fillStyle = crystal;
    ctx.shadowColor = low ? '#ff4c68' : '#7bf2ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(0, -16 * scale);
    ctx.lineTo(8 * scale, -3 * scale);
    ctx.lineTo(4 * scale, 13 * scale);
    ctx.lineTo(0, 16 * scale);
    ctx.lineTo(-4 * scale, 13 * scale);
    ctx.lineTo(-8 * scale, -3 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(236, 255, 255, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -15 * scale);
    ctx.lineTo(0, 15 * scale);
    ctx.moveTo(-7.6 * scale, -3 * scale);
    ctx.lineTo(7.6 * scale, -3 * scale);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.stroke();
    ctx.restore();

    // damage cracks
    if (low) {
      ctx.strokeStyle = 'rgba(255, 85, 108, 0.58)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-2 * scale, -35 * scale);
      ctx.lineTo(-9 * scale, -22 * scale);
      ctx.lineTo(-5 * scale, -13 * scale);
      ctx.lineTo(-11 * scale, -4 * scale);
      ctx.moveTo(5 * scale, -28 * scale);
      ctx.lineTo(10 * scale, -18 * scale);
      ctx.lineTo(6 * scale, -9 * scale);
      ctx.stroke();
    }

    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash * 0.28;
      ctx.fillStyle = '#ffdfe5';
      ctx.beginPath();
      ctx.arc(0, -10 * scale, 45 * scale, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (G.towerFreeze > 0) {
      ctx.fillStyle = 'rgba(163, 232, 255, 0.22)';
      ctx.strokeStyle = 'rgba(220, 252, 255, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-27 * scale, 21 * scale);
      ctx.lineTo(-7 * scale, -47 * scale);
      ctx.lineTo(14 * scale, -19 * scale);
      ctx.lineTo(28 * scale, 22 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDefenders() {
    const inspected = G.inspectedDef;
    if (inspected) {
      const d = inspected;
      const ringRadius = d.type === 'booster' || d.type === 'god'
        ? d.auraRadius
        : (d.type === 'banker' ? 44 * layout.scale : d.range);
      ctx.save();
      ctx.fillStyle = hexAlpha(d.def.color, 0.045);
      ctx.strokeStyle = hexAlpha(d.def.color, 0.28);
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.arc(d.x, d.y, ringRadius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    for (const b of G.defenders) {
      if (b.dead || (b.type !== 'booster' && b.type !== 'god')) continue;
      for (const target of G.defenders) {
        if (target === b || target.dead || target.def.support) continue;
        if (dist(b.x, b.y, target.x, target.y) > b.auraRadius) continue;
        ctx.strokeStyle = hexAlpha(b.def.color, b.type === 'god' ? 0.17 : 0.11);
        ctx.lineWidth = b.type === 'god' ? 1.2 : 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.restore();

    for (const d of G.defenders) {
      const s = layout.scale;
      ctx.save();
      ctx.translate(d.x, d.y);

      if (d.type === 'booster' || d.type === 'god') {
        const pulse = 0.5 + 0.5 * Math.sin(G.visual * 2.4 + d.x * 0.01);
        ctx.fillStyle = hexAlpha(d.def.color, (d.type === 'god' ? 0.04 : 0.025) + pulse * 0.015);
        ctx.beginPath();
        ctx.arc(0, 0, d.auraRadius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = hexAlpha(d.def.color, (d.type === 'god' ? 0.24 : 0.14) + pulse * 0.08);
        ctx.lineWidth = d.type === 'god' ? 1.4 : 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.auraRadius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 10 * s, 16 * s, 6 * s, 0, 0, TAU);
      ctx.fill();

      if (G.hoverDefender === d) {
        ctx.strokeStyle = hexAlpha(d.def.color, 0.65);
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 19 * s, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (!d.def.support && d.aura) {
        ctx.strokeStyle = 'rgba(125, 252, 196, 0.38)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, 17 * s, G.visual * 0.8, G.visual * 0.8 + TAU * 0.8);
        ctx.stroke();
      }

      // base
      drawPolygon(ctx, 0, 0, 14.5 * s, 6, 'rgba(7, 18, 24, 0.98)', hexAlpha(d.def.color, 0.5), 1.2);

      if (d.type === 'archer') {
        ctx.save();
        ctx.rotate(d.aim);
        const kick = d.recoil * 3 * s;
        ctx.translate(-kick, 0);
        ctx.strokeStyle = hexAlpha(d.def.color, 0.95);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(-2 * s, 0, 8 * s, -0.95, 0.95);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(223, 253, 255, 0.85)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-7 * s, 0);
        ctx.lineTo(14 * s, 0);
        ctx.stroke();
        ctx.fillStyle = '#ebfeff';
        ctx.beginPath();
        ctx.moveTo(15 * s, 0);
        ctx.lineTo(10 * s, -2.4 * s);
        ctx.lineTo(10 * s, 2.4 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (d.type === 'mortar') {
        ctx.save();
        ctx.rotate(d.aim);
        const kick = d.recoil * 4 * s;
        ctx.translate(-kick, 0);
        ctx.fillStyle = 'rgba(29, 37, 39, 0.95)';
        ctx.strokeStyle = hexAlpha(d.def.color, 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-3 * s, -4.6 * s, 17 * s, 9.2 * s, 3 * s);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hexAlpha(d.def.color, 0.8);
        ctx.beginPath();
        ctx.arc(14 * s, 0, 2.6 * s, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255, 189, 99, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2 * s, 0, TAU);
        ctx.fill();
      } else if (d.type === 'frost') {
        const p = 1 + Math.sin(G.visual * 3 + d.x) * 0.08;
        ctx.save();
        ctx.scale(p, p);
        ctx.strokeStyle = hexAlpha(d.def.color, 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 9 * s, G.visual * 0.8, G.visual * 0.8 + TAU * 0.7);
        ctx.stroke();
        ctx.fillStyle = hexAlpha(d.def.color, 0.92);
        ctx.shadowColor = d.def.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -9 * s);
        ctx.lineTo(4.5 * s, 0);
        ctx.lineTo(0, 9 * s);
        ctx.lineTo(-4.5 * s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        for (let i = 0; i < 2; i++) {
          const a = G.visual * 1.3 + i * Math.PI;
          ctx.fillStyle = 'rgba(219, 213, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 11 * s, Math.sin(a) * 11 * s, 1.6 * s, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      } else if (d.type === 'god') {
        const p = 1 + Math.sin(G.visual * 4 + d.x) * 0.05;
        ctx.save();
        ctx.scale(p, p);

        // halo rays
        for (let i = 0; i < 8; i++) {
          const a = G.visual * 0.55 + i * TAU / 8;
          ctx.strokeStyle = hexAlpha(d.def.color, 0.2 + (i % 2) * 0.12);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 10 * s, Math.sin(a) * 10 * s);
          ctx.lineTo(Math.cos(a) * 16 * s, Math.sin(a) * 16 * s);
          ctx.stroke();
        }

        // wings
        ctx.strokeStyle = 'rgba(255, 244, 190, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-4 * s, -2 * s);
        ctx.quadraticCurveTo(-15 * s, -9 * s, -17 * s, 3 * s);
        ctx.quadraticCurveTo(-11 * s, 1 * s, -5 * s, 5 * s);
        ctx.moveTo(4 * s, -2 * s);
        ctx.quadraticCurveTo(15 * s, -9 * s, 17 * s, 3 * s);
        ctx.quadraticCurveTo(11 * s, 1 * s, 5 * s, 5 * s);
        ctx.stroke();

        // body and core
        ctx.fillStyle = 'rgba(255, 247, 205, 0.92)';
        ctx.shadowColor = d.def.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 7.2 * s, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.arc(0, 0, 4.1 * s, 0, TAU);
        ctx.fill();

        // all-seeing eye looking at the target
        ctx.save();
        ctx.rotate(Math.sin(G.visual * 1.7) * 0.12);
        ctx.strokeStyle = '#6b4b00';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5 * s, 2.3 * s, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#3f2b00';
        ctx.beginPath();
        ctx.arc(0, 0, 1.6 * s, 0, TAU);
        ctx.fill();
        ctx.restore();

        // crown
        ctx.strokeStyle = '#fff5bd';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -10 * s);
        ctx.lineTo(-3 * s, -14 * s);
        ctx.lineTo(0, -10.5 * s);
        ctx.lineTo(3 * s, -14 * s);
        ctx.lineTo(6 * s, -10 * s);
        ctx.stroke();
        ctx.restore();
      } else if (d.type === 'banker') {
        const bob = Math.sin(G.visual * 2 + d.x * 0.03) * 1.2 * s;
        ctx.save();
        ctx.translate(0, bob);

        // coin stack
        for (let i = 0; i < 3; i++) {
          const cy = 6 * s - i * 3.4 * s;
          ctx.fillStyle = i === 2 ? '#ffe8a3' : '#c99a36';
          ctx.strokeStyle = 'rgba(255, 226, 143, 0.7)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(0, cy, 9 * s, 3.2 * s, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }

        // coin above the stack
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = 'rgba(255, 246, 197, 0.9)';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(0, -8 * s, 5.7 * s, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#4a3505';
        ctx.beginPath();
        ctx.moveTo(0, -12 * s);
        ctx.lineTo(2.2 * s, -8 * s);
        ctx.lineTo(0, -4 * s);
        ctx.lineTo(-2.2 * s, -8 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // booster: mint beacon with a pulsing aura fin
        ctx.save();
        const p = 1 + Math.sin(G.visual * 3.2 + d.x) * 0.06;
        ctx.scale(p, p);
        ctx.strokeStyle = hexAlpha(d.def.color, 0.85);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 2 * s);
        ctx.lineTo(0, -13 * s);
        ctx.stroke();
        for (let i = 0; i < 2; i++) {
          const y = -6 * s - i * 4 * s;
          ctx.strokeStyle = hexAlpha(d.def.color, 0.7 - i * 0.18);
          ctx.beginPath();
          ctx.moveTo(-5 * s, y);
          ctx.lineTo(0, y - 3 * s);
          ctx.lineTo(5 * s, y);
          ctx.stroke();
        }
        ctx.fillStyle = hexAlpha(d.def.color, 0.94);
        ctx.shadowColor = d.def.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 4 * s, 4.6 * s, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hexAlpha(d.def.color, 0.55);
        ctx.beginPath();
        ctx.arc(0, 4 * s, 8 * s, G.visual * 0.9, G.visual * 0.9 + TAU * 0.72);
        ctx.stroke();
        ctx.restore();
      }

      // level pips
      for (let i = 0; i < d.level; i++) {
        ctx.fillStyle = '#ffd88f';
        ctx.beginPath();
        const px = (i - (d.level - 1) / 2) * 5 * s;
        ctx.arc(px, -19 * s, 1.35, 0, TAU);
        ctx.fill();
      }

      // hp bar
      if (d.freeze > 0) {
        ctx.fillStyle = 'rgba(162, 232, 255, 0.4)';
        ctx.strokeStyle = 'rgba(224, 252, 255, 0.75)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -17 * s);
        ctx.lineTo(10 * s, -4 * s);
        ctx.lineTo(4 * s, 17 * s);
        ctx.lineTo(-7 * s, 9 * s);
        ctx.lineTo(-11 * s, -5 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (d.hp < d.maxHp) {
        const bw = 25 * s;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-bw / 2, 17 * s, bw, 3);
        ctx.fillStyle = d.hp / d.maxHp > 0.35 ? '#79f6de' : '#ff6b83';
        ctx.fillRect(-bw / 2, 17 * s, bw * clamp(d.hp / d.maxHp, 0, 1), 3);
      }

      if (d.hitFlash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = d.hitFlash * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 14 * s, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    }
  }

  function drawSkulls() {
    if (!G.skulls.length) return;
    const s = layout.scale;
    for (const skull of G.skulls) {
      const pulse = 0.5 + 0.5 * Math.sin(G.visual * 2 + skull.x * 0.02);
      ctx.save();
      ctx.translate(skull.x, skull.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 5 * s, 7 * s, 3 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#cfc7a8';
      ctx.strokeStyle = `rgba(183, 140, 255, ${0.45 + pulse * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 5.4 * s, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#17121f';
      ctx.beginPath();
      ctx.arc(-2 * s, -1 * s, 1.25 * s, 0, TAU);
      ctx.arc(2 * s, -1 * s, 1.25 * s, 0, TAU);
      ctx.fill();
      ctx.fillRect(-1.4 * s, 1.5 * s, 2.8 * s, 1.5 * s);
      if (pulse > 0.55) {
        ctx.fillStyle = `rgba(183, 140, 255, ${(pulse - 0.55) * 0.7})`;
        ctx.beginPath();
        ctx.arc(0, 0, 9 * s, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.base.towerBoss) {
        drawEnemyTower(e);
        continue;
      }
      const s = layout.scale;
      const spawnScale = 0.55 + 0.45 * e.spawnT;
      const alpha = clamp(e.spawnT * 1.5, 0, 1);
      const lunge = e.lunge * 3.5 * s;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y + Math.sin(G.visual * 2.4 + e.seed) * 1.2);

      // shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.85, e.radius * 1.1, e.radius * 0.42, 0, 0, TAU);
      ctx.fill();

      // slow aura
      if (e.slow > 0 || e.freeze > 0) {
        ctx.fillStyle = e.freeze > 0 ? 'rgba(145, 225, 255, 0.16)' : 'rgba(126, 203, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 1.6, 0, TAU);
        ctx.fill();
      }

      if (e.empower > 0) {
        ctx.strokeStyle = 'rgba(255, 207, 107, 0.42)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 1.4, 0, TAU);
        ctx.stroke();
      }

      ctx.scale(spawnScale, spawnScale);
      ctx.rotate(e.facing);
      ctx.translate(lunge, 0);

      ctx.shadowColor = e.base.color;
      ctx.shadowBlur = e.isBoss ? 18 : 8;

      if (e.type === 'thrall') {
        drawThrall(e);
      } else if (e.type === 'runner') {
        drawRunner(e);
      } else if (e.type === 'brute') {
        drawBrute(e);
      } else if (e.type === 'spitter') {
        drawSpitter(e);
      } else if (e.type === 'healer') {
        drawHealer(e);
      } else if (e.type === 'kamikaze') {
        drawKamikaze(e);
      } else if (e.type === 'drummer') {
        drawDrummer(e);
      } else if (e.type === 'necromancer') {
        drawNecromancer(e);
      } else if (e.type === 'skeleton') {
        drawSkeleton(e);
      } else if (e.base.copy) {
        drawDefenderCopy(e);
      } else if (e.type === 'king') {
        drawKing(e);
      } else if (e.type === 'guardian') {
        drawGuardian(e);
      } else {
        drawBoss(e);
      }
      ctx.shadowBlur = 0;

      if (e.freeze > 0) {
        ctx.fillStyle = 'rgba(176, 238, 255, 0.46)';
        ctx.strokeStyle = 'rgba(224, 252, 255, 0.8)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -e.radius * 1.45);
        ctx.lineTo(e.radius * 0.8, -e.radius * 0.25);
        ctx.lineTo(e.radius * 0.35, e.radius * 1.35);
        ctx.lineTo(-e.radius * 0.45, e.radius * 0.5);
        ctx.lineTo(-e.radius * 0.9, -e.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (e.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.85, e.flash);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.9, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();

      // hp bar (screen space)
      if (e.hp < e.maxHp || e.isBoss) {
        const bw = e.isBoss ? 58 * s : Math.max(18, e.radius * 2.25);
        const bx = e.x - bw / 2;
        const by = e.y - e.radius - 10 * s;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(2, 8, 12, 0.72)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4.5);
        ctx.fillStyle = e.hp / e.maxHp > 0.32 ? e.base.color : '#ff405c';
        ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 2.5);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawThrall(e) {
    const r = e.radius;
    const wobble = Math.sin(G.visual * 7 + e.seed) * 0.16;
    ctx.fillStyle = '#241320';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + wobble;
      const rr = i === 0 ? r * 1.35 : r * (0.85 + (i % 2) * 0.2);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = e.base.color;
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.3, 1.8, 0, TAU);
    ctx.arc(r * 0.55, r * 0.3, 1.8, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 93, 134, 0.55)';
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      const a = side * 0.9;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, side * r * 0.5);
      ctx.lineTo(-r * 0.95 + Math.sin(G.visual * 8 + e.seed) * 2, side * (r * 0.9));
      ctx.stroke();
    }
  }

  function drawRunner(e) {
    const r = e.radius;
    ctx.fillStyle = '#2a1811';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(r * 1.25, 0);
    ctx.lineTo(-r * 0.85, -r * 0.85);
    ctx.lineTo(-r * 0.5, 0);
    ctx.lineTo(-r * 0.85, r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe2c2';
    ctx.beginPath();
    ctx.arc(r * 0.58, 0, 1.8, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 155, 87, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * (0.9 + i * 0.5), -r * 0.4);
      ctx.lineTo(-r * (1.5 + i * 0.6), 0);
      ctx.lineTo(-r * (0.9 + i * 0.5), r * 0.4);
      ctx.stroke();
    }
  }

  function drawBrute(e) {
    const r = e.radius;
    ctx.fillStyle = '#2b1a0f';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    drawPolygon(ctx, 0, 0, r, 6, '#2b1a0f', e.base.color, 1.2);
    ctx.fillStyle = 'rgba(255, 176, 78, 0.18)';
    ctx.beginPath();
    ctx.arc(-r * 0.15, 0, r * 0.68, 0, TAU);
    ctx.fill();

    // horns
    ctx.fillStyle = e.base.color;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.85);
    ctx.lineTo(r * 1.18, -r * 0.6);
    ctx.lineTo(r * 0.55, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.3, r * 0.85);
    ctx.lineTo(r * 1.18, r * 0.6);
    ctx.lineTo(r * 0.55, r * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffdfb0';
    ctx.beginPath();
    ctx.arc(r * 0.56, -r * 0.25, 2.4, 0, TAU);
    ctx.arc(r * 0.56, r * 0.25, 2.4, 0, TAU);
    ctx.fill();
  }

  function drawSpitter(e) {
    const r = e.radius;
    const bob = Math.sin(G.visual * 3 + e.seed) * 1.5;
    ctx.save();
    ctx.translate(0, bob);

    ctx.strokeStyle = 'rgba(149, 239, 118, 0.55)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) {
      const a = G.visual * 1.2 + i * TAU / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.4) * r * 1.25,
        Math.sin(a + 0.4) * r * 1.25,
        Math.cos(a + 0.1) * r * 1.5,
        Math.sin(a + 0.1) * r * 1.5
      );
      ctx.stroke();
    }

    ctx.fillStyle = '#152415';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d9ffc4';
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, 2.8, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(149, 239, 118, 0.35)';
    ctx.beginPath();
    ctx.arc(r * 0.9, 0, r * 0.3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawHealer(e) {
    const r = e.radius;
    const pulse = 1 + Math.sin(G.visual * 3.4 + e.seed) * 0.08;

    ctx.strokeStyle = 'rgba(125, 252, 196, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45 * pulse, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#10251c';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = e.base.color;
    ctx.shadowColor = e.base.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(-r * 0.18, -r * 0.55, r * 0.36, r * 1.1);
    ctx.fillRect(-r * 0.55, -r * 0.18, r * 1.1, r * 0.36);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#e9fff6';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, TAU);
    ctx.fill();
  }

  function drawKamikaze(e) {
    const r = e.radius;
    const pulse = 1 + Math.sin(G.visual * 9 + e.seed) * 0.12;

    ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45 * pulse, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#2a0e12';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // spikes
    ctx.fillStyle = e.base.color;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + G.visual * 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a + 0.18) * r * 1.25, Math.sin(a + 0.18) * r * 1.25);
      ctx.lineTo(Math.cos(a - 0.18) * r * 1.25, Math.sin(a - 0.18) * r * 1.25);
      ctx.closePath();
      ctx.fill();
    }

    // fuse and spark
    ctx.strokeStyle = '#ffd08a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.8, -r * 1.25, r * 0.38, -r * 1.65);
    ctx.stroke();
    ctx.fillStyle = '#fff2a8';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 1.65, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffe6d6';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.15, 1.5, 0, TAU);
    ctx.arc(r * 0.3, r * 0.25, 1.5, 0, TAU);
    ctx.fill();
  }

  function drawKing(e) {
    const r = e.radius;
    const t = G.visual;

    ctx.save();
    ctx.rotate(t * 0.25);
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.38, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = '#2a210d';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.6;
    drawPolygon(ctx, 0, 0, r, 7, '#2a210d', e.base.color, 1.7);

    // crown
    ctx.fillStyle = e.base.color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, -r * 0.48);
    ctx.lineTo(-r * 0.6, -r * 1.18);
    ctx.lineTo(-r * 0.18, -r * 0.78);
    ctx.lineTo(0, -r * 1.35);
    ctx.lineTo(r * 0.18, -r * 0.78);
    ctx.lineTo(r * 0.6, -r * 1.18);
    ctx.lineTo(r * 0.72, -r * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r * 0.62, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff4c8';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(r * 0.34, 0, r * 0.16, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#5a3a06';
    ctx.beginPath();
    ctx.ellipse(r * 0.38, 0, r * 0.05, r * 0.13, 0, 0, TAU);
    ctx.fill();
  }

  function drawGuardian(e) {
    const r = e.radius;

    ctx.fillStyle = '#1e1830';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    drawPolygon(ctx, 0, 0, r, 6, '#1e1830', e.base.color, 1.2);

    // shield
    ctx.fillStyle = 'rgba(201, 167, 255, 0.2)';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.78);
    ctx.lineTo(r * 0.8, -r * 0.48);
    ctx.lineTo(r * 0.8, r * 0.48);
    ctx.lineTo(r * 0.25, r * 0.78);
    ctx.lineTo(-r * 0.15, r * 0.45);
    ctx.lineTo(-r * 0.15, -r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f0e6ff';
    ctx.beginPath();
    ctx.arc(-r * 0.05, -r * 0.2, 1.7, 0, TAU);
    ctx.arc(-r * 0.05, r * 0.2, 1.7, 0, TAU);
    ctx.fill();
  }

  function drawBoss(e) {
    const r = e.radius;
    const t = G.visual;

    ctx.save();
    ctx.rotate(t * 0.3);
    ctx.strokeStyle = 'rgba(255, 61, 92, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.fillStyle = 'rgba(255, 61, 92, 0.8)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08);
      ctx.lineTo(Math.cos(a + 0.12) * r * 1.48, Math.sin(a + 0.12) * r * 1.48);
      ctx.lineTo(Math.cos(a - 0.12) * r * 1.48, Math.sin(a - 0.12) * r * 1.48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#260d15';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.6;
    drawPolygon(ctx, 0, 0, r, 7, '#260d15', e.base.color, 1.8);

    ctx.fillStyle = 'rgba(255, 61, 92, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffe4e9';
    ctx.shadowColor = '#ff3d5c';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(r * 0.34, 0, r * 0.18, r * 0.28, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a1026';
    ctx.beginPath();
    ctx.ellipse(r * 0.38, 0, r * 0.055, r * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawDrummer(e) {
    const r = e.radius;
    const beat = 0.5 + 0.5 * Math.sin(G.visual * 8);
    const aura = (e.base.buffRadius || 0) * layout.scale;

    if (aura > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 207, 107, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, aura, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.fillStyle = '#241b0d';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    drawPolygon(ctx, 0, 0, r, 5, '#241b0d', e.base.color, 1.2);

    ctx.strokeStyle = 'rgba(255, 207, 107, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = '#5c3b12';
    ctx.strokeStyle = e.base.color;
    ctx.beginPath();
    ctx.ellipse(r * 0.2, 0, r * 0.62, r * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 229, 157, ${0.35 + beat * 0.35})`;
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, r * 0.36, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#ffe6a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.55);
    ctx.lineTo(r * 0.65, -r * 0.12);
    ctx.moveTo(-r * 0.1, r * 0.55);
    ctx.lineTo(r * 0.65, r * 0.12);
    ctx.stroke();
  }

  function drawNecromancer(e) {
    const r = e.radius;
    const pulse = 0.5 + 0.5 * Math.sin(G.visual * 3 + e.seed);
    ctx.save();
    ctx.rotate(Math.sin(G.visual * 1.8 + e.seed) * 0.08);

    ctx.fillStyle = '#1d132b';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r * 0.72, r * 0.62);
    ctx.quadraticCurveTo(0, r * 0.95, -r * 0.72, r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0b0712';
    ctx.beginPath();
    ctx.ellipse(r * 0.05, -r * 0.28, r * 0.34, r * 0.42, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = `rgba(183, 140, 255, ${0.65 + pulse * 0.35})`;
    ctx.shadowColor = '#b78cff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(r * 0.05, -r * 0.28, r * 0.11, 0, TAU);
    ctx.arc(r * 0.05, r * 0.08, r * 0.11, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#d9c7ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, r * 0.15);
    ctx.lineTo(-r * 1.0, -r * 0.9);
    ctx.stroke();
    ctx.fillStyle = '#b78cff';
    ctx.shadowColor = '#b78cff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-r * 1.0, -r * 0.9, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawSkeleton(e) {
    const r = e.radius;
    const step = Math.sin(G.visual * 9 + e.seed) * r * 0.16;
    ctx.strokeStyle = '#e9e3c8';
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.lineTo(0, r * 0.55);
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(-r * 0.55, r * 0.45 + step);
    ctx.moveTo(0, r * 0.1);
    ctx.lineTo(r * 0.55, r * 0.45 - step);
    ctx.moveTo(0, -r * 0.1);
    ctx.lineTo(-r * 0.6, -r * 0.4);
    ctx.moveTo(0, -r * 0.1);
    ctx.lineTo(r * 0.55, -r * 0.55);
    ctx.stroke();

    ctx.fillStyle = '#ded7ba';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -r * 0.48, r * 0.34, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#17121f';
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.52, r * 0.075, 0, TAU);
    ctx.arc(r * 0.12, -r * 0.52, r * 0.075, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#b9b195';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.55);
    ctx.lineTo(r * 1.25, -r * 0.9);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawDefenderCopy(e) {
    const r = e.radius;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 16, 0.94)';
    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.2;
    drawPolygon(ctx, 0, 0, r, 6, 'rgba(7, 10, 16, 0.94)', e.base.color, 1.2);

    ctx.fillStyle = e.base.color;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = e.base.color;
    ctx.lineWidth = 1.4;
    if (e.copyOf === 'archer') {
      ctx.beginPath();
      ctx.arc(r * 0.15, 0, r * 0.5, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, 0);
      ctx.lineTo(r * 0.9, 0);
      ctx.stroke();
    } else if (e.copyOf === 'mortar') {
      ctx.fillStyle = '#20242c';
      ctx.beginPath();
      ctx.roundRect(-r * 0.15, -r * 0.32, r * 0.95, r * 0.64, r * 0.2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(0, r * 0.5);
      ctx.moveTo(-r * 0.42, 0);
      ctx.lineTo(r * 0.42, 0);
      ctx.stroke();
    }

    ctx.fillStyle = '#120c18';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.1, r * 0.1, 0, TAU);
    ctx.arc(r * 0.2, -r * 0.1, r * 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemyTower(e) {
    const s = layout.scale;
    const r = e.radius;
    const alpha = clamp(e.spawnT * 1.5, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(G.visual * 2.6);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x, e.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.92, r * 1.25, r * 0.34, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 122, 158, ${0.24 + pulse * 0.18})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, TAU);
    ctx.stroke();

    if (e.lightningCast) {
      const ratio = clamp(e.lightningCast.remaining / e.lightningCast.total, 0, 1);
      ctx.strokeStyle = 'rgba(255, 142, 219, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.72, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
      ctx.stroke();
    }

    // feet and plinth
    ctx.fillStyle = '#120b16';
    ctx.strokeStyle = '#6e354c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.74);
    ctx.lineTo(-r * 0.55, r * 0.42);
    ctx.lineTo(r * 0.55, r * 0.42);
    ctx.lineTo(r * 0.9, r * 0.74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawPolygon(ctx, 0, 0, r * 1.02, 6, '#160c19', '#7f3a58', 1.2);

    // body
    const body = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
    body.addColorStop(0, '#1b0e1a');
    body.addColorStop(0.48, '#3b182c');
    body.addColorStop(1, '#120913');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#a14b6c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.56, r * 0.58);
    ctx.lineTo(-r * 0.36, -r * 0.54);
    ctx.lineTo(-r * 0.2, -r * 0.9);
    ctx.lineTo(0, -r * 1.32);
    ctx.lineTo(r * 0.2, -r * 0.9);
    ctx.lineTo(r * 0.36, -r * 0.54);
    ctx.lineTo(r * 0.56, r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ribs / windows
    ctx.strokeStyle = 'rgba(255, 122, 158, 0.42)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = -r * 0.35 + i * r * 0.25;
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, y);
      ctx.lineTo(r * 0.32, y);
      ctx.stroke();
    }

    // side spikes
    ctx.fillStyle = '#2a1020';
    ctx.strokeStyle = '#c05a7b';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, -r * 0.35);
      ctx.lineTo(side * r * 0.98, -r * 0.12);
      ctx.lineTo(side * r * 0.5, r * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // core eye
    ctx.fillStyle = `rgba(255, 96, 142, ${0.45 + pulse * 0.35})`;
    ctx.shadowColor = '#ff7a9e';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, -r * 0.78, r * 0.23, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff0f5';
    ctx.beginPath();
    ctx.arc(0, -r * 0.78, r * 0.09, 0, TAU);
    ctx.fill();

    // crown
    ctx.strokeStyle = '#ff9ab8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 1.08);
    ctx.lineTo(-r * 0.14, -r * 1.42);
    ctx.lineTo(0, -r * 1.2);
    ctx.lineTo(r * 0.14, -r * 1.42);
    ctx.lineTo(r * 0.32, -r * 1.08);
    ctx.stroke();

    if (e.lastStandTimer > 0) {
      ctx.fillStyle = 'rgba(255, 80, 120, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, TAU);
      ctx.fill();
    }

    ctx.restore();

    // local health bar under the boss UI bar
    const bw = 72 * s;
    const bx = e.x - bw / 2;
    const by = e.y - r * 1.55;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(2, 8, 12, 0.78)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.32 ? '#ff7a9e' : '#ff405c';
    ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 3);
    ctx.globalAlpha = 1;
  }

  function drawProjectiles() {
    for (const p of G.projectiles) {
      if (p.kind === 'arrow') {
        const a = p.angle || 0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.1;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.fillStyle = '#f2feff';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(3, -2);
        ctx.lineTo(3, 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'shell') {
        const t = clamp(p.t, 0, 1);
        const x = lerp(p.x0, p.tx, t);
        const y = lerp(p.y0, p.ty, t);
        const z = Math.sin(Math.PI * t) * 52;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2.3, 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y - z);
        ctx.rotate(t * 5);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(0, 0, 3.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff0d0';
        ctx.beginPath();
        ctx.arc(-0.8, -0.8, 1.1, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'enemy') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius || 4, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(-Math.cos(p.angle || 0) * 8, -Math.sin(p.angle || 0) * 8, 2.4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawEffects() {
    // beams
    for (const b of G.beams) {
      const frac = b.life / b.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = frac * 0.75;
      ctx.lineWidth = b.width * frac;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      b.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.globalAlpha = frac;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(0.6, b.width * frac * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    // rings
    for (const r of G.rings) {
      const p = 1 - r.life / r.maxLife;
      const ease = 1 - Math.pow(1 - p, 3);
      const radius = lerp(r.startR, r.endR, ease);
      const alpha = (1 - p) * 0.85;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.4, r.width * (1 - p * 0.45));
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // particles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // flashes at targets (small)
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    if (!G.floats.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontFamily = getComputedStyle(document.body).fontFamily;
    for (const f of G.floats) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `800 ${f.size}px ${fontFamily}`;
      ctx.fillStyle = f.color;
      ctx.shadowColor = 'rgba(0,0,0,.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawReticle() {
    if (!G.reticle || G.reticle.life <= 0) return;
    const r = G.reticle;
    const alpha = clamp(r.life / 0.5, 0, 1);
    const color = r.denied ? '#ff6f86' : '#9df7ff';
    const base = 12 * layout.scale;

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(G.visual * 0.6);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.75;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, base, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (base + 3), Math.sin(a) * (base + 3));
      ctx.lineTo(Math.cos(a) * (base + 8), Math.sin(a) * (base + 8));
      ctx.stroke();
    }
    ctx.restore();

    if (G.manualCd > 0 && !r.denied) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, base + 12, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - G.manualCd / 0.62));
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFlash() {
    if (G.flash > 0.002) {
      ctx.save();
      ctx.globalAlpha = G.flash;
      ctx.fillStyle = G.flashColor;
      ctx.fillRect(0, 0, layout.w, layout.h);
      ctx.restore();
    }
  }

  function drawPolygon(c, x, y, radius, sides, fill, stroke, lineWidth) {
    c.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i / sides) * TAU;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth || 1; c.stroke(); }
  }

  function hexAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return hex;
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  /* ========================= Update / loop ========================= */

  function update(dt) {
    G.visual += dt;
    G.time += dt;
    G.shake *= Math.exp(-dt * 6.5);
    G.towerFlash = Math.max(0, G.towerFlash - dt * 2.8);
    G.flash = Math.max(0, G.flash - dt * 1.8);
    G.pulseCd = Math.max(0, G.pulseCd - dt);
    G.deniedCd = Math.max(0, G.deniedCd - dt);

    const simActive = G.state === 'prep' || G.state === 'combat';
    if (simActive) {
      G.manualCd = Math.max(0, G.manualCd - dt);
      for (const key of ['nova', 'frost', 'repair']) {
        const a = G.abilities[key];
        if (a.cd > 0) a.cd = Math.max(0, a.cd - dt);
      }
    }

    if (G.reticle) {
      G.reticle.life -= dt;
      if (G.reticle.life <= 0) G.reticle = null;
    }

    for (const m of motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(G.visual * 0.7 + m.phase) * m.drift * dt;
      if (m.y < -4) {
        m.y = layout.h + 4;
        m.x = rand(0, layout.w);
      }
      if (m.x < -4) m.x = layout.w + 4;
      if (m.x > layout.w + 4) m.x = -4;
    }

    if (G.state === 'prep') {
      prepTick(dt);
    } else if (G.state === 'combat') {
      updateWave(dt);
    }

    if (G.state !== 'paused') updateEffects(dt);

    G.hudTimer += dt;
    if (G.hudTimer >= 0.08) {
      G.hudTimer = 0;
      updateUi();
    }
  }

  let last = performance.now();
  function frame(now) {
    const rawDt = Math.max(0, (now - last) / 1000);
    const dt = Math.min(0.05, rawDt);
    last = now;
    update(dt);
    draw();

    if (!FORCE_HQ && rawDt > 0 && rawDt < 0.5) {
      perfTime += rawDt;
      perfFrames++;
      if (perfTime >= 2.5 && perfFrames > 8) {
        const avg = perfTime / perfFrames;
        if (avg > 0.028 && qualityScale > 0.65) {
          qualityScale = Math.max(0.65, qualityScale - 0.15);
          applyCanvasScale();
          draw();
        }
        perfTime = 0;
        perfFrames = 0;
      }
    }

    requestAnimationFrame(frame);
  }

  /* ========================= Events ========================= */

  function bindEvents() {
    stage.addEventListener('pointerdown', onPointerDown, { passive: true });
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerleave', onPointerLeave, { passive: true });
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    stage.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.startBtn.addEventListener('click', openModeSelect);
    dom.restartBtn.addEventListener('click', () => startGame(G.mode));
    dom.toMenuBtn.addEventListener('click', showMenu);
    dom.pauseRestartBtn.addEventListener('click', () => startGame(G.mode));
    dom.pauseMenuBtn.addEventListener('click', showMenu);
    dom.victoryRestartBtn.addEventListener('click', () => startGame(G.mode));
    dom.victoryMenuBtn.addEventListener('click', showMenu);

    dom.modeClose.addEventListener('click', closeModeSelect);
    dom.modeBackBtn.addEventListener('click', closeModeSelect);
    dom.modeSelect.addEventListener('click', (e) => {
      if (e.target === dom.modeSelect) closeModeSelect();
    });
    dom.modeCards.forEach((card) => {
      card.addEventListener('click', () => startGame(card.dataset.mode));
    });
    dom.resumeBtn.addEventListener('click', resumeGame);
    dom.pauseBtn.addEventListener('click', () => {
      if (G.state === 'paused') resumeGame();
      else pauseGame(false);
    });

    dom.inventoryBtn.addEventListener('click', openInventory);
    dom.menuInventoryBtn.addEventListener('click', openInventory);
    dom.inventoryClose.addEventListener('click', closeInventory);
    dom.inventoryDoneBtn.addEventListener('click', closeInventory);
    dom.invTowerUpgradeBtn.addEventListener('click', buyTowerUpgrade);
    if (dom.invTowerUnlockBtn) dom.invTowerUnlockBtn.addEventListener('click', buyFinalTower);
    if (dom.invTowerSelector) {
      dom.invTowerSelector.addEventListener('click', (e) => {
        const button = e.target.closest('[data-tower]');
        if (!button) return;
        selectTower(button.dataset.tower);
      });
    }
    if (dom.invViewDefenders) {
      dom.invViewDefenders.addEventListener('click', (e) => {
        const button = e.target.closest('.inv-loadout-btn');
        if (!button) return;
        toggleLoadoutDefender(button.dataset.loadoutDef);
      });
    }
    dom.invBuyBanker.addEventListener('click', () => buyDefender('banker'));
    dom.invBuyBooster.addEventListener('click', () => buyDefender('booster'));
    dom.inventory.addEventListener('click', (e) => {
      if (e.target === dom.inventory) closeInventory();
    });

    dom.menuProgressBtn.addEventListener('click', openProgress);
    dom.progressClose.addEventListener('click', closeProgress);
    dom.progressDoneBtn.addEventListener('click', closeProgress);
    dom.progress.addEventListener('click', (e) => {
      if (e.target === dom.progress) closeProgress();
    });

    if (dom.instructionsBtn) dom.instructionsBtn.addEventListener('click', openGuide);
    if (dom.instructionsClose) dom.instructionsClose.addEventListener('click', closeGuide);
    if (dom.instructionsDoneBtn) dom.instructionsDoneBtn.addEventListener('click', closeGuide);
    if (dom.instructions) {
      dom.instructions.addEventListener('click', (e) => {
        if (e.target === dom.instructions) closeGuide();
      });
    }

    if (dom.accountBtn) dom.accountBtn.addEventListener('click', () => openAccount());
    if (dom.accountClose) dom.accountClose.addEventListener('click', closeAccount);
    if (dom.accountGuestBtn) dom.accountGuestBtn.addEventListener('click', closeAccount);
    if (dom.account) {
      dom.account.addEventListener('click', (e) => {
        if (e.target === dom.account) closeAccount();
      });
    }
    if (dom.accountLoginTab) {
      dom.accountLoginTab.addEventListener('click', () => {
        setAccountTab('login');
        dom.accountLoginUsername?.focus({ preventScroll: true });
      });
    }
    if (dom.accountRegisterTab) {
      dom.accountRegisterTab.addEventListener('click', () => {
        setAccountTab('register');
        dom.accountRegisterUsername?.focus({ preventScroll: true });
      });
    }
    if (dom.accountLoginForm) dom.accountLoginForm.addEventListener('submit', handleAccountLogin);
    if (dom.accountRegisterForm) dom.accountRegisterForm.addEventListener('submit', handleAccountRegister);
    if (dom.accountLogoutBtn) dom.accountLogoutBtn.addEventListener('click', logoutAccount);
    if (dom.accountDeleteBtn) dom.accountDeleteBtn.addEventListener('click', deleteCurrentAccount);
    dom.progressTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        setProgressTab(btn.dataset.progressTab);
        Sound.click();
      });
      btn.addEventListener('keydown', (e) => {
        if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return;
        e.preventDefault();
        const index = dom.progressTabs.indexOf(btn);
        const step = e.code === 'ArrowRight' ? 1 : -1;
        const next = dom.progressTabs[(index + step + dom.progressTabs.length) % dom.progressTabs.length];
        setProgressTab(next.dataset.progressTab);
        next.focus();
      });
    });

    if (dom.leaderboardModes) {
      dom.leaderboardModes.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-leader-mode]');
        if (!btn) return;
        setLeaderMode(btn.dataset.leaderMode);
        Sound.click();
      });
    }

    dom.invTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        setInventoryTab(btn.dataset.invTab);
        Sound.click();
      });
      btn.addEventListener('keydown', (e) => {
        if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return;
        e.preventDefault();
        const index = dom.invTabs.indexOf(btn);
        const step = e.code === 'ArrowRight' ? 1 : -1;
        const next = dom.invTabs[(index + step + dom.invTabs.length) % dom.invTabs.length];
        setInventoryTab(next.dataset.invTab);
        next.focus();
      });
    });

    dom.soundBtn.addEventListener('click', toggleSound);
    dom.pauseSoundBtn.addEventListener('click', toggleSound);

    dom.startWaveBtn.addEventListener('click', () => startNextWave(true));

    dom.zoomInBtn.addEventListener('click', () => {
      zoomStep(1.25);
      Sound.click();
    });
    dom.zoomOutBtn.addEventListener('click', () => {
      zoomStep(1 / 1.25);
      Sound.click();
    });
    dom.zoomResetBtn.addEventListener('click', () => {
      resetCamera();
      Sound.click();
    });

    dom.abilityNova.addEventListener('click', () => useAbility('nova'));
    dom.abilityFrost.addEventListener('click', () => useAbility('frost'));
    dom.abilityRepair.addEventListener('click', () => useAbility('repair'));

    document.querySelectorAll('.def-card').forEach((card) => {
      card.addEventListener('click', () => selectDefender(card.dataset.def));
    });

    dom.inspectorClose.addEventListener('click', closeInspector);
    dom.upgradeBtn.addEventListener('click', upgradeSelected);
    dom.sellBtn.addEventListener('click', sellSelected);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', () => {
      resize();
      checkOrientation();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => { resize(); checkOrientation(); }, 120);
    });

    if (window.matchMedia) {
      G.hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (G.state === 'prep' || G.state === 'combat')) {
        pauseGame(false);
      }
      last = performance.now();
    });

    window.addEventListener('pagehide', () => {
      saveDailyState();
      saveEnemyKills();
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(app);
      ro.observe(dom.hud);
      ro.observe(dom.controls);
    }
  }

  function toggleSound() {
    Sound.init();
    Sound.setMuted(!Sound.muted);
    syncSoundUi();
    if (!Sound.muted) Sound.click();
  }

  /* ========================= Boot ========================= */

  // A tiny read-only-ish debug surface for QA and browser tinkering.
  window.LastTower = {
    get account() {
      if (!AccountAuth.current) return null;
      return {
        username: AccountAuth.current.username,
        displayName: AccountAuth.current.displayName,
        owner: !!AccountAuth.current.owner,
        exclusive: AccountAuth.current.exclusive || '',
        cloud: !!AccountAuth.current.cloud,
        userId: AccountAuth.current.userId || ''
      };
    },
    get cloud() {
      return {
        enabled: Cloud.enabled,
        signedIn: !!Cloud.session,
        ready: CloudSync.ready,
        profile: Cloud.profile ? {
          userId: Cloud.profile.user_id,
          username: Cloud.profile.username,
          isOwner: !!Cloud.profile.is_owner,
          saveVersion: Cloud.profile.save_version,
          updatedAt: Cloud.profile.updated_at
        } : null
      };
    },
    get cloudSave() { return exportSaveForPrefix(AccountAuth.prefix); },
    get cloudSync() {
      return {
        ready: CloudSync.ready,
        dirty: CloudSync.dirty,
        pushing: CloudSync.pushing,
        pending: CloudSync.pending,
        version: Cloud.profile?.save_version || null
      };
    },
    cloudFlush: () => CloudSync.flush(true),
    get state() { return G.state; },
    get wave() { return G.wave; },
    get targetWave() { return G.targetWave; },
    get mode() { return G.mode; },
    get money() { return G.money; },
    get moneyEarned() { return G.moneyEarned; },
    get bankerEarned() { return G.bankerEarned; },
    get modeOpen() { return G.modeOpen; },
    get progressOpen() { return G.progressOpen; },
    get daily() { return JSON.parse(JSON.stringify(G.daily)); },
    get achievements() { return [...G.achievements]; },
    get enemyKills() { return JSON.parse(JSON.stringify(G.enemyKills)); },
    get enemyUnlocked() { return ENEMY_ORDER.filter((id) => enemyUnlocked(id)); },
    setEnemyKills: (typeId, kills = 0) => {
      if (!ENEMY_TYPES[typeId]) return null;
      const count = Math.max(0, Math.min(9999999, Math.floor(Number(kills) || 0)));
      const record = enemyKillRecord(typeId);
      record.kills = count;
      record.hpSum = count * ENEMY_TYPES[typeId].hp;
      G.enemyKills.total = ENEMY_ORDER.reduce((sum, id) => sum + enemyKillRecord(id).kills, 0);
      saveEnemyKills();
      syncEnemyBadge();
      if (G.progressOpen) renderEnemies();
      return { typeId, kills: count, total: G.enemyKills.total };
    },
    get bestEndless() { return Number(Store.get(STORAGE.bestEndless, 0)) || 0; },
    get towerLevel() { return G.towerLevel; },
    get towerId() { return G.towerId; },
    get towerLevels() { return { ...G.towerLevels }; },
    get towerLoadouts() {
      return {
        start: [...G.towerLoadouts.start],
        final: [...G.towerLoadouts.final]
      };
    },
    get tower() {
      return {
        ...towerStats(),
        id: G.towerId,
        slots: towerSlots(),
        abilities: towerAbilities(),
        loadout: towerLoadout(),
        level: G.towerLevel,
        maxHp: G.maxHp,
        hp: G.hp
      };
    },
    get hp() { return G.hp; },
    get essence() { return G.essence; },
    get kills() { return G.kills; },
    get spawnQueue() { return [...G.spawnQueue]; },
    get selected() { return G.selected; },
    get cooldowns() {
      return Object.fromEntries(Object.entries(G.abilities).map(([key, value]) => [key, value.cd]));
    },
    get enemies() {
      return G.enemies.map((enemy) => ({
        type: enemy.type, x: enemy.x, y: enemy.y, hp: enemy.hp, maxHp: enemy.maxHp,
        empower: enemy.empower || 0, buffSpeed: enemy.buffSpeed || 1,
        buffDamage: enemy.buffDamage || 1, copyOf: enemy.copyOf || null,
        stolenFunds: enemy.stolenFunds || 0,
        lightning: enemy.lightningCast ? { ...enemy.lightningCast } : null,
        lastStandTimer: enemy.lastStandTimer || 0, lastStandUsed: !!enemy.lastStandUsed
      }));
    },
    get skulls() { return G.skulls.map((skull) => ({ x: skull.x, y: skull.y })); },
    get layout() { return { ...layout }; },
    get camera() { return { ...camera }; },
    get render() { return { dpr, quality: qualityScale, width: stage.width, height: stage.height }; },
    get defenders() {
      return G.defenders.map((defender) => ({
        type: defender.type,
        x: defender.x,
        y: defender.y,
        level: defender.level,
        hp: defender.hp,
        maxHp: defender.maxHp,
        baseDamage: defender.baseDamage,
        support: !!defender.def.support,
        damage: defender.damage,
        range: defender.range,
        interval: defender.interval,
        cooldown: defender.cooldown,
        aim: defender.aim,
        income: defender.income,
        auraRadius: defender.auraRadius,
        aura: defender.aura ? { ...defender.aura } : null
      }));
    },
    get defenderCounts() {
      return {
        total: G.defenders.length,
        archer: defenderCount('archer'),
        mortar: defenderCount('mortar'),
        frost: defenderCount('frost'),
        banker: defenderCount('banker'),
        booster: defenderCount('booster'),
        god: defenderCount('god')
      };
    },
    get defenderLimits() { return { ...defenderLimits() }; },
    get ownedDefenders() { return [...G.ownedDefenders]; },
    get bankerIncome() { return bankerIncome(); },
    get inspectedDefender() {
      return G.inspectedDef ? { type: G.inspectedDef.type, level: G.inspectedDef.level } : null;
    },
    cancelPlacement,
    placeDefender: (typeId, x, y) => buildAt(typeId, Number(x), Number(y)),
    buyDefender,
    refreshAuras,
    openInspector: (typeId, index = 0) => {
      const d = G.defenders.filter((item) => item.type === typeId)[Math.max(0, Math.floor(index))];
      if (d) openInspector(d);
      return !!d;
    },
    closeInspector,
    upgradeSelected,
    sellSelected,
    get inventoryOpen() { return G.inventoryOpen; },
    get inventoryTab() { return G.inventoryTab; },
    startGame,
    startNextWave,
    finishWave: completeWave,
    clearEnemies: () => {
      G.enemies = [];
      G.spawnQueue = [];
      G.spawnTimer = 0;
    },
    spawnEnemy: (typeId, x, y) => {
      const hasPoint = Number.isFinite(Number(x)) && Number.isFinite(Number(y));
      return spawnEnemy(typeId, hasPoint ? { x: Number(x), y: Number(y) } : {});
    },
    spawnBoss: (typeId = 'boss', x, y) => {
      const hasPoint = Number.isFinite(Number(x)) && Number.isFinite(Number(y));
      return spawnEnemy(typeId, hasPoint ? { x: Number(x), y: Number(y) } : {});
    },
    damageEnemy: (index, amount) => {
      const enemy = G.enemies[Math.max(0, Math.floor(Number(index) || 0))];
      if (!enemy || enemy.dead) return false;
      damageEnemy(enemy, Math.max(0, Number(amount) || 0));
      return true;
    },
    setMoney: (value) => {
      G.money = Math.max(0, Math.floor(Number(value) || 0));
      Store.set(STORAGE.money, G.money);
      syncWallet();
      return G.money;
    },
    setWave: (value) => {
      G.wave = Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
      updateUi();
    },
    useAbility,
    selectDefender,
    strike: manualStrike,
    openModeSelect,
    closeModeSelect,
    openProgress,
    closeProgress,
    advanceDaily,
    setDailyAllDoneDays: (value) => {
      G.daily.allDoneDays = Math.max(0, Math.min(9999, Math.floor(Number(value) || 0)));
      saveDailyState();
      syncProgressBadge();
      checkDailyAchievements(true);
      if (G.progressOpen) renderProgress();
      return G.daily.allDoneDays;
    },
    victory,
    buyTowerUpgrade,
    openInventory,
    closeInventory,
    zoomAt,
    resetCamera,
    damageTower,
    addEssence
  };

  function boot() {
    if (maybeMigrateLocalSessionToCloud()) return;
    syncSoundUi();
    resize();
    resetWorld();
    G.state = 'menu';
    ensureDailyState();
    saveDailyState();
    updateMenuBest();
    syncAccountUi();
    syncWallet();
    syncModeCards();
    syncProgressBadge();
    checkDailyAchievements(false);
    updateUi();
    bindEvents();
    checkOrientation();
    requestAnimationFrame(frame);

    if (Cloud.enabled && AccountAuth.current?.cloud) {
      CloudSync.start();
      const flushCloud = () => {
        if (CloudSync.ready && CloudSync.dirty) CloudSync.flush(true, true);
      };
      window.addEventListener('pagehide', flushCloud);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushCloud();
      });
    }

    if (!AccountAuth.current && !AccountAuth.prompted) {
      setTimeout(() => {
        if (G.state === 'menu' && !AccountAuth.current && !G.authOpen && !AccountAuth.prompted) {
          openAccount({ from: 'auto' });
        }
      }, 650);
    }
    setInterval(() => {
      ensureDailyState();
      if (G.progressOpen) updateDailyResetLabel();
    }, 60000);

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  boot();
})();
