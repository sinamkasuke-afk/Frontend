const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/email-verification');
function fixture({ authenticated = true, deliveryFails = false } = {}) {
  let value, sent, time = 1800000000000, queue = Promise.resolve();
  const account = { uid: 'student', email: 'student@gmail.com', displayName: 'Alex', emailVerified: false };
  const ref = { delete: async () => { value = undefined; } };
  const db = { collection: () => ({ doc: () => ref }), runTransaction: callback => {
    const result = queue.then(() => callback({ get: async () => ({ data: () => value }), set: (_, data) => { value = data; }, update: (_, data) => { value = { ...value, ...data }; } }));
    queue = result.catch(() => {}); return result;
  } };
  const handler = createHandler({ db, now: () => time, auth: {
    verifyIdToken: async () => { if (!authenticated) throw Error(); return { uid: account.uid }; },
    getUser: async () => account, updateUser: async (_, update) => Object.assign(account, update)
  }, sendEmail: async data => { if (deliveryFails) throw Error(); sent = data; } });
  const request = async body => {
    const result = {}, res = { setHeader() {}, status(code) { result.status = code; return this; }, json(data) { result.body = data; return result; } };
    await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body }, res); return result;
  };
  return { request, account, get value() { return value; }, get sent() { return sent; }, advance: ms => { time += ms; } };
}
test('verification sends only to the signed-in address, stores a hash, and verifies the account', async () => {
  const f = fixture(); const sent = await f.request({ action: 'send', email: 'attacker@gmail.com' });
  assert.equal(sent.status, 200); assert.equal(f.sent.email, f.account.email); assert.match(f.sent.code, /^\d{6}$/);
  assert(!JSON.stringify(sent.body).includes(f.sent.code)); assert(!JSON.stringify(f.value).includes(f.sent.code));
  assert.equal((await f.request({ action: 'verify', code: f.sent.code })).body.verified, true);
  assert.equal(f.account.emailVerified, true); assert.equal(f.value, undefined);
});
test('wrong codes cannot verify email; five failed attempts lock the challenge', async () => {
  const f = fixture(); await f.request({ action: 'send' }); const wrong = f.sent.code === '123456' ? '654321' : '123456';
  for (let i = 0; i < 5; i++) assert.equal((await f.request({ action: 'verify', code: wrong })).status, 400);
  assert.match((await f.request({ action: 'verify', code: f.sent.code })).body.error, /Too many attempts/);
  assert.equal(f.account.emailVerified, false);
});
test('expired, replaced and malformed codes are rejected', async () => {
  const f = fixture(); await f.request({ action: 'send' }); const original = f.sent.code;
  f.advance(600001); assert.equal((await f.request({ action: 'verify', code: original })).status, 400);
  assert.equal((await f.request({ action: 'verify', code: 'abc' })).status, 400);
  await f.request({ action: 'send' });
  if (original !== f.sent.code) assert.equal((await f.request({ action: 'verify', code: original })).status, 400);
});
test('resends enforce cooldown and hourly delivery limit', async () => {
  const f = fixture(); await f.request({ action: 'send' });
  assert.equal((await f.request({ action: 'send' })).status, 429);
  for (let i = 1; i < 5; i++) { f.advance(60001); assert.equal((await f.request({ action: 'send' })).status, 200); }
  f.advance(60001); assert.equal((await f.request({ action: 'send' })).status, 429);
});
test('authentication and email delivery failures never verify an account', async () => {
  assert.equal((await fixture({ authenticated: false }).request({ action: 'send' })).status, 401);
  const f = fixture({ deliveryFails: true }); assert.equal((await f.request({ action: 'send' })).status, 503);
  assert.equal(f.value.delivered, false); assert.equal(f.account.emailVerified, false);
});
