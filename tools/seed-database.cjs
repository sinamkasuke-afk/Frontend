// Run with project administrator Application Default Credentials.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
const db = getFirestore();
const venues = [
  { id: 'canteen', name: 'Canteen', location: '2nd Floor' },
  { id: 'garden', name: 'Garden', location: 'Outdoor' },
  { id: 'multipurpose-hall', name: 'Multipurpose Hall', capacity: 300, featured: true,
    description: 'Ideal for seminars and organizational conferences.', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80', tags: ['Seminars', 'Conferences', 'Events'] },
  { id: 'social-hall', name: 'Social Hall', capacity: 150, featured: true,
    description: 'Tailored for banquets and academic celebrations.', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80', tags: ['Banquets', 'Academic Events', 'Meetings'] },
  { id: 'amphitheater', name: 'Amphitheater' },
  { id: 'classroom', name: 'Classroom' },
  { id: 'school-gymnasium', name: 'School Gymnasium', capacity: 1000, featured: true,
    description: 'Perfect for sports tournaments, pep rallies, and large events.', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80', tags: ['Sports', 'Tournaments', 'Exhibitions'] },
  { id: 'open-courtyard', name: 'Open Courtyard', capacity: 400, featured: true,
    description: 'Ideal for outdoor fairs, concerts, and campus festivals.', image: 'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?auto=format&fit=crop&w=900&q=80', tags: ['Fairs', 'Concerts', 'Outdoor Events'] }
];
const slots = [
  { id: 'morning', label: '7:00 AM – 10:00 AM', startMinutes: 420, endMinutes: 600 },
  { id: 'midday', label: '10:00 AM – 1:00 PM', startMinutes: 600, endMinutes: 780 },
  { id: 'afternoon', label: '1:00 PM – 4:00 PM', startMinutes: 780, endMinutes: 960 }
];
(async () => {
  // Create missing catalog documents without overwriting administrator edits.
  let created = 0;
  for (const [collection, records] of [['venues', venues], ['timeSlots', slots]]) {
    for (let order = 0; order < records.length; order++) {
      const { id, ...record } = records[order];
      const ref = db.collection(collection).doc(id);
      await db.runTransaction(async transaction => {
        const existing = await transaction.get(ref);
        if (existing.exists) return;
        transaction.set(ref, { ...record, active: true, order, createdAt: FieldValue.serverTimestamp() });
      });
      created++;
    }
  }
  console.log(`Checked ${created} venue/slot records. Collections with reservations, bookings, and events populate on the first real submission.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
