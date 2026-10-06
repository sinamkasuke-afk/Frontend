/* Shared services. Demo mode is explicit and never connects to Firebase. */
window.FRMS = (() => {
  if (window.FRMS_DEMO_MODE === true && window.FRMS_DEMO) return window.FRMS_DEMO;
  let auth, db, user, admin = false;
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
    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
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
  async function register(displayName, email, password) {
    await ready;
    displayName = displayName.trim();
    email = email.trim();
    if (!displayName || displayName.length > 100) throw new Error("Enter your full name (up to 100 characters).");
    if (!email.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    user = credential.user;
    admin = false;
    try {
      await user.updateProfile({ displayName });
      await ensureProfile();
    } catch (error) {
      await auth.signOut(); user = null;
      throw new Error("Your account was created, but your profile could not be saved. Sign in again to finish setup.");
    }
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
  function requestQuery(isAdmin) {
    const query = db.collection("reservations");
    return isAdmin ? query : query.where("ownerUid", "==", user.uid);
  }
  function requestRecords(snapshot) {
    const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    records.forEach(record => requestCache.set(record.id, record));
    return records;
  }
  async function requests(isAdmin = false) {
    if (!await requireUser(isAdmin)) return [];
    return requestRecords(await requestQuery(isAdmin).get());
  }
  async function watchRequests(onChange, isAdmin = false) {
    if (!await requireUser(isAdmin)) return () => {};
    return requestQuery(isAdmin).onSnapshot(snapshot => onChange(requestRecords(snapshot)), showError);
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
  function actor() { return { uid: user.uid, email: user.email, name: user.displayName, admin }; }
  async function submit(data, file) {
    if (!await requireUser()) throw new Error("Sign in to submit a reservation.");
    let documentData = null;
    if (file) {
      if (file.size > 500 * 1024) throw new Error("The PDF must not exceed 500KB on the free plan.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 4096) binary += String.fromCharCode(...bytes.subarray(offset, offset + 4096));
      documentData = { base64: btoa(binary), name: file.name, contentType: "application/pdf", size: file.size };
    }
    const transactionalDatabase = {
      collection: name => db.collection(name),
      runTransaction: action => db.runTransaction(transaction => action({
        get: ref => transaction.get(ref),
        set: (ref, record) => {
          transaction.set(ref, record);
          if (documentData && ref.parent.id === "reservations") transaction.set(ref.collection("documents").doc("proposal"), documentData);
        }
      }))
    };
    const result = await FRMS_RESERVATION_SERVICE.submitReservation({ db: transactionalDatabase, actor: actor(),
      data: { ...data, hasAttachment: Boolean(file) }, timestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
      verifyAttachment: async (uid, id) => ({ path: `reservations/${id}/documents/proposal`, name: file.name, size: file.size, contentType: "application/pdf" }) });
    requestCache.set(result.id, { ...data, id: result.id, requestNumber: result.requestNumber });
    return result.id;
  }
  async function updateStatus(id, status) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    await FRMS_RESERVATION_SERVICE.reviewReservation({ db, actor: actor(), data: { id, status }, timestamp: () => firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function deleteReservation(id) {
    if (!await requireUser()) throw new Error("Sign in to delete your reservation.");
    const ref = db.collection("reservations").doc(id);
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return;
      const record = snapshot.data();
      if (!admin && record.ownerUid !== user.uid) throw new Error("You can only delete your own reservations.");
      const bookingRef = record.bookingId ? db.collection("bookings").doc(record.bookingId) : null;
      const booking = bookingRef ? await transaction.get(bookingRef) : null;
      // A declined request's old slot may now belong to another reservation.
      if (booking?.exists && booking.data().reservationId === id) transaction.delete(bookingRef);
      transaction.delete(ref.collection("documents").doc("proposal"));
      transaction.delete(ref);
    });
    requestCache.delete(id);
    window.dispatchEvent(new CustomEvent("reservation-deleted", { detail: { id } }));
  }
  async function openDocument(request) {
    if (!request.attachment?.path) throw new Error("This request has no uploaded supporting document.");
    const snapshot = await db.doc(request.attachment.path).get();
    if (!snapshot.exists) throw new Error("Supporting PDF was not found.");
    const binary = atob(snapshot.data().base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = snapshot.data().name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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
      line.append(name, String((key === "id" ? request.requestNumber || request.id : request[key]) || "—")); dialog.append(line);
    }
    if (request.attachment?.path) {
      const button = document.createElement("button"); button.textContent = "Open supporting PDF";
      button.onclick = () => openDocument(request).catch(showError); dialog.append(button);
    }
    if (admin || request.ownerUid === user.uid) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete reservation";
      remove.style.cssText = "margin:16px 0;padding:10px 16px;border:0;border-radius:8px;background:#b42318;color:white;cursor:pointer";
      remove.onclick = async () => {
        if (!window.confirm("Permanently delete this reservation and its attachment? Its time slot will be released.")) return;
        remove.disabled = true;
        remove.textContent = "Deleting…";
        try { await deleteReservation(id); dialog.close(); }
        catch (error) { remove.disabled = false; remove.textContent = "Delete reservation"; showError(error); }
      };
      dialog.append(remove);
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
    if (!link || !(link.hasAttribute("data-logout") || link.classList.contains("admin-profile-menu__logout") || link.textContent.trim() === "Logout")) return;
    event.preventDefault();
    try { await ready; await auth.signOut(); sessionStorage.clear(); location.href = "index.html"; }
    catch (error) { showError(error); }
  }, true);
  return { currentUser: async () => { await ready; return user ? { displayName: user.displayName, email: user.email } : null; }, requestLabel: id => requestCache.get(id)?.requestNumber || id, ready, requireUser, login, register, requests, watchRequests, venues, availableSlots, submit, updateStatus, deleteReservation, openDocument, reservationEvents, showError };
})();
