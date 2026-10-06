const { getServices } = require('./admin-register');
const { submitReservation } = require('./lib/reservation-service.cjs');
function createHandler({ auth, db, timestamp }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
    let account;
    try { const identity = await auth.verifyIdToken((req.headers.authorization || '').replace(/^Bearer /, ''), true); account = await auth.getUser(identity.uid); }
    catch (_) { return res.status(401).json({ error: 'Sign in again to submit your reservation.' }); }
    try {
      const profile = await db.collection('users').doc(account.uid).get();
      const value = profile.data() || {};
      const admin = account.customClaims?.admin === true;
      if (!admin && (!/^[^@]+@gmail\.com$/.test(account.email || '') || value.role !== 'student' || value.enrollmentStatus !== 'approved' || !value.studentId || value.confirmedStudentId !== value.studentId)) return res.status(403).json({ error: 'Your enrollment must be approved and your student ID confirmed before reserving.' });
      const result = await submitReservation({ db, actor: { uid: account.uid, email: account.email, name: value.displayName || account.email, admin }, data: req.body || {}, timestamp, flexible: true });
      return res.status(200).json(result);
    } catch (error) {
      const status = { 'invalid-argument': 400, 'permission-denied': 403, 'already-exists': 409, 'failed-precondition': 409, 'resource-exhausted': 429 }[error.code];
      return res.status(status || 503).json({ error: status ? error.message : 'Could not save your reservation. Please try again.' });
    }
  };
}
let handler;
module.exports = async (req, res) => {
  try { handler ||= createHandler(getServices()); return await handler(req, res); }
  catch (_) { return res.status(503).json({ error: 'Reservation submission is temporarily unavailable.' }); }
};
module.exports.createHandler = createHandler;
