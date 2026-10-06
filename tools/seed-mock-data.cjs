// Run with administrator credentials after seed-database and provision-test-accounts.
// Existing profiles/catalog/requests and real booking locks are preserved.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { create } = require('../js/data/sample-data.js');
initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
const db = getFirestore();
function fields(value) {
  if (Array.isArray(value)) return value.map(fields);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.seconds === 'number') return Timestamp.fromMillis(value.seconds * 1000);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fields(item)]));
  }
  return value;
}
(async () => {
  const emails = ['frms-test-027efef2@example.com', 'frms-student2-test@example.com', 'frms-admin-test@example.com'];
  const accounts = await Promise.all(emails.map(email => getAuth().getUserByEmail(email)));
  if (accounts[2].customClaims?.admin !== true) throw new Error('Run the account provisioning tool first to grant test administrator access.');
  const samples = create({ studentUid: accounts[0].uid, otherUid: accounts[1].uid, adminUid: accounts[2].uid,
    studentEmail: emails[0], otherEmail: emails[1], adminEmail: emails[2] });
  for (const [name, records] of [['users', samples.users], ['venues', samples.venues], ['timeSlots', samples.timeSlots]]) {
    for (const record of records) {
      const ref = db.collection(name).doc(record.id || record.uid);
      const { id, ...data } = record;
      await db.runTransaction(async transaction => { if (!(await transaction.get(ref)).exists) transaction.set(ref, fields(data)); });
    }
  }
  let created = 0;
  for (const record of samples.reservations) {
    const ref = db.collection('reservations').doc(record.id);
    const booking = samples.bookings.find(booking => booking.reservationId === record.id);
    const events = samples.reservationEvents.filter(event => event.reservationId === record.id);
    const inserted = await db.runTransaction(async transaction => {
      if ((await transaction.get(ref)).exists) return false;
      let bookingRef;
      if (booking) {
        bookingRef = db.collection('bookings').doc(booking.id);
        const occupied = await transaction.get(bookingRef);
        if (occupied.exists && occupied.data().reservationId !== record.id) throw new Error(`Sample slot is occupied: ${booking.id}. No real booking was changed.`);
      }
      transaction.set(ref, fields(record));
      if (booking) { const { id, ...data } = booking; transaction.set(bookingRef, fields(data)); }
      for (const event of events) { const { id, ...data } = event; transaction.set(db.collection('reservationEvents').doc(id), fields(data)); }
      return true;
    });
    if (inserted) created++;
  }
  console.log(`Created ${created} sample reservations with matching bookings and audit events. Existing requests were preserved.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
