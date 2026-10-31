// Rybna Wyspa: one WebRTC link with a reliable control channel and an unreliable state channel, signalled through RTDB mailboxes.

import { ICE } from './config.js';

export function createPeer({ initiator, onOpen, onClose, onControl, onState, signal }) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const ch = { c: null, s: null };
  const pending = [];
  let remote = false, closed = false, open = false;

  const wire = (name, d) => {
    ch[name] = d;
    d.binaryType = 'arraybuffer';
    d.onmessage = (e) => {
      if (name === 'c') { try { onControl(JSON.parse(e.data)); } catch (err) { console.warn('[peer] bad control', err); } }
      else onState(e.data);
    };
    d.onclose = () => close();
    const ready = () => { if (!open && ch.c && ch.s && ch.c.readyState === 'open' && ch.s.readyState === 'open') { open = true; onOpen(); } };
    if (d.readyState === 'open') ready(); else d.onopen = ready;
  };

  pc.onicecandidate = (e) => { if (e.candidate) signal('c', JSON.stringify(e.candidate.toJSON ? e.candidate.toJSON() : e.candidate)); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') close(); };
  pc.ondatachannel = (e) => { if (e.channel.label === 'c' || e.channel.label === 's') wire(e.channel.label, e.channel); };

  async function flush() {
    remote = true;
    while (pending.length) { try { await pc.addIceCandidate(pending.shift()); } catch (e) { /* stale candidate */ } }
  }

  function close() {
    if (closed) return;
    closed = true;
    try { ch.c && ch.c.close(); ch.s && ch.s.close(); pc.close(); } catch (e) { /* gone */ }
    if (onClose) onClose();
  }

  const api = {
    get open() { return open && !closed; },
    get closed() { return closed; },
    async start() {
      wire('c', pc.createDataChannel('c', { ordered: true }));
      wire('s', pc.createDataChannel('s', { ordered: false, maxRetransmits: 0 }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signal('o', pc.localDescription.sdp);
    },
    async offer(sdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp });
      await flush();
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      signal('a', pc.localDescription.sdp);
    },
    async answer(sdp) {
      if (pc.signalingState === 'stable') return;
      await pc.setRemoteDescription({ type: 'answer', sdp });
      await flush();
    },
    async candidate(json) {
      let c;
      try { c = JSON.parse(json); } catch (e) { return; }
      if (!remote) { pending.push(c); return; }
      try { await pc.addIceCandidate(c); } catch (e) { /* stale */ }
    },
    control(msg) {
      if (!ch.c || ch.c.readyState !== 'open') return false;
      ch.c.send(JSON.stringify(msg));
      return true;
    },
    state(buf) {
      if (!ch.s || ch.s.readyState !== 'open' || ch.s.bufferedAmount > 256 * 1024) return false;
      ch.s.send(buf);
      return true;
    },
    close,
  };
  return api;
}
