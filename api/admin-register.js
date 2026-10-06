// Runs on Vercel, never in the browser. Admin SDK credentials stay in server environment variables.
function createHandler({ auth, db, timestamp }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
    const bearer = req.headers.authorization || '';
    if (!bearer.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to register administrator access.' });
    let identity;
    try { identity = await auth.verifyIdToken(bearer.slice(7), true); }
    catch (_) { return res.status(401).json({ error: 'Your sign-in session expired. Sign in again.' }); }
    try {
      const account = await auth.getUser(identity.uid);
      if (account.customClaims?.admin === true) return res.status(200).json({ registered: true });
      const application = db.collection('adminApplications').doc(identity.uid);
      const snapshot = await application.get();
      if (!snapshot.exists || !['pending', 'approved'].includes(snapshot.data().status) || snapshot.data().email !== account.email) {
        return res.status(403).json({ error: 'Register through Register as Administrator first.' });
      }
      const data = snapshot.data();
      await db.collection('users').doc(identity.uid).set({ uid: identity.uid, email: account.email,
        displayName: data.displayName, role: 'admin', studentId: '', enrollmentStatus: 'approved', createdAt: data.createdAt });
      await auth.setCustomUserClaims(identity.uid, { ...account.customClaims, admin: true });
      await application.update({ status: 'approved', approvedAt: timestamp() });
      return res.status(200).json({ registered: true });
    } catch (_) { return res.status(503).json({ error: 'Could not enable administrator access. Your account is saved; try Admin Login again.' }); }
  };
}
let handler;
module.exports = async (req, res) => {
  if (!handler) {
    try {
      const { initializeApp, cert, getApps } = require('firebase-admin/app');
      const { getAuth } = require('firebase-admin/auth');
      const { getFirestore, FieldValue } = require('firebase-admin/firestore');
      const credential = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT || '{}');
      if (credential.project_id !== 'frontend-d6606') throw new Error('Wrong project');
      const app = getApps()[0] || initializeApp({ credential: cert(credential), projectId: credential.project_id });
      handler = createHandler({ auth: getAuth(app), db: getFirestore(app), timestamp: () => FieldValue.serverTimestamp() });
    } catch (_) { return res.status(503).json({ error: 'Administrator registration is temporarily unavailable.' }); }
  }
  return handler(req, res);
};
module.exports.createHandler = createHandler;
