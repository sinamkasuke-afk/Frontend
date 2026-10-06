const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { create } = require('../js/data/sample-data.js');
function demo() {
  const local = new Map(), session = new Map();
  const storage = values => ({ getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), clear: () => values.clear() });
  const context = { window: { FRMS_DEMO_MODE: true }, FRMS_SAMPLE_DATA: { create }, localStorage: storage(local), sessionStorage: storage(session),
    document: { addEventListener() {} }, location: { replace() {} }, crypto: { randomUUID: () => 'new-event' }, console };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/firebase/demo.js', 'utf8'), context);
  return { api: context.window.FRMS_DEMO, local, context };
}
test('sample records have coherent users, audit events and booking locks', () => {
  const database = create({ now: new Date('2026-10-06T00:00:00Z') });
  assert.equal(database.reservations.length, 8); assert.equal(database.venues.length, 8);
  for (const record of database.reservations) {
    assert(database.users.some(user => user.uid === record.ownerUid));
    assert(database.reservationEvents.some(event => event.reservationId === record.id));
    assert.equal(database.bookings.some(booking => booking.reservationId === record.id), record.status !== 'declined');
  }
});
test('demo sign-in validates credentials and isolates student requests', async () => {
  const { api } = demo();
  await assert.rejects(api.login('student@example.com', 'wrong'));
  await api.login('student@example.com', 'Demo123!'); assert.equal((await api.requests()).length, 7);
  await assert.rejects(api.login('student@example.com', 'Demo123!', true));
  await api.login('student2@example.com', 'Demo123!'); assert.equal((await api.requests()).length, 1);
  await assert.rejects(api.reservationEvents('sample-request-1'));
  await api.login('admin@example.com', 'Demo123!', true); assert.equal((await api.requests(true)).length, 8);
});
test('demo decisions persist and declining restores slot availability', async () => {
  const { api } = demo(); await api.login('admin@example.com', 'Demo123!', true);
  const record = (await api.requests(true))[0];
  assert(!(await api.availableSlots(record.venueId, record.dateISO)).some(slot => slot.id === record.slotId));
  await api.updateStatus(record.id, 'declined');
  assert((await api.availableSlots(record.venueId, record.dateISO)).some(slot => slot.id === record.slotId));
  assert.equal((await api.requests(true))[0].status, 'declined');
  assert.equal((await api.reservationEvents(record.id)).at(-1).action, 'declined');
});
test('local demo selection bypasses Firebase initialization completely', () => {
  const { context } = demo();
  context.firebase = { initializeApp: () => { throw new Error('Must not initialize Firebase in demo mode'); } };
  vm.runInContext(fs.readFileSync('js/firebase/client.js', 'utf8'), context);
  assert.equal(context.window.FRMS, context.window.FRMS_DEMO);
});
