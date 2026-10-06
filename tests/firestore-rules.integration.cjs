const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { submitReservation, reviewReservation, cancelReservation } = require('../functions/reservation-service.cjs');
const firebase = require('firebase/compat/app'); require('firebase/compat/firestore'); require('firebase/compat/auth');
let env;
const uid = 'student1', email = 'student@gmail.com';
const actor = { uid, email, name: 'Test Student' };
const stamp = () => firebase.firestore.FieldValue.serverTimestamp();
const dateISO = new Date(Date.now() + 8 * 3600000 + 2 * 86400000).toISOString().slice(0, 10);
const data = { requestId: 'request-1', venueId: 'hall', slotId: 'morning', dateISO, event: 'Meeting', expectedGuests: 10, organization: 'Club', eventType: 'Meeting', purpose: 'Planning', contactPerson: 'Student' };
function db(user = uid, verified = true, admin = false) {
  return env.authenticatedContext(user, { email: user === uid ? email : user + '@gmail.com', email_verified: verified, admin }).firestore();
}
function submit(database = db(), changes = {}) { return submitReservation({ db: database, actor, data: { ...data, ...changes }, timestamp: stamp }); }
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-frms-rules', firestore: { host: '127.0.0.1', port: 8086, rules: fs.readFileSync('firestore.rules', 'utf8') } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const database = ctx.firestore();
    await database.collection('venues').doc('hall').set({ name: 'Hall', active: true, capacity: 50, location: 'Campus' });
    await database.collection('venues').doc('other-hall').set({ name: 'Other Hall', active: true, capacity: 50, location: 'Campus' });
    await database.collection('timeSlots').doc('morning').set({ label: 'Morning', active: true, startMinutes: 420 });
    await database.collection('users').doc(uid).set({ uid, email, displayName: actor.name, role: 'student', studentId: '2026-001', enrollmentStatus: 'approved' });
  });
});
test('verified submission writes booking, request number, audit and daily quota', async () => {
  await assertSucceeds(submit());
  assert.equal((await db().collection('reservations').doc('request-1').get()).data().requestNumber, 1);
});
test('enrollment-approved students can submit without email verification', async () => { await assertSucceeds(submit(db(uid, false))); });
test('student cannot read another student reservation or approve it', async () => {
  await submit();
  await assertFails(db('other').collection('reservations').doc('request-1').get());
  await assertFails(reviewReservation({ db: db(), actor: { ...actor, admin: true }, data: { id: 'request-1', status: 'approved' }, timestamp: stamp }));
});
test('owner cancellation retains audit and releases slot; other users cannot cancel', async () => {
  await submit();
  await assertFails(cancelReservation({ db: db('other'), actor: { uid: 'other', admin: true }, data: { id: 'request-1' }, timestamp: stamp }));
  await assertSucceeds(cancelReservation({ db: db(), actor, data: { id: 'request-1' }, timestamp: stamp }));
  assert.equal((await db().collection('reservations').doc('request-1').get()).data().status, 'cancelled');
  assert.equal((await db().collection('bookings').doc('hall_' + dateISO + '_morning').get()).exists, false);
  await assertFails(db().collection('reservations').doc('request-1').delete());
});
test('same slot at different venues succeeds and same venue cannot be double booked', async () => {
  await submit();
  await assertSucceeds(submit(db(), { requestId: 'request-2', venueId: 'other-hall' }));
  await assert.rejects(submit(db(), { requestId: 'request-3' }), { code: 'already-exists' });
});
test('direct writes cannot forge displayed venue, dates, quotas or attach PDFs', async () => {
  const database = db();
  const badDb = changes => ({ collection: name => database.collection(name), runTransaction: action => database.runTransaction(tx => action({
    get: ref => tx.get(ref), set: (ref, record) => tx.set(ref, ref.parent.id === 'reservations' ? { ...record, ...changes } : record)
  })) });
  for (const changes of [{ venue: 'Fake Venue' }, { dateISO: '2026-02-31' }, { dateISO: '2000-01-01' }, { quotaId: 'student1_2000-01-01' }, { attachment: { name: 'file.pdf' } }]) {
    await assertFails(submit(badDb(changes)));
  }
  await submit();
  await assertFails(database.collection('reservations').doc('request-1').collection('documents').doc('proposal').set({ base64: 'fake' }));
});
test('admin approval and cancellation are permitted and cancelled requests cannot be reapproved', async () => {
  await submit();
  const admin = { uid: 'admin1', admin: true };
  await assertSucceeds(reviewReservation({ db: db('admin1', true, true), actor: admin, data: { id: 'request-1', status: 'approved' }, timestamp: stamp }));
  await assertSucceeds(cancelReservation({ db: db('admin1', true, true), actor: admin, data: { id: 'request-1' }, timestamp: stamp }));
  await assert.rejects(reviewReservation({ db: db('admin1', true, true), actor: admin, data: { id: 'request-1', status: 'approved' }, timestamp: stamp }), { code: 'failed-precondition' });
});
test('daily quota cannot exceed five even through direct writes', async () => {
  for (let i = 0; i < 5; i++) {
    const day = new Date(new Date(dateISO + 'T00:00:00Z').getTime() + i * 86400000).toISOString().slice(0, 10);
    await submit(db(), { requestId: 'request-' + i, dateISO: day });
  }
  await assert.rejects(submit(db(), { requestId: 'request-6', dateISO: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) }), { code: 'resource-exhausted' });
  const quotaId = uid + '_' + new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  await assertFails(db().collection('submissionLimits').doc(quotaId).update({ count: 0 }));
});
test('administrator expires old pending holds but cannot expire fresh requests', async () => {
  await submit();
  const options = { db: db('admin1', true, true), actor: { uid: 'admin1', admin: true }, data: { id: 'request-1', status: 'expired' }, timestamp: stamp };
  await assert.rejects(reviewReservation(options), { code: 'failed-precondition' });
  await env.withSecurityRulesDisabled(async ctx => {
    await ctx.firestore().collection('reservations').doc('request-1').update({ createdAt: firebase.firestore.Timestamp.fromMillis(Date.now() - 49 * 3600000) });
  });
  await assertSucceeds(reviewReservation(options));
  assert.equal((await db().collection('bookings').doc('hall_' + dateISO + '_morning').get()).exists, false);
});
test('Gmail alone is insufficient; only admin can approve enrollment', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await ctx.firestore().collection('users').doc(uid).update({ enrollmentStatus: 'pending' }); });
  await assertFails(submit());
  await assertFails(db().collection('users').doc(uid).update({ enrollmentStatus: 'approved' }));
  await assertSucceeds(db('admin1', true, true).collection('users').doc(uid).update({ enrollmentStatus: 'approved', studentId: '2026-001', approvedBy: 'admin1', updatedAt: stamp() }));
  await assertSucceeds(submit());
});
test('an expired pending slot can be reused without an admin; expiration cannot free the replacement slot', async () => {
  await submit();
  await env.withSecurityRulesDisabled(async ctx => {
    const old = firebase.firestore.Timestamp.fromMillis(Date.now() - 49 * 3600000);
    await ctx.firestore().collection('reservations').doc('request-1').update({ createdAt: old });
    await ctx.firestore().collection('bookings').doc('hall_' + dateISO + '_morning').update({ createdAt: old });
  });
  await assert.rejects(reviewReservation({ db: db('admin1', true, true), actor: { uid: 'admin1', admin: true }, data: { id: 'request-1', status: 'approved' }, timestamp: stamp }), { code: 'failed-precondition' });
  await assertSucceeds(submit(db(), { requestId: 'replacement' }));
  const options = { db: db('admin1', true, true), actor: { uid: 'admin1', admin: true }, data: { id: 'request-1', status: 'expired' }, timestamp: stamp };
  await assertSucceeds(reviewReservation(options));
  assert.equal((await db().collection('bookings').doc('hall_' + dateISO + '_morning').get()).data().reservationId, 'replacement');
});
test('approved bookings cannot be stolen even if their creation time is old', async () => {
  await submit();
  await reviewReservation({ db: db('admin1', true, true), actor: { uid: 'admin1', admin: true }, data: { id: 'request-1', status: 'approved' }, timestamp: stamp });
  await env.withSecurityRulesDisabled(async ctx => { await ctx.firestore().collection('bookings').doc('hall_' + dateISO + '_morning').update({ createdAt: firebase.firestore.Timestamp.fromMillis(Date.now() - 49 * 3600000) }); });
  await assert.rejects(submit(db(), { requestId: 'replacement' }), { code: 'already-exists' });
});
test('real Auth emulator workflow: register without verification, admin enrollment approval, login, submit, approve and cancel', async () => {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Auth emulator must be running; refusing external email operations.');
  const app = firebase.initializeApp({ projectId: 'demo-frms-rules', apiKey: 'demo-key', authDomain: 'demo-frms-rules.firebaseapp.com' }, 'auth-workflow');
  const auth = app.auth(); auth.useEmulator('http://127.0.0.1:9096', { disableWarnings: true });
  const database = app.firestore(); database.useEmulator('127.0.0.1', 8086);
  try {
    const email = 'integration-student@gmail.com', password = 'EmulatorTest123!';
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const student = credential.user;
    await student.updateProfile({ displayName: 'Integration Student' });
    await database.collection('users').doc(student.uid).set({ uid: student.uid, email, displayName: student.displayName, role: 'student', studentId: '2026-TEST', enrollmentStatus: 'pending', createdAt: stamp() });
    const options = { db: database, actor: { uid: student.uid, email, name: student.displayName }, data: { ...data, requestId: 'auth-request' }, timestamp: stamp };
    await assertFails(submitReservation(options));
    assert.equal(student.emailVerified, false);
    await db('admin1', true, true).collection('users').doc(student.uid).update({ enrollmentStatus: 'approved', approvedBy: 'admin1', updatedAt: stamp() });
    await auth.signOut();
    await assert.rejects(auth.signInWithEmailAndPassword(email, 'WrongPassword123!'));
    await auth.signInWithEmailAndPassword(email, password);
    await assertSucceeds(submitReservation(options));
    await assertSucceeds(reviewReservation({ db: db('admin1', true, true), actor: { uid: 'admin1', admin: true }, data: { id: 'auth-request', status: 'approved' }, timestamp: stamp }));
    assert.equal((await database.collection('reservations').doc('auth-request').get()).data().status, 'approved');
    await assertSucceeds(cancelReservation({ db: database, actor: options.actor, data: { id: 'auth-request' }, timestamp: stamp }));
    assert.equal((await database.collection('reservations').doc('auth-request').get()).data().status, 'cancelled');
  } finally { await app.delete(); }
});
