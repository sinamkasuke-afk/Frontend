const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const db = admin.firestore();
  const docs = (await db.collection('reservations').get()).docs.sort((a, b) => (a.data().createdAt?.seconds || 0) - (b.data().createdAt?.seconds || 0) || a.id.localeCompare(b.id));
  let assigned = 0;
  for (const doc of docs) {
    await db.runTransaction(async tx => {
      const ref = db.collection('counters').doc('reservations');
      const [current, counter] = await Promise.all([tx.get(doc.ref), tx.get(ref)]);
      if (!current.exists || current.data().requestNumber) return;
      const value = Math.max(counter.exists ? counter.data().value : 0, ...docs.map(d => d.data().requestNumber || 0)) + 1;
      if (value > 99999) throw new Error('Request number limit reached.');
      tx.update(doc.ref, { requestNumber: value });
      tx.set(ref, { value, reservationId: doc.id });
    });
    if (!doc.data().requestNumber) assigned++;
  }
  console.log(`Assigned short request numbers to ${assigned} existing reservations.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
