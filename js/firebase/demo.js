/* Explicit local demo. Never grants access to Firebase or changes cloud records. */
if (window.FRMS_DEMO_MODE === true) {
  window.FRMS_DEMO = (() => {
    const key = 'frms_demo_database_v1';
    const userKey = 'frms_demo_user';
    function read() {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
      const database = FRMS_SAMPLE_DATA.create(); write(database); return database;
    }
    function write(database) { localStorage.setItem(key, JSON.stringify(database)); }
    function currentUser() { return read().users.find(user => user.uid === sessionStorage.getItem(userKey)); }
    function showError(error) {
      let element = document.getElementById('firebase-error');
      if (!element) { element = document.createElement('p'); element.id = 'firebase-error'; element.setAttribute('role', 'alert'); document.body.prepend(element); }
      element.textContent = error.message;
    }
    const ready = Promise.resolve();
    async function requireUser(isAdmin = false) {
      const user = currentUser();
      if (!user) { location.replace(isAdmin ? 'admin-login.html' : 'login.html'); return false; }
      if (isAdmin && user.role !== 'admin') { location.replace('dashboard.html'); return false; }
      return true;
    }
    async function login(email, password, isAdmin = false) {
      const user = read().users.find(user => user.email === email.trim().toLowerCase());
      if (!user || password !== 'Demo123!') throw new Error('Use a demo email and the password Demo123!');
      if (isAdmin && user.role !== 'admin') throw new Error('This demo account is not an administrator.');
      sessionStorage.setItem(userKey, user.uid); sessionStorage.removeItem('frms_reservation');
    }
    async function requests(isAdmin = false) {
      if (!await requireUser(isAdmin)) return [];
      return read().reservations.filter(record => isAdmin || record.ownerUid === currentUser().uid);
    }
    async function venues() { return read().venues.filter(venue => venue.active); }
    async function availableSlots(venueId, dateISO) {
      if (!await requireUser()) return [];
      const database = read();
      const occupied = database.bookings.filter(booking => booking.venueId === venueId && booking.dateISO === dateISO);
      return database.timeSlots.filter(slot => slot.active && !occupied.some(booking => booking.slotId === slot.id));
    }
    async function fileStore(mode, action) {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('frms-demo-files', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      try { return await new Promise((resolve, reject) => {
        const transaction = db.transaction('files', mode); const request = action(transaction.objectStore('files'));
        transaction.oncomplete = () => resolve(request.result); transaction.onerror = () => reject(transaction.error);
      }); } finally { db.close(); }
    }
    async function submit(data, file) {
      if (!await requireUser()) throw new Error('Sign in to submit.');
      const database = read(); const user = currentUser();
      const existing = database.reservations.find(record => record.id === data.requestId);
      if (existing) { if (existing.ownerUid !== user.uid) throw new Error('Request ID is in use.'); return existing.id; }
      const venue = database.venues.find(venue => venue.id === data.venueId && venue.active);
      const slot = database.timeSlots.find(slot => slot.id === data.slotId && slot.active);
      if (!venue || !slot) throw new Error('Choose a valid venue and slot.');
      if (!Number.isInteger(Number(data.expectedGuests)) || Number(data.expectedGuests) < 1 || Number(data.expectedGuests) > venue.capacity) throw new Error('Check the guest count and venue capacity.');
      const bookingId = `${venue.id}_${data.dateISO}_${slot.id}`;
      if (database.bookings.some(booking => booking.id === bookingId)) throw new Error('This slot is already reserved.');
      const createdAt = { seconds: Math.floor(Date.now() / 1000) };
      if (file) await fileStore('readwrite', store => store.put(file, data.requestId));
      // Read again after async file storage so another local submission cannot be overwritten.
      const latest = read();
      if (latest.bookings.some(booking => booking.id === bookingId)) throw new Error('This slot is already reserved.');
      latest.reservations.unshift({ ...data, id: data.requestId, ownerUid: user.uid, requester: user.displayName,
        requesterType: 'Student', initials: user.displayName.slice(0, 2), venue: venue.name, venueDetail: venue.location,
        date: data.dateISO, time: slot.label, status: 'pending', bookingId, createdAt,
        attachment: file ? { path: data.requestId, name: file.name } : null });
      latest.bookings.push({ id: bookingId, reservationId: data.requestId, venueId: venue.id, dateISO: data.dateISO, slotId: slot.id });
      latest.reservationEvents.push({ id: `${data.requestId}_submitted`, reservationId: data.requestId, ownerUid: user.uid, actorUid: user.uid, action: 'submitted', createdAt });
      write(latest); return data.requestId;
    }
    async function updateStatus(id, status) {
      if (!await requireUser(true)) throw new Error('Administrator access required.');
      if (!['approved', 'declined'].includes(status)) throw new Error('Invalid decision.');
      const database = read(); const request = database.reservations.find(record => record.id === id);
      if (!request) throw new Error('Request not found.');
      if (request.status === status) return;
      const occupied = database.bookings.find(booking => booking.id === request.bookingId);
      if (status === 'approved' && occupied && occupied.reservationId !== id) throw new Error('Another request holds this slot.');
      database.bookings = database.bookings.filter(booking => booking.reservationId !== id);
      if (status === 'approved') database.bookings.push({ id: request.bookingId, reservationId: id, venueId: request.venueId, dateISO: request.dateISO, slotId: request.slotId });
      request.status = status; request.reviewedBy = currentUser().uid; request.updatedAt = { seconds: Math.floor(Date.now() / 1000) };
      database.reservationEvents.push({ id: crypto.randomUUID(), reservationId: id, ownerUid: request.ownerUid, actorUid: currentUser().uid, action: status, createdAt: request.updatedAt });
      write(database);
    }
    async function reservationEvents(id) {
      if (!await requireUser()) return [];
      const user = currentUser(); const database = read();
      const request = database.reservations.find(record => record.id === id);
      if (!request || (user.role !== 'admin' && request.ownerUid !== user.uid)) throw new Error('Access denied.');
      return database.reservationEvents.filter(event => event.reservationId === id);
    }
    async function openDocument(request) {
      await reservationEvents(request.id);
      const file = await fileStore('readonly', store => store.get(request.id));
      if (!file) throw new Error('No PDF is attached to this sample request.');
      const url = URL.createObjectURL(file); const link = document.createElement('a');
      link.href = url; link.download = request.attachment.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    async function viewRequest(id) {
      const database = read(); await reservationEvents(id);
      const request = database.reservations.find(record => record.id === id);
      const dialog = document.createElement('dialog'); dialog.style.cssText = 'max-width:640px;padding:24px;max-height:85vh;overflow:auto';
      const heading = document.createElement('h2'); heading.textContent = request.event;
      dialog.append(heading);
      for (const key of ['id', 'status', 'venue', 'date', 'time', 'requester', 'organization', 'expectedGuests', 'purpose', 'contactPerson', 'facilityRequirements', 'setupNotes']) {
        const line = document.createElement('p'); line.textContent = `${key}: ${request[key] || '—'}`; dialog.append(line);
      }
      const activity = document.createElement('p'); activity.textContent = 'Activity: ' + (await reservationEvents(id)).map(event => event.action).join(' → '); dialog.append(activity);
      if (request.attachment) { const pdf = document.createElement('button'); pdf.textContent = 'Open supporting PDF'; pdf.onclick = () => openDocument(request).catch(showError); dialog.append(pdf); }
      const close = document.createElement('button'); close.textContent = 'Close'; close.onclick = () => dialog.close(); dialog.append(close);
      dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
    }
    document.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link && (link.classList.contains('admin-profile-menu__logout') || link.textContent.trim() === 'Logout')) {
        event.preventDefault(); sessionStorage.clear(); location.href = 'index.html'; return;
      }
      if (event.target.closest('button,a,input,select')) return;
      const row = event.target.closest('[data-reservation-id]'); if (row) viewRequest(row.dataset.reservationId).catch(showError);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-reservation-id]')) { event.preventDefault(); viewRequest(event.target.dataset.reservationId).catch(showError); } });
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('aside'); banner.style.cssText = 'padding:12px;background:#fff3cd;color:#664d03;text-align:center';
      banner.textContent = 'Demo mode — local sample data. Student: student@example.com · Admin: admin@example.com · Password: Demo123! ';
      const reset = document.createElement('button'); reset.textContent = 'Reset demo data';
      reset.onclick = () => { localStorage.removeItem(key); sessionStorage.clear(); indexedDB.deleteDatabase('frms-demo-files'); location.href = 'index.html'; };
      banner.append(reset); document.body.prepend(banner);
    });
    read();
    return { ready, showError, requireUser, login, requests, venues, availableSlots, submit, updateStatus, openDocument, reservationEvents };
  })();
}
