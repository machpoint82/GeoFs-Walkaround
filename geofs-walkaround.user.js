// ==UserScript==
// @name         GeoFS Walkaround
// @namespace    https://www.github.com/machpoint82
// @version      1.0.0-beta
// @description  Ground walkaround for geofs.
// @icon         https://raw.githubusercontent.com/machpoint82/GeoFs-Walkaround/main/icon.png
// @downloadURL  https://raw.githubusercontent.com/machpoint82/GeoFs-Walkaround/main/geofs-walkaround.user.js
// @updateURL    https://raw.githubusercontent.com/machpoint82/GeoFs-Walkaround/main/geofs-walkaround.user.js
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const STORAGE_KEY = "geofsWalkaround_v11";
  const CURRENT_VERSION = "1.0.0-beta";
  const VERSION_CHECK_URL = "https://raw.githubusercontent.com/machpoint82/GeoFs-Walkaround/main/geofs-walkaround.user.js";
  const RELEASES_URL = "https://github.com/machpoint82/GeoFs-Walkaround/releases/latest";

  const DEFAULTS = {
    walkSpeedMps: 3.2,
    runMultiplier: 2.8,
    verticalSpeedMps: 2.4,
    eyeHeightM: 1.75,
    maxExtraHeightM: 12,
    turnSens: 0.0024,
    pitchLimitDeg: 80,
    groundProbeMs: 90,
    uiTopPct: 72,
    hotkeyPanel: "l",
    hotkeyToggle: "x",
    hotkeyPointerLock: "!",
    hotkeyChecklist: "",
    soundUrl: "https://od.lk/s/MzlfMTAzMzYzNzAxX0c0THM5/GroundwalkaroundDallasone.mp3",
    soundEnabled: true,
    soundVolume: 0.5
  };

  const CHECKLIST = [
    "Chocks / parking brake set",
    "Nose gear tire & oleo",
    "Nose gear doors / linkages",
    "Pitot probe(s) clear / covers removed",
    "Static ports clear",
    "AoA / TAT probes clear",
    "Radome / nose skin condition",
    "Left forward fuselage / windows",
    "Left main gear tires & brakes",
    "Left main gear doors / actuators",
    "Left wing leading edge / LE devices",
    "Left engines intake(s) clear of FOD",
    "Left engines fan / spinner condition",
    "Left engines exhaust / reverser area",
    "Left wing trailing edge / flaps / aileron",
    "Left wingtip / nav light / static wick",
    "Left rear fuselage / belly fairing",
    "Tail cone / APU inlet-exhaust (if fitted)",
    "Vertical stabilizer / rudder free",
    "Horizontal stabilizer / elevators free",
    "Right rear fuselage",
    "Right wingtip / nav light / static wick",
    "Right wing trailing edge / flaps / aileron",
    "Right engines exhaust / reverser area",
    "Right engines fan / spinner condition",
    "Right engines intake(s) clear of FOD",
    "Right wing leading edge / LE devices",
    "Right main gear tires & brakes",
    "Right main gear doors / actuators",
    "Right forward fuselage",
    "Cargo doors secure (if visible)",
    "No fuel / hydraulic / oil leaks",
    "Overall skin, rivets, panels OK"
  ];

  const PART_TEMPLATES = [
    { id: "nose", name: "Nose / radome", local: [0, 1.05, 0.12] },
    { id: "pitot", name: "Pitot / probes", local: [0.08, 0.95, 0.08] },
    { id: "noseGear", name: "Nose gear", local: [0, 0.55, -0.02] },
    { id: "fuselageL", name: "Left forward fuselage", local: [-0.22, 0.35, 0.08] },
    { id: "fuselageR", name: "Right forward fuselage", local: [0.22, 0.35, 0.08] },
    { id: "leftWingRoot", name: "Left wing root", local: [-0.35, 0.05, 0.05] },
    { id: "rightWingRoot", name: "Right wing root", local: [0.35, 0.05, 0.05] },
    { id: "leftWing", name: "Left wing mid", local: [-0.75, 0.0, 0.05] },
    { id: "rightWing", name: "Right wing mid", local: [0.75, 0.0, 0.05] },
    { id: "leftWingTip", name: "Left wingtip", local: [-1.15, -0.05, 0.08] },
    { id: "rightWingTip", name: "Right wingtip", local: [1.15, -0.05, 0.08] },
    { id: "leftEngineInboard", name: "Left inboard engine", local: [-0.45, 0.12, -0.02] },
    { id: "leftEngineOutboard", name: "Left outboard engine", local: [-0.75, 0.05, -0.02] },
    { id: "rightEngineInboard", name: "Right inboard engine", local: [0.45, 0.12, -0.02] },
    { id: "rightEngineOutboard", name: "Right outboard engine", local: [0.75, 0.05, -0.02] },
    { id: "leftMainGear", name: "Left main gear", local: [-0.28, -0.15, -0.05] },
    { id: "rightMainGear", name: "Right main gear", local: [0.28, -0.15, -0.05] },
    { id: "belly", name: "Belly / center gear area", local: [0, -0.05, -0.08] },
    { id: "tail", name: "Tail cone", local: [0, -1.05, 0.1] },
    { id: "vstab", name: "Vertical stabilizer", local: [0, -1.0, 0.45] },
    { id: "hstab", name: "Horizontal stabilizer", local: [0, -1.05, 0.28] },
    { id: "leftElev", name: "Left elevator", local: [-0.25, -1.08, 0.28] },
    { id: "rightElev", name: "Right elevator", local: [0.25, -1.08, 0.28] },
    { id: "rudder", name: "Rudder", local: [0, -1.12, 0.55] }
  ];

  function gmAvailable() {
    return typeof GM_getValue === "function" && typeof GM_setValue === "function";
  }

  function loadSettings() {
    try {
      let raw = null;
      if (gmAvailable()) {
        raw = GM_getValue(STORAGE_KEY, null);
      } else {
        raw = localStorage.getItem(STORAGE_KEY);
      }
      if (!raw) return { ...DEFAULTS };
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return { ...DEFAULTS, ...parsed };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    try {
      const json = JSON.stringify(settings);
      if (gmAvailable()) {
        GM_setValue(STORAGE_KEY, json);
      } else {
        localStorage.setItem(STORAGE_KEY, json);
      }
    } catch (_) {}
  }

  function clearSettingsStorage() {
    try {
      if (gmAvailable() && typeof GM_deleteValue === "function") {
        GM_deleteValue(STORAGE_KEY);
      }
    } catch (_) {}
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  let settings = loadSettings();
  let remoteVersion = null;
  let updateCheckDone = false;

  const state = {
    active: false,
    panelOpen: false,
    lastCamMode: 0,
    keys: Object.create(null),
    headingRad: 0,
    pitchRad: 0,
    pos: null,
    savedPos: null,
    savedHeading: null,
    savedPitch: null,
    groundAlt: 0,
    extraHeight: 0,
    lastProbeAt: 0,
    lastFlightId: null,
    checked: new Set(),
    lastLabel: null,
    raf: 0,
    sizeFactor: 35,
    capturingFor: null
  };

  function ready() {
    return !!(
      page.geofs &&
      page.geofs.aircraft &&
      page.geofs.aircraft.instance &&
      Array.isArray(page.geofs.aircraft.instance.llaLocation) &&
      page.geofs.camera &&
      page.geofs.api &&
      page.Cesium
    );
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitReady() {
    while (!ready()) await sleep(300);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function aircraft() {
    return page.geofs.aircraft.instance;
  }

  function aircraftLLA() {
    const lla = aircraft().llaLocation;
    return { lat: +lla[0], lon: +lla[1], alt: +lla[2] };
  }

  function aircraftHtr() {
    const htr = aircraft().htr || [0, 0, 0];
    return { h: +htr[0] || 0, t: +htr[1] || 0, r: +htr[2] || 0 };
  }

  function enginesOff() {
    const ac = aircraft();
    if (ac.engine && typeof ac.engine.on === "boolean") return !ac.engine.on;
    if (Array.isArray(ac.engines) && ac.engines.length) {
      return ac.engines.every(e => !e || e.on === false || e.rpm <= 5);
    }
    try {
      const rpm = page.geofs.animation?.values?.rpm ?? page.geofs.animation?.values?.engineRpm;
      if (Number.isFinite(rpm)) return rpm < 5;
    } catch (_) {}
    return true;
  }

  function computeSafetyConditions() {
    const ac = aircraft();
    if (!ac) return null;
    return {
      onGround: ac.groundContact === true,
      brakesOn: ac.brakesOn === true,
      lowSpeed: (Number(ac.groundSpeed) || 0) < 0.5,
      enginesOff: enginesOff()
    };
  }

  function entryConditions() {
    const cond = computeSafetyConditions();
    const ok = !!cond && Object.values(cond).every(Boolean);
    return { ok, cond };
  }

  function estimateSizeFactor() {
    const ac = aircraft();
    let span = null;
    try {
      const def = ac.definition || {};
      span = def.wingspan || def.wingSpan || def.span || null;
      if (!span && def.scale) span = 25 * def.scale;
    } catch (_) {}

    const id = String(ac.id || "");
    if (!span) {
      if (/a380|380/i.test(id) || /A380/i.test(ac.name || "")) span = 80;
      else if (/747|a350|b777|787|a330|a340/i.test(id)) span = 60;
      else if (/737|a320|a321|a319|md80|e175|e190/i.test(id)) span = 35;
      else if (/c172|cessna|cub|dr400|extra/i.test(id)) span = 12;
      else span = 30;
    }
    return clamp(span * 0.55, 10, 55);
  }

  function enuToLlaDelta(lat, eastM, northM) {
    const dLat = northM / 111320;
    const dLon = eastM / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    return { dLat, dLon };
  }

  function llaDistanceM(a, b) {
    const latScale = 111320;
    const lonScale = 111320 * Math.max(0.2, Math.cos((a.lat * Math.PI) / 180));
    const x = (b.lon - a.lon) * lonScale;
    const y = (b.lat - a.lat) * latScale;
    const z = (b.alt || 0) - (a.alt || 0);
    return Math.hypot(x, y, z);
  }

  function bodyLocalToLLA(localUnit) {
    const ac = aircraftLLA();
    const h = (aircraftHtr().h * Math.PI) / 180;
    const cos = Math.cos(h);
    const sin = Math.sin(h);
    const x = localUnit[0] * state.sizeFactor;
    const y = localUnit[1] * state.sizeFactor;
    const z = localUnit[2] * state.sizeFactor;
    const east = x * cos + y * sin;
    const north = -x * sin + y * cos;
    const d = enuToLlaDelta(ac.lat, east, north);
    return {
      lat: ac.lat + d.dLat,
      lon: ac.lon + d.dLon,
      alt: ac.alt + z
    };
  }

  function sampleGroundAlt(lat, lon, fallback) {
    try {
      const globe = page.geofs.api?.viewer?.scene?.globe;
      if (globe && page.Cesium?.Cartographic) {
        const c = page.Cesium.Cartographic.fromDegrees(lon, lat);
        const h = globe.getHeight(c);
        if (Number.isFinite(h)) return h;
      }
    } catch (_) {}
    if (Number.isFinite(page.geofs.camera?.groundAltitude)) return page.geofs.camera.groundAltitude;
    return Number.isFinite(fallback) ? fallback : state.groundAlt || 0;
  }

  function applyCamera() {
    const cam = page.geofs.camera.cam;
    if (!cam || !state.pos) return;
    try {
      cam.setView({
        destination: page.Cesium.Cartesian3.fromDegrees(state.pos.lon, state.pos.lat, state.pos.alt),
        orientation: {
          heading: state.headingRad,
          pitch: state.pitchRad,
          roll: 0
        }
      });
    } catch (_) {
      try {
        page.geofs.api.setCameraPositionAndOrientation(
          cam,
          [state.pos.lat, state.pos.lon, state.pos.alt],
          [(((state.headingRad * 180) / Math.PI) + 360) % 360, (state.pitchRad * 180) / Math.PI, 0]
        );
      } catch (e) {
        console.warn("[Walkaround] camera set failed", e);
      }
    }
  }

  function setStatus(text, mode) {
    const el = document.getElementById("wa-status");
    if (!el) return;
    el.textContent = text;
    el.dataset.mode = mode || "";
  }

  function setHotkeyStatus(text) {
    const el = document.getElementById("wa-hk-status");
    if (!el) return;
    el.textContent = text || "";
  }

  function resetChecklist() {
    state.checked = new Set();
    document.querySelectorAll("#wa-checklist input[type=checkbox]").forEach(cb => {
      cb.checked = false;
    });
  }

  function checkNextChecklistItem() {
    if (!state.active) return;
    for (let i = 0; i < CHECKLIST.length; i++) {
      if (!state.checked.has(i)) {
        state.checked.add(i);
        const cb = document.querySelector('#wa-checklist input[data-idx="' + i + '"]');
        if (cb) cb.checked = true;
        break;
      }
    }
  }

  function flightSignature() {
    const ac = aircraftLLA();
    return `${ac.lat.toFixed(3)}_${ac.lon.toFixed(3)}_${aircraft().id || 0}`;
  }

  function maybeResetChecklistOnNewFlight() {
    const sig = flightSignature();
    if (state.lastFlightId == null) {
      state.lastFlightId = sig;
      return;
    }
    if (sig !== state.lastFlightId) {
      state.lastFlightId = sig;
      state.savedPos = null;
      resetChecklist();
      openPanel(true);
    }
  }

  let ambientAudio = null;
  let ambientFadeInterval = null;

  function getAmbientAudio() {
    if (!ambientAudio) {
      ambientAudio = document.createElement("audio");
      ambientAudio.id = "wa-ambient";
      ambientAudio.loop = true;
      ambientAudio.preload = "auto";
      document.body.appendChild(ambientAudio);
    }
    return ambientAudio;
  }

  function playAmbient() {
    if (!settings.soundEnabled || !settings.soundUrl) return;
    const audio = getAmbientAudio();
    if (audio.src !== settings.soundUrl) audio.src = settings.soundUrl;
    audio.volume = 0;
    audio.currentTime = 0;
    audio.play().catch(err => console.warn("[Walkaround] sound play blocked", err));
    fadeAudioTo(audio, clamp(settings.soundVolume, 0, 1), 500);
  }

  function stopAmbient() {
    if (!ambientAudio) return;
    fadeAudioTo(ambientAudio, 0, 350, () => {
      ambientAudio.pause();
    });
  }

  function fadeAudioTo(audio, target, durationMs, onDone) {
    if (ambientFadeInterval) clearInterval(ambientFadeInterval);
    const steps = 20;
    const stepMs = durationMs / steps;
    const start = audio.volume;
    const delta = (target - start) / steps;
    let i = 0;
    ambientFadeInterval = setInterval(() => {
      i++;
      audio.volume = clamp(start + delta * i, 0, 1);
      if (i >= steps) {
        clearInterval(ambientFadeInterval);
        ambientFadeInterval = null;
        if (onDone) onDone();
      }
    }, stepMs);
  }

  function applyLiveVolume() {
    if (ambientAudio && state.active) ambientAudio.volume = clamp(settings.soundVolume, 0, 1);
  }

  function getFadeOverlay() {
    let el = document.getElementById("wa-fade");
    if (!el) {
      el = document.createElement("div");
      el.id = "wa-fade";
      document.body.appendChild(el);
    }
    return el;
  }

  function fadeToBlack(durationMs) {
    return new Promise(resolve => {
      const el = getFadeOverlay();
      el.style.transition = `opacity ${durationMs}ms ease`;
      el.style.pointerEvents = "auto";
      requestAnimationFrame(() => {
        el.style.opacity = "1";
      });
      setTimeout(resolve, durationMs);
    });
  }

  function fadeFromBlack(durationMs) {
    return new Promise(resolve => {
      const el = getFadeOverlay();
      el.style.transition = `opacity ${durationMs}ms ease`;
      requestAnimationFrame(() => {
        el.style.opacity = "0";
      });
      setTimeout(() => {
        el.style.pointerEvents = "none";
        resolve();
      }, durationMs);
    });
  }

  const PASS_THROUGH_CODES = new Set(["Escape", "F5", "F11", "F12"]);

  function keysEqual(a, b) {
    if (!a || !b) return false;
    if (a.length === 1 && b.length === 1) return a.toLowerCase() === b.toLowerCase();
    return a === b;
  }

  function formatKeyLabel(key) {
    if (!key) return "Not set";
    if (key === " ") return "Space";
    if (key.length === 1) return /[a-z]/i.test(key) ? key.toUpperCase() : key;
    return key;
  }

  function isEditableTarget(t) {
    if (!t) return false;
    const tag = t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (t.isContentEditable) return true;
    return false;
  }

  function onKeyDown(e) {
    if (state.capturingFor) return;
    if (!state.panelOpen && isEditableTarget(e.target)) return;

    if (keysEqual(e.key, settings.hotkeyPanel) && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      openPanel();
      return;
    }
    if (keysEqual(e.key, settings.hotkeyToggle) && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      toggleWalkaround();
      return;
    }
    if (keysEqual(e.key, settings.hotkeyPointerLock) && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      togglePointerLock();
      return;
    }
    if (settings.hotkeyChecklist && keysEqual(e.key, settings.hotkeyChecklist) && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      checkNextChecklistItem();
      return;
    }
    if (state.active) {
      state.keys[e.code] = true;
      if (PASS_THROUGH_CODES.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  function onKeyUp(e) {
    if (state.active) {
      state.keys[e.code] = false;
      if (PASS_THROUGH_CODES.has(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  function zeroFlightControlsOnce() {
    try {
      if (page.controls) {
        ["pitch", "roll", "yaw", "throttle", "rudder"].forEach(k => {
          if (k in page.controls) page.controls[k] = 0;
        });
      }
    } catch (_) {}
  }

  function spawnPosition() {
    if (state.savedPos) {
      return {
        pos: { ...state.savedPos },
        heading: state.savedHeading ?? 0,
        pitch: state.savedPitch ?? -0.1
      };
    }
    const ac = aircraftLLA();
    const side = bodyLocalToLLA([0.55, 0.35, 0]);
    const ground = sampleGroundAlt(side.lat, side.lon, ac.alt);
    const toAcEast =
      (ac.lon - side.lon) * (111320 * Math.max(0.2, Math.cos((side.lat * Math.PI) / 180)));
    const toAcNorth = (ac.lat - side.lat) * 111320;
    return {
      pos: { lat: side.lat, lon: side.lon, alt: ground + settings.eyeHeightM },
      heading: Math.atan2(toAcEast, toAcNorth),
      pitch: -0.1
    };
  }

  async function enterWalkaround() {
    if (state.active) return;
    const { ok } = entryConditions();
    if (!ok) {
      setStatus("Not ready — check the requirements above.", "error");
      openPanel(true);
      return;
    }

    await fadeToBlack(450);

    state.sizeFactor = estimateSizeFactor();
    state.lastCamMode = page.geofs.camera.currentMode;
    page.geofs.camera.set(4);

    const spawn = spawnPosition();
    state.pos = spawn.pos;
    state.headingRad = spawn.heading;
    state.pitchRad = spawn.pitch;
    state.extraHeight = Math.max(0, (state.pos.alt - sampleGroundAlt(state.pos.lat, state.pos.lon, state.pos.alt)) - settings.eyeHeightM);
    state.groundAlt = sampleGroundAlt(state.pos.lat, state.pos.lon, state.pos.alt);
    state.pos.alt = state.groundAlt + settings.eyeHeightM + state.extraHeight;

    state.active = true;
    zeroFlightControlsOnce();
    showChecklist(true);
    openPanel(true);
    document.getElementById("wa-toggle-btn").textContent = "Exit walkaround";
    refreshLockedControls();

    applyCamera();
    requestPointerLock();
    playAmbient();
    setStatus("Walkaround active · WASD move · mouse look · Space/Ctrl height · Shift run", "ok");

    await fadeFromBlack(450);
  }

  async function exitWalkaround() {
    if (!state.active) return;
    if (state.pos) {
      state.savedPos = { ...state.pos };
      state.savedHeading = state.headingRad;
      state.savedPitch = state.pitchRad;
    }

    await fadeToBlack(300);

    state.active = false;
    document.exitPointerLock?.();
    showChecklist(false);
    document.getElementById("wa-toggle-btn").textContent = "Start walkaround";
    document.getElementById("wa-look-label")?.classList.remove("show");
    stopAmbient();
    refreshLockedControls();

    try {
      page.geofs.camera.set(state.lastCamMode);
    } catch (_) {
      page.geofs.camera.set(1);
    }
    setStatus("Walkaround off", "idle");

    await fadeFromBlack(300);
  }

  function toggleWalkaround() {
    state.active ? exitWalkaround() : enterWalkaround();
  }

  function requestPointerLock() {
    try {
      document.body.requestPointerLock?.();
    } catch (_) {}
  }

  function togglePointerLock() {
    if (!state.active) {
      setStatus("Cursor toggle only works while walkaround is active", "error");
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock?.();
    else requestPointerLock();
  }

  function updateMovement(dt) {
    if (!state.active || !state.pos) return;

    const run = !!(state.keys.ShiftLeft || state.keys.ShiftRight);
    const speed = settings.walkSpeedMps * (run ? settings.runMultiplier : 1) * dt;

    let forward = 0;
    let right = 0;
    let up = 0;
    if (state.keys.KeyW) forward += 1;
    if (state.keys.KeyS) forward -= 1;
    if (state.keys.KeyD) right += 1;
    if (state.keys.KeyA) right -= 1;
    if (state.keys.Space) up += 1;
    if (state.keys.ControlLeft || state.keys.ControlRight) up -= 1;
    if (state.keys.ArrowUp) up += 1;
    if (state.keys.ArrowDown) up -= 1;

    if (forward || right) {
      const len = Math.hypot(forward, right) || 1;
      forward /= len;
      right /= len;
      const h = state.headingRad;
      const east = Math.sin(h) * forward * speed + Math.cos(h) * right * speed;
      const north = Math.cos(h) * forward * speed - Math.sin(h) * right * speed;
      const d = enuToLlaDelta(state.pos.lat, east, north);
      state.pos.lat += d.dLat;
      state.pos.lon += d.dLon;
    }

    if (up) {
      state.extraHeight = clamp(
        state.extraHeight + up * settings.verticalSpeedMps * dt,
        0,
        settings.maxExtraHeightM
      );
    }

    const now = performance.now();
    if (now - state.lastProbeAt > settings.groundProbeMs) {
      state.lastProbeAt = now;
      state.groundAlt = sampleGroundAlt(state.pos.lat, state.pos.lon, state.groundAlt);
    }
    state.pos.alt = state.groundAlt + settings.eyeHeightM + state.extraHeight;

    applyCamera();
    updateLookLabel();
  }

  function updateLookLabel() {
    const labelEl = document.getElementById("wa-look-label");
    if (!labelEl) return;

    const h = state.headingRad;
    const p = state.pitchRad;
    const fwdEast = Math.sin(h) * Math.cos(p);
    const fwdNorth = Math.cos(h) * Math.cos(p);
    const fwdUp = Math.sin(p);

    let best = null;
    for (const part of PART_TEMPLATES) {
      const world = bodyLocalToLLA(part.local);
      world.alt = state.groundAlt + clamp(world.alt - state.groundAlt, 0.2, 8);
      const dist = llaDistanceM(state.pos, world);
      if (dist > state.sizeFactor * 1.35) continue;

      const east =
        (world.lon - state.pos.lon) *
        (111320 * Math.max(0.2, Math.cos((state.pos.lat * Math.PI) / 180)));
      const north = (world.lat - state.pos.lat) * 111320;
      const up = world.alt - state.pos.alt;
      const inv = 1 / Math.max(0.001, Math.hypot(east, north, up));
      const dot = east * inv * fwdEast + north * inv * fwdNorth + up * inv * fwdUp;
      if (dot < 0.62) continue;

      const score = dot * (1 / (1 + dist * 0.05));
      if (!best || score > best.score) best = { part, dist, score };
    }

    if (best) {
      labelEl.textContent = `${best.part.name} · ${Math.round(best.dist)} m`;
      labelEl.classList.add("show");
      state.lastLabel = best.part.id;
    } else {
      labelEl.classList.remove("show");
      state.lastLabel = null;
    }
  }

  function showChecklist(show) {
    const box = document.getElementById("wa-checklist-wrap");
    if (box) box.style.display = show ? "block" : "none";
  }

  function openPanel(forceOpen) {
    const root = document.getElementById("geofs-walkaround-ui");
    if (!root) return;
    if (typeof forceOpen === "boolean") state.panelOpen = forceOpen;
    else state.panelOpen = !state.panelOpen;
    root.classList.toggle("open", state.panelOpen);
  }

  const SAFETY_ROWS = [
    { key: "onGround", label: "On the ground" },
    { key: "brakesOn", label: "Parking brake set" },
    { key: "lowSpeed", label: "Stopped (below 0.5 kt)" },
    { key: "enginesOff", label: "Engines off" }
  ];

  function updateSafetyUI() {
    const cond = computeSafetyConditions();
    if (!cond) return;
    let allOk = true;
    SAFETY_ROWS.forEach(row => {
      const el = document.getElementById("wa-check-" + row.key);
      if (!el) return;
      const ok = !!cond[row.key];
      allOk = allOk && ok;
      el.classList.toggle("ok", ok);
      el.classList.toggle("bad", !ok);
      const icon = el.querySelector(".wa-check-icon");
      if (icon) icon.textContent = ok ? "✓" : "✕";
    });
    const btn = document.getElementById("wa-toggle-btn");
    if (btn && !state.active) btn.disabled = !allOk;
  }

  function otherHotkeys(which) {
    const map = {
      panel: settings.hotkeyPanel,
      toggle: settings.hotkeyToggle,
      lock: settings.hotkeyPointerLock,
      checklist: settings.hotkeyChecklist
    };
    delete map[which];
    return Object.values(map).filter(Boolean);
  }

  function renderHotkeyBoxes() {
    const panelBox = document.getElementById("wa-hk-panel-box");
    const toggleBox = document.getElementById("wa-hk-toggle-box");
    const lockBox = document.getElementById("wa-hk-lock-box");
    const checklistBox = document.getElementById("wa-hk-checklist-box");
    if (panelBox) panelBox.textContent = formatKeyLabel(settings.hotkeyPanel);
    if (toggleBox) toggleBox.textContent = formatKeyLabel(settings.hotkeyToggle);
    if (lockBox) lockBox.textContent = formatKeyLabel(settings.hotkeyPointerLock);
    if (checklistBox) checklistBox.textContent = formatKeyLabel(settings.hotkeyChecklist);

    const panelDisplay = document.getElementById("wa-hk-panel-display");
    const toggleDisplay = document.getElementById("wa-hk-toggle-display");
    const lockDisplay = document.getElementById("wa-hk-lock-display");
    if (panelDisplay) panelDisplay.textContent = formatKeyLabel(settings.hotkeyPanel);
    if (toggleDisplay) toggleDisplay.textContent = formatKeyLabel(settings.hotkeyToggle);
    if (lockDisplay) lockDisplay.textContent = formatKeyLabel(settings.hotkeyPointerLock);

    refreshLockedControls();
  }

  function refreshLockedControls() {
    ["wa-hk-panel-box", "wa-hk-toggle-box", "wa-hk-lock-box", "wa-hk-checklist-box", "wa-reset-settings"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = state.active;
      el.classList.toggle("disabled", state.active);
    });
  }

  function startHotkeyCapture(which, boxEl) {
    if (state.active || state.capturingFor) return;
    state.capturingFor = which;
    boxEl.classList.add("listening");
    boxEl.textContent = "Press a key… (Esc cancels)";
    setHotkeyStatus("");

    const handler = e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.removeEventListener("keydown", handler, true);
      state.capturingFor = null;
      boxEl.classList.remove("listening");

      if (e.key === "Escape") {
        renderHotkeyBoxes();
        return;
      }
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
        setHotkeyStatus("Modifier keys alone can't be used — hold it and press another key.");
        renderHotkeyBoxes();
        return;
      }

      const others = otherHotkeys(which);
      if (others.some(k => keysEqual(e.key, k))) {
        setHotkeyStatus("Choose a key that isn't already in use.");
        renderHotkeyBoxes();
        return;
      }

      if (which === "panel") settings.hotkeyPanel = e.key;
      else if (which === "toggle") settings.hotkeyToggle = e.key;
      else if (which === "lock") settings.hotkeyPointerLock = e.key;
      else settings.hotkeyChecklist = e.key;
      saveSettings();
      setHotkeyStatus("Saved.");
      renderHotkeyBoxes();
    };
    window.addEventListener("keydown", handler, true);
  }

  function resetSettingsToDefaults() {
    if (state.active) return;
    const confirmed = window.confirm("Reset all Walkaround settings and hotkeys to defaults?");
    if (!confirmed) return;

    clearSettingsStorage();
    settings = { ...DEFAULTS };
    saveSettings();

    const root = document.getElementById("geofs-walkaround-ui");
    if (root) {
      root.style.left = "14px";
      root.style.top = settings.uiTopPct + "%";
      root.style.transform = "translateY(-50%)";
    }

    const walkSpeedEl = document.getElementById("wa-walk-speed");
    if (walkSpeedEl) walkSpeedEl.value = settings.walkSpeedMps;
    const runMultEl = document.getElementById("wa-run-mult");
    if (runMultEl) runMultEl.value = settings.runMultiplier;
    const vertSpeedEl = document.getElementById("wa-vert-speed");
    if (vertSpeedEl) vertSpeedEl.value = settings.verticalSpeedMps;
    const maxHEl = document.getElementById("wa-max-h");
    if (maxHEl) maxHEl.value = settings.maxExtraHeightM;
    const soundEnabledEl = document.getElementById("wa-sound-enabled");
    if (soundEnabledEl) soundEnabledEl.checked = !!settings.soundEnabled;
    const soundVolEl = document.getElementById("wa-sound-vol");
    if (soundVolEl) soundVolEl.value = Math.round(settings.soundVolume * 100);

    renderHotkeyBoxes();
    resetChecklist();
    setHotkeyStatus("");
    setStatus("Settings reset to defaults", "ok");
  }

  function checkForUpdate() {
    if (updateCheckDone || !VERSION_CHECK_URL) return;
    fetch(VERSION_CHECK_URL)
      .then(r => r.text())
      .then(text => {
        const m = text.match(/@version\s+([\d.]+[\w-]*)/);
        if (m) remoteVersion = m[1];
        updateCheckDone = true;
        renderUpdateBanner();
      })
      .catch(() => {
        updateCheckDone = true;
      });
  }

  function renderUpdateBanner() {
    const el = document.getElementById("wa-update-banner");
    if (!el) return;
    if (remoteVersion && remoteVersion !== CURRENT_VERSION) {
      el.style.display = "block";
      el.innerHTML = "";
      const link = document.createElement("a");
      link.href = RELEASES_URL;
      link.target = "_blank";
      link.textContent = "Update available: v" + remoteVersion;
      el.appendChild(link);
    } else {
      el.style.display = "none";
    }
  }

  function makeDraggable(root, handle) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    if (Number.isFinite(settings.panelLeftPx) && Number.isFinite(settings.panelTopPx)) {
      root.style.left = settings.panelLeftPx + "px";
      root.style.top = settings.panelTopPx + "px";
      root.style.transform = "none";
    }

    handle.addEventListener("mousedown", e => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = root.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      root.style.transform = "none";
      root.style.left = rect.left + "px";
      root.style.top = rect.top + "px";
      e.preventDefault();
    });

    window.addEventListener("mousemove", e => {
      if (!dragging) return;
      const maxLeft = Math.max(0, window.innerWidth - root.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - root.offsetHeight);
      root.style.left = clamp(e.clientX - offsetX, 0, maxLeft) + "px";
      root.style.top = clamp(e.clientY - offsetY, 0, maxTop) + "px";
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      settings.panelLeftPx = parseInt(root.style.left, 10);
      settings.panelTopPx = parseInt(root.style.top, 10);
      saveSettings();
    });
  }

  function addUI() {
    if (document.getElementById("geofs-walkaround-ui")) return;

    const style = document.createElement("style");
    style.id = "geofs-walkaround-style";
    style.textContent = `
      #wa-fade {
        position: fixed; inset: 0; background: #000; opacity: 0;
        pointer-events: none; z-index: 2147483647;
      }
      #geofs-walkaround-ui {
        position: fixed; left: 14px; top: ${settings.uiTopPct}%;
        transform: translateY(-50%); width: 300px; max-height: 74vh; overflow: auto;
        display: none; z-index: 2147483400;
        font-family: Arial, Helvetica, sans-serif; color: #eef0f1; user-select: none;
        border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
        background: rgba(18,20,22,.96); box-shadow: 0 8px 22px rgba(0,0,0,.42); padding: 11px;
      }
      #geofs-walkaround-ui.open { display: block; }
      .wa-title { font: 700 12px Arial; letter-spacing: .4px; margin-bottom: 6px; cursor: move; }
      .wa-help { font: 400 11px/1.35 Arial; color: #aeb4b8; margin-bottom: 8px; }
      .wa-section { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.08); }
      .wa-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:6px 0; }
      .wa-row label { font: 600 10px Arial; color:#c5cacf; }
      .wa-row input[type=number] {
        width: 88px; height: 26px; border-radius: 4px; border: 1px solid rgba(255,255,255,.14);
        background:#202326; color:#f0f1f2; padding:0 6px; font: 600 11px Arial;
      }
      .wa-row input[type=range] { width: 120px; }
      #wa-checklist label { display:block; margin:4px 0; font:400 11px/1.3 Arial; color:#d7dbde; }
      #wa-checklist input { margin-right:6px; }
      #wa-actions { display:flex; gap:6px; margin-top:10px; }
      #wa-actions button, .wa-btn {
        flex:1; height:28px; border:1px solid rgba(255,255,255,.12); border-radius:4px;
        background:#34383c; color:#e8e9ea; cursor:pointer; font:600 10px Arial;
      }
      #wa-actions button:hover, .wa-btn:hover { background:#42474c; }
      #wa-actions button:disabled, .wa-btn:disabled { opacity:.4; cursor:not-allowed; }
      #wa-status { margin-top:8px; color:#9aa1a6; font:400 10px/1.35 Arial; }
      #wa-status[data-mode=error] { color:#d8a6a6; }
      #wa-status[data-mode=ok] { color:#b7d7c4; }
      #wa-look-label {
        position:fixed; left:50%; bottom:86px; transform:translateX(-50%);
        z-index:2147483500; padding:7px 12px; border-radius:6px;
        background:rgba(12,14,16,.86); border:1px solid rgba(143,208,255,.35);
        color:#dcefff; font:700 12px Arial; opacity:0; pointer-events:none; transition:opacity .12s ease;
      }
      #wa-look-label.show { opacity:1; }
      .wa-note { font:400 10px/1.35 Arial; color:#8f969c; margin-top:6px; }
      .wa-update-banner { margin-bottom:8px; display:none; }
      .wa-update-banner a {
        display:block; width:100%; text-decoration:none; text-align:center;
        background:#b23b3b; color:#fff; padding:6px; border-radius:4px; font:700 11px Arial;
      }
      .wa-hotkeys-top { background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
        border-radius:6px; padding:8px; margin-bottom:8px; }
      .wa-hk-line { display:flex; justify-content:space-between; font:400 11px Arial; color:#d7dbde; margin:2px 0; }
      .wa-hk-line b { color:#c5cacf; font-weight:600; }
      .wa-hk-line span.val { color:#8fd0ff; font-weight:700; }
      .wa-check-row { display:flex; align-items:center; gap:8px; margin:5px 0; font:400 11px Arial; color:#c7cbcf; }
      .wa-check-icon {
        width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        font:700 10px Arial; flex:0 0 auto; border:1px solid rgba(255,255,255,.18);
      }
      .wa-check-row.ok .wa-check-icon { background: rgba(80,200,120,.18); color:#5fd68a; border-color: rgba(95,214,138,.6); }
      .wa-check-row.bad .wa-check-icon { background: rgba(220,90,90,.18); color:#e28080; border-color: rgba(226,128,128,.6); }
      .wa-hk-box {
        min-width:70px; text-align:center; padding:4px 8px; border-radius:4px;
        border:1px solid rgba(255,255,255,.16); background:#22262a; cursor:pointer;
        font:700 11px Arial; color:#dfe3e6;
      }
      .wa-hk-box:hover { background:#2b3034; }
      .wa-hk-box.listening { border-color:#8fd0ff; color:#8fd0ff; }
      .wa-hk-box.disabled { opacity:.4; cursor:not-allowed; }
      #wa-hk-status { font:400 10px/1.3 Arial; color:#9aa1a6; min-height:12px; margin-top:4px; }
      #wa-settings-body { margin-top:4px; }
      #wa-reset-settings { border-color: rgba(226,128,128,.5); color:#e8a6a6; }
      #wa-reset-settings:hover { background:#3a2c2c; }
    `;
    document.head.appendChild(style);

    getFadeOverlay();

    const root = document.createElement("div");
    root.id = "geofs-walkaround-ui";
    root.innerHTML = `
      <div class="wa-title" id="wa-drag-handle">Walkaround 1.0 beta</div>
      <div class="wa-help">Ground inspection camera near your aircraft. In development.</div>

      <div id="wa-update-banner" class="wa-update-banner"></div>

      <div class="wa-hotkeys-top">
        <div class="wa-hk-line"><b>Show/hide panel</b><span class="val" id="wa-hk-panel-display"></span></div>
        <div class="wa-hk-line"><b>Toggle walkaround</b><span class="val" id="wa-hk-toggle-display"></span></div>
        <div class="wa-hk-line"><b>Toggle cursor</b><span class="val" id="wa-hk-lock-display"></span></div>
        <div class="wa-note" style="margin-top:2px">Esc also exits cursor mode.</div>
      </div>

      <div id="wa-safety">
        <div class="wa-title">Before you start</div>
        <div class="wa-check-row" id="wa-check-onGround"><span class="wa-check-icon"></span><span>On the ground</span></div>
        <div class="wa-check-row" id="wa-check-brakesOn"><span class="wa-check-icon"></span><span>Parking brake set</span></div>
        <div class="wa-check-row" id="wa-check-lowSpeed"><span class="wa-check-icon"></span><span>Stopped (below 0.5 kt)</span></div>
        <div class="wa-check-row" id="wa-check-enginesOff"><span class="wa-check-icon"></span><span>Engines off</span></div>
      </div>

      <div id="wa-actions">
        <button id="wa-toggle-btn">Start walkaround</button>
      </div>
      <div id="wa-status">Ready</div>

      <div id="wa-checklist-wrap" class="wa-section" style="display:none">
        <div class="wa-title">Checklist</div>
        <div id="wa-checklist"></div>
        <button class="wa-btn" id="wa-reset-list" style="width:100%;margin-top:8px">Reset checklist</button>
      </div>

      <div class="wa-section">
        <button class="wa-btn" id="wa-settings-toggle" style="width:100%">⚙ Settings</button>
        <div id="wa-settings-body" style="display:none">

          <div class="wa-section">
            <div class="wa-title">Movement</div>
            <div class="wa-row"><label>Walk speed (m/s)</label><input id="wa-walk-speed" type="number" min="0.5" max="20" step="0.1"></div>
            <div class="wa-row"><label>Run multiplier</label><input id="wa-run-mult" type="number" min="1" max="6" step="0.1"></div>
            <div class="wa-row"><label>Vertical speed (m/s)</label><input id="wa-vert-speed" type="number" min="0.5" max="10" step="0.1"></div>
            <div class="wa-row"><label>Max extra height (m)</label><input id="wa-max-h" type="number" min="1" max="40" step="1"></div>
          </div>

          <div class="wa-section">
            <div class="wa-title">Sound</div>
            <div class="wa-row"><label>Enabled</label><input id="wa-sound-enabled" type="checkbox"></div>
            <div class="wa-row"><label>Volume</label><input id="wa-sound-vol" type="range" min="0" max="100" step="1"></div>
          </div>

          <div class="wa-section">
            <div class="wa-title">Hotkeys</div>
            <div class="wa-row"><label>Show/hide panel</label><button class="wa-hk-box" id="wa-hk-panel-box" type="button"></button></div>
            <div class="wa-row"><label>Toggle walkaround</label><button class="wa-hk-box" id="wa-hk-toggle-box" type="button"></button></div>
            <div class="wa-row"><label>Toggle cursor</label><button class="wa-hk-box" id="wa-hk-lock-box" type="button"></button></div>
            <div class="wa-row"><label>Check next item (optional)</label><button class="wa-hk-box" id="wa-hk-checklist-box" type="button"></button></div>
            <div class="wa-note">Click a box, then press the key you want to use. Choose a key that isn't already in use. Only editable while walkaround is inactive.</div>
            <div id="wa-hk-status"></div>
          </div>

          <button class="wa-btn" id="wa-save-settings" style="width:100%;margin-top:8px">Save settings</button>
          <button class="wa-btn" id="wa-reset-settings" style="width:100%;margin-top:8px" type="button">Reset to defaults</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const look = document.createElement("div");
    look.id = "wa-look-label";
    document.body.appendChild(look);

    const list = root.querySelector("#wa-checklist");
    CHECKLIST.forEach((item, i) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" data-idx="${i}"> ${item}`;
      label.querySelector("input").addEventListener("change", e => {
        if (e.target.checked) state.checked.add(i);
        else state.checked.delete(i);
      });
      label.addEventListener("keydown", e => e.stopPropagation());
      list.appendChild(label);
    });

    root.querySelector("#wa-walk-speed").value = settings.walkSpeedMps;
    root.querySelector("#wa-run-mult").value = settings.runMultiplier;
    root.querySelector("#wa-vert-speed").value = settings.verticalSpeedMps;
    root.querySelector("#wa-max-h").value = settings.maxExtraHeightM;
    root.querySelector("#wa-sound-enabled").checked = !!settings.soundEnabled;
    root.querySelector("#wa-sound-vol").value = Math.round(settings.soundVolume * 100);

    renderHotkeyBoxes();

    root.querySelector("#wa-toggle-btn").onclick = e => {
      e.stopPropagation();
      toggleWalkaround();
    };
    root.querySelector("#wa-reset-list").onclick = e => {
      e.stopPropagation();
      resetChecklist();
      setStatus("Checklist reset");
    };
    root.querySelector("#wa-settings-toggle").onclick = e => {
      e.stopPropagation();
      const body = root.querySelector("#wa-settings-body");
      const open = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
    };
    root.querySelector("#wa-sound-enabled").onchange = e => {
      settings.soundEnabled = e.target.checked;
      saveSettings();
    };
    root.querySelector("#wa-sound-vol").oninput = e => {
      settings.soundVolume = clamp(+e.target.value / 100, 0, 1);
      applyLiveVolume();
    };
    root.querySelector("#wa-hk-panel-box").onclick = e => {
      e.stopPropagation();
      startHotkeyCapture("panel", e.currentTarget);
    };
    root.querySelector("#wa-hk-toggle-box").onclick = e => {
      e.stopPropagation();
      startHotkeyCapture("toggle", e.currentTarget);
    };
    root.querySelector("#wa-hk-lock-box").onclick = e => {
      e.stopPropagation();
      startHotkeyCapture("lock", e.currentTarget);
    };
    root.querySelector("#wa-hk-checklist-box").onclick = e => {
      e.stopPropagation();
      startHotkeyCapture("checklist", e.currentTarget);
    };
    root.querySelector("#wa-save-settings").onclick = e => {
      e.stopPropagation();
      settings.walkSpeedMps = clamp(+root.querySelector("#wa-walk-speed").value || DEFAULTS.walkSpeedMps, 0.5, 20);
      settings.runMultiplier = clamp(+root.querySelector("#wa-run-mult").value || DEFAULTS.runMultiplier, 1, 6);
      settings.verticalSpeedMps = clamp(+root.querySelector("#wa-vert-speed").value || DEFAULTS.verticalSpeedMps, 0.5, 10);
      settings.maxExtraHeightM = clamp(+root.querySelector("#wa-max-h").value || DEFAULTS.maxExtraHeightM, 1, 40);
      settings.soundEnabled = root.querySelector("#wa-sound-enabled").checked;
      settings.soundVolume = clamp(+root.querySelector("#wa-sound-vol").value / 100, 0, 1);
      saveSettings();
      setStatus("Settings saved", "ok");
    };
    root.querySelector("#wa-reset-settings").onclick = e => {
      e.stopPropagation();
      resetSettingsToDefaults();
    };

    root.querySelectorAll("input,button").forEach(el => {
      el.addEventListener("keydown", e => e.stopPropagation());
      el.addEventListener("keyup", e => e.stopPropagation());
    });

    document.addEventListener("click", e => {
      if (!root.contains(e.target) && state.panelOpen && !state.active) openPanel(false);
    });

    makeDraggable(root, root.querySelector("#wa-drag-handle"));
  }

  function bindInput() {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);

    document.addEventListener("mousemove", e => {
      if (!state.active || document.pointerLockElement !== document.body) return;
      state.headingRad += e.movementX * settings.turnSens;
      state.pitchRad -= e.movementY * settings.turnSens;
      const lim = (settings.pitchLimitDeg * Math.PI) / 180;
      state.pitchRad = clamp(state.pitchRad, -lim, lim);
    });
  }

  function loop(tPrev) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - tPrev) / 1000);
    maybeResetChecklistOnNewFlight();
    if (state.active) updateMovement(dt);
    state.raf = requestAnimationFrame(() => loop(now));
  }

  async function main() {
    await waitReady();
    addUI();
    bindInput();
    state.lastFlightId = flightSignature();
    openPanel(true);
    state.raf = requestAnimationFrame(() => loop(performance.now()));
    setInterval(updateSafetyUI, 500);
    checkForUpdate();
    console.log("[Walkaround 1.0 beta] ready");
  }

  main();
})();