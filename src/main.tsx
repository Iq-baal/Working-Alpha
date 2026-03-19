import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

let stableAppHeight = 0;
let stableViewportWidth = 0;
let scheduledSyncId: number | null = null;

const isKeyboardEditableElement = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
};

const syncAppViewportHeight = () => {
  const layoutHeight = Math.round(window.innerHeight);
  const viewport = window.visualViewport;
  const viewportWidth = Math.round(viewport?.width ?? window.innerWidth);
  const focusedElement = document.activeElement;
  const keyboardOpen =
    !!viewport &&
    isKeyboardEditableElement(focusedElement) &&
    layoutHeight - viewport.height > 120;

  if (!stableAppHeight || Math.abs(viewportWidth - stableViewportWidth) > 24) {
    stableViewportWidth = viewportWidth;
    stableAppHeight = layoutHeight;
  }

  const nextHeight = keyboardOpen && viewport
    ? Math.round(viewport.height)
    : Math.max(stableAppHeight, layoutHeight);

  stableAppHeight = nextHeight;
  document.documentElement.style.setProperty('--app-height', `${nextHeight}px`);
};

const scheduleAppViewportSync = () => {
  if (scheduledSyncId !== null) {
    window.cancelAnimationFrame(scheduledSyncId);
  }
  scheduledSyncId = window.requestAnimationFrame(() => {
    scheduledSyncId = null;
    syncAppViewportHeight();
  });
};

scheduleAppViewportSync();
window.addEventListener('resize', scheduleAppViewportSync, { passive: true });
window.addEventListener('orientationchange', scheduleAppViewportSync, { passive: true });
window.addEventListener('pageshow', scheduleAppViewportSync, { passive: true });
window.visualViewport?.addEventListener('resize', scheduleAppViewportSync, { passive: true });
document.addEventListener('focusin', scheduleAppViewportSync);
document.addEventListener('focusout', scheduleAppViewportSync);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
