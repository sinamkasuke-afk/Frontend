const crypto = require('node:crypto');
const { getServices } = require('./admin-register');
const digest = (uid, email, nonce, code) => crypto.createHash('sha256').update([uid, email, nonce, code].join(':')).digest('hex');
function createHandler({ auth, db, timestamp, sendEmail, now = Date.now }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST.' }); }
    let account;
    try {
      const token = await auth.verifyIdToken((req.headers.authorization || '').replace(/^Bearer /, ''), true);
      account = await auth.getUser(token.uid);
    } catch (_) { return res.status(401).json({ error: 'Sign in again to verify your email.' }); }
    if (account.emailVerified) return res.status(200).json({ verified: true });
    if (!/^[^@\s]+@gmail\.com$/i.test(account.email || '')) return res.status(400).json({ error: 'Use your registered Gmail address.' });
    const ref = db.collection('emailVerifications').doc(account.uid);
    const action = req.body?.action;
    if (!['send', 'verify'].includes(action)) return res.status(400).json({ error: 'Choose send or verify.' });
    try {
      if (action === 'send') {
        const code = String(crypto.randomInt(100000, 1000000));
        const nonce = crypto.randomBytes(24).toString('hex');
        const at = now();
        const result = await db.runTransaction(async tx => {
          const snapshot = await tx.get(ref), previous = snapshot.data() || {};
          if (previous.sentAt && at - previous.sentAt < 60000) return 'Wait one minute before requesting another code.';
          const withinHour = at - (previous.windowStart || 0) < 3600000;
          if (withinHour && previous.sentCount >= 5) return 'Too many email requests. Try again in an hour.';
          tx.set(ref, { email: account.email, nonce, hash: digest(account.uid, account.email, nonce, code), expiresAt: at + 600000,
            sentAt: at, attempts: 0, sentCount: withinHour ? previous.sentCount + 1 : 1,
            windowStart: withinHour ? previous.windowStart : at, delivered: false });
          return null;
        });
        if (result) return res.status(429).json({ error: result });
        try { await sendEmail({ email: account.email, name: account.displayName || 'Student', code }); }
        catch (_) { return res.status(503).json({ error: 'Could not send the verification email. Try again in one minute.' }); }
        await db.runTransaction(async tx => {
          const snapshot = await tx.get(ref);
          if (snapshot.data()?.nonce === nonce) tx.update(ref, { delivered: true });
        });
        return res.status(200).json({ sent: true, expiresIn: 600 });
      }
      const code = String(req.body?.code || '').trim();
      if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit code from your email.' });
      const result = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref), challenge = snapshot.data();
        if (!challenge || challenge.email !== account.email || !challenge.delivered || challenge.expiresAt <= now()) return 'This code has expired. Request a new code.';
        if (challenge.attempts >= 5) return 'Too many attempts. Request a new code.';
        const match = digest(account.uid, account.email, challenge.nonce, code) === challenge.hash;
        tx.update(ref, { attempts: challenge.attempts + 1 });
        return match ? null : 'The code does not match. Try again.';
      });
      if (result) return res.status(400).json({ error: result });
      await auth.updateUser(account.uid, { emailVerified: true });
      await ref.delete();
      return res.status(200).json({ verified: true });
    } catch (_) { return res.status(503).json({ error: 'Email verification is temporarily unavailable. Try again.' }); }
  };
}
async function sendEmail({ email, name, code }) {
  const service_id = process.env.EMAILJS_SERVICE_ID, template_id = process.env.EMAILJS_TEMPLATE_ID, user_id = process.env.EMAILJS_PUBLIC_KEY;
  if (!service_id || !template_id || !user_id) throw new Error('EmailJS setup is incomplete.');
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ service_id, template_id, user_id, ...(process.env.EMAILJS_PRIVATE_KEY ? { accessToken: process.env.EMAILJS_PRIVATE_KEY } : {}),
      template_params: { [process.env.EMAILJS_EMAIL_VARIABLE || 'to_email']: email,
        [process.env.EMAILJS_CODE_VARIABLE || 'verification_code']: code, to_name: name, expires_in: '10 minutes' } })
  });
  if (!response.ok) throw new Error('Email delivery failed.');
}
let handler;
module.exports = async (req, res) => {
  try { handler ||= createHandler({ ...getServices(), sendEmail }); return await handler(req, res); }
  catch (_) { return res.status(503).json({ error: 'Email verification is temporarily unavailable.' }); }
};
module.exports.createHandler = createHandler;
