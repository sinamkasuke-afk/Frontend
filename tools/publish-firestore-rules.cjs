const fs = require('node:fs');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
initializeApp({ credential: applicationDefault(), projectId: 'frontend-d6606' });
(async () => {
  const rules = getSecurityRules();
  const before = await rules.getFirestoreRuleset();
  fs.writeFileSync('/tmp/frms-firestore-rules-before-publish.rules', before.source.map(file => file.content).join('\n'));
  const published = await rules.releaseFirestoreRulesetFromSource(fs.readFileSync('firestore.rules', 'utf8'));
  console.log('Published project Firestore rules: ' + published.name);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
