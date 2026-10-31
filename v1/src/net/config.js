// Rybna Wyspa: public Firebase web config for the shared gzowos-games project (data lives under rybnaWyspa/) and network constants.

export const firebaseConfig = {
  apiKey: 'AIzaSyAaTuELH_mToxH3hRJ4WPIVTECSH7Z8-FY',
  authDomain: 'gzowos-games.firebaseapp.com',
  databaseURL: 'https://gzowos-games-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'gzowos-games',
  storageBucket: 'gzowos-games.firebasestorage.app',
  messagingSenderId: '658227201482',
  appId: '1:658227201482:web:627b44e3c4c2988bc4bb33',
};

export const ROOT = new URLSearchParams(location.search).get('realm') === 'test' ? 'rybnaWyspaTest' : 'rybnaWyspa';
export const MAX_PLAYERS = 10;
export const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];
export const STATE_HZ = 15;
export const LEADER_STALE = 9000;
