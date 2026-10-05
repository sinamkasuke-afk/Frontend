/* Shared Firebase services for every page. No demo authentication fallback. */
window.FRMS = (() => {
  let auth, db, user, admin = false;
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
    sessionStorage.removeItem("frms_reservation");
  }
  async function requests(isAdmin = false) {
    if (!await requireUser(isAdmin)) return [];
    let query = db.collection("reservations");
    if (!isAdmin) query = query.where("ownerUid", "==", user.uid);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
  async function venues(fallback) {
    if (!await requireUser()) return [];
    const snapshot = await db.collection("venues").get();
    return snapshot.empty ? fallback : snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }
  async function submit(data) {
    if (!await requireUser()) throw new Error("Sign in to submit a reservation.");
    const ref = db.collection("reservations").doc();
    await ref.set({ ...data, id: ref.id, requestId: ref.id,
      ownerUid: user.uid, requester: user.displayName || user.email,
      requesterType: "Student", initials: (user.displayName || user.email).slice(0, 2).toUpperCase(),
      venueDetail: "", status: "pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    return ref.id;
  }
  async function updateStatus(id, status) {
    if (!await requireUser(true)) throw new Error("Administrator access is required.");
    await db.collection("reservations").doc(id).update({ status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), reviewedBy: user.uid });
  }
  document.addEventListener("click", async event => {
    const link = event.target.closest("a");
    if (!link || !(link.classList.contains("admin-profile-menu__logout") || link.textContent.trim() === "Logout")) return;
    event.preventDefault();
    try { await ready; await auth.signOut(); sessionStorage.clear(); location.href = "index.html"; }
    catch (error) { showError(error); }
  }, true);
  return { ready, requireUser, login, requests, venues, submit, updateStatus, showError };
})();
