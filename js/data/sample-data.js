/* Shared sample generator for local demo mode and the trusted Firestore importer. */
(function (root) {
  function create(options = {}) {
    const now = options.now || new Date();
    const studentUid = options.studentUid || 'demo-student';
    const otherUid = options.otherUid || 'demo-other-student';
    const adminUid = options.adminUid || 'demo-admin';
    const seconds = Math.floor(now.getTime() / 1000);
    const users = [
      { uid: studentUid, email: options.studentEmail || 'student@example.com', displayName: 'Alex Santos', role: 'student', createdAt: { seconds } },
      { uid: otherUid, email: options.otherEmail || 'student2@example.com', displayName: 'Jamie Reyes', role: 'student', createdAt: { seconds } },
      { uid: adminUid, email: options.adminEmail || 'admin@example.com', displayName: 'PFMO Test Admin', role: 'admin', createdAt: { seconds } }
    ];
    const venues = [
      ['canteen', 'Canteen', 100], ['garden', 'Garden', 200],
      ['multipurpose-hall', 'Multipurpose Hall', 300], ['social-hall', 'Social Hall', 150],
      ['amphitheater', 'Amphitheater', 250], ['classroom', 'Classroom', 40],
      ['school-gymnasium', 'School Gymnasium', 1000], ['open-courtyard', 'Open Courtyard', 400]
    ].map(([id, name, capacity], order) => ({ id, name, capacity, order, active: true,
      featured: ['multipurpose-hall', 'social-hall', 'school-gymnasium', 'open-courtyard'].includes(id),
      description: `Sample ${name.toLowerCase()} for school events.`, location: 'Sample campus location',
      tags: ['School events'], image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80' }));
    const timeSlots = [
      { id: 'morning', label: '7:00 AM – 10:00 AM', startMinutes: 420, endMinutes: 600, active: true },
      { id: 'midday', label: '10:00 AM – 1:00 PM', startMinutes: 600, endMinutes: 780, active: true },
      { id: 'afternoon', label: '1:00 PM – 4:00 PM', startMinutes: 780, endMinutes: 960, active: true }
    ];
    const events = ['IT General Assembly', 'Research Proposal Defense', 'Student Council Meeting', 'Leadership Workshop', 'Sports Club Orientation', 'Community Outreach Planning', 'Academic Recognition Ceremony', 'Arts Society Rehearsal'];
    const statuses = ['pending', 'approved', 'declined', 'pending', 'approved', 'declined', 'approved', 'pending'];
    const reservations = events.map((event, index) => {
      const owner = index === 7 ? users[1] : users[0];
      const venue = venues[index]; const slot = timeSlots[index % 3];
      const shifted = new Date(now.getTime() + 8 * 3600000 + (index + 1) * 86400000);
      const dateISO = shifted.toISOString().slice(0, 10); const id = `sample-request-${index + 1}`;
      return { id, requestId: id, ownerUid: owner.uid, requester: owner.displayName, requesterType: 'Student',
        initials: owner.displayName.split(' ').map(name => name[0]).join(''), venueId: venue.id, venue: venue.name,
        venueDetail: venue.location, slotId: slot.id, date: dateISO, dateISO, time: slot.label, event,
        status: statuses[index], expectedGuests: Math.min(30 + index * 5, venue.capacity), organization: 'Sample Student Organization',
        eventType: 'School activity', purpose: `Organize ${event.toLowerCase()}.`, contactPerson: owner.email,
        facilityRequirements: 'Projector, microphone and chairs', setupNotes: 'Arrange chairs before the event.',
        bookingId: `${venue.id}_${dateISO}_${slot.id}`, attachment: null, createdAt: { seconds: seconds - index * 3600 },
        ...(statuses[index] !== 'pending' ? { reviewedBy: adminUid, updatedAt: { seconds } } : {}), sample: true };
    });
    const bookings = reservations.filter(record => record.status !== 'declined').map(record => ({ id: record.bookingId,
      reservationId: record.id, venueId: record.venueId, dateISO: record.dateISO, slotId: record.slotId, createdAt: record.createdAt }));
    const reservationEvents = reservations.flatMap(record => [
      { id: `${record.id}_submitted`, reservationId: record.id, ownerUid: record.ownerUid, actorUid: record.ownerUid, action: 'submitted', status: 'pending', createdAt: record.createdAt },
      ...(record.status === 'pending' ? [] : [{ id: `${record.id}_review`, reservationId: record.id, ownerUid: record.ownerUid, actorUid: adminUid, action: record.status, status: record.status, createdAt: { seconds } }])
    ]);
    return { users, venues, timeSlots, reservations, bookings, reservationEvents };
  }
  root.FRMS_SAMPLE_DATA = { create };
  if (typeof module !== 'undefined') module.exports = { create };
})(globalThis);
