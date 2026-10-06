const crypto = require('node:crypto');
const { getServices } = require('./admin-register');
function createHandler({ auth, db, timestamp, expires }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    let identity, account;
    try { identity = await auth.verifyIdToken(token, true); account = await auth.getUser(identity.uid); }
    catch (_) { return res.status(401).json({ error: 'Sign in again.' }); }
    if (account.customClaims?.admin !== true) return res.status(403).json({ error: 'Administrator access is required.' });
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    try {
      const code = crypto.randomBytes(24).toString('hex');
      const expiresAt = expires(Date.now() + 7 * 86400000);
      await db.collection('adminInvitations').doc(crypto.createHash('sha256').update(code).digest('hex')).set({ email, createdBy: identity.uid, createdAt: timestamp(), expiresAt });
      return res.status(200).json({ invitationCode: code, email, expiresAt: expiresAt.toMillis() });
    } catch (_) { return res.status(503).json({ error: 'Could not create the invitation. Try again.' }); }
  };
}
let handler;
module.exports = async (req, res) => {
  try { handler ||= createHandler(getServices()); return await handler(req, res); }
  catch (_) { return res.status(503).json({ error: 'Administrator invitations are temporarily unavailable.' }); }
};
module.exports.createHandler = createHandler;
