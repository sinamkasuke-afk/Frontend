// Uses the owner's Firebase CLI session. Private key data is never printed.
const fs = require('node:fs');
const admin = require('firebase-admin');
(async () => {
  const oldFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const replacementFile = process.env.FRMS_REPLACEMENT_CREDENTIALS;
  if (!oldFile || !replacementFile) throw new Error('Set old and replacement credential file paths.');
  if (fs.existsSync(replacementFile)) throw new Error('Replacement file already exists; refusing to overwrite it.');
  const credential = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
  if (credential.project_id !== 'frontend-d6606') throw new Error('Unexpected project.');
  const cliAuth = require(process.env.FRMS_FIREBASE_CLI_AUTH_MODULE);
  const account = cliAuth.getGlobalDefaultAccount();
  if (!account) throw new Error('Sign in with Firebase CLI first.');
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const service = `projects/${credential.project_id}/serviceAccounts/${encodeURIComponent(credential.client_email)}`;
  const endpoint = `https://iam.googleapis.com/v1/${service}/keys`;
  const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE', keyAlgorithm: 'KEY_ALG_RSA_2048' }) });
  if (!response.ok) throw new Error(`Replacement key creation failed (HTTP ${response.status}). Old key was not changed.`);
  const result = await response.json();
  const replacement = JSON.parse(Buffer.from(result.privateKeyData, 'base64').toString('utf8'));
  fs.writeFileSync(replacementFile, JSON.stringify(replacement, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  const app = admin.initializeApp({ credential: admin.credential.cert(replacement), projectId: credential.project_id }, 'replacement-check');
  try { await app.firestore().collection('venues').limit(1).get(); }
  catch { throw new Error('Replacement was saved but validation failed; the old key was not changed.'); }
  const revoke = await fetch(`${endpoint}/${credential.private_key_id}`, { method: 'DELETE', headers });
  if (!revoke.ok && revoke.status !== 404) throw new Error(`Replacement works, but old-key revocation failed (HTTP ${revoke.status}).`);
  console.log('Replacement key validated; exposed key revoked.');
  console.log(`Replacement credentials saved securely to ${replacementFile}`);
  await app.delete();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
