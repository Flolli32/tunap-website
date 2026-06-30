/* ============================================================
   tunap. — Landingpage Skript
   1) Sprachumschalter DE/EN
   2) Interaktive Live-Demo (Court-Monitor + Schiedsrichter-Tablet)
      — Vanilla-Portierung der ursprünglichen DCLogic/React-Komponente,
        inkl. BWF-konformer Aufschlag-/Seitenwechsel-/Satzlogik.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1) Sprachumschalter ---------- */
  function initLang() {
    var de = document.getElementById('lang-de');
    var en = document.getElementById('lang-en');
    if (!de || !en) return;
    function set(lang) {
      document.body.setAttribute('data-lang', lang);
      document.documentElement.lang = lang;
      var deOn = lang === 'de';
      de.classList.toggle('is-active', deOn);
      en.classList.toggle('is-active', !deOn);
      de.setAttribute('aria-pressed', String(deOn));
      en.setAttribute('aria-pressed', String(!deOn));
    }
    de.addEventListener('click', function () { set('de'); });
    en.addEventListener('click', function () { set('en'); });
  }

  /* ---------- Mini-Hyperscript (React.createElement-Ersatz) ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (k === 'style' && v) {
          Object.assign(el.style, v);
        } else if (k === 'onClick') {
          if (v) el.addEventListener('click', v);
        } else if (k === 'dangerouslySetInnerHTML') {
          if (v && v.__html != null) el.innerHTML = v.__html;
        } else if (k === 'key') {
          /* ignoriert */
        } else if (v != null && v !== false) {
          el.setAttribute(k, v);
        }
      }
    }
    var children = [].slice.call(arguments, 2);
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false || c === true) continue;
        if (Array.isArray(c)) { add(c); continue; }
        if (typeof c === 'string' || typeof c === 'number') {
          el.appendChild(document.createTextNode(String(c)));
        } else if (c instanceof Node) {
          el.appendChild(c);
        }
      }
    })(children);
    return el;
  }

  /* ---------- 2) Live-Demo ---------- */
  function LiveDemo(monitorMount, tabletMount, doublesBtn, singlesBtn) {
    this.monitorMount = monitorMount;
    this.tabletMount = tabletMount;
    this.doublesBtn = doublesBtn;
    this.singlesBtn = singlesBtn;
    this.state = this.initialState(true);
    var self = this;
    if (doublesBtn) doublesBtn.addEventListener('click', function () { self.reset(true); });
    if (singlesBtn) singlesBtn.addEventListener('click', function () { self.reset(false); });
    this.startTimer();
    this.render();
  }

  LiveDemo.prototype.initialState = function (isDoubles) {
    return {
      isDoubles: isDoubles,
      homePoints: 0, awayPoints: 0,
      sets: [], homeSetsWon: 0, awaySetsWon: 0,
      servingTeam: 'Home', homeRight: 0, awayRight: 0,
      shuttle: 3, finished: false, winner: null,
      seconds: 0, history: []
    };
  };

  LiveDemo.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state) : patch;
    if (next === this.state) return;            /* gleiche Referenz => kein Update */
    for (var k in next) { if (Object.prototype.hasOwnProperty.call(next, k)) this.state[k] = next[k]; }
    this.render();
  };

  LiveDemo.prototype.startTimer = function () {
    var self = this;
    this.timer = window.setInterval(function () {
      self.setState(function (s) { return s.finished ? s : { seconds: s.seconds + 1 }; });
    }, 1000);
  };

  /* ----- Daten ----- */
  LiveDemo.prototype.roster = function () {
    if (this.state.isDoubles) {
      return { a: { badge: 'DFC', players: ['Lukas Moser', 'Anton Abeln'] }, b: { badge: 'TVC', players: ['Tom Tommsen', 'Jan Vogt'] } };
    }
    return { a: { badge: 'DFC', players: ['Lukas Moser'] }, b: { badge: 'TVC', players: ['Tom Tommsen'] } };
  };
  LiveDemo.prototype.initials = function (name) {
    var p = name.trim().split(/\s+/).filter(Boolean);
    if (p.length === 0) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };
  LiveDemo.prototype.surname = function (name) {
    var p = name.trim().split(/\s+/).filter(Boolean);
    return p.length < 2 ? name : p.slice(1).join(' ');
  };

  /* ----- BWF-Aufschlaglogik ----- */
  LiveDemo.prototype.computeServe = function (servingTeam, homeRight, awayRight, homePoints, awayPoints) {
    if (servingTeam == null) return null;
    if (homeRight == null || awayRight == null) return null;
    var serverTeam = servingTeam === 'Home' ? 'A' : 'B';
    var receivingTeam = serverTeam === 'A' ? 'B' : 'A';
    var serverScore = serverTeam === 'A' ? homePoints : awayPoints;
    var even = serverScore % 2 === 0;
    var servingRight = serverTeam === 'A' ? homeRight : awayRight;
    var receivingRight = serverTeam === 'A' ? awayRight : homeRight;
    var serverIdx = even ? servingRight : 1 - servingRight;
    var receiverIdx = even ? receivingRight : 1 - receivingRight;
    return {
      server: { team: serverTeam, playerIndex: serverIdx, role: 'server' },
      serverPartner: { team: serverTeam, playerIndex: 1 - serverIdx, role: 'serverPartner' },
      receiver: { team: receivingTeam, playerIndex: receiverIdx, role: 'receiver' },
      receiverPartner: { team: receivingTeam, playerIndex: 1 - receiverIdx, role: 'receiverPartner' },
      serverTeam: serverTeam, serverPlayerIndex: serverIdx
    };
  };
  LiveDemo.prototype.playerPos = function (team, role, serverScore, serverTeam) {
    var evenScore = serverScore % 2 === 0;
    var serverOnLeftHalf = serverTeam === 'A';
    var serverX = serverOnLeftHalf ? -1 : 1;
    var rightCourtY = serverOnLeftHalf ? 1 : -1;
    var serverY = evenScore ? rightCourtY : -rightCourtY;
    var receiverX = -serverX, receiverY = -serverY;
    var isServerTeam = team === serverTeam;
    var SVC_X = 26, SVC_Y = 11;
    if (role === 'server') return { x: serverX * SVC_X, y: serverY * SVC_Y };
    if (role === 'receiver') return { x: receiverX * SVC_X, y: receiverY * SVC_Y };
    if (isServerTeam) return { x: serverX * SVC_X, y: -serverY * SVC_Y };
    return { x: receiverX * SVC_X, y: -receiverY * SVC_Y };
  };

  LiveDemo.prototype.courtSVG = function () {
    var s = this.state;
    var r = this.roster();
    var serverTeam = s.servingTeam === 'Home' ? 'A' : 'B';
    var serverScore = serverTeam === 'A' ? s.homePoints : s.awayPoints;
    var COL = { surface: '#2c5e44', surfaceDark: '#1d4030', line: 'rgba(250,250,249,0.88)', net: 'rgba(250,250,249,0.5)', teamA: '#5b8def', teamB: '#ef6b6b', serve: '#fb923c' };
    var C = { halfLen: 67, halfWid: 30.5, singlesWid: 25.9, shortService: 19.8, longDoublesService: 59.4 };
    var aLabels = r.a.players.map(this.initials.bind(this));
    var bLabels = r.b.players.map(this.initials.bind(this));
    var players = [];
    var self = this;
    if (!s.isDoubles) {
      var aServes = serverTeam === 'A';
      players.push({ team: 'A', label: aLabels[0], role: aServes ? 'server' : 'receiver' });
      players.push({ team: 'B', label: bLabels[0], role: aServes ? 'receiver' : 'server' });
    } else {
      var aServes2 = serverTeam === 'A';
      var pos = this.computeServe(s.servingTeam, s.homeRight, s.awayRight, aServes2 ? serverScore : 0, aServes2 ? 0 : serverScore);
      var mapRole = function (role) { return role === 'server' ? 'server' : role === 'receiver' ? 'receiver' : 'partner'; };
      [pos.server, pos.serverPartner, pos.receiver, pos.receiverPartner].forEach(function (slot) {
        players.push({ team: slot.team, label: (slot.team === 'A' ? aLabels : bLabels)[slot.playerIndex], role: mapRole(slot.role) });
      });
    }
    var positioned = players.map(function (p) {
      var pp = self.playerPos(p.team, p.role, serverScore, serverTeam);
      return { team: p.team, label: p.label, role: p.role, x: pp.x, y: pp.y };
    });
    var server = positioned.find(function (p) { return p.role === 'server'; });
    var receiver = positioned.find(function (p) { return p.role === 'receiver'; });
    var m = 6, W = C.halfLen * 2 + m * 2, H = C.halfWid * 2 + m * 2, tx = W / 2, ty = H / 2;
    var arrow = '';
    if (server && receiver) {
      var dx = receiver.x - server.x, dy = receiver.y - server.y;
      var len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      arrow = '<line x1="' + (server.x + ux * 7.2).toFixed(2) + '" y1="' + (server.y + uy * 7.2).toFixed(2) + '" x2="' + (receiver.x - ux * 8.4).toFixed(2) + '" y2="' + (receiver.y - uy * 8.4).toFixed(2) + '" stroke="' + COL.serve + '" stroke-width="0.5" stroke-dasharray="1.6 1.1" stroke-linecap="round" opacity="0.9" marker-end="url(#tnArrow)"/>';
    }
    var playerSVG = positioned.map(function (p) {
      var teamColor = p.team === 'A' ? COL.teamA : COL.teamB;
      var rr = 4.4;
      var rings = '';
      if (p.role === 'server') rings = '<circle r="' + (rr + 2.2) + '" fill="none" stroke="' + COL.serve + '" stroke-width="0.45" opacity="0.6"/><circle r="' + (rr + 1.3) + '" fill="none" stroke="' + COL.serve + '" stroke-width="0.6" filter="url(#tnGlow)"/>';
      else if (p.role === 'receiver') rings = '<circle r="' + (rr + 1.3) + '" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="0.45" stroke-dasharray="1.1 0.9"/>';
      else rings = '<circle r="' + (rr + 1.0) + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.3"/>';
      var roleLabel = '';
      if (p.role !== 'partner') {
        var txt = p.role === 'server' ? 'AUFSCHLAG' : 'ANNAHME';
        var col = p.role === 'server' ? COL.serve : 'rgba(255,255,255,0.85)';
        roleLabel = '<text x="0" y="' + (rr + 5.4) + '" text-anchor="middle" font-size="2" font-weight="700" fill="' + col + '" letter-spacing="0.15">' + txt + '</text>';
      }
      return '<g transform="translate(' + p.x + ' ' + p.y + ')" filter="url(#tnShadow)">' + rings + '<circle r="' + rr + '" fill="' + teamColor + '"/><circle r="' + rr + '" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="0.25"/><text x="0" y="0.45" text-anchor="middle" dominant-baseline="middle" font-size="3" font-weight="700" fill="#fff" letter-spacing="-0.05">' + p.label + '</text>' + roleLabel + '</g>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">\n' +
      '<defs>\n' +
      '<radialGradient id="tnSurf" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="' + COL.surface + '"/><stop offset="100%" stop-color="' + COL.surfaceDark + '"/></radialGradient>\n' +
      '<filter id="tnGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>\n' +
      '<filter id="tnShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0.6" stdDeviation="0.8" flood-opacity="0.55"/></filter>\n' +
      '<marker id="tnArrow" markerUnits="userSpaceOnUse" markerWidth="5.4" markerHeight="5.4" refX="4.4" refY="2.7" orient="auto"><path d="M0.6 0.6 L5 2.7 L0.6 4.8 Z" fill="' + COL.serve + '"/></marker>\n' +
      '</defs>\n' +
      '<g transform="translate(' + tx + ' ' + ty + ')">\n' +
      '<rect x="' + (-C.halfLen - 4) + '" y="' + (-C.halfWid - 4) + '" width="' + (C.halfLen * 2 + 8) + '" height="' + (C.halfWid * 2 + 8) + '" fill="url(#tnSurf)" rx="0.6"/>\n' +
      '<rect x="' + (-C.halfLen) + '" y="' + (-C.halfWid) + '" width="' + (C.halfLen * 2) + '" height="' + (C.halfWid * 2) + '" fill="url(#tnSurf)"/>\n' +
      (!s.isDoubles ? '<rect x="' + (-C.halfLen) + '" y="' + (-C.singlesWid) + '" width="' + (C.halfLen * 2) + '" height="' + (C.singlesWid * 2) + '" fill="rgba(255,255,255,0.04)"/>' : '') + '\n' +
      '<rect x="' + (-C.halfLen) + '" y="' + (-C.halfWid) + '" width="' + (C.halfLen * 2) + '" height="' + (C.halfWid * 2) + '" fill="none" stroke="' + COL.line + '" stroke-width="0.55"/>\n' +
      '<line x1="' + (-C.halfLen) + '" y1="' + (-C.singlesWid) + '" x2="' + C.halfLen + '" y2="' + (-C.singlesWid) + '" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="' + (-C.halfLen) + '" y1="' + C.singlesWid + '" x2="' + C.halfLen + '" y2="' + C.singlesWid + '" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="' + (-C.shortService) + '" y1="' + (-C.halfWid) + '" x2="' + (-C.shortService) + '" y2="' + C.halfWid + '" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="' + C.shortService + '" y1="' + (-C.halfWid) + '" x2="' + C.shortService + '" y2="' + C.halfWid + '" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="' + (-C.longDoublesService) + '" y1="' + (-C.halfWid) + '" x2="' + (-C.longDoublesService) + '" y2="' + C.halfWid + '" stroke="' + COL.line + '" stroke-width="0.4" opacity="' + (s.isDoubles ? 0.92 : 0.25) + '"/>\n' +
      '<line x1="' + C.longDoublesService + '" y1="' + (-C.halfWid) + '" x2="' + C.longDoublesService + '" y2="' + C.halfWid + '" stroke="' + COL.line + '" stroke-width="0.4" opacity="' + (s.isDoubles ? 0.92 : 0.25) + '"/>\n' +
      '<line x1="' + (-C.halfLen) + '" y1="0" x2="' + (-C.shortService) + '" y2="0" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="' + C.shortService + '" y1="0" x2="' + C.halfLen + '" y2="0" stroke="' + COL.line + '" stroke-width="0.4"/>\n' +
      '<line x1="0" y1="' + (-C.halfWid - 1.5) + '" x2="0" y2="' + (C.halfWid + 1.5) + '" stroke="' + COL.net + '" stroke-width="0.5" stroke-dasharray="1.2 1.2"/>\n' +
      '<circle cx="0" cy="' + (-C.halfWid - 1.5) + '" r="0.8" fill="' + COL.line + '"/>\n' +
      '<circle cx="0" cy="' + (C.halfWid + 1.5) + '" r="0.8" fill="' + COL.line + '"/>\n' +
      arrow + '\n' + playerSVG + '\n</g></svg>';
  };

  LiveDemo.prototype.snapshot = function () {
    var s = this.state;
    return { homePoints: s.homePoints, awayPoints: s.awayPoints, sets: s.sets.map(function (x) { return { home: x.home, away: x.away }; }), homeSetsWon: s.homeSetsWon, awaySetsWon: s.awaySetsWon, servingTeam: s.servingTeam, homeRight: s.homeRight, awayRight: s.awayRight, finished: s.finished, winner: s.winner };
  };
  LiveDemo.prototype.recordPoint = function (team) {
    if (this.state.finished) return;
    var snap = this.snapshot();
    this.setState(function (s) {
      var hp = s.homePoints, ap = s.awayPoints, st = s.servingTeam, hr = s.homeRight, ar = s.awayRight;
      if (team === st) { if (s.isDoubles) { if (st === 'Home') hr = 1 - hr; else ar = 1 - ar; } } else { st = team; }
      if (team === 'Home') hp += 1; else ap += 1;
      var setOver = (hp >= 21 && hp - ap >= 2) || hp === 30 || (ap >= 21 && ap - hp >= 2) || ap === 30;
      if (!setOver) return { homePoints: hp, awayPoints: ap, servingTeam: st, homeRight: hr, awayRight: ar, history: s.history.concat([snap]) };
      var homeWon = hp > ap;
      var newHsw = s.homeSetsWon + (homeWon ? 1 : 0);
      var newAsw = s.awaySetsWon + (homeWon ? 0 : 1);
      var matchOver = newHsw === 2 || newAsw === 2;
      if (matchOver) return { homePoints: hp, awayPoints: ap, homeSetsWon: newHsw, awaySetsWon: newAsw, finished: true, winner: homeWon ? 'Home' : 'Away', history: s.history.concat([snap]) };
      return { sets: s.sets.concat([{ home: hp, away: ap }]), homeSetsWon: newHsw, awaySetsWon: newAsw, homePoints: 0, awayPoints: 0, servingTeam: homeWon ? 'Home' : 'Away', homeRight: 0, awayRight: 0, history: s.history.concat([snap]) };
    });
  };
  LiveDemo.prototype.undo = function () {
    this.setState(function (s) {
      if (s.history.length === 0) return s;
      var prev = s.history[s.history.length - 1];
      var next = {};
      for (var k in prev) { if (Object.prototype.hasOwnProperty.call(prev, k)) next[k] = prev[k]; }
      next.history = s.history.slice(0, -1);
      return next;
    });
  };
  LiveDemo.prototype.reset = function (isDoubles) {
    if (this.timer) window.clearInterval(this.timer);
    var d = isDoubles === undefined ? this.state.isDoubles : isDoubles;
    this.state = this.initialState(d);
    if (this.doublesBtn) this.doublesBtn.classList.toggle('is-active', d);
    if (this.singlesBtn) this.singlesBtn.classList.toggle('is-active', !d);
    this.startTimer();
    this.render();
  };
  LiveDemo.prototype.fmtTime = function (sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };

  /* ----- Abgeleitete View ----- */
  LiveDemo.prototype.getView = function () {
    var s = this.state;
    var r = this.roster();
    var self = this;
    var serverTeam = s.servingTeam === 'Home' ? 'A' : 'B';
    var serverScore = serverTeam === 'A' ? s.homePoints : s.awayPoints;
    var serverPlayerIndex = 0;
    if (s.isDoubles) {
      var aServes = serverTeam === 'A';
      var pos = this.computeServe(s.servingTeam, s.homeRight, s.awayRight, aServes ? serverScore : 0, aServes ? 0 : serverScore);
      if (pos) serverPlayerIndex = pos.serverPlayerIndex;
    }
    var currentSetIndex = Math.min(s.sets.length, 2);
    var side = function (sd) {
      var isA = sd === 'A';
      var data = isA ? r.a : r.b;
      var serving = (s.servingTeam === 'Home') === isA;
      var running = isA ? s.homePoints : s.awayPoints;
      var cells = [0, 1, 2].map(function (i) {
        var set = s.sets[i];
        if (set) {
          var own = isA ? set.home : set.away, opp = isA ? set.away : set.home;
          return { value: own, state: own > opp ? 'won' : 'lost' };
        }
        if (i === currentSetIndex && !s.finished) return { value: running, state: 'current' };
        return { value: null, state: 'empty' };
      });
      var boxes = s.sets.map(function (set) {
        var own = isA ? set.home : set.away, opp = isA ? set.away : set.home;
        return { value: own, won: own > opp };
      });
      return {
        fullNames: data.players,
        surnames: data.players.map(function (n) { return self.surname(n); }),
        badge: data.badge,
        running: running,
        serving: serving,
        serverPlayerIndex: serving ? serverPlayerIndex : -1,
        cells: cells, boxes: boxes
      };
    };
    return {
      disc: s.isDoubles ? 'HD' : 'HE',
      cls: 'A',
      round: 'Achtelfinale',
      matchNo: 7,
      field: 3,
      satz: s.sets.length + 1,
      timer: this.fmtTime(s.seconds),
      finished: s.finished,
      isSingles: !s.isDoubles,
      winnerSide: s.winner === 'Home' ? 'A' : s.winner === 'Away' ? 'B' : null,
      serverTeam: serverTeam,
      shuttle: s.shuttle,
      canUndo: s.history.length > 0,
      courtHtml: this.courtSVG(),
      A: side('A'), B: side('B')
    };
  };

  /* ===== COURT-MONITOR ===== */
  LiveDemo.prototype.buildMonitor = function (v) {
    var TEXT = '#fafaf9', DIM2 = 'rgba(250,250,249,0.35)';
    var headText = function (t, extra) {
      var st = { fontSize: '0.44em', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: TEXT, fontVariantNumeric: 'tabular-nums' };
      if (extra) Object.assign(st, extra);
      return h('span', { style: st }, t);
    };
    var labels = [v.disc + ' ' + v.cls, v.round].filter(Boolean);
    var centerKids = [];
    labels.forEach(function (l, i) {
      if (i > 0) centerKids.push(h('span', { style: { width: '0.06em', height: '0.06em', borderRadius: '50%', background: DIM2 } }));
      centerKids.push(headText(l));
    });
    var header = h('header', { style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.4em', padding: '0.32em 0.56em', background: 'linear-gradient(180deg,#1a1a1a 0%,#121212 100%)', borderBottom: '0.06em solid #f97316', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '0.18em', justifyContent: 'flex-start', whiteSpace: 'nowrap' } }, headText('Feld'), headText(String(v.field))),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '0.2em', justifyContent: 'center', whiteSpace: 'nowrap' } }, centerKids),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '0.16em', justifyContent: 'flex-end', whiteSpace: 'nowrap' } },
        v.finished ? null : h('span', { style: { width: '0.14em', height: '0.14em', borderRadius: '50%', background: '#f97316', animation: 'tnDemoPulse 1.6s ease-out infinite' } }),
        headText(v.timer))
    );

    var row = function (sd) {
      var isA = sd === 'A';
      var d = isA ? v.A : v.B;
      var _srv = !v.finished && d.serving;
      var teamColor = _srv ? '#f97316' : 'rgba(250,250,249,0.30)';
      var teamSoft = _srv ? 'rgba(249,115,22,0.12)' : 'rgba(250,250,249,0.06)';
      var serving = !v.finished && d.serving;
      var isWinner = v.finished && v.winnerSide === sd;
      var rowBg = serving
        ? 'linear-gradient(90deg, color-mix(in srgb, ' + teamColor + ' 28%, transparent) 0%, ' + teamSoft + ' 40%, transparent 80%)'
        : isWinner ? 'linear-gradient(90deg, ' + teamSoft + ' 0%, transparent 70%)' : 'transparent';

      var players = h('div', { style: { display: 'flex', flexDirection: 'column', gap: v.isSingles ? 0 : '0.14em', minWidth: 0 } },
        d.surnames.map(function (nm, i) {
          var isServer = serving && d.serverPlayerIndex === i;
          return h('div', { style: { display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: '0.16em', minWidth: 0 } },
            h('div', { style: { width: v.isSingles ? '1.44em' : '1.08em', height: v.isSingles ? '1.44em' : '1.08em', borderRadius: '0.14em', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'color-mix(in srgb, ' + teamColor + ' 10%, transparent)', border: '1px solid color-mix(in srgb, ' + teamColor + ' 25%, transparent)' } },
              h('span', { style: { fontWeight: 800, letterSpacing: '0.04em', color: TEXT, fontSize: (v.isSingles ? 1.44 : 1.08) * 0.32 + 'em' } }, d.badge)),
            h('span', { style: { fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, fontSize: v.isSingles ? '2.08em' : '1.52em', color: isServer ? '#f97316' : TEXT, textShadow: isServer ? '0 0 0.4em rgba(249,115,22,0.25)' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0 } }, nm));
        }));

      var setsEl = h('div', { style: { display: 'flex', gap: '0.14em', marginLeft: '0.64em' } },
        d.boxes.length === 0 ? null : d.boxes.map(function (b) {
          return h('div', { style: { width: '1.4em', height: '1.4em', borderRadius: '0.16em', display: 'flex', alignItems: 'center', justifyContent: 'center', background: b.won ? '#f97316' : 'transparent', border: b.won ? '1px solid #f97316' : '1.5px solid rgba(255,255,255,0.06)' } },
            h('span', { style: { fontSize: '0.76em', fontWeight: b.won ? 800 : 600, letterSpacing: '-0.04em', color: b.won ? '#fff' : DIM2, fontVariantNumeric: 'tabular-nums' } }, b.value));
        }));

      var scoreEl = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '4.2em' } },
        h('span', { style: { fontSize: '3.4em', fontWeight: 800, lineHeight: 0.82, letterSpacing: '-0.055em', color: isWinner ? teamColor : TEXT, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, String(d.running)));

      return h('div', { style: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0.56em', padding: '0.2em 0.64em', position: 'relative', overflow: 'hidden', background: rowBg, transition: 'background 0.5s' } },
        h('div', { style: { position: 'absolute', top: '0.24em', bottom: '0.24em', left: 0, width: '0.06em', borderRadius: '0 0.04em 0.04em 0', background: teamColor, opacity: serving || isWinner ? 1 : 0.5, boxShadow: serving || isWinner ? '0 0 0.24em color-mix(in srgb, ' + teamColor + ' 35%, transparent)' : 'none' } }),
        players, setsEl, scoreEl);
    };

    return h('div', { style: { width: '100%', height: '100%', fontSize: '5.208cqw', fontFamily: "'Inter Tight',system-ui,sans-serif", color: TEXT, display: 'flex', flexDirection: 'column' } },
      header,
      h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } },
        row('A'),
        h('div', { style: { height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0.56em' } }),
        row('B')));
  };

  /* ===== SCHIEDSRICHTER-TABLET ===== */
  LiveDemo.prototype.buildTablet = function (v) {
    var self = this;
    var CARD = '#171717', BORDER = 'rgba(255,255,255,0.06)', BORDERS = 'rgba(255,255,255,0.12)', TEXT = '#fafaf9', DIM = 'rgba(250,250,249,0.55)', DIM2 = 'rgba(250,250,249,0.35)', DIM3 = 'rgba(250,250,249,0.18)', SURF = 'rgba(255,255,255,0.06)', ORANGE = '#fb923c';
    var canScore = !v.finished;

    var header = h('header', { style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.24em', padding: '0.16em 0.28em', borderBottom: '1px solid ' + BORDER } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.12em' } },
        h('span', { style: { fontSize: '0.34em', fontWeight: 900, letterSpacing: '-0.03em', color: TEXT } }, 'tunap', h('span', { style: { color: ORANGE } }, '.')),
        h('span', { style: { fontSize: '0.13em', color: DIM, whiteSpace: 'nowrap' } }, v.disc + ' · ' + v.cls)),
      h('div', { style: { display: 'flex', justifyContent: 'center' } },
        h('span', { style: { padding: '0.05em 0.11em', borderRadius: '0.06em', background: ORANGE, color: '#1a0d05', fontSize: '0.11em', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, 'Match ' + v.matchNo)),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.1em' } },
        h('span', { style: { fontSize: '0.13em', color: DIM, whiteSpace: 'nowrap' } }, v.round),
        h('span', { style: { fontSize: '0.12em', color: DIM, fontVariantNumeric: 'tabular-nums' } }, v.timer),
        v.finished
          ? h('span', { style: { fontSize: '0.11em', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: DIM } }, 'Ende')
          : h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '0.06em', fontSize: '0.11em', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: ORANGE } },
              h('span', { style: { width: '0.6em', height: '0.6em', borderRadius: '50%', background: '#ef4444', animation: 'tnDemoPulse 1.6s ease-out infinite' } }), 'Live')));

    var teamCard = function (sd) {
      var isA = sd === 'A';
      var d = isA ? v.A : v.B;
      var teamColor = isA ? '#5b8def' : '#ef6b6b';
      var teamSoft = isA ? 'rgba(91,141,239,0.12)' : 'rgba(239,107,107,0.12)';
      var teamLine = isA ? 'rgba(91,141,239,0.31)' : 'rgba(239,107,107,0.31)';
      var serving = !v.finished && d.serving;

      var head = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.1em', minHeight: '0.26em' } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '0.07em', fontSize: '0.11em', fontWeight: 600, color: DIM, letterSpacing: '0.04em' } },
          h('span', { style: { width: '0.7em', height: '0.7em', borderRadius: '50%', background: teamColor } }), 'Team ' + sd),
        serving ? h('span', { style: { padding: '0.03em 0.09em', borderRadius: '0.06em', background: 'rgba(251,146,60,0.13)', border: '1px solid rgba(251,146,60,0.35)', color: ORANGE, fontSize: '0.11em', fontWeight: 600, letterSpacing: '0.04em' } }, 'Aufschlag') : null);

      var players = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.04em', marginTop: '0.18em' } },
        h('span', { style: { padding: '0.01em 0.06em', borderRadius: '0.04em', background: SURF, color: teamColor, fontSize: '0.1em', fontWeight: 700, letterSpacing: '0.03em', marginBottom: '0.04em' } }, d.badge),
        d.fullNames.map(function (nm) { return h('span', { style: { fontWeight: 600, color: TEXT, lineHeight: 1.2, letterSpacing: '-0.015em', fontSize: v.isSingles ? '0.44em' : '0.36em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, nm); }));

      var score = h('div', { style: { width: '100%', textAlign: 'center', fontSize: '1.68em', fontWeight: 800, lineHeight: 0.82, color: TEXT, fontVariantNumeric: 'tabular-nums' } }, String(d.running));
      var hint = canScore ? h('div', { style: { textAlign: 'center', fontSize: '0.13em', color: DIM2, letterSpacing: '0.04em', marginTop: '0.06em' } }, 'Tippen für Punkt') : null;

      var sets = h('div', null,
        h('div', { style: { fontSize: '0.11em', color: DIM2, marginBottom: '0.08em', textAlign: 'left' } }, 'Sätze'),
        h('div', { style: { display: 'flex', gap: '0.06em' } },
          d.cells.map(function (c, i) {
            var won = c.state === 'won', lost = c.state === 'lost', cur = c.state === 'current';
            return h('div', { style: { flex: 1, minHeight: '0.78em', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.08em 0.06em', borderRadius: '0.08em', background: won ? teamSoft : cur ? 'rgba(255,255,255,0.04)' : 'transparent', border: won ? '1px solid ' + teamLine : cur ? '1px solid ' + BORDERS : '1px dashed ' + BORDER } },
              h('span', { style: { fontSize: '0.1em', fontWeight: 600, letterSpacing: '0.03em', textAlign: 'center', color: won ? teamColor : cur ? DIM : DIM3 } }, 'Satz ' + (i + 1)),
              h('span', { style: { fontSize: '0.3em', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textAlign: 'center', letterSpacing: '-0.02em', color: won || cur ? TEXT : lost ? DIM2 : DIM3 } }, c.value == null ? '–' : c.value),
              h('span', { style: { fontSize: '0.1em', fontWeight: 600, letterSpacing: '0.04em', textAlign: 'center', minHeight: '0.12em', color: won ? teamColor : DIM3 } }, won ? 'Gewonnen' : lost ? 'Verloren' : cur ? 'Laufend' : ''));
          })));

      return h('button', { type: 'button', onClick: canScore ? function () { self.recordPoint(isA ? 'Home' : 'Away'); } : undefined, style: { position: 'relative', background: CARD, border: serving ? '1px solid rgba(249,115,22,0.33)' : '1px solid ' + BORDER, boxShadow: serving ? '0 0 0 1px rgba(249,115,22,0.2), 0 0 0.32em rgba(249,115,22,0.1)' : 'none', borderRadius: '0.12em', padding: '0.22em 0.24em', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', cursor: canScore ? 'pointer' : 'default', color: TEXT, transition: 'box-shadow 0.4s, border-color 0.4s' } },
        head, players,
        h('div', { style: { flex: 1, minHeight: '0.16em' } }),
        score, hint,
        h('div', { style: { flex: 1, minHeight: '0.16em' } }),
        sets);
    };

    var center = h('div', { style: { background: CARD, border: '1px solid ' + BORDER, borderRadius: '0.12em', padding: '0.2em 0.22em 0.16em', display: 'flex', flexDirection: 'column', gap: '0.12em', overflow: 'hidden' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.08em' } },
        h('span', { style: { padding: '0.05em 0.11em', borderRadius: '0.06em', background: SURF, color: TEXT, fontSize: '0.12em', fontWeight: 600 } }, 'Satz ' + v.satz),
        h('span', { style: { fontSize: '0.12em', color: DIM } }, v.disc + ' ' + v.cls)),
      h('div', { style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }, dangerouslySetInnerHTML: { __html: v.courtHtml } }),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.14em', paddingTop: '0.1em', borderTop: '1px solid ' + BORDER } },
        h('span', { style: { fontSize: '0.12em', fontWeight: 600, letterSpacing: '0.04em', color: DIM } }, 'Bälle'),
        h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '0.12em' } },
          h('button', { type: 'button', onClick: canScore ? function () { self.setState(function (st) { return { shuttle: Math.max(0, st.shuttle - 1) }; }); } : undefined, style: { border: '1px solid ' + BORDERS, background: SURF, color: TEXT, width: '0.44em', height: '0.44em', borderRadius: '0.1em', fontSize: '0.24em', fontWeight: 600, fontFamily: 'inherit', lineHeight: 1, cursor: canScore ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, '−'),
          h('span', { style: { minWidth: '0.32em', textAlign: 'center', fontSize: '0.22em', fontWeight: 700, color: TEXT, fontVariantNumeric: 'tabular-nums' } }, v.shuttle),
          h('button', { type: 'button', onClick: canScore ? function () { self.setState(function (st) { return { shuttle: st.shuttle + 1 }; }); } : undefined, style: { border: '1px solid ' + BORDERS, background: SURF, color: TEXT, width: '0.44em', height: '0.44em', borderRadius: '0.1em', fontSize: '0.24em', fontWeight: 600, fontFamily: 'inherit', lineHeight: 1, cursor: canScore ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, '+'))));

    var body = h('div', { style: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.55fr 1fr', gap: '0.16em', padding: '0.16em 0.2em', minHeight: 0 } },
      teamCard('A'), center, teamCard('B'));

    var switchBtn = function (label, onClick, disabled) {
      return h('button', { type: 'button', onClick: disabled ? undefined : onClick, style: { border: '1px solid ' + BORDERS, background: 'transparent', color: disabled ? DIM3 : TEXT, padding: '0.08em 0.14em', borderRadius: '0.07em', fontSize: '0.12em', fontWeight: 500, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap' } }, label);
    };

    var footer = h('footer', { style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.18em', padding: '0.13em 0.28em', borderTop: '1px solid ' + BORDER } },
      h('span', { style: { justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '0.07em', fontSize: '0.12em', color: DIM } },
        h('span', { style: { width: '0.6em', height: '0.6em', borderRadius: '50%', background: '#22c55e' } }), 'Verbunden'),
      h('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: '0.06em' } },
        h('span', { style: { fontSize: '0.15em', fontWeight: 700, color: TEXT, letterSpacing: '0.04em', textTransform: 'uppercase' } }, 'Feld'),
        h('span', { style: { fontSize: '0.15em', fontWeight: 700, color: TEXT, fontVariantNumeric: 'tabular-nums' } }, String(v.field))),
      h('div', { style: { justifySelf: 'end', display: 'flex', gap: '0.1em' } },
        switchBtn('↩ Punkt zurück', function () { self.undo(); }, !v.canUndo),
        switchBtn('↺ Neu', function () { self.reset(); })));

    return h('div', { style: { width: '100%', height: '100%', fontSize: '7.8125cqw', fontFamily: "'Inter Tight',system-ui,sans-serif", background: '#0a0a0a', color: TEXT, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      header, body, footer);
  };

  LiveDemo.prototype.render = function () {
    var v = this.getView();
    if (this.monitorMount) { this.monitorMount.textContent = ''; this.monitorMount.appendChild(this.buildMonitor(v)); }
    if (this.tabletMount) { this.tabletMount.textContent = ''; this.tabletMount.appendChild(this.buildTablet(v)); }
  };

  function initDemo() {
    var mon = document.getElementById('tn-monitor');
    var tab = document.getElementById('tn-tablet');
    if (!mon || !tab) return;
    new LiveDemo(mon, tab, document.getElementById('tn-doubles'), document.getElementById('tn-singles'));
  }

  function init() { initLang(); initDemo(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
