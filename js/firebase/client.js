/* Shared services. Demo mode is explicit and never connects to Firebase. */
window.FRMS = (() => {
  if (window.FRMS_DEMO_MODE === true && window.FRMS_DEMO) return window.FRMS_DEMO;
  let auth, db, user, admin = false;
  const requestCache = new Map();
  const expiring = new Set();
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
      auth.onAuthStateChanged(value => { user = value; if (!value) admin = false; resolve(value); }, reject);
    });
    if (user) admin = (await user.getIdTokenResult()).claims.admin === true;
    return user;
  })();
  ready.then(() => {
    if (!user || admin || user.emailVerified) return;
    const notice = document.createElement("p");
    notice.style.cssText = "padding:12px 24px;background:#fff8e1";
    const send = document.createElement("button");
    send.type = "button"; send.textContent = "Send verification email";
    send.onclick = async () => {
      send.disabled = true;
      try { await sendVerification(); notice.firstChild.textContent = "Verification email sent. Open the email link, then submit your reservation again. "; }
      catch (error) { showError(error); }
      finally { send.disabled = false; }
    };
    notice.append("Verify your email before reserving facilities. ", send);
    document.body.prepend(notice);
  }).catch(showError);
  ready.then(async () => {
    if (!user || admin) return;
    const profile = await db.collection("users").doc(user.uid).get();
    if (profile.data()?.enrollmentStatus === "approved") return;
    const notice = document.createElement("p");
    notice.style.cssText = "padding:12px 24px;background:#eef4ef";
    notice.textContent = "Your student enrollment needs administrator approval before you can reserve. Contact the facilities office with your student ID.";
    document.body.prepend(notice);
  }).catch(showError);
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
  async function register(displayName, email, password, studentId) {
    await ready;
    displayName = displayName.trim();
    email = email.trim();
    if (!displayName || displayName.length > 100) throw new Error("Enter your full name (up to 100 characters).");
    if (!/^[^@\s]+@gmail\.com$/i.test(email)) throw new Error("Register using a gmail.com email address.");
    if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
    studentId = (studentId || "").trim();
    if (!/^[a-zA-Z0-9-]{1,50}$/.test(studentId)) throw new Error("Enter your school student ID (letters, numbers and hyphens only).");
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    user = credential.user;
    admin = false;
    try {
      await user.updateProfile({ displayName });
      await ensureProfile(studentId);
    } catch (error) {
      await auth.signOut(); user = null;
      throw new Error("Your account was created, but your profile could not be saved. Sign in again to finish setup.");
    }
    try { await user.sendEmailVerification(); }
    catch (error) { throw new Error("Your account is ready, but the verification email could not be sent. Sign in and use Send verification email to retry."); }
    sessionStorage.removeItem("frms_reservation");
  }
  async function ensureProfile(studentId = "") {
    if (!user) return;
    const ref = db.collection("users").doc(user.uid);
    const profile = await ref.get();
    if (!profile.exists) {
      await ref.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        role: admin ? "admin" : "student",
        studentId, enrollmentStatus: admin ? "approved" : "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  function requestQuery(isAdmin) {
    const query = db.collection("reservations");
    return isAdmin ? query : query.where("ownerUid", "==", user.uid);
  }
  function requestRecords(snapshot) {
    const records = snapshot.docs.map(doc => {
      const record = { ...doc.data(), id: doc.id };
      record.storedStatus = record.status;
      if (record.status === "pending" && record.createdAt?.seconds !== undefined && Date.now() >= record.createdAt.seconds * 1000 + 48 * 3600000) record.status = "expired";
      return record;
    })
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    requestCache.clear();
    records.forEach(record => requestCache.set(record.id, record));
    return records;
  }
  async function requests(isAdmin = false) {
    if (!await requireUser(isAdmin)) return [];
    return requestRecords(await requestQuery(isAdmin).get());
  }
  async function watchRequests(onChange, isAdmin = false) {
    if (!await requireUser(isAdmin)) return () => {};
    const refresh = records => {
      onChange(records);
      if (isAdmin) for (const record of records) {
        if ((record.storedStatus || record.status) !== "pending" || !record.createdAt?.seconds || Date.now() < record.createdAt.seconds * 1000 + 48 * 3600000 || expiring.has(record.id)) continue;
        expiring.add(record.id);
        updateStatus(record.id, "expired").catch(showError).finally(() => expiring.delete(record.id));
      }
    };
    const unsubscribe = requestQuery(isAdmin).onSnapshot(snapshot => refresh(requestRecords(snapshot)), showError);
    const interval = isAdmin ? setInterval(() => refresh([...requestCache.values()]), 60000) : null;
    return () => { unsubscribe(); if (interval) clearInterval(interval); };
  }
  async function requestCounts(isAdmin = false) {
    if (!await requireUser(isAdmin)) return {};
    const token = await user.getIdToken();
    const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
    const field = (name, op, value) => ({ fieldFilter: { field: { fieldPath: name }, op, value } });
    const counts = await Promise.all(["total", "pending", "approved", "declined", "cancelled", "expired"].map(async status => {
      const filters = isAdmin ? [] : [field("ownerUid", "EQUAL", { stringValue: user.uid })];
      if (status === "expired") {
        filters.push({ compositeFilter: { op: "OR", filters: [field("status", "EQUAL", { stringValue: "expired" }), { compositeFilter: { op: "AND", filters: [field("status", "EQUAL", { stringValue: "pending" }), field("createdAt", "LESS_THAN_OR_EQUAL", { timestampValue: cutoff })] } }] } });
      } else if (status !== "total") {
        filters.push(field("status", "EQUAL", { stringValue: status }));
        if (status === "pending") filters.push(field("createdAt", "GREATER_THAN", { timestampValue: cutoff }));
      }
      const structuredQuery = { from: [{ collectionId: "reservations" }] };
      if (filters.length) structuredQuery.where = filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } };
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(window.FIREBASE_CONFIG.projectId)}/databases/(default)/documents:runAggregationQuery`, {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ structuredAggregationQuery: { structuredQuery, aggregations: [{ alias: "count", count: {} }] } })
      });
      if (!response.ok) throw new Error("Unable to load reservation totals. Please refresh the page.");
      const result = await response.json();
      return [status, Number(result.find(item => item.result)?.result.aggregateFields.count.integerValue || 0)];
    }));
    return Object.fromEntries(counts);
  }
  async function mountRequestPagination({ onChange, onCounts, isAdmin = false, tableBody, filters, controls = [] }) {
    if (!await requireUser(isAdmin)) return () => {};
    const bar = document.createElement("nav");
    bar.setAttribute("aria-label", "Reservation pages");
    bar.style.cssText = "display:flex;align-items:center;justify-content:center;gap:16px;padding:18px;flex-wrap:wrap";
    const previous = document.createElement("button"), next = document.createElement("button"), label = document.createElement("span");
    previous.type = next.type = "button"; previous.textContent = "Previous"; next.textContent = "Next";
    previous.disabled = next.disabled = true;
    bar.append(previous, label, next);
    tableBody.closest("table").parentElement.append(bar);
    let version = 0;
    const pager = window.FRMS_REQUEST_PAGINATION.create({ base: requestQuery(isAdmin), onError: showError, onChange: async state => {
      const current = ++version;
      previous.disabled = !state.hasPrevious; next.disabled = !state.hasNext;
      label.textContent = `Page ${state.page} · ${state.docs.length} requests`;
      const records = requestRecords({ docs: state.docs });
      onChange(records);
      try { const counts = await requestCounts(isAdmin); if (current === version) onCounts(counts); }
      catch (error) { showError(error); }
      if (isAdmin) for (const record of records) {
        if (record.storedStatus === "pending" && record.status === "expired" && !expiring.has(record.id)) {
          expiring.add(record.id);
          updateStatus(record.id, "expired").catch(showError).finally(() => expiring.delete(record.id));
        }
      }
    } });
    previous.onclick = () => { previous.disabled = next.disabled = true; pager.previous(); };
    next.onclick = () => { previous.disabled = next.disabled = true; pager.next(); };
    const reset = () => pager.start(filters());
    const handlers = controls.map(control => {
      const event = control.tagName === "SELECT" ? "change" : "click";
      control.addEventListener(event, reset);
      return () => control.removeEventListener(event, reset);
    });
    pager.start(filters());
    return () => { version++; pager.close(); handlers.forEach(remove => remove()); bar.remove(); };
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
    const occupied = new Set(bookings.docs.filter(doc => {
      const booking = doc.data();
      return !(booking.status === "pending" && booking.createdAt?.seconds !== undefined && Date.now() >= booking.createdAt.seconds * 1000 + 48 * 3600000);
    }).map(doc => doc.data().slotId));
    return slots.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(slot => !occupied.has(slot.id)).sort((a, b) => a.startMinutes - b.startMinutes);
  }
  function actor() { return { uid: user.uid, email: user.email, name: user.displayName, admin }; }
  async function submit(data) {
    if (!await requireUser()) throw new Error("Sign in to submit a reservation.");
    await user.reload();
    if (!admin && !user.emailVerified) throw new Error("Verify your email before submitting a reservation. Use Send verification email below.");
    await user.getIdToken(true);
    const profile = await db.collection("users").doc(user.uid).get();
    if (!admin && profile.data()?.enrollmentStatus !== "approved") throw new Error("Your student enrollment is awaiting administrator approval. Contact the facilities office with your student ID.");
    const submittingActor = { ...actor(), name: profile.data()?.displayName || user.email };
    const result = await FRMS_RESERVATION_SERVICE.submitReservation({ db, actor: submittingActor, data,
      timestamp: () => firebase.firestore.FieldValue.serverTimestamp() });
    requestCache.set(result.id, { ...data, id: result.id, requestNumber: result.requestNumber });
    return result.id;
  }
  async function updateStatus(id, status) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    await FRMS_RESERVATION_SERVICE.reviewReservation({ db, actor: actor(), data: { id, status }, timestamp: () => firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function cancelReservation(id) {
    if (!await requireUser()) throw new Error("Sign in to cancel your reservation.");
    await FRMS_RESERVATION_SERVICE.cancelReservation({ db, actor: actor(), data: { id },
      timestamp: () => firebase.firestore.FieldValue.serverTimestamp() });
    window.dispatchEvent(new CustomEvent("reservation-cancelled", { detail: { id } }));
  }
  async function resetPassword(email) {
    await ready;
    if (!email || !email.includes("@")) throw new Error("Enter your email address first.");
    await auth.sendPasswordResetEmail(email.trim());
  }
  async function sendVerification() {
    await ready;
    if (!user) throw new Error("Sign in first.");
    await user.sendEmailVerification();
  }
  async function approveEnrollment(uid, studentId, approved) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    if (!/^[a-zA-Z0-9-]{1,50}$/.test(studentId)) throw new Error("Enter a valid student ID.");
    await db.collection("users").doc(uid).update({ studentId, enrollmentStatus: approved ? "approved" : "rejected", approvedBy: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function studentQuery() {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    return db.collection("users").where("role", "==", "student");
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
    if ((admin || request.ownerUid === user.uid) && ['pending', 'approved'].includes(request.status)) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel reservation";
      cancel.style.cssText = "margin:16px 0;padding:10px 16px;border:0;border-radius:8px;background:#b42318;color:white;cursor:pointer";
      cancel.onclick = async () => {
        if (!window.confirm("Cancel this reservation and release its time slot? Its history will be kept.")) return;
        cancel.disabled = true;
        try { await cancelReservation(id); dialog.close(); }
        catch (error) { cancel.disabled = false; showError(error); }
      };
      dialog.append(cancel);
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
  return { currentUser: async () => { await ready; return user ? { displayName: user.displayName, email: user.email } : null; }, requestLabel: id => requestCache.get(id)?.requestNumber || id, ready, requireUser, login, register, requests, watchRequests, requestCounts, mountRequestPagination, venues, availableSlots, submit, updateStatus, cancelReservation, approveEnrollment, studentQuery, resetPassword, sendVerification, reservationEvents, showError };
})();
