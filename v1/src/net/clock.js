// Rybna Wyspa: a worker-driven interval that keeps ticking in a hidden tab (setInterval is throttled to ~1 Hz there).

const SRC = 'let t=null;onmessage=(e)=>{const d=e.data||{};clearInterval(t);if(d.stop){close();return;}t=setInterval(()=>postMessage(1),Math.max(1,d.ms|0));};';
let url = null;

export function createClock(ms, fn) {
  let worker = null, iv = null, stopped = false;
  const tick = () => { if (!stopped) { try { fn(); } catch (e) { console.warn('[clock]', e); } } };
  try {
    url = url || URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = tick;
    worker.postMessage({ ms });
  } catch (e) {
    worker = null;
    iv = setInterval(tick, ms);
  }
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (worker) { try { worker.postMessage({ stop: true }); } catch (e) { /* gone */ } worker.terminate(); }
      if (iv) clearInterval(iv);
    },
  };
}
