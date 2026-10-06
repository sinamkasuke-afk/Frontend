(() => {
class ReservationError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fail(code, message) { throw new ReservationError(code, message); }
function identifier(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(value)) fail('invalid-argument', `Invalid ${label}.`);
  return value;
}
function text(value, label, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > 4000 || (required && !value.trim())) fail('invalid-argument', `Invalid ${label}.`);
  return value.trim();
}
function dateISO(value, now) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid-argument', 'Choose a valid reservation date.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('invalid-argument', 'Choose a valid reservation date.');
  const today = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  if (value < today) fail('invalid-argument', 'Past dates cannot be reserved.');
  return value;
}
async function submitReservation({ db, actor, data, timestamp, now = new Date(), verifyAttachment }) {
  if (!actor?.uid) fail('unauthenticated', 'Sign in to submit a reservation.');
  const id = identifier(data.requestId, 'request ID');
  const reservationRef = db.collection('reservations').doc(id);
  // Check committed requests before validation/upload so retries still work later.
  const existing = await reservationRef.get();
  if (existing.exists) {
    if (existing.data().ownerUid !== actor.uid) fail('permission-denied', 'Request ID is already used.');
    return { id };
  }
  if (data.checkOnly === true) return { id: null };
  const venueId = identifier(data.venueId, 'venue');
  const slotId = identifier(data.slotId, 'time slot');
  const date = dateISO(data.dateISO, now);
  const event = text(data.event, 'event name', true);
  const guests = Number(data.expectedGuests);
  if (!Number.isInteger(guests) || guests < 1) fail('invalid-argument', 'Guest count must be a positive whole number.');
  const detail = {};
  for (const key of ['organization', 'eventType', 'purpose', 'contactPerson', 'facilityRequirements', 'setupNotes']) detail[key] = text(data[key], key, ["organization", "eventType", "purpose", "contactPerson"].includes(key));
  const bookingId = `${venueId}_${date}_${slotId}`;
  const bookingRef = db.collection('bookings').doc(bookingId);
  const eventRef = db.collection('reservationEvents').doc(`${id}_submitted`);
  const attachment = data.hasAttachment ? await verifyAttachment(actor.uid, id) : null;
  await db.runTransaction(async transaction => {
    const reservation = await transaction.get(reservationRef);
    if (reservation.exists) {
      if (reservation.data().ownerUid !== actor.uid) fail('permission-denied', 'Request ID is already used.');
      return;
    }
    const venue = await transaction.get(db.collection('venues').doc(venueId));
    const slot = await transaction.get(db.collection('timeSlots').doc(slotId));
    const booking = await transaction.get(bookingRef);
    if (!venue.exists || venue.data().active !== true) fail('failed-precondition', 'This facility is unavailable.');
    if (!slot.exists || slot.data().active !== true) fail('failed-precondition', 'This time slot is unavailable.');
    if (venue.data().capacity && guests > venue.data().capacity) fail('invalid-argument', 'The guest count exceeds this facility’s capacity.');
    if (booking.exists) fail('already-exists', 'This venue and time slot have already been reserved. Choose another slot.');
    const requester = actor.name || actor.email || actor.uid;
    const record = { ...detail, id, requestId: id, ownerUid: actor.uid, requester,
      requesterType: actor.admin ? 'Admin' : 'Student', initials: requester.slice(0, 2).toUpperCase(),
      venueId, venue: venue.data().name, venueDetail: venue.data().location || '',
      slotId, dateISO: date, date, time: slot.data().label, event,
      expectedGuests: guests, status: 'pending', bookingId, createdAt: timestamp(), attachment, lastEventId: eventRef.id };
    transaction.set(reservationRef, record);
    transaction.set(bookingRef, { reservationId: id, venueId, dateISO: date, slotId, createdAt: timestamp() });
    transaction.set(eventRef, { reservationId: id, ownerUid: actor.uid, actorUid: actor.uid, action: 'submitted', status: 'pending', createdAt: timestamp() });
  });
  return { id };
}
async function reviewReservation({ db, actor, data, timestamp }) {
  if (!actor?.uid) fail('unauthenticated', 'Sign in to review reservations.');
  if (!actor.admin) fail('permission-denied', 'Administrator access is required.');
  const id = identifier(data.id, 'request ID');
  if (!['approved', 'declined'].includes(data.status)) fail('invalid-argument', 'Invalid decision.');
  const ref = db.collection('reservations').doc(id);
  const eventRef = db.collection('reservationEvents').doc();
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) fail('not-found', 'Reservation was not found.');
    const record = snapshot.data();
    if (record.status === data.status) return;
    if (!record.bookingId) fail('failed-precondition', 'This legacy request has no booking record. Migrate it before reviewing.');
    const bookingRef = db.collection('bookings').doc(record.bookingId);
    const booking = await transaction.get(bookingRef);
    if (data.status === 'approved') {
      if (booking.exists && booking.data().reservationId !== id) fail('already-exists', 'Another request now holds this slot.');
      transaction.set(bookingRef, { reservationId: id, venueId: record.venueId, dateISO: record.dateISO, slotId: record.slotId, createdAt: timestamp() });
    } else if (booking.exists && booking.data().reservationId === id) transaction.delete(bookingRef);
    transaction.update(ref, { status: data.status, updatedAt: timestamp(), reviewedBy: actor.uid, lastEventId: eventRef.id });
    transaction.set(eventRef, { reservationId: id, ownerUid: record.ownerUid, actorUid: actor.uid, action: data.status, status: data.status, createdAt: timestamp() });
  });
  return { id, status: data.status };
}
const reservationService = { ReservationError, submitReservation, reviewReservation, dateISO };
if (typeof module !== 'undefined') module.exports = reservationService;
else window.FRMS_RESERVATION_SERVICE = reservationService;

})();
