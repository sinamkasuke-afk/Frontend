// Run only in a trusted environment with project administrator credentials.
// Never include this file or Firebase Admin credentials in browser scripts.
const crypto = require('node:crypto');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = 'frontend-d6606';
initializeApp({ credential: applicationDefault(), projectId });

async function provision(email, displayName, role) {
  const auth = getAuth();
  let account;
  let password;
  try {
    account = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    password = `Test!${crypto.randomBytes(12).toString('base64url')}`;
    account = await auth.createUser({ email, displayName, password });
  }
  if (role === 'admin') {
    await auth.setCustomUserClaims(account.uid, { ...account.customClaims, admin: true });
  } else if (account.customClaims?.admin === true) {
    throw new Error(`Refusing to label existing administrator ${email} as a student.`);
  }
  const ref = getFirestore().collection('users').doc(account.uid);
  const current = await ref.get();
  await ref.set({
    uid: account.uid,
    email: account.email,
    displayName: account.displayName || displayName,
    role,
    ...(!current.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
  }, { merge: true });
  console.log(JSON.stringify({ email, uid: account.uid, role, ...(password ? { password } : { password: 'Existing password preserved' }) }));
}

(async () => {
  // Reuse the student test account already created in this project.
  await provision('frms-test-027efef2@example.com', 'Test Student', 'student');
  await provision('frms-student2-test@example.com', 'Second Test Student', 'student');
  await provision('frms-admin-test@example.com', 'Test Administrator', 'admin');
  console.log('All test account profiles are saved in Firestore users. Sign out and back in to refresh admin access.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
