const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function client(isAdmin = false) {
  const calls = [], writes = [], filters = [];
  const user = { uid: 'student-1', email: 'student@example.com', updateProfile: async profile => { user.displayName = profile.displayName; }, getIdTokenResult: async () => ({ claims: { admin: isAdmin } }) };
  const records = {
    reservations: [{ id: 'request-1', value: { ownerUid: user.uid, status: 'pending' } }],
    venues: [{ id: 'hall', value: { active: true, name: 'Hall', order: 1 } }],
    timeSlots: [{ id: 'morning', value: { startMinutes: 420 } }, { id: 'midday', value: { startMinutes: 600 } }],
    bookings: [{ id: 'lock', value: { slotId: 'morning' } }],
    reservationEvents: []
  };
  const auth = { setPersistence: async () => {}, onAuthStateChanged: callback => { queueMicrotask(() => callback(user)); return () => {}; }, signInWithEmailAndPassword: async () => ({ user }), createUserWithEmailAndPassword: async () => ({ user }), signOut: async () => {} };
  const db = { collection: name => {
    const query = {
      where: (...args) => { filters.push([name, ...args]); return query; },
      get: async () => ({ docs: (records[name] || []).map(record => ({ id: record.id, data: () => record.value })) }),
      doc: id => ({ get: async () => ({ exists: false }), set: async data => writes.push({ name, id, data }) })
    }; return query;
  } };
  const firebase = {
    initializeApp: () => {},
    auth: Object.assign(() => auth, { Auth: { Persistence: { LOCAL: 'local' } } }),
    firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'SERVER' } }),
    app: () => ({ functions: region => { assert.equal(region, 'asia-southeast1'); return { httpsCallable: name => async data => { calls.push({ name, data }); return { data: { id: data.checkOnly ? null : data.requestId } }; } }; } }),
    storage: () => ({ ref: path => ({ put: async (file, metadata) => calls.push({ path, file, metadata }) }) })
  };
  const reservationService = {
    submitReservation: async options => { calls.push({ name: 'firestore-submit', data: options.data }); if(options.data.hasAttachment) calls.push(await options.verifyAttachment(user.uid, options.data.requestId)); return { id: options.data.requestId }; },
    reviewReservation: async options => { calls.push({ name: 'firestore-review', data: options.data }); }
  };
  const sandbox = { FRMS_RESERVATION_SERVICE: reservationService, Uint8Array, btoa: value => Buffer.from(value, 'binary').toString('base64'), window: { FIREBASE_CONFIG: { apiKey: 'test', projectId: 'test', appId: 'test' } }, firebase, console, document: { addEventListener: () => {} }, sessionStorage: { removeItem: () => {} }, location: { replace: () => {} } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('js/firebase/client.js', 'utf8'), sandbox);
  return { api: sandbox.window.FRMS, calls, writes, filters };
}
test('login creates student and admin profiles without storing passwords', async () => {
  for (const admin of [false, true]) {
    const { api, writes } = client(admin); await api.login('student@example.com', 'secret', admin);
    assert.equal(writes[0].name, 'users'); assert.equal(writes[0].data.role, admin ? 'admin' : 'student');
    assert(!('password' in writes[0].data));
  }
});
test('student list queries are scoped to owner and available slots omit bookings', async () => {
  const { api, filters } = client(); await api.requests();
  assert(filters.some(filter => filter.join('/') === 'reservations/ownerUid/==/student-1'));
  assert.deepEqual(Array.from(await api.availableSlots('hall', '2026-10-15'), slot => slot.id), ['midday']);
  assert(filters.some(filter => filter.join('/') === 'bookings/dateISO/==/2026-10-15'));
});
test('PDF submission uses Firestore document metadata without paid services', async () => {
  const { api, calls } = client(); const file = { name: 'proposal.pdf', size: 4, arrayBuffer: async () => new Uint8Array([37,80,68,70]).buffer };
  assert.equal(await api.submit({ requestId: 'request-1', venueId: 'hall' }, file), 'request-1');
  assert.equal(calls[0].name, 'firestore-submit'); assert.equal(calls[0].data.hasAttachment, true);
  assert.equal(calls[1].path, 'reservations/request-1/documents/proposal');
});
test('student cannot invoke admin review; admin uses a Firestore transaction', async () => {
  const student = client(); await assert.rejects(student.api.updateStatus('request-1', 'approved'));
  assert.equal(student.calls.length, 0);
  const admin = client(true); await admin.api.updateStatus('request-1', 'approved');
  assert.equal(admin.calls[0].name, 'firestore-review');
});

test('registration saves a student profile and name without copying passwords', async () => {
  const { api, writes } = client(true);
  await api.register(' Alex Student ', 'alex@example.com', 'TestPass123!');
  assert.equal(writes[0].name, 'users');
  assert.equal(writes[0].data.role, 'student');
  assert.equal(writes[0].data.displayName, 'Alex Student');
  assert(!('password' in writes[0].data));
  await assert.rejects(api.updateStatus('request-1', 'approved'));
});
test('invalid registration input cannot create a profile', async () => {
  const { api, writes } = client();
  await assert.rejects(api.register('', 'alex@example.com', 'TestPass123!'));
  await assert.rejects(api.register('Alex', 'alex', 'TestPass123!'));
  await assert.rejects(api.register('Alex', 'alex@example.com', 'short'));
  assert.equal(writes.length, 0);
});
