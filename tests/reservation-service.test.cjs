const test = require('node:test');
const assert = require('node:assert/strict');
const { submitReservation, reviewReservation, dateISO } = require('../functions/reservation-service.cjs');
function database() {
  const records = new Map([
    ['venues/hall', { name: 'Hall', active: true, capacity: 50 }],
    ['timeSlots/morning', { label: '7:00 AM – 10:00 AM', active: true }]
  ]);
  let sequence = 0, queue = Promise.resolve();
  const ref = key => ({ key, id: key.split('/').at(-1), get: async () => snapshot(key) });
  const snapshot = key => ({ exists: records.has(key), data: () => records.get(key) });
  const db = {
    collection: name => ({ doc: id => ref(`${name}/${id || 'event-' + ++sequence}`) }),
    runTransaction: action => {
      const result = queue.then(async () => {
        const changes = [];
        const result = await action({
          get: async ref => snapshot(ref.key),
          set: (ref, data) => changes.push(() => records.set(ref.key, data)),
          update: (ref, data) => changes.push(() => records.set(ref.key, { ...records.get(ref.key), ...data })),
          delete: ref => changes.push(() => records.delete(ref.key))
        });
        changes.forEach(change => change()); return result;
      });
      queue = result.catch(() => {}); return result;
    }
  };
  return { db, records };
}
const student = { uid: 'student-1', email: 'student@example.com' };
const admin = { uid: 'admin-1', admin: true };
const data = { requestId: 'request-1', venueId: 'hall', slotId: 'morning', dateISO: '2026-10-15', event: 'Assembly', expectedGuests: 25, organization: 'Club', eventType: 'Meeting', purpose: 'Planning', contactPerson: 'Student' };
function submit(db, overrides = {}, actor = student) {
  return submitReservation({ db, actor, data: { ...data, ...overrides }, timestamp: () => 'SERVER', now: new Date('2026-10-06T00:00:00Z'), verifyAttachment: async () => ({ path: 'proposal.pdf' }) });
}
function review(db, status, id = data.requestId, actor = admin) {
  return reviewReservation({ db, actor, data: { id, status }, timestamp: () => 'SERVER' });
}
test('submission atomically writes pending request, booking and audit event', async () => {
  const { db, records } = database(); await submit(db, { status: 'approved', ownerUid: 'spoof' });
  const request = records.get('reservations/request-1');
  assert.equal(request.ownerUid, student.uid); assert.equal(request.status, 'pending');
  assert.equal(records.get('bookings/hall_2026-10-15_morning').reservationId, request.id);
  assert.equal(records.get('reservationEvents/request-1_submitted').action, 'submitted');
});
test('competing submissions yield exactly one reservation and one occupied slot', async () => {
  const { db, records } = database();
  const outcomes = await Promise.allSettled([submit(db), submit(db, { requestId: 'request-2' })]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(result => result.status === 'rejected').reason.code, 'already-exists');
  assert.equal([...records.keys()].filter(key => key.startsWith('bookings/')).length, 1);
});
test('submission retries are idempotent and IDs cannot be stolen', async () => {
  const { db, records } = database(); await submit(db); await submit(db);
  assert.equal([...records.keys()].filter(key => key.startsWith('reservationEvents/')).length, 1);
  await assert.rejects(submit(db, {}, { uid: 'other-user' }), { code: 'permission-denied' });
});
test('decline releases lock; later request prevents reapproval of old request', async () => {
  const { db, records } = database(); await submit(db); await review(db, 'declined');
  assert(!records.has('bookings/hall_2026-10-15_morning'));
  await submit(db, { requestId: 'request-2' });
  await assert.rejects(review(db, 'approved'), { code: 'already-exists' });
  assert.equal(records.get('reservations/request-1').status, 'declined');
});
test('approval retains booking; duplicate review does not duplicate audit', async () => {
  const { db, records } = database(); await submit(db); await review(db, 'approved'); await review(db, 'approved');
  assert(records.has('bookings/hall_2026-10-15_morning'));
  assert.equal([...records.keys()].filter(key => key.startsWith('reservationEvents/')).length, 2);
});
test('rejects missing auth, student decisions, malformed dates, inactive venues and excess guests', async () => {
  const { db, records } = database();
  await assert.rejects(submit(db, {}, null), { code: 'unauthenticated' });
  await assert.rejects(review(db, 'approved', 'request-1', student), { code: 'permission-denied' });
  await assert.rejects(submit(db, { dateISO: '2026-02-31' }), { code: 'invalid-argument' });
  await assert.rejects(submit(db, { dateISO: '2026-10-01' }), { code: 'invalid-argument' });
  await assert.rejects(submit(db, { expectedGuests: 51 }), { code: 'invalid-argument' });
  await assert.rejects(submit(db, { expectedGuests: 2.5 }), { code: 'invalid-argument' });
  records.set('venues/hall', { name: 'Hall', active: false });
  await assert.rejects(submit(db), { code: 'failed-precondition' });
  assert.equal([...records.keys()].filter(key => key.startsWith('reservations/')).length, 0);
});
test('date boundary follows Manila timezone and attachments are recorded', async () => {
  assert.throws(() => dateISO('2026-10-06', new Date('2026-10-06T17:00:00Z')), { code: 'invalid-argument' });
  const { db, records } = database(); await submit(db, { hasAttachment: true });
  assert.equal(records.get('reservations/request-1').attachment.path, 'proposal.pdf');
});

test('upload preflight is read-only and returns committed requests even after event date', async () => {
  const { db, records } = database();
  const options = { db, actor: student, data: { requestId: 'request-1', checkOnly: true }, timestamp: () => 'SERVER' };
  assert.deepEqual(await submitReservation(options), { id: null });
  assert.equal(records.size, 2);
  await submit(db);
  assert.deepEqual(await submitReservation({ ...options, now: new Date('2027-01-01T00:00:00Z') }), { id: 'request-1', requestNumber: 1 });
  await assert.rejects(submitReservation({ ...options, actor: { uid: 'other-user' } }), { code: 'permission-denied' });
});

test('request numbers increment across slots, remain stable on retries and stop at five digits', async () => {
  const { db, records } = database();
  assert.equal((await submit(db)).requestNumber, 1);
  assert.equal((await submit(db)).requestNumber, 1);
  assert.equal((await submit(db, { requestId: 'request-2', dateISO: '2026-10-16' })).requestNumber, 2);
  assert.equal(records.get('counters/reservations').value, 2);
  records.set('counters/reservations', { value: 99999 });
  await assert.rejects(submit(db, { requestId: 'request-3', dateISO: '2026-10-17' }), { code: 'failed-precondition' });
  assert(!records.has('reservations/request-3'));
});
