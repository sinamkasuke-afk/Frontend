// Trusted project owner tool; never run or expose this script in the browser.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
(async () => {
  const email = process.argv[2];
  if (!email || !email.includes('@')) throw new Error('Usage: node tools/approve-admin-account.cjs administrator@example.com');
  initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
  const auth = getAuth(), db = getFirestore();
  const user = await auth.getUserByEmail(email);
  const application = db.collection('adminApplications').doc(user.uid);
  const request = await application.get();
  if (!request.exists) throw new Error('No administrator registration request exists for this account.');
  if (user.disabled) throw new Error('This account is disabled.');
  // Keep the application pending if either profile creation or claim assignment fails; retry safely.
  await db.collection('users').doc(user.uid).set({ uid: user.uid, email: user.email,
    displayName: request.data().displayName || user.displayName || '', role: 'admin',
    enrollmentStatus: 'approved', studentId: '', createdAt: request.data().createdAt });
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  await application.update({ status: 'approved', approvedAt: FieldValue.serverTimestamp() });
  console.log('Administrator access approved. Sign out and sign in through Admin Login.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
