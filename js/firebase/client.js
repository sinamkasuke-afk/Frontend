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
  async function requireUser(isAdmin = false) {
    await ready;
    if (!user) { location.replace(isAdmin ? "admin-login.html" : "login.html"); return false; }
    if (isAdmin && !admin) { location.replace("dashboard.html"); return false; }
    return true;
  }
  async function login(identifier, password, isAdmin = false) {
    await ready;
    let email = identifier.trim();
    if (!email.includes("@") && !isAdmin && window.FIREBASE_STUDENT_EMAIL_DOMAIN) email += "@" + window.FIREBASE_STUDENT_EMAIL_DOMAIN;
    if (!email.includes("@")) throw new Error("Enter your account email address.");
    const credential = await auth.signInWithEmailAndPassword(email, password);
    user = credential.user;
    admin = (await user.getIdTokenResult(true)).claims.admin === true;
    if (isAdmin && !admin) {
      try {
        await activateAdminRegistration("");
        admin = (await user.getIdTokenResult(true)).claims.admin === true;
        if (!admin) throw new Error("Administrator access is awaiting project-owner approval.");
      } catch (error) { await auth.signOut(); user = null; admin = false; throw error; }
    }
    if (!isAdmin && admin) {
      await auth.signOut(); user = null; admin = false;
      throw new Error("This is an administrator account. Use Admin Login, or sign in with your student account.");
    }
    await ensureProfile();
    requestCache.clear();
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
    requestCache.clear();
    sessionStorage.removeItem("frms_reservation");
  }
  async function activateAdminRegistration(invitationCode) {
    const response = await fetch("/api/admin-register", { method: "POST", headers: { Authorization: "Bearer " + await user.getIdToken(), "Content-Type": "application/json" }, body: JSON.stringify({ invitationCode }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not register administrator access.");
  }
  async function registerAdmin(displayName, email, password, invitationCode) {
    await ready;
    displayName = displayName.trim(); email = email.trim();
    if (invitationCode && !/^[a-f0-9]{48}$/.test(invitationCode.trim())) throw new Error("Invalid administrator invitation code.");
    if (!displayName || displayName.length > 100) throw new Error("Enter your full name (up to 100 characters).");
    if (!email.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Use at least eight characters for your password.");
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    user = credential.user; admin = false;
    try {
      await user.updateProfile({ displayName });
      await db.collection("adminApplications").doc(user.uid).set({ uid: user.uid, email: user.email,
        displayName, status: "pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
      try { await credential.user.delete(); } catch (_) {}
      await auth.signOut(); user = null;
      throw error;
    }
    if (!invitationCode) {
      await auth.signOut(); user = null; admin = false;
      return;
    }
    try {
      await activateAdminRegistration(invitationCode);
      admin = (await user.getIdTokenResult(true)).claims.admin === true;
      if (!admin) throw new Error("Your account is saved. Sign in through Admin Login to finish registration.");
    } catch (error) { await auth.signOut(); user = null; admin = false; throw error; }
    requestCache.clear();
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
    records.forEach(record => requestCache.set(record.id, record));
    while (requestCache.size > 500) requestCache.delete(requestCache.keys().next().value);
    return records;
  }
  function scopedRequestQuery(isAdmin, options) {
    let query = requestQuery(isAdmin);
    if (!options) return query;
    if (options.month) {
      const [year, month] = options.month.split('-').map(Number);
      const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
      query = query.where('dateISO', '>=', options.month + '-01').where('dateISO', '<', end).orderBy('dateISO', 'desc');
    }
    query = query.orderBy('createdAt', 'desc');
    if (options.limit) query = query.limit(options.limit);
    return query;
  }
  function upcomingQuery(isAdmin) {
    const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    return requestQuery(isAdmin).where('status','==','approved').where('dateISO','>=',today).orderBy('dateISO','asc').limit(1);
  }
  async function upcomingReservation(isAdmin = false) {
    if (!await requireUser(isAdmin)) return null;
    return requestRecords(await upcomingQuery(isAdmin).get())[0] || null;
  }
  async function watchUpcoming(onChange) {
    if (!await requireUser()) return () => {};
    return upcomingQuery(false).onSnapshot(snapshot => onChange(requestRecords(snapshot)[0] || null), showError);
  }
  async function requests(isAdmin = false, options = null) {
    if (!await requireUser(isAdmin)) return [];
    return requestRecords(await scopedRequestQuery(isAdmin, options).get());
  }
  async function watchRequests(onChange, isAdmin = false, options = null) {
    if (!await requireUser(isAdmin)) return () => {};
    let latestRecords = [];
    const refresh = records => {
      latestRecords = records;
      onChange(records);
      if (isAdmin) for (const record of records) {
        if ((record.storedStatus || record.status) !== "pending" || !record.createdAt?.seconds || Date.now() < record.createdAt.seconds * 1000 + 48 * 3600000 || expiring.has(record.id)) continue;
        expiring.add(record.id);
        updateStatus(record.id, "expired").catch(showError).finally(() => expiring.delete(record.id));
      }
    };
    const unsubscribe = scopedRequestQuery(isAdmin, options).onSnapshot(snapshot => refresh(requestRecords(snapshot)), showError);
    const interval = isAdmin ? setInterval(() => refresh(latestRecords), 60000) : null;
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
  function watchCounts(onChange, isAdmin, initial) {
    let signature = JSON.stringify(initial), closed = false, running = false;
    const interval = setInterval(async () => {
      if (closed || running || document.hidden) return;
      running = true;
      try {
        const counts = await requestCounts(isAdmin), next = JSON.stringify(counts);
        if (!closed && next !== signature) { signature = next; onChange(counts); }
      } catch(error) { if (!closed) showError(error); }
      finally { running = false; }
    }, 60000);
    return () => { closed = true; clearInterval(interval); };
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
    const canonical = { morning: [420,600], midday: [600,780], afternoon: [780,960] };
    const blocked = bookings.docs.filter(doc => {
      const booking = doc.data();
      return !(booking.status === "pending" && booking.createdAt?.seconds !== undefined && Date.now() >= booking.createdAt.seconds * 1000 + 48 * 3600000);
    }).map(doc => {
      const value = doc.data();
      const range = Number.isInteger(value.startMinutes) ? [value.startMinutes,value.endMinutes] : canonical[value.slotId];
      return range ? { startMinutes: range[0], endMinutes: range[1] } : { startMinutes: 0, endMinutes: 1440 };
    });
    const available = slots.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(slot => canonical[slot.id] && slot.startMinutes === canonical[slot.id][0] && slot.endMinutes === canonical[slot.id][1])
      .filter(slot => !blocked.some(range => slot.startMinutes < range.endMinutes && slot.endMinutes > range.startMinutes)).sort((a,b) => a.startMinutes-b.startMinutes);
    available.blocked = blocked;
    return available;
  }

  function actor() { return { uid: user.uid, email: user.email, name: user.displayName, admin }; }
  async function submit(data, onProgress = () => {}) {
    onProgress(10, "Checking your account…");
    if (!await requireUser()) throw new Error("Sign in to submit a reservation.");
    await user.reload();
    await user.getIdToken(true);
    onProgress(25, "Checking enrollment and student ID…");
    const profile = await db.collection("users").doc(user.uid).get();
    if (!admin && profile.data()?.enrollmentStatus !== "approved") throw new Error("Your student enrollment is awaiting administrator approval. Contact the facilities office with your student ID.");
    if (!admin && profile.data()?.confirmedStudentId !== profile.data()?.studentId) throw new Error("Confirm your approved student ID at the top of this page before reserving.");
    onProgress(40, "Validating reservation details…");
    onProgress(60, "Checking availability and saving your reservation…");
    const response = await fetch("/api/reservation-submit", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save your reservation.");
    onProgress(100, "Reservation saved successfully.");
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
  async function approveEnrollment(uid, studentId, approved) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    if (!/^[a-zA-Z0-9-]{1,50}$/.test(studentId)) throw new Error("Enter a valid student ID.");
    await db.collection("users").doc(uid).update({ studentId, enrollmentStatus: approved ? "approved" : "rejected", confirmedStudentId: firebase.firestore.FieldValue.delete(), studentIdConfirmedAt: firebase.firestore.FieldValue.delete(), approvedBy: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function createAdminInvitation(email) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    const response = await fetch("/api/admin-invite", { method: "POST", headers: { Authorization: "Bearer " + await user.getIdToken(true), "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not create invitation.");
    return result;
  }
  async function watchEnrollment(callback) {
    await ready;
    if (!user || admin) return () => {};
    return db.collection("users").doc(user.uid).onSnapshot({ includeMetadataChanges: true }, snapshot => {
      // Keep confirmation visible until Firestore acknowledges it; navigation must not discard an optimistic write.
      if (!snapshot.metadata.hasPendingWrites) callback(snapshot.data() || {});
    }, showError);
  }
  async function confirmStudentId(studentId) {
    if (!await requireUser()) throw new Error("Sign in first.");
    studentId = studentId.trim();
    const ref = db.collection("users").doc(user.uid);
    const profile = (await ref.get()).data();
    if (profile?.enrollmentStatus !== "approved") throw new Error("Wait for administrator enrollment approval first.");
    if (!studentId || studentId !== profile.studentId) throw new Error("The student ID does not match the ID approved by your administrator.");
    await ref.update({ confirmedStudentId: studentId, studentIdConfirmedAt: firebase.firestore.FieldValue.serverTimestamp() });
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
      dialog.setAttribute("aria-labelledby", "reservation-detail-title");
      dialog.addEventListener("click", event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
      });
      document.body.append(dialog);
    }
    dialog.replaceChildren();
    const element = (tag, className, text) => {
      const node = document.createElement(tag); node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const header = element("header", "reservation-detail__header");
    const titles = element("div", "reservation-detail__titles");
    const label = element("p", "reservation-detail__eyebrow", "RESERVATION DETAILS");
    const heading = element("h2", "reservation-detail__title", request.event || "Reservation details");
    heading.id = "reservation-detail-title";
    titles.append(label, heading);
    const close = element("button", "reservation-detail__close", "×");
    close.type = "button"; close.setAttribute("aria-label", "Close reservation details"); close.onclick = () => dialog.close();
    header.append(titles, close);
    const content = element("div", "reservation-detail__content");
    const summary = element("div", "reservation-detail__summary");
    const number = element("span", "reservation-detail__number", "Request #" + (request.requestNumber || request.id));
    const status = element("span", "reservation-detail__status", (request.status || "pending").replace(/^./, value => value.toUpperCase()));
    status.dataset.status = request.status;
    summary.append(number, status);
    const details = element("dl", "reservation-detail__grid");
    for (const [label, key] of [["Facility", "venue"], ["Date", "date"], ["Time", "time"], ["Requester", "requester"], ["Organization", "organization"], ["Event type", "eventType"], ["Guests", "expectedGuests"], ["Contact", "contactPerson"], ["Purpose", "purpose"], ["Requirements", "facilityRequirements"], ["Setup notes", "setupNotes"]]) {
      const item = element("div", "reservation-detail__field" + (["purpose", "facilityRequirements", "setupNotes"].includes(key) ? " reservation-detail__field--wide" : ""));
      item.append(element("dt", "", label), element("dd", "", String(request[key] ?? "—") || "—"));
      details.append(item);
    }
    content.append(summary, details);
    const footer = element("footer", "reservation-detail__footer");
    const done = element("button", "reservation-detail__done", "Close details");
    done.type = "button"; done.onclick = () => dialog.close();
    dialog.append(header, content, footer);
    if ((admin || request.ownerUid === user.uid) && ['pending', 'approved'].includes(request.status)) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel reservation";
      cancel.className = "reservation-detail__cancel";
      cancel.onclick = async () => {
        if (!window.confirm("Cancel this reservation and release its time slot? Its history will be kept.")) return;
        cancel.disabled = true;
        try { await cancelReservation(id); dialog.close(); }
        catch (error) { cancel.disabled = false; showError(error); }
      };
      footer.append(cancel);
    }
    footer.append(done);
    const activity = element("section", "reservation-detail__activity");
    activity.append(element("h3", "", "Request activity"));
    const history = element("p", "", "Loading activity…"); activity.append(history); content.append(activity);
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
  return { currentUser: async () => {
    await ready;
    if (!user) return null;
    const profile = await db.collection("users").doc(user.uid).get();
    return { displayName: profile.data()?.displayName || user.displayName || "", email: user.email, role: admin ? "admin" : "student" };
  }, requestLabel: id => requestCache.get(id)?.requestNumber || id, ready, requireUser, login, register, registerAdmin, createAdminInvitation, upcomingReservation, watchUpcoming, requests, watchRequests, requestCounts, watchCounts, mountRequestPagination, venues, availableSlots, submit, updateStatus, cancelReservation, approveEnrollment, watchEnrollment, confirmStudentId, studentQuery, resetPassword, reservationEvents, showError };
})();
