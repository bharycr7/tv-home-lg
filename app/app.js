/* TV Home for LG webOS (webOS 5 / Chromium 68: no optional chaining, no flex gap). */
(function () {
  'use strict';
  var C = window.CONFIG, D = window.DATA;
  var $ = function (id) { return document.getElementById(id); };
  var onTV = typeof window.PalmServiceBridge === 'function';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600); }

  // ---------- webOS services ----------
  function luna(uri, params) {
    return new Promise(function (resolve, reject) {
      if (!onTV) return reject({ errorText: 'not on TV' });
      var b = new window.PalmServiceBridge(), done = false;
      b.onservicecallback = function (msg) {
        if (done) return; done = true;
        var r; try { r = JSON.parse(msg); } catch (e) { r = {}; }
        if (r.returnValue === false) reject(r); else resolve(r);
      };
      b.call('luna://' + uri, JSON.stringify(params || {}));
      setTimeout(function () { if (!done) { done = true; reject({ errorText: 'timeout' }); } }, 8000);
    });
  }
  function launch(id, params) {
    if (window.__musicPause) window.__musicPause(300);
    if (!onTV) { toast('Would open ' + id + (params ? ' ' + JSON.stringify(params) : '')); return Promise.resolve(); }
    return luna('com.webos.applicationManager/launch', { id: id, params: params || {} })
      .catch(function (e) { toast('Couldn’t open it: ' + (e.errorText || id)); });
  }
  var exists = {};
  function appExists(id) {
    if (!onTV) return Promise.resolve(true);
    if (id in exists) return Promise.resolve(exists[id]);
    return luna('com.webos.applicationManager/getAppLoadStatus', { appId: id })
      .then(function (r) { return (exists[id] = !!r.exist); }, function () { return (exists[id] = false); });
  }
  // A service's installed app id (first candidate that exists), or null.
  var svcApp = {};
  function resolveSvc(key) {
    if (key in svcApp) return Promise.resolve(svcApp[key]);
    var s = C.services[key]; if (!s) return Promise.resolve(null);
    var ids = s.ids.slice();
    function next() {
      if (!ids.length) return (svcApp[key] = null);
      var id = ids.shift();
      return appExists(id).then(function (ok) { return ok ? (svcApp[key] = id) : next(); });
    }
    return Promise.resolve(next());
  }
  function deepParams(svc, target) {
    if (!target) return undefined;
    if (svc === 'netflix') return { contentTarget: 'm=https://www.netflix.com/title/' + target + '&source_type=4' };
    if (svc === 'youtube') return { contentTarget: 'https://www.youtube.com/tv?v=' + target };
    return { contentTarget: target }; // Prime takes its gti; others get the title's web link
  }
  function openTitle(svc, target, title) {
    return resolveSvc(svc).then(function (id) {
      if (!id) return toast((C.services[svc] ? C.services[svc].name : svc) + ' isn’t installed');
      return launch(id, deepParams(svc, target));
    });
  }
  function openHdmi(n) { return launch('com.webos.app.hdmi' + n); }

  // ---------- HDMI inputs (names over HDMI-CEC when the TV tells us) ----------
  var inputNames = {};
  function loadInputs() {
    return luna('com.webos.service.eim/getAllInputStatus').then(function (r) {
      (r.devices || []).forEach(function (d) {
        var m = /(\d)/.exec(d.id || d.label || ''); if (!m) return;
        var name = d.deviceName || d.connectedDeviceName || d.cecDeviceName || (d.label && !/^HDMI/i.test(d.label) ? d.label : '');
        if (name) inputNames[m[1]] = name;
        
      });
    }, function () {});
  }

  // ---------- clock & weather ----------
  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    if (!C.clock24h) h = h % 12 || 12;
    $('clock').textContent = h + ':' + (m < 10 ? '0' : '') + m;
    setTimeout(tick, 60000 - d.getSeconds() * 1000 - d.getMilliseconds() + 30);
  }
  var WI = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
    partly: '<path d="M8 3.2v1.6M3.2 8h1.6M4.6 4.6l1.1 1.1M11.4 4.6l-1.1 1.1"/><path d="M5.6 10.4A3.2 3.2 0 1 1 11 7.2"/><path d="M8 20h9.5a3.8 3.8 0 0 0 .4-7.6 5.3 5.3 0 0 0-10.2 1.3A3.2 3.2 0 0 0 8 20z"/>',
    cloud: '<path d="M7 19h10.5a4.2 4.2 0 0 0 .5-8.4 6 6 0 0 0-11.6 1.6A3.4 3.4 0 0 0 7 19z"/>',
    fog: '<path d="M7 14h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.2 3.2 0 0 0 7 14zM4 17.5h16M6 21h12"/>',
    rain: '<path d="M7 15h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.2 3.2 0 0 0 7 15zM8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    storm: '<path d="M7 14h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.2 3.2 0 0 0 7 14zM12.5 14.5L10 18.5h4l-2.5 4"/>',
    snow: '<path d="M7 14h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6 1.6A3.2 3.2 0 0 0 7 14zM8.5 18v.01M12 19.5v.01M15.5 18v.01M10 21.5v.01M14 21.5v.01"/>'
  };
  function wkind(code, day) {
    if (code <= 1) return day ? 'sun' : 'moon';
    if (code === 2) return day ? 'partly' : 'cloud';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }
  function showWeather(w) {
    if (!w) return;
    $('wicon').innerHTML = WI[wkind(w.code, w.day)];
    $('temp').textContent = Math.round(w.t) + (C.weather.unit === 'fahrenheit' ? '°F' : '°C');
  }
  function getJSON(url) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(); x.open('GET', url); x.timeout = 15000;
      x.onload = function () { try { res(JSON.parse(x.responseText)); } catch (e) { rej(e); } };
      x.onerror = x.ontimeout = rej; x.send();
    });
  }
  function where() {
    if (C.weather.lat !== '' && C.weather.lon !== '') return Promise.resolve({ lat: C.weather.lat, lon: C.weather.lon });
    var c = store('geo');
    if (c && Date.now() - c.at < 7 * 864e5) return Promise.resolve(c);
    return getJSON('https://get.geojs.io/v1/ip/geo.json').then(function (g) {
      var p = { lat: (+g.latitude).toFixed(2), lon: (+g.longitude).toFixed(2), at: Date.now() }; store('geo', p); return p;
    });
  }
  function weather(force) {
    var c = store('wx'); showWeather(c);
    if (!force && c && Date.now() - c.at < 30 * 60000) return;
    where().then(function (p) {
      return getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
        '&current=temperature_2m,weather_code,is_day&temperature_unit=' + C.weather.unit);
    }).then(function (r) {
      var w = { t: r.current.temperature_2m, code: r.current.weather_code, day: !!r.current.is_day, at: Date.now() };
      store('wx', w); showWeather(w);
    }).catch(function () {});
  }

  // ---------- wifi ----------
  var WIFI_ON = '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.4a10.5 10.5 0 0 1 14 0M8.5 15.9a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19.4" r="1" fill="#fff"/>';
  var WIFI_OFF = '<path d="M3 3l18 18M8.5 15.9a5.5 5.5 0 0 1 7 0M5 12.4a10.5 10.5 0 0 1 4.2-2.4M14.5 10.1a10.4 10.4 0 0 1 4.5 2.3M2 8.8a15 15 0 0 1 4.3-2.8M10.5 5.1A15 15 0 0 1 22 8.8"/>';
  function wifi() {
    var set = function (on) { $('wifiicon').innerHTML = on ? WIFI_ON : WIFI_OFF; };
    set(navigator.onLine);
    luna('com.webos.service.connectionmanager/getStatus').then(function (r) { set(!!r.isInternetConnectionAvailable); }, function () {});
  }

  // ---------- dock ----------
  var dockEls = [];
  function dockName(d) { return d.name || C.services[d.svc].name; }
  function dockColor(d) { return d.color || C.services[d.svc].color; }
  function buildDock() {
    var dock = $('dock');
    C.dock.forEach(function (d, i) {
      var cell = el('div', 'cell'), logo = el('div', 'logo');
      if (d.icon) {
        var img = new Image(); img.src = 'img/icon/' + d.icon + '.png';
        img.onload = function () { sizeLogo(img); };
        logo.appendChild(img);
      } else { var wd = el('div', 'word', dockName(d)); wd.style.fontSize = Math.min(60, Math.round(520 / Math.max(6, dockName(d).length))) + 'px'; logo.appendChild(wd); }
      cell.appendChild(logo); if (d.icon) cell.appendChild(el('div', 'name', dockName(d)));
      dock.appendChild(cell); dockEls.push(cell);
      d.line = pick(d.lines);
    });
  }
  // Size logos by visual weight so they look equally big without stretching.
  function sizeLogo(img) {
    var w = img.naturalWidth, h = img.naturalHeight, fill = 0.55;
    try {
      var c = document.createElement('canvas'); c.width = 64; c.height = 64;
      var x = c.getContext('2d'); x.drawImage(img, 0, 0, 64, 64);
      var px = x.getImageData(0, 0, 64, 64).data, n = 0;
      for (var i = 3; i < px.length; i += 4) if (px[i] > 128) n++;
      fill = Math.max(0.2, n / 4096);
    } catch (e) { /* file:// canvas may be tainted off-TV */ }
    var area = 9000 / fill;                      // target visual area in px²
    var s = Math.sqrt(area / (w * h));
    s = Math.min(s, 220 / w, 120 / h);
    img.style.width = Math.round(w * s) + 'px'; img.style.height = Math.round(h * s) + 'px';
  }

  // ---------- My Favourites ----------
  var FRAME_ASPECT = 1.6226, TITLE_BAND = 150;
  var frameH = Math.min(Math.round(1920 / FRAME_ASPECT), Math.round(1080 * 0.76)), frameW = Math.round(frameH * FRAME_ASPECT);
  // Centre the whole group, even when characters stand outside the original frame.
  var minL = Math.min.apply(null, D.shows.map(function (s) { return s.box[0]; })), maxR = Math.max.apply(null, D.shows.map(function (s) { return s.box[2]; }));
  if ((maxR - minL) * frameW > 1840) { frameW = Math.floor(1840 / (maxR - minL)); frameH = Math.round(frameW / FRAME_ASPECT); }
  var frameX = Math.round((1920 - (maxR - minL) * frameW) / 2 - minL * frameW), frameY = TITLE_BAND + Math.round(frameH * 0.02);
  var lanes = [[], []], chEls = {}, overlayEls = {};
  function boxStyle(e, b) {
    e.style.left = (frameX + b[0] * frameW) + 'px'; e.style.top = (frameY + b[1] * frameH) + 'px';
    e.style.width = ((b[2] - b[0]) * frameW) + 'px'; e.style.height = ((b[3] - b[1]) * frameH) + 'px';
  }
  function buildLineup() {
    var L = $('lineup');
    D.shows.forEach(function (s, i) {
      var e = el('div', 'ch' + (s.fit === 'contain' ? ' fit' : ''));
      e.innerHTML = '<img class="g" src="img/cast/' + s.art + '_bw.png"><img class="c" src="img/cast/' + s.art + '.png">';
      // A character whose picture hasn't been added yet is left out of the lineup.
      e.firstChild.onerror = (function (show, node) { return function () {
        node.style.display = 'none'; var ln = lanes[show.lane], k = ln.indexOf(show); if (k >= 0) ln.splice(k, 1);
        if (favCol >= lanes[favLane].length) favCol = Math.max(0, lanes[favLane].length - 1);
      }; })(s, e);
      boxStyle(e, s.box); e.style.zIndex = Math.round(s.z * 10) + 1;
      L.appendChild(e); chEls[i] = e; s.i = i;
      lanes[s.lane].push(s);
      if (s.overlay) {
        var o = el('div', 'ch ov');
        o.innerHTML = '<img class="g" src="img/cast/' + s.overlay.img + '_bw.png"><img class="c" src="img/cast/' + s.overlay.img + '.png">';
        boxStyle(o, s.overlay.box); o.style.zIndex = s.overlay.z * 10 + 1; L.appendChild(o); overlayEls[i] = o;
      }
      if (s.scene) { var im = new Image(); im.src = 'img/dark/' + s.scene + '.jpg'; } // warm the cache
    });
    lanes.forEach(function (l) { l.sort(function (a, b) { return (a.box[0] + a.box[2]) - (b.box[0] + b.box[2]); }); });
    var f = el('div'); f.id = 'lineupfade';
    f.style.top = (frameY + frameH * 0.6) + 'px'; f.style.height = (1080 - frameY - frameH * 0.6) + 'px';
    L.appendChild(f);
  }
  function showX(s) { return frameX + (s.box[0] + s.box[2]) / 2 * frameW; }
  var favSel = null;
  function selectFav(s) {
    if (favSel && favSel !== s) {
      var p = chEls[favSel.i]; p.classList.remove('f', 'vib', 'thud'); p.style.zIndex = favSel.z * 10 + 1;
      if (overlayEls[favSel.i]) overlayEls[favSel.i].classList.remove('f');
    }
    favSel = s;
    var cap = $('caption'), glow = $('castglow'), scene = $('scene');
    if (!s) { cap.style.opacity = 0; glow.style.opacity = 0; scene.style.opacity = 0; return; }
    var e = chEls[s.i];
    e.classList.add('f'); e.style.zIndex = s.lane === 1 ? 200 : s.z * 10 + 5;
    if (overlayEls[s.i]) { overlayEls[s.i].classList.add('f'); overlayEls[s.i].style.zIndex = s.lane === 1 ? 201 : s.overlay.z * 10 + 1; }
    if (s.effect === 'vibrate') { e.classList.remove('vib'); void e.offsetWidth; e.classList.add('vib'); }
    if (s.effect === 'spidersense') { e.classList.remove('thud'); void e.offsetWidth; e.classList.add('thud'); spiderSense(s); }
    if (s.scene) { scene.style.backgroundImage = 'url(img/dark/' + s.scene + '.jpg)'; scene.style.opacity = 1; } else scene.style.opacity = 0;
    var gx = showX(s), gy = frameY + (s.box[1] + (s.box[3] - s.box[1]) * 0.3) * frameH;
    glow.style.background = 'radial-gradient(closest-side, ' + rgba(s.glow, .42) + ', ' + rgba(s.glow, .12) + ' 55%, ' + rgba(s.glow, 0) + ')';
    glow.style.left = (gx - 550) + 'px'; glow.style.top = (gy - 550) + 'px'; glow.style.opacity = 1;
    var svc = C.services[s.app];
    $('captitle').textContent = s.title; $('capapp').textContent = svc ? svc.name : s.app;
    cap.style.opacity = 1;
    var w = cap.offsetWidth, x = Math.max(112, Math.min(1920 - 112 - w, gx - w / 2));
    cap.style.transform = 'translateX(' + x + 'px)';
  }
  // Spider-sense: wavy ink strands around the head that taper at both ends, drift and fade.
  var BASE_ANG = [-172, -146, -120, -95, -68, -42, -16, 12, 162], senseRaf = 0;
  function spiderSense(s) {
    var cv = $('sense'), ctx = cv.getContext('2d');
    var bw = (s.box[2] - s.box[0]) * frameW, bh = (s.box[3] - s.box[1]) * frameH;
    var hx = frameX + s.box[0] * frameW + bw * 0.6, hy = frameY + s.box[1] * frameH + bh * 0.2;
    var size = 600; cv.style.left = (hx - size / 2) + 'px'; cv.style.top = (hy - size / 2) + 'px';
    var R = size * 0.48 * 0.5, st = [];
    BASE_ANG.forEach(function (a, i) {
      st.push({ ang: (a + (Math.random() - .5) * 16) * Math.PI / 180, len: (i % 2 ? .34 : .46) + Math.random() * .22,
        amp: .045 + Math.random() * .045, bend: (Math.random() - .5) * .45, wid: .055 + Math.random() * .035,
        delay: Math.random() * .12, root: 1 + Math.random() * .1, ph: Math.random() * 6 });
    });
    cancelAnimationFrame(senseRaf);
    var t0 = performance.now();
    (function frame(now) {
      var t = (now - t0) / 1400; ctx.clearRect(0, 0, size, size);
      if (t >= 1) return;
      var fade = t < .45 ? 1 : 1 - (t - .45) / .55;
      st.forEach(function (q) {
        var g = Math.max(0, Math.min(1, (t - q.delay) / .22)); if (!g) return;
        var steps = 22, pts = [];
        for (var k = 0; k <= steps; k++) {
          var u = k / steps, r = R * (q.root + 0.12 * t) + u * q.len * R * 1.6 * g;
          var off = Math.sin(u * 7 + q.ph + t * 6) * q.amp * R * 2 * u + q.bend * u * u * R;
          var cx = size / 2 + Math.cos(q.ang) * r - Math.sin(q.ang) * off, cy = size / 2 + Math.sin(q.ang) * r + Math.cos(q.ang) * off;
          pts.push([cx, cy, Math.sin(Math.PI * u) * q.wid * R * (1 - t * .45)]);
        }
        ctx.beginPath();
        for (k = 0; k < pts.length; k++) {
          var a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
          var px = pts[k][0] + nx / nl * pts[k][2], py = pts[k][1] + ny / nl * pts[k][2];
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        for (k = pts.length - 1; k >= 0; k--) {
          a = pts[Math.max(0, k - 1)]; b = pts[Math.min(pts.length - 1, k + 1)]; nx = -(b[1] - a[1]); ny = b[0] - a[0]; nl = Math.hypot(nx, ny) || 1;
          ctx.lineTo(pts[k][0] - nx / nl * pts[k][2], pts[k][1] - ny / nl * pts[k][2]);
        }
        ctx.closePath(); ctx.fillStyle = 'rgba(10,10,12,' + (0.85 * fade) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * fade) + ')'; ctx.lineWidth = 1; ctx.stroke();
      });
      senseRaf = requestAnimationFrame(frame);
    })(t0);
  }

  // ---------- mood cards ----------
  var moodIdx = 0, available = D.titles.slice(), preload = [];
  function titlesFor(id) { return available.filter(function (t) { return id === 'anything' || t.moods.indexOf(id) >= 0; }); }
  function moodCard(m, cls) {
    var c = el('div', 'card ' + cls), list = titlesFor(m.id);
    c.style.background = 'linear-gradient(to bottom, ' + rgba(m.color, .38) + ', rgba(14,14,14,.96) 70%)';
    c.style.border = '2px solid ' + rgba(m.color, .45);
    var fan = el('div', 'fan'), picks = list.slice(0, 5);
    picks.forEach(function (t, i) {
      var im = el('img'); im.src = posterSrc(t);
      var n = picks.length, a = (i - (n - 1) / 2) * 9;
      im.style.left = (105 + (i - (n - 1) / 2) * (n > 3 ? 46 : 70)) + 'px'; im.style.top = (Math.abs(i - (n - 1) / 2) * 12) + 'px';
      im.style.transform = 'rotate(' + a + 'deg)'; im.style.zIndex = 10 - Math.abs(Math.round(i - (n - 1) / 2));
      fan.appendChild(im);
    });
    c.appendChild(fan); c.appendChild(el('div', 'nm', m.name)); c.appendChild(el('div', 'ct', list.length + ' titles'));
    return c;
  }
  function moods() { return C.moods.filter(function (m) { return titlesFor(m.id).length; }); }
  function buildDeck() {
    var deck = $('deck'); deck.innerHTML = '';
    var ms = moods(); if (!ms.length) return;
    moodIdx = moodIdx % ms.length;
    deck.appendChild(moodCard(ms[(moodIdx + 1) % ms.length], 'back'));
    deck.appendChild(moodCard(ms[moodIdx], 'top'));
    [ms[moodIdx], ms[(moodIdx + 1) % ms.length]].forEach(function (m) { titlesFor(m.id).forEach(function (t) { var i = new Image(); i.src = posterSrc(t); preload.push(i); }); });
    if (preload.length > 120) preload.splice(0, preload.length - 120);
    moodBackdrop();
  }
  function moodBackdrop() {
    var ms = moods(), list = titlesFor(ms[moodIdx].id).filter(function (t) { return t.backdrop; });
    if (!list.length) { $('moodbg').style.backgroundImage = 'none'; return; }
    $('moodbg').style.backgroundImage = 'url(img/dark/' + pick(list).backdrop + '.jpg)';
  }
  function swipe(dir) {
    var top = document.querySelector('.card.top'); if (!top) return;
    top.classList.remove('top'); top.classList.add(dir < 0 ? 'gone-l' : 'gone-r');
    var ms = moods(), m = ms[moodIdx];
    if (dir < 0) {
      moodIdx = (moodIdx + 1) % ms.length;
      setTimeout(buildDeck, 300);
      var back = document.querySelector('.card.back'); if (back) { back.classList.remove('back'); back.classList.add('top'); }
    } else {
      setTimeout(function () { spin(m); }, 260);
    }
  }
  // Reel: a horizontal cover-flow of the mood's posters that spins and lands on one title.
  var reel = null, reelRaf = 0, reelEls = [];
  // One element per poster in the strip, built once per spin (no image swapping mid-spin = no decode stalls).
  function buildStrip(seq, color) {
    var strip = $('reelstrip'); strip.innerHTML = ''; reelEls = [];
    seq.forEach(function (t) {
      var w = el('div', 'rp'); w.innerHTML = '<img src="' + posterSrc(t) + '"><div class="sh"></div>';
      w.style.display = 'none'; w.vis = false; strip.appendChild(w); reelEls.push(w);
    });
    reelEls.color = color;
  }
  function layoutReel(seq, pos) {
    var lo = Math.floor(pos) - 5, hi = Math.ceil(pos) + 5;
    for (var idx = 0; idx < reelEls.length; idx++) {
      var w = reelEls[idx], d = idx - pos, ad = Math.abs(d), show = idx >= lo && idx <= hi && ad <= 4.6;
      if (show !== w.vis) { w.style.display = show ? 'block' : 'none'; w.vis = show; }
      if (!show) continue;
      var sc = Math.max(.42, 1 - ad * .16), x = 960 + (d < 0 ? -1 : 1) * (ad < 1 ? ad * 260 : 260 + (ad - 1) * 190 - (ad - 1) * (ad - 1) * 12);
      w.style.transform = 'translate3d(' + (x - 157).toFixed(1) + 'px,0,0) scale(' + sc.toFixed(3) + ')';
      w.style.zIndex = 100 - Math.round(ad * 10);
      w.lastChild.style.opacity = Math.min(.8, ad * .28).toFixed(2);
      var on = ad < .5; if (on !== w.on) { w.on = on; w.style.borderColor = on ? reelEls.color : 'transparent'; }
    }
  }
  function spin(m) {
    var list = titlesFor(m.id); if (!list.length) return;
    if (reel) { clearTimeout(reel.timer); cancelAnimationFrame(reelRaf); }
    var target = pick(list), seq = [], n = 34;
    // Every poster appears once on screen: show at most list.length posters around the centre,
    // and order the strip so the landing title sits in the middle of one full cycle.
    var others = list.filter(function (t) { return t !== target; }).sort(function () { return Math.random() - .5; });
    var cycle = others.slice(0, Math.floor(others.length / 2)).concat([target], others.slice(Math.floor(others.length / 2)));
    var off = Math.floor(others.length / 2);
    for (var i = 0; seq.length < n + 8 || (seq.length - off) % cycle.length; i++) seq.push(cycle[i % cycle.length]);
    n = Math.floor((n - off) / cycle.length) * cycle.length + off;
    buildStrip(seq, m.color);
    var sec = $('s-mood'); sec.classList.add('reeling'); sec.classList.remove('landed');
    $('picktitle').textContent = ''; $('pickcount').textContent = ''; $('pickbar').style.transition = 'none'; $('pickbar').style.width = '0';
    $('pickbar').style.background = m.color;
    if (target.backdrop) $('moodbg').style.backgroundImage = 'url(img/dark/' + target.backdrop + '.jpg)';
    reel = { mood: m, title: target, seq: seq };
    var t0 = performance.now(), from = 4, dur = 2800;
    (function frame(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3.2);
      layoutReel(seq, from + (n - from) * e);
      if (t < 1) { reelRaf = requestAnimationFrame(frame); return; }
      land();
    })(t0);
  }
  function land() {
    var sec = $('s-mood'); sec.classList.add('landed');
    $('picktitle').textContent = reel.title.title;
    var bar = $('pickbar'); void bar.offsetWidth; bar.style.transition = 'width 3000ms linear'; bar.style.width = '100%';
    reel.count = 3;
    (function tickc() {
      if (!reel) return;
      if (reel.count <= 0) { var t = reel.title; endReel(); openTitle(t.app, t.target, t.title); return; }
      $('pickcount').textContent = 'Opening in ' + reel.count + '\u2026   OK to play now  \u00b7  \u203a spin again';
      reel.count--; reel.timer = setTimeout(tickc, 1000);
    })();
  }
  function endReel() {
    if (!reel) return;
    clearTimeout(reel.timer); cancelAnimationFrame(reelRaf); reel = null;
    $('s-mood').classList.remove('reeling', 'landed'); buildDeck();
  }
  function posterSrc(t) { return t.poster || ('img/poster/' + t.art + '.jpg'); }

  // ---------- "New in Tamil & Malayalam": refreshes itself once a week from JustWatch (US catalogue) ----------
  var FRESH_ORDER = [['netflix', 'netflix'], ['netflixbasicwithads', 'netflix'], ['amazonprime', 'prime'], ['amazonprimevideowithads', 'prime'],
    ['hulu', 'hulu'], ['disneyplus', 'disney'], ['appletvplus', 'appletv']];
  function freshLang(t) { return /[஀-௿]/.test(t || '') ? 'ta' : /[ഀ-ൿ]/.test(t || '') ? 'ml' : ''; }
  function freshFromNode(n) {
    var c = n.content, offs = {};
    (n.offers || []).forEach(function (o) { if (o.monetizationType === 'FLATRATE' || o.monetizationType === 'ADS') offs[o.package.technicalName] = o.standardWebURL; });
    for (var i = 0; i < FRESH_ORDER.length; i++) {
      var u = offs[FRESH_ORDER[i][0]], svc = FRESH_ORDER[i][1], m, tgt;
      if (!u) continue;
      if (svc === 'netflix') { m = /title\/(\d+)/.exec(u); tgt = m ? m[1] : ''; }
      else if (svc === 'prime') { m = /gti=([^&]+)/.exec(u); tgt = m ? m[1] : ''; }
      else tgt = u.split('?utm_source')[0];
      return { title: c.title, app: svc, target: tgt, art: '', moods: ['fresh'], backdrop: '', year: c.originalReleaseYear,
        poster: c.posterUrl ? 'https://images.justwatch.com' + c.posterUrl.replace('{profile}', 's332').replace('{format}', 'jpg') : '' };
    }
    return null;
  }
  function applyFresh(list) {
    var pinned = D.titles.filter(function (t) { return t.pinned; });
    var names = {}; D.titles.forEach(function (t) { if (t.moods.indexOf('fresh') < 0 || t.pinned) names[t.title.toLowerCase()] = 1; });
    var add = list.filter(function (t) { if (names[t.title.toLowerCase()]) return false; names[t.title.toLowerCase()] = 1; return true; }).slice(0, 20);
    D.titles = D.titles.filter(function (t) { return t.moods.indexOf('fresh') < 0 || t.pinned; }).concat(add);
    void pinned;
  }
  function refreshFresh() {
    if (!C.freshFeed) { C.moods = C.moods.filter(function (m) { return m.id !== 'fresh'; }); return Promise.resolve(); }
    var c = store('fresh');
    if (c && c.list) applyFresh(c.list);
    if (c && Date.now() - c.at < 7 * 864e5) return Promise.resolve();
    var year = new Date().getFullYear() - 1;
    var q = '{popularTitles(country:US,first:100,sortBy:POPULAR,filter:{productionCountries:["IN"],packages:["nfx","prv","hlu","dnp","atp"],releaseYear:{min:' + year + '}})' +
      '{edges{node{objectType content(country:US,language:"en"){title originalTitle originalReleaseYear posterUrl} offers(country:US,platform:WEB){monetizationType package{technicalName} standardWebURL}}}}}';
    return new Promise(function (res) {
      var x = new XMLHttpRequest(); x.open('POST', 'https://apis.justwatch.com/graphql'); x.timeout = 20000;
      x.setRequestHeader('Content-Type', 'application/json');
      x.onload = function () {
        try {
          var edges = JSON.parse(x.responseText).data.popularTitles.edges, list = [];
          edges.forEach(function (e) { if (freshLang(e.node.content.originalTitle)) { var t = freshFromNode(e.node); if (t) list.push(t); } });
          if (list.length) { store('fresh', { at: Date.now(), list: list }); applyFresh(list); }
        } catch (err) { /* keep what we have */ }
        res();
      };
      x.onerror = x.ontimeout = function () { res(); };
      x.send(JSON.stringify({ query: q }));
    });
  }

  // Leave out titles whose app isn't installed.
  function filterTitles() {
    var keys = {}; D.titles.forEach(function (t) { keys[t.app] = 1; });
    return Promise.all(Object.keys(keys).map(function (k) { return resolveSvc(k); })).then(function () {
      available = D.titles.filter(function (t) { return svcApp[t.app]; });
      buildDeck();
    });
  }

  // ---------- inputs menu ----------
  var menuItems = [], menuIdx = 0;
  function openInputs() {
    var m = $('inputs'); m.innerHTML = ''; menuItems = [];
    [1, 2, 3, 4].forEach(function (n) {
      menuItems.push({ html: 'HDMI ' + n + (inputNames[n] ? '<small>' + inputNames[n] + '</small>' : (n === C.ps5Hdmi ? '<small>Fire TV</small>' : '')), go: function () { openHdmi(n); } });
    });
    menuItems.push({ html: 'Live TV', go: function () { launch('com.webos.app.livetv'); } });
    menuItems.forEach(function (it) { var d = el('div', 'mi', it.html); m.appendChild(d); it.el = d; });
    m.classList.add('on'); menuIdx = 0; paintMenu(); mode = 'inputs';
  }
  function paintMenu() { menuItems.forEach(function (it, i) { it.el.classList.toggle('f', i === menuIdx); }); }
  function closeMenu() { $('inputs').classList.remove('on'); mode = 'home'; }

  // ---------- more apps ----------
  var appItems = [], appIdx = 0;
  function openApps() {
    var g = $('appgrid'); g.innerHTML = ''; appItems = [];
    var seen = {}, first = [], rest = [];
    var svcKeys = Object.keys(C.services);
    Promise.all(svcKeys.map(resolveSvc)).then(function () {
      svcKeys.forEach(function (k) { var id = svcApp[k]; if (id && !seen[id]) { seen[id] = 1; first.push({ id: id, title: C.services[k].name }); } });
      return Promise.all(C.moreApps.map(function (a) { return appExists(a.id).then(function (ok) { return ok ? a : null; }); }));
    }).then(function (list) {
      list.forEach(function (a) { if (a && !seen[a.id] && !seen['t:' + a.title]) { seen[a.id] = 1; seen['t:' + a.title] = 1; rest.push(a); } });
      first.forEach(function (a) { seen['t:' + a.title] = 1; });
      rest = rest.filter(function (a) { return first.every(function (f) { return f.title !== a.title; }); });
      rest.sort(function (a, b) { return a.title.localeCompare(b.title); });
      first.concat(rest).forEach(function (a) {
        var d = el('div', 'app'), col = appColor(a);
        d.innerHTML = '<div class="tile" style="background:linear-gradient(145deg,' + rgba(col, .95) + ',' + rgba(col, .45) + ')">' + initials(a.title) + '</div><div class="an">' + a.title + '</div>';
        g.appendChild(d); appItems.push({ id: a.id, el: d });
      });
      appIdx = 0; paintApps();
    });
    $('apps').classList.add('on'); mode = 'apps';
  }
  function initials(t) { var w = t.replace(/[^A-Za-z0-9+& ]/g, '').split(' ').filter(Boolean); return w.length > 1 && w[0].length < 4 && /^[A-Z]/.test(w[1]) ? (w[0][0] + w[1][0]) : t.replace(/ /g, '').slice(0, t.length > 6 ? 1 : 2); }
  var APP_COLORS = { 'Spotify': '#1DB954', 'ZEE5': '#8230C6', 'Sun NXT': '#FF7A00', 'Twitch': '#9146FF', 'Plex': '#E5A00D', 'Fandango at Home': '#3A6FF7',
    'Paramount+': '#0064FF', 'Crunchyroll': '#F47521', 'LG Channels': '#A50034', 'Live TV': '#D93025', 'Web Browser': '#1A73E8', 'Photo & Video': '#E8710A',
    'Music': '#D81B60', 'LG Content Store': '#C5221F', 'Settings': '#5F6368' };
  function appColor(a) {
    for (var k in C.services) if (C.services[k].name === a.title) return C.services[k].color;
    return APP_COLORS[a.title] || '#555B66';
  }
  function paintApps() {
    appItems.forEach(function (it, i) { it.el.classList.toggle('f', i === appIdx); });
    var row = Math.floor(appIdx / 5); $('appgrid').style.transform = 'translateY(' + (-Math.max(0, row - 2) * 230) + 'px)';
  }
  function closeApps() { $('apps').classList.remove('on'); mode = 'home'; }

  // ---------- focus & navigation ----------
  var ROWS = ['top', 'dock', 'fav', 'mood', 'more', 'chess'];
  var SECTION = { top: 0, dock: 0, fav: 1, mood: 2, more: 2, chess: 3 };
  var mode = 'home', row = 'dock', col = { top: 0, dock: 0, mood: 0, more: 0, chess: 0 }, favLane = 1, favCol = 0;
  var lastUsed = null;
  function rowItems(r) {
    if (r === 'top') return [].slice.call(document.querySelectorAll('.ic'));
    if (r === 'dock') return dockEls;
    if (r === 'mood') return [$('s-mood')]; if (r === 'more') return [$('morebtn')]; if (r === 'chess') return [$('s-play')];
    return [];
  }
  function xOf(r) {
    if (r === 'fav') return showX(lanes[favLane][favCol]);
    var e = rowItems(r)[col[r]]; if (!e) return 960;
    var b = e.getBoundingClientRect(); return b.left + b.width / 2;
  }
  function nearest(r, x) {
    if (r === 'fav') return;
    var best = 0, bd = 1e9;
    rowItems(r).forEach(function (e, i) { var b = e.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - x); if (d < bd) { bd = d; best = i; } });
    col[r] = best;
  }
  function nearestFav(lane, x) {
    var best = 0, bd = 1e9; lanes[lane].forEach(function (s, i) { var d = Math.abs(showX(s) - x); if (d < bd) { bd = d; best = i; } }); return best;
  }
  function paint() {
    ['top', 'dock'].forEach(function (r) { rowItems(r).forEach(function (e, i) { e.classList.toggle('f', row === r && col[r] === i); }); });
    $('s-mood').classList.toggle('f', row === 'mood');
    $('morebtn').classList.toggle('f', row === 'more');
    $('s-play').classList.toggle('f', row === 'chess');
    var d = C.dock[col.dock];
    $('tagline').textContent = d.line;
    $('tagline').style.opacity = row === 'dock' ? 1 : .35;
    $('dock').classList.toggle('blur', row !== 'dock');
    var g = $('dockglow'), c = dockColor(d), b = dockEls[col.dock].getBoundingClientRect();
    var pageY = SECTION[row] * 1080;
    g.style.background = 'radial-gradient(closest-side, ' + rgba(c, .24) + ', ' + rgba(c, .06) + ' 60%, ' + rgba(c, 0) + ')';
    g.style.left = (b.left + b.width / 2 - 840) + 'px'; g.style.top = (720 + 60 - 495) + 'px';
    g.style.opacity = row === 'dock' || row === 'top' ? 1 : .4;
    selectFav(row === 'fav' ? lanes[favLane][favCol] : null);
    var sec = SECTION[row];
    $('page').style.transform = 'translateY(' + (-sec * 1080) + 'px)';
    $('dim').style.opacity = sec === 0 ? 0 : sec === 1 ? .55 : .6;
    $('moodbg').style.opacity = sec === 2 ? 1 : 0;
    $('grad').style.opacity = sec === 0 ? 1 : 0;
    if (row !== 'mood' && reel) endReel();
  }
  function move(dy) {
    var x = xOf(row), i = ROWS.indexOf(row);
    if (row === 'fav') {
      var nl = favLane + (dy > 0 ? 1 : -1);
      if (nl >= 0 && nl <= 1) { favCol = nearestFav(nl, x); favLane = nl; return paint(); }
    }
    var ni = i + dy; if (ni < 0 || ni >= ROWS.length) return;
    row = ROWS[ni];
    if (row === 'fav') { favLane = dy > 0 ? 0 : 1; favCol = nearestFav(favLane, x); }
    else nearest(row, x);
    paint();
  }
  function side(dx) {
    if (row === 'fav') { favCol = Math.max(0, Math.min(lanes[favLane].length - 1, favCol + dx)); return paint(); }
    if (row === 'mood') { if (reel) { if (dx > 0) spin(reel.mood); else endReel(); } else swipe(dx); return; }
    var n = rowItems(row).length; col[row] = Math.max(0, Math.min(n - 1, col[row] + dx)); paint();
  }
  function ok() {
    lastUsed = { row: row, col: col[row], favLane: favLane, favCol: favCol };
    if (row === 'top') { var a = rowItems('top')[col.top].getAttribute('data-act');
      if (a === 'wifi') launch('com.palm.app.settings', { target: 'network' });
      if (a === 'settings') launch('com.palm.app.settings');
      if (a === 'inputs') openInputs();
      return; }
    if (row === 'dock') { var d = C.dock[col.dock]; if (d.svc === 'ps5') return openHdmi(C.ps5Hdmi);
      return resolveSvc(d.svc).then(function (id) { id ? launch(id) : toast(dockName(d) + ' isn’t installed'); }); }
    if (row === 'fav') { var s = lanes[favLane][favCol]; return openTitle(s.app, s.target, s.title); }
    if (row === 'mood') { if (reel) { var t = reel.title; endReel(); return openTitle(t.app, t.target, t.title); } return swipe(1); }
    if (row === 'more') return openApps();
    if (row === 'chess') { mode = 'chess'; return window.DoomChess.open(function () { mode = 'home'; paint(); }); }
  }
  function back() {
    if (row === 'mood' && reel) return endReel();
    if (row !== 'dock') { row = 'dock'; return paint(); }
    if (window.PalmSystem && window.PalmSystem.platformBack) window.PalmSystem.platformBack();
  }
  var lastKey = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode, now = Date.now();
    if (now - lastKey < 70 && k >= 37 && k <= 40) { e.preventDefault(); return; } // tame key repeat on the TV
    lastKey = now;
    if (k === 415 || k === 19 || k === 179) { musicToggle(); e.preventDefault(); return; }
    if (mode === 'chess') { window.DoomChess.key(k); e.preventDefault(); return; }
    if (mode === 'inputs') {
      if (k === 38) menuIdx = Math.max(0, menuIdx - 1); else if (k === 40) menuIdx = Math.min(menuItems.length - 1, menuIdx + 1);
      else if (k === 13) { var it = menuItems[menuIdx]; closeMenu(); it.go(); }
      else if (k === 461 || k === 8 || k === 27 || k === 37 || k === 39) closeMenu();
      paintMenu(); e.preventDefault(); return;
    }
    if (mode === 'apps') {
      var per = 5;
      if (k === 37) appIdx = Math.max(0, appIdx - 1); else if (k === 39) appIdx = Math.min(appItems.length - 1, appIdx + 1);
      else if (k === 38) appIdx = Math.max(0, appIdx - per); else if (k === 40) appIdx = Math.min(appItems.length - 1, appIdx + per);
      else if (k === 13 && appItems[appIdx]) { closeApps(); launch(appItems[appIdx].id); }
      else if (k === 461 || k === 8 || k === 27) closeApps();
      paintApps(); e.preventDefault(); return;
    }
    if (k === 38) move(-1); else if (k === 40) move(1); else if (k === 37) side(-1); else if (k === 39) side(1);
    else if (k === 13) ok(); else if (k === 461 || k === 8 || k === 27) back(); else return;
    e.preventDefault();
  });
  // Home button / reopening: go back to the last thing used; again → dock.
  function relaunch() {
    if (mode === 'chess') return;
    if (mode !== 'home') { closeMenu(); closeApps(); }
    C.dock.forEach(function (d) { d.line = pick(d.lines); });
    if (lastUsed && !(row === lastUsed.row && col[row] === lastUsed.col)) {
      row = lastUsed.row; col[row] = lastUsed.col; favLane = lastUsed.favLane; favCol = lastUsed.favCol; lastUsed = null;
    } else { row = 'dock'; }
    paint(); weather(); wifi();
  }
  document.addEventListener('webOSRelaunch', relaunch);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { weather(); wifi(); } });

  // ---------- background music ----------
  var bgm = null, musicOn = store('musicOn') !== false;
  function musicInit() {
    if (!C.music || !C.music.file) return;
    bgm = new Audio(C.music.file); bgm.loop = true; bgm.volume = 0;
    bgm.onerror = function () { if (bgm) clearInterval(bgm.fade); bgm = null; }; // no music file added yet
    musicPlay();
  }
  function fadeTo(v, ms, done) {
    var a = bgm; if (!a) return; var from = a.volume, t0 = Date.now();
    clearInterval(a.fade);
    a.fade = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (v - from) * k));
      if (k >= 1 || bgm !== a) { clearInterval(a.fade); if (done && bgm === a) done(); }
    }, 50);
  }
  function musicPlay() { if (!bgm || !musicOn || document.hidden) return; var p = bgm.play(); if (p && p.catch) p.catch(function () {}); fadeTo(C.music.volume, 1200); }
  function musicPause(ms) { if (!bgm) return; fadeTo(0, ms || 400, function () { if (bgm) bgm.pause(); }); }
  function musicToggle() {
    musicOn = !musicOn; store('musicOn', musicOn);
    if (!bgm) return toast('Add a song as audio/bgm.mp3 to play music');
    if (musicOn) { musicPlay(); toast('Music on'); } else { musicPause(); toast('Music off'); }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) musicPause(200); else musicPlay(); });

  // ---------- start ----------
  buildDock(); buildLineup(); buildDeck();
  tick(); weather(); wifi(); paint();
  setInterval(function () { if (!document.hidden) weather(); }, 30 * 60000);
  loadInputs(); refreshFresh().then(filterTitles);
  window.__musicPause = musicPause; musicInit();
  setInterval(function () { refreshFresh().then(filterTitles); }, 12 * 3600e3);
  window.TVHome = { launch: launch, paint: paint };
})();
