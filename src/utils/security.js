import bcrypt from 'bcryptjs';
import React, { useRef, useState, useCallback } from 'react';

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch {
    return false;
  }
}

function deepClone(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

function makeImmutableProxy(target, onTamper) {
  if (target === null || target === undefined) return target;
  const handler = {
    set() {
      if (typeof onTamper === 'function') onTamper();
      return false;
    },
    deleteProperty() {
      if (typeof onTamper === 'function') onTamper();
      return false;
    },
    defineProperty() {
      if (typeof onTamper === 'function') onTamper();
      return false;
    },
    get(obj, prop, receiver) {
      const v = Reflect.get(obj, prop, receiver);
      if (v && typeof v === 'object') return makeImmutableProxy(v, onTamper);
      return v;
    }
  };
  return new Proxy(target, handler);
}

function defaultTamperResponse() {
  try { sessionStorage.clear(); } catch {}
  try { localStorage.removeItem('token'); localStorage.removeItem('schedease_current_user'); } catch {}
  try { /* no reload to avoid breaking page - keep app running */ } catch {}
}

export function secureState(initial) {
  try {
    const clone = deepClone(initial);
    return makeImmutableProxy(clone, defaultTamperResponse);
  } catch {
    return makeImmutableProxy(initial, defaultTamperResponse);
  }
}

export function useSecureState(initial) {
  const [ver, setVer] = useState(0);
  const ref = useRef();
  const onTamper = useCallback(() => {
    defaultTamperResponse();
  }, []);
  if (!ref.current) {
    const base = typeof initial === 'function' ? initial() : initial;
    ref.current = makeImmutableProxy(deepClone(base), onTamper);
  }
  const setSecure = useCallback((updater) => {
    try {
      const prev = deepClone(ref.current);
      const next = typeof updater === 'function' ? updater(prev) : updater;
      ref.current = makeImmutableProxy(deepClone(next), onTamper);
      setVer(v => v + 1);
    } catch {
      onTamper();
    }
  }, [onTamper]);
  return [ref.current, setSecure];
}

export function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = ['password','token','secret','apiKey','api_key','authorization'];
  const out = { ...obj };
  Object.keys(out).forEach(k => {
    const lk = String(k).toLowerCase();
    if (sensitive.some(s => lk.includes(s))) out[k] = '[REDACTED]';
  });
  return out;
}

export function disableConsoleInProduction() {
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
  }
}

export function protectConsole() {
  try {
    if (process.env.NODE_ENV === 'production') {
      Object.freeze(console);
      try { Object.defineProperty(window, 'console', { configurable: false, writable: false, value: console }); } catch {}
    }
  } catch {}
}

export function monitorDevtools() {
  try {
    let last = { w: window.outerWidth, h: window.outerHeight };
    setInterval(() => {
      try {
        const wDiff = Math.abs(window.outerWidth - last.w);
        const hDiff = Math.abs(window.outerHeight - last.h);
        last.w = window.outerWidth; last.h = window.outerHeight;
        if (wDiff > 160 || hDiff > 160) {
          // just log; do not reload or break UI
          // any sensitive operations should always be validated server-side
          // this keeps app reachable while alerting dev that devtools opened
          // eslint-disable-next-line no-console
          console.warn('DevTools likely opened');
        }
      } catch {}
    }, 1500);
  } catch {}
}

export function protectDOM() {
  try {
    if (typeof document === 'undefined') return;
    const origCreate = document.createElement.bind(document);
    const origQuery = document.querySelector.bind(document);
    const origGet = document.getElementById.bind(document);
    try { Object.defineProperty(document, 'createElement', { configurable: false, writable: false, value: origCreate }); } catch {}
    try { Object.defineProperty(document, 'querySelector', { configurable: false, writable: false, value: origQuery }); } catch {}
    try { Object.defineProperty(document, 'getElementById', { configurable: false, writable: false, value: origGet }); } catch {}
  } catch {}
}

export const secureStorage = {
  setItem(key, value) {
    try { localStorage.setItem(key, btoa(JSON.stringify(value))); } catch {}
  },
  getItem(key) {
    try {
      const v = localStorage.getItem(key);
      if (!v) return null;
      return JSON.parse(atob(v));
    } catch { return null; }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch {}
  }
};

export function initSecurity() {
  disableConsoleInProduction();
  protectConsole();
  protectDOM();
  monitorDevtools();
}
