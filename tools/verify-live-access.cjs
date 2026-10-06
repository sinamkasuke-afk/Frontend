const fs = require('node:fs');
const vm = require('node:vm');
const firebase = require('firebase/compat/app'); require('firebase/compat/auth'); require('firebase/compat/firestore');
(async () => {
  if (!process.env.FRMS_ADMIN_TEST_PASSWORD) throw new Error('Provide the test admin password via environment.');
  const configContext = { window: {} }; vm.createContext(configContext); vm.runInContext(fs.readFileSync('js/firebase/config.js', 'utf8'), configContext);
  const config = configContext.window.FIREBASE_CONFIG;
  firebase.initializeApp(config); const auth = firebase.auth(), db = firebase.firestore();
  await auth.signInWithEmailAndPassword('frms-admin-test@example.com', process.env.FRMS_ADMIN_TEST_PASSWORD);
  if (!(await auth.currentUser.getIdTokenResult()).claims.admin) throw new Error('Test account is not administrator.');
  await db.collection('reservations').orderBy('createdAt', 'desc').orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(26).get();
  await db.collection('users').where('role', '==', 'student').orderBy('createdAt', 'desc').orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(26).get();
  const shim = { initializeApp() {}, auth: Object.assign(() => ({ setPersistence: async () => {}, onAuthStateChanged: cb => auth.onAuthStateChanged(cb) }), { Auth: firebase.auth.Auth }), firestore: Object.assign(() => db, { FieldValue: firebase.firestore.FieldValue }) };
  const context = { window: { FIREBASE_CONFIG: config }, firebase: shim, fetch: async (...args) => {
    const response = await fetch(...args);
    if (!response.ok) { const detail = await response.clone().json(); console.error('Totals check:', response.status, detail.error?.message); }
    return response;
  }, console, document: { addEventListener() {} }, location: { replace() {} } };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/firebase/client.js', 'utf8'), context);
  const counts = await context.window.FRMS.requestCounts(true);
  console.log(`Live administrator login, paginated queries and global totals verified (${counts.total} reservations).`);
  await auth.signOut(); await firebase.app().delete();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
