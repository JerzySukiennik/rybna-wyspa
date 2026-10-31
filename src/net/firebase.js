// Rybna Wyspa: lazy Firebase (anonymous auth + Realtime Database) with a timeout so the game can fall back to solo.

import { firebaseConfig, ROOT } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.5';
let fbp = null;

function timeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

export function firebase(ms = 9000) {
  if (fbp) return fbp;
  fbp = (async () => {
    const [appM, authM, db] = await timeout(Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-database.js`),
    ]), ms);
    const app = appM.getApps().length ? appM.getApp() : appM.initializeApp(firebaseConfig);
    const auth = authM.getAuth(app);
    await timeout(auth.authStateReady ? auth.authStateReady() : Promise.resolve(), ms);
    const user = auth.currentUser || (await timeout(authM.signInAnonymously(auth), ms)).user;
    const database = db.getDatabase(app);
    const fb = {
      ...db,
      uid: user.uid,
      db: database,
      ref: (p) => db.ref(database, `${ROOT}/${p}`),
      raw: (p) => db.ref(database, p),
      offset: 0,
      connected: false,
    };
    db.onValue(db.ref(database, '.info/serverTimeOffset'), (s) => { fb.offset = s.val() || 0; });
    db.onValue(db.ref(database, '.info/connected'), (s) => { fb.connected = !!s.val(); });
    await timeout(db.get(fb.ref('dir')).catch((e) => { throw e; }), ms);
    return fb;
  })();
  fbp.catch(() => { fbp = null; });
  return fbp;
}
