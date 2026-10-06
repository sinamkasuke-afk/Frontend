const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function client(isAdmin = false) {
  const calls = [], writes = [], filters = [], subscriptions = [], persistence = [], deletes = [];
  const user = { uid: 'student-1', email: 'student@example.com', updateProfile: async profile => { user.displayName = profile.displayName; }, getIdTokenResult: async () => ({ claims: { admin: isAdmin } }) };
  const records = {
    reservations: [{ id: 'request-1', value: { ownerUid: user.uid, status: 'pending' } }],
    venues: [{ id: 'hall', value: { active: true, name: 'Hall', order: 1 } }],
    timeSlots: [{ id: 'morning', value: { startMinutes: 420 } }, { id: 'midday', value: { startMinutes: 600 } }],
    bookings: [{ id: 'lock', value: { slotId: 'morning' } }],
    reservationEvents: []
  };
  const auth = { setPersistence: async value => persistence.push(value), onAuthStateChanged: callback => { queueMicrotask(() => callback(user)); return () => {}; }, signInWithEmailAndPassword: async () => ({ user }), createUserWithEmailAndPassword: async () => ({ user }), signOut: async () => {} };
  const db = { runTransaction: async callback => callback({
    get: async ref => ({ exists: true, data: () => ref.name === 'reservations' ? { bookingId: 'hall_date_morning', ownerUid: ref.id === 'someone-elses-request' ? 'other-student' : user.uid } : { reservationId: 'request-1' } }),
    delete: ref => deletes.push(ref.name + '/' + ref.id)
  }), collection: name => {
    const query = {
      where: (...args) => { filters.push([name, ...args]); return query; },
      get: async () => ({ docs: (records[name] || []).map(record => ({ id: record.id, data: () => record.value })) }),
      onSnapshot: callback => {
        subscriptions.push({ name, callback });
        return () => subscriptions.push({ stopped: true });
      },
      doc: id => ({ name, id, collection: sub => ({ doc: child => ({ name: sub, id: child }) }), get: async () => ({ exists: false }), set: async data => writes.push({ name, id, data }) })
    }; return query;
  } };
  const firebase = {
    initializeApp: () => {},
    auth: Object.assign(() => auth, { Auth: { Persistence: { LOCAL: 'local', SESSION: 'session' } } }),
    firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'SERVER' } }),
    app: () => ({ functions: region => { assert.equal(region, 'asia-southeast1'); return { httpsCallable: name => async data => { calls.push({ name, data }); return { data: { id: data.checkOnly ? null : data.requestId } }; } }; } }),
    storage: () => ({ ref: path => ({ put: async (file, metadata) => calls.push({ path, file, metadata }) }) })
  };
  const reservationService = {
    submitReservation: async options => { calls.push({ name: 'firestore-submit', data: options.data }); if(options.data.hasAttachment) calls.push(await options.verifyAttachment(user.uid, options.data.requestId)); return { id: options.data.requestId }; },
    reviewReservation: async options => { calls.push({ name: 'firestore-review', data: options.data }); }
  };
  const sandbox = { FRMS_RESERVATION_SERVICE: reservationService, Uint8Array, btoa: value => Buffer.from(value, 'binary').toString('base64'), CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, window: { dispatchEvent() {}, FIREBASE_CONFIG: { apiKey: 'test', projectId: 'test', appId: 'test' } }, firebase, console, document: { addEventListener: () => {} }, sessionStorage: { removeItem: () => {} }, location: { replace: () => {} } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('js/firebase/client.js', 'utf8'), sandbox);
  return { api: sandbox.window.FRMS, calls, writes, filters, subscriptions, persistence, deletes };
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

test('sessions are tab-specific and student live updates remain owner-scoped', async () => {
  const { api, filters, subscriptions, persistence } = client();
  let rows;
  const unsubscribe = await api.watchRequests(records => { rows = records; });
  assert.deepEqual(persistence, ['session']);
  assert(filters.some(filter => filter.join('/') === 'reservations/ownerUid/==/student-1'));
  subscriptions[0].callback({ docs: [{ id: 'request-1', data: () => ({ status: 'approved' }) }] });
  assert.equal(rows[0].status, 'approved');
  unsubscribe();
  assert.equal(subscriptions[1].stopped, true);
});

test('students can delete their own reservation atomically but cannot delete another student request', async () => {
  const student = client();
  await assert.rejects(student.api.deleteReservation('someone-elses-request'));
  assert.equal(student.deletes.length, 0);
  await student.api.deleteReservation('request-1');
  assert.deepEqual(student.deletes, ['bookings/hall_date_morning', 'documents/proposal', 'reservations/request-1']);
  const admin = client(true);
  await admin.api.deleteReservation('request-1');
  assert.deepEqual(admin.deletes, ['bookings/hall_date_morning', 'documents/proposal', 'reservations/request-1']);
  const other = client(true);
  await other.api.deleteReservation('old-request');
  assert(!other.deletes.some(path => path.startsWith('bookings/')));
});
