# Browser validation — October 7, 2026

Headless Google Chrome ran the actual HTML/JS pages against local Firebase Auth and Firestore emulators. Production accounts and reservations were not modified.

Passed: student registration; pending enrollment notice; admin login and enrollment approval; incorrect/correct student ID confirmation; venue/date selection and a custom 8 AM–8 PM (12-hour) booking; details form; submission and 100% progress after save; admin request approval; student approved status; desktop dialog centering; cancellation; calendar month navigation; admin invitation issuance and invited signup; mobile dialog fitting a 390px viewport. No uncaught page JavaScript errors were detected.

The browser test discovered and fixed an optimistic-write timing issue: the student ID confirmation form now disappears only after Firebase acknowledges the saved ID.

To reproduce on this Mac, install tools dependencies, have Java 21 available, and run:

```sh
npm install --prefix tools
npx firebase-tools emulators:exec --config firebase.test.json --project demo-frms-rules --only firestore,auth 'node tools/browser-check.cjs'
```

The runner requires the emulator environment and refuses to run against production. It uses Google Chrome from `/Applications/Google Chrome.app`. Local ports 8086, 9096 and 8087 must be free. Firebase SDK files are downloaded from Google's CDN. Other browsers and physical devices have not been checked.

Final validation: 54 unit tests and 19 Firebase integration tests passed. Custom ranges were checked for same-venue overlaps, adjacent times, different venues, invalid numeric ranges, approval, cancellation, and managed-day protection against older clients. Live production checks confirmed that an uninvited applicant cannot gain admin access, a non-admin cannot issue an invitation, a valid invitation enables the invited account, and bounded dashboard/month/upcoming queries succeed. Temporary live test accounts, profiles and invitations were removed. Existing known administrators were retained.
