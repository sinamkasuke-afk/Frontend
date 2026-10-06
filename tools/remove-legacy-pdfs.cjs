// Permanently removes the PDF feature's previously stored data. Never prints file contents.
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const db = admin.firestore();
  let removed = 0;
  for (const doc of (await db.collection('reservations').get()).docs) {
    const files = await doc.ref.collection('documents').get();
    const batch = db.batch();
    files.docs.forEach(file => { batch.delete(file.ref); removed++; });
    if ('attachment' in doc.data()) batch.update(doc.ref, { attachment: admin.firestore.FieldValue.delete() });
    await batch.commit();
  }
  console.log(`Removed ${removed} legacy supporting-document records.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
