import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from '@/app.tsx';

const NativeResizeObserver = window.ResizeObserver;

class AnimationFrameResizeObserver extends NativeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    let frameId: number | undefined;
    super((entries: ResizeObserverEntry[], observer: ResizeObserver) => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => callback(entries, observer));
    });
  }
}

// Deliver resize measurements in the next frame so layout updates cannot feed back
// into the same ResizeObserver notification cycle.
window.ResizeObserver = AnimationFrameResizeObserver;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
