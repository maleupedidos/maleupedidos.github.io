'use strict';
// Toques por CDP sin esperar el acuse (como el dedo: el segundo puede caer mientras el hilo está ocupado y queda en cola).
module.exports = function (cdp) {
  const ev = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 2, radiusY: 2, force: 1, id: 1 }], timestamp: Date.now() / 1000 }).catch(() => {});
  return function tap(x, y) { const a = ev('touchStart', x, y); return new Promise((ok) => setTimeout(() => { ok(Promise.all([a, ev('touchEnd', x, y)])); }, 40)); };
};
