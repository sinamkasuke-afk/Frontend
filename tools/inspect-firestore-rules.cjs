const fs = require('node:fs');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const ruleset = await getSecurityRules().getFirestoreRuleset();
  const source = ruleset.source.map(file => file.content).join('\n');
  fs.writeFileSync('/tmp/frms-firestore-rules-before-slot-fix.rules', source);
  console.log(source);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
