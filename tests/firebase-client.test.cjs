const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function client(isAdmin = false, verified = true, profileName = null, submissionError = null) {
  const calls = [], writes = [], filters = [], subscriptions = [], persistence = [], deletes = [], fetches = [];
  const user = { emailVerified: verified, reload: async () => {}, getIdToken: async () => 'token', sendEmailVerification: async () => calls.push({ name: 'verification-email' }), uid: 'student-1', email: 'student@example.com', updateProfile: async profile => { user.displayName = profile.displayName; }, getIdTokenResult: async () => ({ claims: { admin: isAdmin } }) };
  const records = {
    reservations: [{ id: 'request-1', value: { ownerUid: user.uid, status: 'pending' } }],
    venues: [{ id: 'hall', value: { active: true, name: 'Hall', order: 1 } }],
    timeSlots: [{ id: 'morning', value: { startMinutes: 420, endMinutes:600 } }, { id: 'midday', value: { startMinutes: 600, endMinutes:780 } }],
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
      orderBy: (...args) => { filters.push([name,'orderBy',...args]); return query; },
      limit: amount => { filters.push([name,'limit',amount]); return query; },
      get: async () => ({ docs: (records[name] || []).map(record => ({ id: record.id, data: () => record.value })) }),
      onSnapshot: callback => {
        subscriptions.push({ name, callback });
        return () => subscriptions.push({ stopped: true });
      },
      doc: id => ({ name, id, collection: sub => ({ doc: child => ({ name: sub, id: child }) }), onSnapshot: (options, callback) => { subscriptions.push({name, options, callback}); return () => {}; }, get: async () => ({ exists: false, data: () => ({ displayName: profileName || user.displayName || user.email, enrollmentStatus: 'approved', studentId: '2026-001', confirmedStudentId: '2026-001' }) }), set: async data => writes.push({ name, id, data }) })
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
    submitReservation: async options => { options.onProgress?.(85, 'Saving your reservation…'); if (submissionError) throw submissionError; calls.push({ name: 'server-submit', data: options.data }); if(options.data.hasAttachment) calls.push(await options.verifyAttachment(user.uid, options.data.requestId)); return { id: options.data.requestId }; },
    cancelReservation: async options => { calls.push({ name: 'firestore-cancel', data: options.data }); },
    reviewReservation: async options => { calls.push({ name: 'firestore-review', data: options.data }); }
  };
  const sandbox = { fetch: async (url, options) => { fetches.push({ url, options }); if (url === '/api/admin-register') isAdmin = true; if (url === '/api/reservation-submit') { const data = JSON.parse(options.body); calls.push({name:'server-submit',data}); return {ok:!submissionError,json:async()=>submissionError ? {error:submissionError.message} : {id:data.requestId}}; } return { ok: true, json: async () => [{ result: { aggregateFields: { count: { integerValue: '3' } } } }] }; }, FRMS_RESERVATION_SERVICE: reservationService, Uint8Array, btoa: value => Buffer.from(value, 'binary').toString('base64'), CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, window: { dispatchEvent() {}, FIREBASE_CONFIG: { apiKey: 'test', projectId: 'test', appId: 'test' } }, firebase, console, document: { addEventListener: () => {}, createElement: () => ({ style: {}, append() {} }), body: { prepend() {} } }, sessionStorage: { removeItem: () => {} }, location: { replace: () => {} } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('js/firebase/client.js', 'utf8'), sandbox);
  return { api: sandbox.window.FRMS, calls, writes, filters, subscriptions, persistence, deletes, fetches, records };
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
test('submission does not require email verification and has no PDF support', async () => {
  const { api, calls } = client();
  assert.equal(await api.submit({ requestId: 'request-1', venueId: 'hall' }), 'request-1');
  assert.equal(calls[0].name, 'server-submit');
  assert(!('hasAttachment' in calls[0].data));
  assert.equal(api.openDocument, undefined);
  const unverified = client(false, false);
  assert.equal(await unverified.api.submit({ requestId: 'request-1' }), 'request-1');
  assert.equal(unverified.calls[0].name, 'server-submit');
});
test('student cannot invoke admin review; admin uses a Firestore transaction', async () => {
  const student = client(); await assert.rejects(student.api.updateStatus('request-1', 'approved'));
  assert.equal(student.calls.length, 0);
  const admin = client(true); await admin.api.updateStatus('request-1', 'approved');
  assert.equal(admin.calls[0].name, 'firestore-review');
});

test('registration saves a student profile and name without copying passwords', async () => {
  const { api, writes } = client(true);
  await api.register(' Alex Student ', 'alex@gmail.com', 'TestPass123!', '2026-001');
  assert.equal(writes[0].name, 'users');
  assert.equal(writes[0].data.role, 'student');
  assert.equal(writes[0].data.displayName, 'Alex Student');
  assert(!('password' in writes[0].data));
  await assert.rejects(api.updateStatus('request-1', 'approved'));
});
test('invalid registration input cannot create a profile', async () => {
  const { api, writes } = client();
  await assert.rejects(api.register('', 'alex@gmail.com', 'TestPass123!'));
  await assert.rejects(api.register('Alex', 'alex', 'TestPass123!'));
  await assert.rejects(api.register('Alex', 'alex@gmail.com', 'short'));
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

test('cancellation calls the audited service without deleting documents', async () => {
  const { api, calls, deletes } = client();
  await api.cancelReservation('request-1');
  assert.equal(calls[0].name, 'firestore-cancel');
  assert.equal(calls[0].data.id, 'request-1');
  assert.equal(deletes.length, 0);
  assert.equal(api.deleteReservation, undefined);
});

test('global totals use owner-scoped aggregation queries instead of downloading all reservations', async () => {
  const { api, fetches } = client();
  const counts = await api.requestCounts();
  assert.equal(counts.total, 3);
  assert.equal(fetches.length, 6);
  for (const request of fetches) {
    const body = JSON.parse(request.options.body);
    assert.equal(body.structuredAggregationQuery.aggregations[0].alias, 'count');
    assert(request.options.body.includes('student-1'));
    assert.equal(request.options.headers.Authorization, 'Bearer token');
  }
});
test('slot availability ignores expired pending holds but preserves old approved bookings', async () => {
  const { api, records } = client();
  records.bookings[0].value = { slotId: 'morning', status: 'pending', createdAt: { seconds: Math.floor(Date.now() / 1000) - 49 * 3600 } };
  assert.deepEqual(Array.from(await api.availableSlots('hall', '2026-10-15'), slot => slot.id), ['morning', 'midday']);
  records.bookings[0].value.status = 'approved';
  assert.deepEqual(Array.from(await api.availableSlots('hall', '2026-10-15'), slot => slot.id), ['midday']);
});

test('navbar identity uses the saved student profile name', async () => {
  const { api } = client(false, true, 'Maria Student');
  const identity = await api.currentUser();
  assert.equal(identity.displayName, 'Maria Student');
  assert.equal(identity.role, 'student');
});
test('student login rejects an administrator account', async () => {
  const { api, writes } = client(true);
  await assert.rejects(api.login('admin@example.com', 'secret', false), /Use Admin Login/);
  assert.equal(writes.length, 0);
});

test('administrator registration saves an application and immediately enables admin login', async () => {
  const { api, writes } = client();
  await api.registerAdmin('New Administrator', 'newadmin@example.com', 'Password123!', 'a'.repeat(48));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].name, 'adminApplications');
  assert.equal(writes[0].data.status, 'pending');
  assert.equal(writes[0].data.displayName, 'New Administrator');
  assert(!('password' in writes[0].data));
  assert.equal((await api.currentUser()).role, 'admin');
});

test('submission progress reaches completion only after a successful save', async () => {
  const progress = [];
  await client().api.submit({ requestId: 'progress-request' }, percent => progress.push(percent));
  assert.deepEqual(progress, [10, 25, 40, 60, 100]);
});
test('failed submission never reports 100 percent', async () => {
  const progress = [];
  await assert.rejects(client(false, true, null, new Error('Slot occupied')).api.submit({ requestId: 'progress-request' }, percent => progress.push(percent)), /Slot occupied/);
  assert(!progress.includes(100));
});

test('dashboard reads are limited and calendar reads are scoped to the selected month', async () => {
  const {api,filters}=client(true);
  await api.requests(true,{limit:10});
  assert(filters.some(item=>item.join('/')==='reservations/limit/10'));
  await api.requests(true,{month:'2026-10'});
  assert(filters.some(item=>item.join('/')==='reservations/dateISO/>=/2026-10-01'));
  assert(filters.some(item=>item.join('/')==='reservations/dateISO/</2026-11-01'));
});
test('upcoming reservation is fetched independently of the recent page', async () => {
  const {api,filters}=client();await api.upcomingReservation();
  assert(filters.some(item=>item.join('/')==='reservations/status/==/approved'));
  assert(filters.some(item=>item.join('/')==='reservations/limit/1'));
});

test('ID confirmation does not disappear before Firebase acknowledges the write', async () => {
  const {api,subscriptions}=client(); const received=[];
  await api.watchEnrollment(profile=>received.push(profile));
  const watch=subscriptions.find(item=>item.name==='users');
  assert.equal(watch.options.includeMetadataChanges,true);
  watch.callback({metadata:{hasPendingWrites:true},data:()=>({confirmedStudentId:'2026-001'})});
  assert.equal(received.length,0);
  watch.callback({metadata:{hasPendingWrites:false},data:()=>({confirmedStudentId:'2026-001'})});
  assert.equal(received.length,1);
});

test('legacy custom bookings block their encoded hours rather than the entire day', async () => {
  const { api, records } = client();
  records.bookings[0].value = { slotId: 'hours-300-420', status: 'approved' };
  const slots = await api.availableSlots('garden', '2026-10-15');
  assert.deepEqual(Array.from(slots, slot => slot.id), ['morning', 'midday']);
  assert.equal(slots.blocked[0].startMinutes, 300);
  assert.equal(slots.blocked[0].endMinutes, 420);
});
