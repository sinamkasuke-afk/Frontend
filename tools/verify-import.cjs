const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const db = getFirestore();
  const names = ['users', 'venues', 'timeSlots', 'reservations', 'bookings', 'reservationEvents'];
  for (const name of names) {
    const result = await db.collection(name).count().get();
    console.log(`${name}: ${result.data().count} documents`);
  }
  const requests = await db.collection('reservations').where('sample', '==', true).get();
  const counts = { pending: 0, approved: 0, declined: 0 };
  for (const doc of requests.docs) counts[doc.data().status]++;
  console.log('Sample reservation statuses: ' + JSON.stringify(counts));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
