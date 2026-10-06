const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const db = admin.firestore(); let updated = 0;
  for (const doc of (await db.collection('bookings').get()).docs) {
    await db.runTransaction(async tx => {
      const booking = await tx.get(doc.ref);
      if (!booking.exists) return;
      const request = await tx.get(db.collection('reservations').doc(booking.data().reservationId));
      if (!request.exists || !['pending','approved'].includes(request.data().status)) return;
      tx.update(doc.ref, { status: request.data().status, createdAt: request.data().status === 'pending' ? request.data().createdAt : booking.data().createdAt });
    }); updated++;
  }
  console.log(`Updated ${updated} booking leases without changing reservations.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
