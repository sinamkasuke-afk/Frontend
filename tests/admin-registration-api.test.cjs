const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/admin-register.js');
function setup({ missing = false, invalidToken = false, failWrite = false, expired = false, wrongEmail = false, used = false } = {}) {
  const writes = [], claims = [];
  const auth = { verifyIdToken: async token => { if (invalidToken || token !== 'valid') throw Error('bad token'); return { uid: 'applicant' }; }, getUser: async () => ({ email: 'admin@gmail.com', customClaims: { extra: true } }), setCustomUserClaims: async (uid, value) => claims.push({ uid, value }) };
  const db = { runTransaction: callback => callback({ get: ref => ref.get(), update() {} }), collection: collection => ({ doc: uid => ({ get: async () => ({ exists: !missing, data: () => ({ email: wrongEmail ? 'other@gmail.com' : 'admin@gmail.com', expiresAt: { toMillis: () => Date.now() + (expired ? -1000 : 86400000) }, usedBy: used ? 'another-user' : null, displayName: 'New Admin', status: 'pending', createdAt: 'TIME' }) }), set: async value => { if(failWrite) throw Error('secret credential details'); writes.push({ collection, uid, value }); }, update: async value => writes.push({ collection, uid, value }) }) }) };
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
  return { handler: createHandler({ auth, db, timestamp: () => 'SERVER' }), res, writes, claims };
}
test('registration endpoint requires a verified Firebase session', async () => {
  for (const headers of [{}, { authorization: 'Bearer wrong' }]) {
    const s=setup(); await s.handler({method:'POST',headers},s.res); assert.equal(s.res.code,401); assert.equal(s.claims.length,0);
  }
});
test('account without an administrator registration cannot be promoted', async () => {
  const s=setup({missing:true}); await s.handler({method:'POST',headers:{authorization:'Bearer valid'}},s.res); assert.equal(s.res.code,403);assert.equal(s.claims.length,0);
});
test('registered account receives immediate privileges for its own UID only', async () => {
  const s=setup(); await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body:{uid:'victim',invitationCode:'a'.repeat(48)}},s.res);
  assert.equal(s.res.code,200);assert.equal(s.claims[0].uid,'applicant');assert.deepEqual(s.claims[0].value,{extra:true,admin:true});
  assert.equal(s.writes[0].value.role,'admin');assert.equal(s.writes[1].value.status,'approved');
});
test('failed profile creation grants no claim and exposes no credentials', async () => {
  const s=setup({failWrite:true});await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body:{invitationCode:'a'.repeat(48)}},s.res);assert.equal(s.res.code,503);assert.equal(s.claims.length,0);assert(!s.res.body.error.includes('secret'));
});

test('public registration without an invitation is denied', async () => {
  const s=setup();await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body:{}},s.res);assert.equal(s.res.code,403);assert.equal(s.claims.length,0);
});
test('expired, wrong-email and already-used invitations cannot grant access', async () => {
  for(const options of [{expired:true},{wrongEmail:true},{used:true}]) {
    const s=setup(options);await s.handler({method:'POST',headers:{authorization:'Bearer valid'},body:{invitationCode:'a'.repeat(48)}},s.res);assert.equal(s.res.code,403);assert.equal(s.claims.length,0);
  }
});
