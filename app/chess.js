/* Shadow Chess: play chess against the Shadow. Rules + engine + TV view, webOS 5 safe. */
(function () {
  'use strict';
  // ======================= rules =======================
  // Board: 64 squares, sq = rank*8 + file, rank 0 = white (heroes) back rank. Pieces: 1 P,2 N,3 B,4 R,5 Q,6 K; black negative.
  var N_OFF = [-17, -15, -10, -6, 6, 10, 15, 17], K_OFF = [-9, -8, -7, -1, 1, 7, 8, 9];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function Pos() { this.b = new Array(64); this.side = 1; this.castle = 15; this.ep = -1; this.half = 0; this.hist = []; this.keys = []; }
  Pos.start = function () {
    var p = new Pos(), back = [4, 2, 3, 5, 6, 3, 2, 4];
    for (var i = 0; i < 64; i++) p.b[i] = 0;
    for (var f = 0; f < 8; f++) { p.b[f] = back[f]; p.b[8 + f] = 1; p.b[48 + f] = -1; p.b[56 + f] = -back[f]; }
    p.keys.push(p.key()); return p;
  };
  Pos.prototype.copy = function () { var p = new Pos(); p.b = this.b.slice(); p.side = this.side; p.castle = this.castle; p.ep = this.ep; p.half = this.half; p.keys = this.keys.slice(); return p; };
  Pos.prototype.key = function () { return this.b.join(',') + '|' + this.side + this.castle + '|' + this.ep; };
  function onB(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
  Pos.prototype.attacked = function (sq, by) { // is sq attacked by side `by` (1 or -1)
    var b = this.b, f = sq & 7, r = sq >> 3, i, t, nf, nr;
    var pr = r - by; // pawn attacks
    if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === by) return true; if (f < 7 && b[pr * 8 + f + 1] === by) return true; }
    for (i = 0; i < 8; i++) { t = N_OFF[i]; nf = f + [-1, 1, -2, 2, -2, 2, -1, 1][i]; nr = r + [-2, -2, -1, -1, 1, 1, 2, 2][i]; if (onB(nf, nr) && b[nr * 8 + nf] === 2 * by) return true; }
    for (i = 0; i < 8; i++) { nf = f + [-1, 0, 1, -1, 1, -1, 0, 1][i]; nr = r + [-1, -1, -1, 0, 0, 1, 1, 1][i]; if (onB(nf, nr) && b[nr * 8 + nf] === 6 * by) return true; }
    var dirs = DIAG.concat(ORTH);
    for (i = 0; i < 8; i++) {
      var df = dirs[i][0], dr = dirs[i][1]; nf = f + df; nr = r + dr;
      while (onB(nf, nr)) {
        var q = b[nr * 8 + nf];
        if (q) { if (q * by > 0) { var a = Math.abs(q); if (a === 5 || (i < 4 ? a === 3 : a === 4)) return true; } break; }
        nf += df; nr += dr;
      }
    }
    return false;
  };
  Pos.prototype.kingSq = function (s) { for (var i = 0; i < 64; i++) if (this.b[i] === 6 * s) return i; return -1; };
  Pos.prototype.inCheck = function () { return this.attacked(this.kingSq(this.side), -this.side); };
  // Move: {from,to,piece,cap,promo,flag} flag: 'ep','castle','double'
  Pos.prototype.pseudo = function (capsOnly) {
    var b = this.b, s = this.side, out = [], sq, f, r, p, a, i, nf, nr, t;
    function add(from, to, flag) {
      var pc = b[from], cap = flag === 'ep' ? -s : b[to];
      if (Math.abs(pc) === 1 && ((to >> 3) === 7 || (to >> 3) === 0)) { [5, 4, 3, 2].forEach(function (pp) { out.push({ from: from, to: to, piece: pc, cap: cap, promo: pp * s }); }); }
      else out.push({ from: from, to: to, piece: pc, cap: cap, promo: 0, flag: flag });
    }
    for (sq = 0; sq < 64; sq++) {
      p = b[sq]; if (!p || p * s < 0) continue;
      a = Math.abs(p); f = sq & 7; r = sq >> 3;
      if (a === 1) {
        var fr = r + s;
        if (fr >= 0 && fr < 8) {
          if (!capsOnly && !b[fr * 8 + f]) {
            add(sq, fr * 8 + f);
            if ((s === 1 && r === 1) || (s === -1 && r === 6)) { var dr2 = r + 2 * s; if (!b[dr2 * 8 + f]) add(sq, dr2 * 8 + f, 'double'); }
          } else if (capsOnly && ((fr === 7 || fr === 0) && !b[fr * 8 + f])) add(sq, fr * 8 + f);
          for (var d = -1; d <= 1; d += 2) {
            nf = f + d; if (nf < 0 || nf > 7) continue; t = fr * 8 + nf;
            if (b[t] * s < 0) add(sq, t); else if (t === this.ep) add(sq, t, 'ep');
          }
        }
      } else if (a === 2 || a === 6) {
        var DF = a === 2 ? [-1, 1, -2, 2, -2, 2, -1, 1] : [-1, 0, 1, -1, 1, -1, 0, 1], DR = a === 2 ? [-2, -2, -1, -1, 1, 1, 2, 2] : [-1, -1, -1, 0, 0, 1, 1, 1];
        for (i = 0; i < 8; i++) { nf = f + DF[i]; nr = r + DR[i]; if (!onB(nf, nr)) continue; t = nr * 8 + nf; if (b[t] * s > 0) continue; if (capsOnly && !b[t]) continue; add(sq, t); }
        if (a === 6 && !capsOnly) {
          var home = s === 1 ? 0 : 56;
          if (sq === home + 4 && !this.attacked(sq, -s)) {
            if ((this.castle & (s === 1 ? 1 : 4)) && !b[home + 5] && !b[home + 6] && b[home + 7] === 4 * s && !this.attacked(home + 5, -s) && !this.attacked(home + 6, -s)) add(sq, home + 6, 'castle');
            if ((this.castle & (s === 1 ? 2 : 8)) && !b[home + 3] && !b[home + 2] && !b[home + 1] && b[home] === 4 * s && !this.attacked(home + 3, -s) && !this.attacked(home + 2, -s)) add(sq, home + 2, 'castle');
          }
        }
      } else {
        var dirs = a === 3 ? DIAG : a === 4 ? ORTH : DIAG.concat(ORTH);
        for (i = 0; i < dirs.length; i++) {
          nf = f + dirs[i][0]; nr = r + dirs[i][1];
          while (onB(nf, nr)) { t = nr * 8 + nf; if (b[t] * s > 0) break; if (!capsOnly || b[t]) add(sq, t); if (b[t]) break; nf += dirs[i][0]; nr += dirs[i][1]; }
        }
      }
    }
    return out;
  };
  Pos.prototype.make = function (m) {
    var b = this.b, s = this.side;
    this.hist.push({ m: m, castle: this.castle, ep: this.ep, half: this.half });
    b[m.to] = m.promo || m.piece; b[m.from] = 0;
    if (m.flag === 'ep') b[m.to - 8 * s] = 0;
    if (m.flag === 'castle') { if ((m.to & 7) === 6) { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = 0; } else { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = 0; } }
    this.ep = m.flag === 'double' ? m.from + 8 * s : -1;
    [[0, 2], [7, 1], [4, 3], [56, 8], [63, 4], [60, 12]].forEach(function (c) { if (m.from === c[0] || m.to === c[0]) this.castle &= ~c[1]; }, this);
    this.half = (Math.abs(m.piece) === 1 || m.cap) ? 0 : this.half + 1;
    this.side = -s;
  };
  Pos.prototype.unmake = function () {
    var h = this.hist.pop(), m = h.m, b = this.b; this.side = -this.side; var s = this.side;
    b[m.from] = m.piece; b[m.to] = m.flag === 'ep' ? 0 : m.cap;
    if (m.flag === 'ep') b[m.to - 8 * s] = -s;
    if (m.flag === 'castle') { if ((m.to & 7) === 6) { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = 0; } else { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = 0; } }
    this.castle = h.castle; this.ep = h.ep; this.half = h.half;
  };
  Pos.prototype.legal = function (capsOnly) {
    var out = [], ms = this.pseudo(capsOnly), s = this.side;
    for (var i = 0; i < ms.length; i++) { this.make(ms[i]); if (!this.attacked(this.kingSq(s), -s)) out.push(ms[i]); this.unmake(); }
    return out;
  };
  Pos.prototype.play = function (m) { this.make(m); this.keys.push(this.key()); };
  Pos.prototype.takeback = function () { this.unmake(); this.keys.pop(); };
  Pos.prototype.repetitions = function () { var k = this.keys[this.keys.length - 1], n = 0; for (var i = 0; i < this.keys.length; i++) if (this.keys[i] === k) n++; return n; };
  Pos.prototype.status = function () {
    var ms = this.legal();
    if (!ms.length) return this.inCheck() ? 'mate' : 'stalemate';
    if (this.half >= 100 || this.repetitions() >= 3) return 'draw';
    var non = 0; for (var i = 0; i < 64; i++) if (this.b[i] && Math.abs(this.b[i]) !== 6) non++;
    if (non === 0) return 'draw';
    return '';
  };

  // ======================= engine (alpha-beta, from the original's tables) =======================
  var VALUE = [0, 100, 320, 330, 500, 900, 0], PHASE = [0, 0, 1, 1, 2, 4, 0];
  var PST = [null,
    [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20]];
  var KING_MG = [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];
  var KING_EG = [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50];
  function evaluate(pos) { // from side to move
    var b = pos.b, mg = 0, ph = 0, kw = 0, kb = 0;
    for (var sq = 0; sq < 64; sq++) {
      var p = b[sq]; if (!p) continue;
      var a = Math.abs(p), w = p > 0, idx = w ? (7 - (sq >> 3)) * 8 + (sq & 7) : sq;
      ph += PHASE[a];
      if (a === 6) { if (w) kw = idx; else kb = idx; continue; }
      var v = VALUE[a] + PST[a][idx]; mg += w ? v : -v;
    }
    var t = Math.min(24, ph) / 24;
    mg += Math.round(t * (KING_MG[kw] - KING_MG[kb]) + (1 - t) * (KING_EG[kw] - KING_EG[kb]));
    return mg * pos.side;
  }
  var MATE = 29000, nodes = 0, deadline = 0, stopped = false;
  function order(ms) {
    ms.forEach(function (m) { m.o = (m.cap ? 10 * VALUE[Math.abs(m.cap)] - VALUE[Math.abs(m.piece)] + 1000 : 0) + (m.promo ? 900 : 0); });
    ms.sort(function (a, b) { return b.o - a.o; }); return ms;
  }
  function quiesce(pos, alpha, beta, ply) {
    var stand = evaluate(pos); if (stand >= beta) return beta; if (stand > alpha) alpha = stand;
    if (ply > 10) return alpha;
    var ms = order(pos.legal(true));
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]); var sc = -quiesce(pos, -beta, -alpha, ply + 1); pos.unmake();
      if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function search(pos, depth, alpha, beta, ply) {
    if ((++nodes & 511) === 0 && Date.now() > deadline) stopped = true;
    if (stopped) return 0;
    if (ply && (pos.half >= 100)) return 0;
    var inCheck = pos.inCheck(); if (inCheck) depth++;
    if (depth <= 0) return quiesce(pos, alpha, beta, 0);
    var ms = order(pos.legal());
    if (!ms.length) return inCheck ? -MATE + ply : 0;
    for (var i = 0; i < ms.length; i++) {
      pos.make(ms[i]); var sc = -search(pos, depth - 1, -beta, -alpha, ply + 1); pos.unmake();
      if (stopped) return 0;
      if (sc >= beta) return beta; if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  var LEVEL = [ // depth, ms, random-pick chance, margin
    { d: 2, ms: 400, pr: 0.4, mg: 150 }, { d: 3, ms: 900, pr: 0.35, mg: 30 }, { d: 4, ms: 1800, pr: 0.15, mg: 10 }, { d: 6, ms: 3500, pr: 0, mg: 0 }];
  function think(pos0, level) {
    var L = LEVEL[level], pos = pos0.copy(); pos.hist = [];
    var root = order(pos.legal()); if (!root.length) return null;
    deadline = Date.now() + L.ms; stopped = false; nodes = 0;
    var scored = root.map(function (m) { return { m: m, s: 0 }; }), best = scored;
    for (var d = 1; d <= L.d; d++) {
      var cur = [];
      for (var i = 0; i < best.length; i++) {
        pos.make(best[i].m); var sc = -search(pos, d - 1, -MATE, MATE, 1); pos.unmake();
        if (stopped) break; cur.push({ m: best[i].m, s: sc });
      }
      if (stopped && cur.length < best.length) break;
      cur.sort(function (a, b) { return b.s - a.s; }); best = cur;
      if (best[0].s > MATE - 100) break;
    }
    if (L.pr && Math.random() < L.pr) {
      var ok = best.filter(function (x) { return x.s >= best[0].s - L.mg; });
      return ok[Math.floor(Math.random() * ok.length)].m;
    }
    return best[0].m;
  }

  // ======================= view =======================
  var KEYS = ['w_r','w_n','w_b','w_q','w_k','w_p','b_r','b_n','b_b','b_q','b_k','b_p'];
  var NAMES = ['Ivory rook','Ivory knight','Ivory bishop','Ivory queen','Ivory king','Ivory pawn','Shadow rook','Shadow knight','Shadow bishop','Shadow queen','Shadow king','Shadow pawn'];
  var HERO_BACK = ['w_r','w_n','w_b','w_q','w_k','w_b','w_n','w_r'], HERO_PAWNS = ['w_p','w_p','w_p','w_p','w_p','w_p','w_p','w_p'];
  var DOOM_BACK = ['b_r','b_n','b_b','b_q','b_k','b_b','b_n','b_r'];
  var ROLE = ['', 'Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'], LEVELS = ['Easy', 'Casual', 'Club', 'Strong'], FIRST = ['You', 'Shadow', 'Random'];
  var T = {
    take: ['Another hero falls.', 'Your champions are paper.', 'I expected more.', 'One by one, they kneel.'],
    lose: ['A minor inconvenience.', 'I permit it. For now.', 'You think that matters?'],
    check: ['Kneel.', 'Your captain trembles.', 'There is nowhere left to run.'],
    checked: ['You dare?', 'Bold. Foolish, but bold.'],
    magTakes: [],
    magFalls: [],
    quiet: ['Choose carefully, hero.', 'Your move.', 'I see every path.', 'Predictable.'],
    resume: ['Back for more, hero?', 'I have been waiting.']
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function isHero(k) { return KEYS[k].charAt(0) === 'w'; }

  // Perspective (same camera as the original).
  var TH = 36 * Math.PI / 180, SF = Math.sin(TH), CF = Math.cos(TH), L = 16, NEAR_W = 1000, NEAR_Y = 1046, CX = 960;
  var CAMY = SF * L, CAMZ = 4 - CF * L, F = (L - CF * 4) * NEAR_W / 8, CY = NEAR_Y - (F * 4 * SF) / (L - CF * 4);
  var BASE = [0, 0.38, 0.43, 0.43, 0.43, 0.45, 0.46], SPRITE_BASE = 120;
  function project(x, y, z) { var a = y - CAMY, c = z - CAMZ, d = -a * SF + c * CF, e = a * CF + c * SF; return [x * F / d + CX, CY - e * F / d, F / d]; }
  function flat(z) { return CAMY / Math.hypot(CAMY, z - CAMZ); }
  function quad(ctx, x0, z0, x1, z1) {
    var a = project(x0, 0, z0), b = project(x1, 0, z0), c = project(x1, 0, z1), d = project(x0, 0, z1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  }

  var cv, ctx, img = {}, table, ready = false;
  var S = { pos: null, who: null, you: 1, level: 1, first: 0, cf: 4, cr: 1, sel: -1, targets: [], moves: [], line: '', caption: '',
    menu: 'start', menuIdx: 2, thinking: false, anim: null, intro: null, over: '', onExit: null, promo: null, captured: [] };
  function load(cb) {
    var names = KEYS.concat(['backdrop']), left = names.length;
    names.forEach(function (n) {
      var i = new Image(); i.onload = i.onerror = function () { if (--left === 0) cb(); };
      i.src = 'img/chess/' + n + (n === 'backdrop' ? '.jpg' : '.png'); img[n] = i;
    });
  }
  function paintTable() {
    table = document.createElement('canvas'); table.width = 1920; table.height = 1080;
    var t = table.getContext('2d'); t.drawImage(img.backdrop, 0, 0, 1920, 1080);
    var a = project(-4, 0, 0), b = project(4, 0, 0);
    t.fillStyle = '#0B0E0D'; t.beginPath(); t.moveTo(a[0], a[1]); t.lineTo(b[0], b[1]); t.lineTo(b[0], b[1] + L); t.lineTo(a[0], a[1] + L); t.closePath(); t.fill();
    for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { quad(t, i - 4, j, i - 3, j + 1); t.fillStyle = (i + j) % 2 === 0 ? '#101213' : '#1E2A2A'; t.fill(); }
    quad(t, -4, 0, 4, 8); t.strokeStyle = 'rgba(52,96,74,.55)'; t.lineWidth = 2; t.shadowColor = 'rgba(52,96,74,.55)'; t.shadowBlur = 30; t.stroke(); t.shadowBlur = 0;
    var c = project(0, 0, 3.6), g = t.createRadialGradient(c[0], c[1], 0, c[0], c[1], 620);
    g.addColorStop(0, 'rgba(220,235,235,.10)'); g.addColorStop(1, 'rgba(220,235,235,0)'); quad(t, -4, 0, 4, 8); t.fillStyle = g; t.fill();
  }
  function xOf(f) { return (S.you === 1 ? f : 7 - f) - 4; }
  function zOf(r) { return S.you === 1 ? r : 7 - r; }
  function resetWho() {
    S.who = []; for (var i = 0; i < 64; i++) S.who[i] = -1;
    var heroBack = 0, doomBack = 56;
    for (var f = 0; f < 8; f++) {
      S.who[heroBack + f] = KEYS.indexOf(HERO_BACK[f]); S.who[8 + f] = KEYS.indexOf(HERO_PAWNS[f]);
      S.who[doomBack + f] = KEYS.indexOf(DOOM_BACK[f]); S.who[48 + f] = KEYS.indexOf('b_p');
    }
  }
  function save() { try { localStorage.setItem('shadowchess', JSON.stringify({ moves: S.moves, you: S.you, level: S.level, who: S.who })); } catch (e) {} }
  function newGame() {
    S.pos = Pos.start(); resetWho(); S.moves = []; S.sel = -1; S.targets = []; S.over = ''; S.captured = [];
    var f = S.first === 2 ? (Math.random() < .5 ? 0 : 1) : S.first;
    S.doomWhite = f === 1;
    S.you = S.doomWhite ? -1 : 1;
    if (S.doomWhite) { // swap who stands where: Doom's army on the white squares
      var w = S.who.slice(); for (var i = 0; i < 64; i++) S.who[i] = w[((7 - (i >> 3)) * 8) + (i & 7)];
    }
    S.cf = 4; S.cr = S.you === 1 ? 1 : 6;
    S.menu = null; S.intro = null; S.line = S.doomWhite ? '' : 'Make your move.'; S.caption = ''; setTimeout(doomMove, 400);
    save(); loop();
  }
  function isHeroSq(sq) { var k = S.who[sq]; return k >= 0 ? isHero(k) : (S.pos.b[sq] > 0) === (S.you === 1); }
  function play(m) {
    var mover = S.who[m.from], victim = m.flag === 'ep' ? S.who[m.to - 8 * S.pos.side] : S.who[m.to];
    var doomMoving = S.pos.side !== S.you;
    S.pos.play(m); S.moves.push(m);
    if (m.flag === 'ep') S.who[m.to - 8 * (-S.pos.side)] = -1;
    S.who[m.to] = mover; S.who[m.from] = -1;
    if (m.flag === 'castle') { var home = m.from & 56; if ((m.to & 7) === 6) { S.who[home + 5] = S.who[home + 7]; S.who[home + 7] = -1; } else { S.who[home + 3] = S.who[home]; S.who[home] = -1; } }
    S.anim = { m: m, t0: performance.now() };
    var st = S.pos.status(), mag = -1;
    if (st) return finish(st);
    if (m.cap) S.line = doomMoving ? (mover === mag ? pick(T.magTakes) : pick(T.take)) : (victim === mag ? pick(T.magFalls) : pick(T.lose));
    else if (S.pos.inCheck()) S.line = doomMoving ? pick(T.check) : pick(T.checked);
    else if (doomMoving && Math.random() < .3) S.line = pick(T.quiet);
    else if (!doomMoving) S.line = '';
    save();
  }
  function finish(st) {
    S.over = st;
    var youWon = st === 'mate' && S.pos.side !== S.you;
    S.line = st === 'mate' ? (youWon ? 'This is not the end. I will return.' : 'As it was always meant to be.') : 'I will remember this.';
    setTimeout(function () { S.menu = 'over'; S.menuIdx = 0; draw(); }, 1600);
    try { localStorage.removeItem('shadowchess'); } catch (e) {}
  }
  function doomMove() {
    if (S.over || S.pos.side === S.you) return;
    S.thinking = true; loop();
    setTimeout(function () {
      var m = think(S.pos, S.level); S.thinking = false;
      if (m) play(m); loop();
    }, 60);
  }
  function overText() {
    if (S.over === 'mate') return S.pos.side !== S.you ? 'You beat the Shadow' : 'The Shadow wins';
    return S.over === 'stalemate' ? 'Stalemate' : 'Draw';
  }
  function menuItems() {
    if (S.menu === 'start') return ['First move: ' + FIRST[S.first], 'Level: ' + LEVELS[S.level], 'Start'];
    if (S.menu === 'pause') return ['Continue', 'Take back move', 'New game', 'Exit to home'];
    if (S.menu === 'over') return ['New game', 'Look at the board', 'Exit to home'];
    if (S.menu === 'promo') return ['Queen', 'Rook', 'Bishop', 'Knight'];
    return [];
  }

  // ---------- drawing ----------
  var raf = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0; draw(now);
    if ((S.anim && now - S.anim.t0 < 320) || S.thinking || S.intro) loop();
    else if (S.anim) { S.anim = null; if (!S.thinking) doomMove(); }
  }
  function sprite(key, type, x, y, scale, glow, alpha, ivoryMag) {
    var im = img[KEYS[key]]; if (!im || !im.width) return;
    var f = BASE[type] * scale / SPRITE_BASE, w = im.width * f, h = im.height * f;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (glow) { ctx.shadowColor = 'rgba(255,255,255,.75)'; ctx.shadowBlur = 24; }
    ctx.drawImage(im, x - w / 2, y + 0.02 * scale - h, w, h);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  function shadow(x, y, r, fl) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * fl, 0, 0, Math.PI * 2); ctx.fill(); }
  function tint(sq, color) { quad(ctx, xOf(sq & 7), zOf(sq >> 3), xOf(sq & 7) + 1, zOf(sq >> 3) + 1); ctx.fillStyle = color; ctx.fill(); }
  function smooth(a, b, t) { var x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); }
  function draw(now) {
    now = now || performance.now();
    if (!ready) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); return; }
    ctx.drawImage(table, 0, 0);
    var p = S.pos, last = S.moves[S.moves.length - 1];
    if (!S.menu || S.menu === 'pause' || S.menu === 'promo' || S.menu === 'over') {
      if (last) { tint(last.from, 'rgba(52,96,74,.10)'); tint(last.to, 'rgba(52,96,74,.18)'); }
      if (S.sel >= 0) tint(S.sel, 'rgba(240,240,220,.14)');
      if (p.inCheck()) tint(p.kingSq(p.side), 'rgba(200,30,30,.38)');
      S.targets.forEach(function (m) {
        var c = project(xOf(m.to & 7) + .5, 0, zOf(m.to >> 3) + .5), r = c[2] * (m.cap ? .42 : .12), fl = flat(zOf(m.to >> 3) + .5);
        ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * fl, 0, 0, Math.PI * 2);
        if (m.cap) { ctx.strokeStyle = 'rgba(190,230,210,.75)'; ctx.lineWidth = 3; ctx.stroke(); } else { ctx.fillStyle = 'rgba(190,230,210,.75)'; ctx.fill(); }
      });
    }
    // pieces, far to near
    var items = [], anim = S.anim && now - S.anim.t0 < 320 ? S.anim : null, at = anim ? (now - anim.t0) / 320 : 1;
        for (var sq = 0; sq < 64; sq++) {
      var pc = p.b[sq]; if (!pc) continue;
      var x = xOf(sq & 7) + .5, z = zOf(sq >> 3) + .5;
      if (anim && sq === anim.m.to) { var fx = xOf(anim.m.from & 7) + .5, fz = zOf(anim.m.from >> 3) + .5, e = 1 - Math.pow(1 - at, 2); x = fx + (x - fx) * e; z = fz + (z - fz) * e; }
      items.push({ sq: sq, x: x, z: z, type: Math.abs(pc), key: S.who[sq] });
    }
    items.sort(function (a, b) { return b.z - a.z; });
    var cursorSq = S.cr * 8 + S.cf;
    items.forEach(function (it) {
      var c = project(it.x, 0, it.z + .06);
      shadow(c[0], c[1], c[2] * BASE[it.type] * .7, flat(it.z));
      var lift = it.sq === S.sel ? c[2] * .12 : 0, hl = !S.menu && !S.intro && (it.sq === S.sel || it.sq === cursorSq);
      sprite(it.key, it.type, c[0], c[1] - lift, c[2], hl, it.alpha, it.ivory);
    });
    // cursor
    if (!S.menu && !S.intro && !S.over) {
      var cx = xOf(S.cf), cz = zOf(S.cr);
      quad(ctx, cx + .04, cz + .04, cx + .96, cz + .96);
      ctx.strokeStyle = 'rgba(240,240,220,.2)'; ctx.lineWidth = 12; ctx.stroke();
      ctx.strokeStyle = 'rgba(240,240,220,.95)'; ctx.lineWidth = 3; ctx.stroke();
    }
    // text
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ctx.font = '300 64px Outfit'; ctx.fillText('Chess', 80, 150);
    ctx.font = '400 26px Outfit'; ctx.globalAlpha = .7;
    if (S.pos && S.menu !== 'start') ctx.fillText(LEVELS[S.level] + '   ·   ' + (S.doomWhite ? 'the Shadow moved first' : 'you moved first'), 80, 188);
    ctx.globalAlpha = 1;
    var line = S.thinking ? 'The Shadow is thinking' + '...'.slice(0, Math.floor(now / 400) % 3 + 1) : S.line;
    ctx.font = 'italic 300 40px Outfit'; ctx.textAlign = 'right'; if (line) ctx.fillText(line, 1840, 150);
    ctx.font = '400 30px Outfit';
    var status = S.over ? (S.over === 'mate' ? (S.pos.side !== S.you ? 'Checkmate. You beat the Shadow.' : 'Checkmate. The Shadow wins.') : S.over === 'stalemate' ? 'Stalemate. A draw.' : 'Draw.')
      : S.intro || !S.pos ? '' : S.pos.side !== S.you ? 'The Shadow’s move' : (S.pos.inCheck() ? 'Your move. Check!' : 'Your move');
    ctx.fillText(status, 1840, 200); ctx.textAlign = 'left';
    if (S.caption) { ctx.font = '600 28px Outfit'; ctx.textAlign = 'center'; ctx.globalAlpha = .9; ctx.fillText(S.caption, 960, 260); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
    var k = S.pos && S.who[cursorSq];
    if (!S.menu && !S.intro && S.pos && S.pos.b[cursorSq] && k >= 0) {
      ctx.font = '500 34px Outfit'; ctx.fillText(NAMES[k], 80, 920);
      ctx.font = '400 24px Outfit'; ctx.globalAlpha = .7;
      ctx.fillText(ROLE[Math.abs(S.pos.b[cursorSq])] + '   ·   ' + (isHero(k) ? 'your side' : 'the Shadow’s side'), 80, 962);
      ctx.globalAlpha = 1;
    }
    if (S.menu) drawMenu();
  }
  function drawMenu() {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, 1920, 1080);
    var title = S.menu === 'start' ? 'Face the Shadow' : S.menu === 'pause' ? 'Paused' : S.menu === 'promo' ? 'Promote to' : overText();
    var items = menuItems();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = '300 72px Outfit'; ctx.fillText(title, 960, 380);
    items.forEach(function (t, i) {
      var f = i === S.menuIdx;
      ctx.font = (f ? '500 44px' : '400 36px') + ' Outfit'; ctx.globalAlpha = f ? 1 : .6;
      ctx.fillText(t, 960, 500 + i * 76);
    });
    ctx.globalAlpha = .5; ctx.font = '400 22px Outfit';
    if (S.menu === 'start') ctx.fillText('‹ › change   ·   OK start   ·   Back exit', 960, 860);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  function endIntro() { S.intro = null; S.caption = ''; S.line = S.pos.side === S.you ? 'Make your move.' : ''; draw(); doomMove(); }

  // ---------- input ----------
  function sqFromCursor() { return S.cr * 8 + S.cf; }
  function moveCursor(dx, dz) {
    // dx/dz are on screen; convert to board file/rank
    var df = S.you === 1 ? dx : -dx, dr = S.you === 1 ? dz : -dz;
    S.cf = Math.max(0, Math.min(7, S.cf + df)); S.cr = Math.max(0, Math.min(7, S.cr + dr));
  }
  function select() {
    var sq = sqFromCursor(), p = S.pos;
    if (S.pos.side !== S.you || S.thinking || S.anim) return;
    if (S.sel >= 0) {
      var ms = S.targets.filter(function (m) { return m.to === sq; });
      if (ms.length) {
        if (ms.length > 1) { S.promo = ms; S.menu = 'promo'; S.menuIdx = 0; return; }
        S.sel = -1; S.targets = []; play(ms[0]); loop(); return;
      }
    }
    if (p.b[sq] && (p.b[sq] > 0) === (p.side > 0)) {
      S.sel = sq; S.targets = p.legal().filter(function (m) { return m.from === sq; });
    } else { S.sel = -1; S.targets = []; }
  }
  function menuOk() {
    var it = menuItems()[S.menuIdx];
    if (S.menu === 'start') { if (S.menuIdx === 2) return newGame(); if (S.menuIdx === 0) S.first = (S.first + 1) % 3; else S.level = (S.level + 1) % 4; return; }
    if (S.menu === 'promo') { var want = [5, 4, 3, 2][S.menuIdx], m = S.promo.filter(function (x) { return Math.abs(x.promo) === want; })[0]; S.menu = null; S.sel = -1; S.targets = []; play(m); loop(); return; }
    if (it === 'Continue') { S.menu = null; return; }
    if (it === 'Take back move') {
      var n = S.pos.side === S.you ? 2 : 1; if (S.moves.length < n) { S.menu = null; return; }
      // replay from the start minus n moves (keeps characters right)
      var keep = S.moves.slice(0, S.moves.length - n), you = S.you, dw = S.doomWhite;
      S.pos = Pos.start(); resetWho(); if (dw) { var w = S.who.slice(); for (var i = 0; i < 64; i++) S.who[i] = w[((7 - (i >> 3)) * 8) + (i & 7)]; }
      S.moves = []; keep.forEach(function (m) { play(m); }); S.anim = null; S.line = 'The Shadow allows it. Once.'; S.menu = null; S.over = ''; save(); return;
    }
    if (it === 'New game') { S.menu = 'start'; S.menuIdx = 2; return; }
    if (it === 'Look at the board') { S.menu = null; return; }
    if (it === 'Exit to home') return exit();
  }
  function exit() { document.getElementById('chess').classList.remove('on'); var cb = S.onExit; S.onExit = null; if (cb) cb(); }
  function key(k) {
    if (S.intro) { if (k === 13 || k === 461 || k === 8 || k === 27) { endIntro(); } return; }
    if (S.menu) {
      var n = menuItems().length;
      if (k === 38) S.menuIdx = (S.menuIdx + n - 1) % n; else if (k === 40) S.menuIdx = (S.menuIdx + 1) % n;
      else if ((k === 37 || k === 39) && S.menu === 'start' && S.menuIdx < 2) { var d = k === 39 ? 1 : -1; if (S.menuIdx === 0) S.first = (S.first + 3 + d) % 3; else S.level = Math.max(0, Math.min(3, S.level + d)); }
      else if (k === 13) menuOk();
      else if (k === 461 || k === 8 || k === 27) { if (S.menu === 'start' || S.menu === 'over') return exit(); if (S.menu === 'promo') { S.menu = null; S.sel = -1; S.targets = []; } else S.menu = null; }
      draw(); return;
    }
    if (k === 37) moveCursor(-1, 0); else if (k === 39) moveCursor(1, 0); else if (k === 38) moveCursor(0, 1); else if (k === 40) moveCursor(0, -1);
    else if (k === 13) { if (S.over) { S.menu = 'over'; S.menuIdx = 0; } else select(); }
    else if (k === 461 || k === 8 || k === 27) { if (S.sel >= 0) { S.sel = -1; S.targets = []; } else { S.menu = S.over ? 'over' : 'pause'; S.menuIdx = 0; } }
    draw();
  }
  function open(onExit) {
    S.onExit = onExit;
    document.getElementById('chess').classList.add('on');
    cv = document.getElementById('board'); ctx = cv.getContext('2d');
    var saved = null; try { saved = JSON.parse(localStorage.getItem('shadowchess')); } catch (e) {}
    function start() {
      if (saved && saved.moves && saved.moves.length && !S.pos) {
        S.level = saved.level; S.doomWhite = saved.you === -1; S.you = saved.you; S.pos = Pos.start(); resetWho();
        if (S.doomWhite) { var w = S.who.slice(); for (var i = 0; i < 64; i++) S.who[i] = w[((7 - (i >> 3)) * 8) + (i & 7)]; }
        saved.moves.forEach(function (m) { play(m); }); S.anim = null; S.menu = null; S.line = pick(T.resume);
        S.cf = 4; S.cr = S.you === 1 ? 1 : 6; draw(); doomMove(); return;
      }
      if (!S.pos || S.over) { S.menu = 'start'; S.menuIdx = 2; S.pos = S.pos || Pos.start(); if (!S.who) resetWho(); }
      else { S.menu = 'pause'; S.menuIdx = 0; S.line = pick(T.resume); }
      draw();
    }
    if (ready) start(); else { draw(); load(function () { paintTable(); ready = true; start(); }); }
  }
  window.DoomChess = { open: open, key: key, _Pos: Pos, _think: think };
})();
