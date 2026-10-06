/* Shared services. Demo mode is explicit and never connects to Firebase. */
window.FRMS = (() => {
  if (window.FRMS_DEMO_MODE === true) return window.FRMS_DEMO;
  let auth, db, functions, storage, user, admin = false;
  const requestCache = new Map();
  function showError(error) {
    console.error(error);
    let message = document.getElementById("firebase-error");
    if (!message) {
      message = document.createElement("p");
      message.id = "firebase-error";
      message.setAttribute("role", "alert");
      message.style.cssText = "padding:16px;background:#fff1f1;color:#8b1a1a;position:relative;z-index:9999";
      document.body.prepend(message);
    }
    message.textContent = error.message || "Firebase could not complete this request. Please try again.";
  }
  const ready = (async () => {
    const config = window.FIREBASE_CONFIG;
    if (!config?.apiKey || !config?.projectId || !config?.appId) {
      throw new Error("Firebase setup is incomplete. Add your web app configuration in js/firebase/config.js.");
    }
    firebase.initializeApp(config);
    auth = firebase.auth();
    db = firebase.firestore();
    functions = firebase.app().functions("asia-southeast1");
    storage = firebase.storage();
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    user = await new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(value => { unsubscribe(); resolve(value); }, reject);
    });
    if (user) admin = (await user.getIdTokenResult()).claims.admin === true;
    return user;
  })();
  ready.catch(showError);
  async function requireUser(isAdmin = false) {
    await ready;
    if (!user) { location.replace(isAdmin ? "admin-login.html" : "login.html"); return false; }
    if (isAdmin && !admin) { location.replace("dashboard.html"); return false; }
    return true;
  }
  async function login(identifier, password, isAdmin = false) {
    await ready;
    let email = identifier.trim();
    if (!email.includes("@") && !isAdmin && window.FIREBASE_STUDENT_EMAIL_DOMAIN) {
      email += "@" + window.FIREBASE_STUDENT_EMAIL_DOMAIN;
    }
    if (!email.includes("@")) throw new Error("Enter your Firebase account email address, or configure a Student ID email domain.");
    const credential = await auth.signInWithEmailAndPassword(email, password);
    user = credential.user;
    admin = (await user.getIdTokenResult(true)).claims.admin === true;
    if (isAdmin && !admin) {
      await auth.signOut(); user = null;
      throw new Error("This account does not have administrator access.");
    }
    await ensureProfile();
    sessionStorage.removeItem("frms_reservation");
  }
  async function ensureProfile() {
    if (!user) return;
    const ref = db.collection("users").doc(user.uid);
    const profile = await ref.get();
    if (!profile.exists) {
      await ref.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        role: admin ? "admin" : "student",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  async function requests(isAdmin = false) {
    if (!await requireUser(isAdmin)) return [];
    let query = db.collection("reservations");
    if (!isAdmin) query = query.where("ownerUid", "==", user.uid);
    const snapshot = await query.get();
    const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    records.forEach(record => requestCache.set(record.id, record));
    return records;
  }
  async function venues() {
    await ready;
    const snapshot = await db.collection("venues").where("active", "==", true).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  async function availableSlots(venueId, dateISO) {
    if (!await requireUser()) return [];
    const [slots, bookings] = await Promise.all([
      db.collection("timeSlots").where("active", "==", true).get(),
      db.collection("bookings").where("venueId", "==", venueId).where("dateISO", "==", dateISO).get()
    ]);
    const occupied = new Set(bookings.docs.map(doc => doc.data().slotId));
    return slots.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(slot => !occupied.has(slot.id)).sort((a, b) => a.startMinutes - b.startMinutes);
  }
  async function submit(data, file) {
    if (!await requireUser()) throw new Error("Sign in to submit a reservation.");
    const submitRequest = functions.httpsCallable("submitReservation");
    if (file) {
      const committed = await submitRequest({ requestId: data.requestId, checkOnly: true });
      if (committed.data.id) return committed.data.id;
      await storage.ref(`supportingDocuments/${user.uid}/${data.requestId}/proposal.pdf`)
        .put(file, { contentType: "application/pdf", customMetadata: { originalName: file.name } });
    }
    const result = await submitRequest({ ...data, hasAttachment: Boolean(file) });
    return result.data.id;
  }
  async function updateStatus(id, status) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    await functions.httpsCallable("reviewReservation")({ id, status });
  }
  async function openDocument(request) {
    if (!request.attachment?.path) throw new Error("This request has no uploaded supporting document.");
    const url = await storage.ref(request.attachment.path).getDownloadURL();
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.rel = "noopener";
    link.click();
  }
  async function reservationEvents(id) {
    if (!await requireUser()) return [];
    let query = db.collection("reservationEvents").where("reservationId", "==", id);
    if (!admin) query = query.where("ownerUid", "==", user.uid);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }
  async function viewRequest(id) {
    const request = requestCache.get(id);
    if (!request) return;
    let dialog = document.getElementById("reservation-detail-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "reservation-detail-dialog";
      dialog.style.cssText = "width:min(640px,90vw);max-height:85vh;overflow:auto;border:1px solid #ddd;border-radius:12px;padding:24px";
      document.body.append(dialog);
    }
    dialog.replaceChildren();
    const heading = document.createElement("h2"); heading.textContent = request.event || "Reservation details";
    const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => dialog.close();
    dialog.append(heading, close);
    for (const [label, key] of [["Request ID", "id"], ["Status", "status"], ["Facility", "venue"], ["Date", "date"], ["Time", "time"], ["Requester", "requester"], ["Organization", "organization"], ["Event type", "eventType"], ["Guests", "expectedGuests"], ["Purpose", "purpose"], ["Contact", "contactPerson"], ["Requirements", "facilityRequirements"], ["Setup notes", "setupNotes"]]) {
      const line = document.createElement("p"); const name = document.createElement("strong"); name.textContent = label + ": ";
      line.append(name, String(request[key] || "—")); dialog.append(line);
    }
    if (request.attachment?.path) {
      const button = document.createElement("button"); button.textContent = "Open supporting PDF";
      button.onclick = () => openDocument(request).catch(showError); dialog.append(button);
    }
    const history = document.createElement("p"); history.textContent = "Loading activity…"; dialog.append(history);
    if (!dialog.open) dialog.showModal();
    try {
      const events = await reservationEvents(id);
      history.textContent = events.length ? events.map(event => {
        const date = event.createdAt?.toDate?.();
        return `${event.action}${date ? " — " + date.toLocaleString() : ""}`;
      }).join("; ") : "No activity recorded for this request.";
    } catch (error) { history.textContent = "Unable to load activity."; showError(error); }
  }
  document.addEventListener("click", event => {
    if (event.target.closest("button,a,input,select")) return;
    const row = event.target.closest("[data-reservation-id]");
    if (row) viewRequest(row.dataset.reservationId).catch(showError);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || !event.target.matches("[data-reservation-id]")) return;
    event.preventDefault(); viewRequest(event.target.dataset.reservationId).catch(showError);
  });
  document.addEventListener("click", async event => {
    const link = event.target.closest("a");
    if (!link || !(link.classList.contains("admin-profile-menu__logout") || link.textContent.trim() === "Logout")) return;
    event.preventDefault();
    try { await ready; await auth.signOut(); sessionStorage.clear(); location.href = "index.html"; }
    catch (error) { showError(error); }
  }, true);
  return { ready, requireUser, login, requests, venues, availableSlots, submit, updateStatus, openDocument, reservationEvents, showError };
})();
