# Firebase setup

The frontend is wired for Firebase Authentication and Cloud Firestore. A live connection requires your project's configuration and deployed rules.

1. Create/select a project in Firebase Console and register a Web app.
2. Copy its config into `js/firebase/config.js`. These are public web configuration values; do not put service account credentials here.
3. Enable Authentication > Sign-in method > Email/Password. Create student and admin accounts in Authentication > Users. There is no public registration page.
4. Login accepts an email address. To keep numeric Student IDs, set `FIREBASE_STUDENT_EMAIL_DOMAIN` to your chosen domain and provision matching Firebase email accounts. Admin login always uses email.
5. Create the default Cloud Firestore database. Publish `firestore.rules` in its Rules tab, or use the Firebase CLI command below.
6. Give administrators the `admin: true` custom claim using Firebase Admin SDK in a trusted environment. This is not a Firestore user profile field. For an existing user, preserve other claims:

   ```js
   const user = await getAuth().getUser(uid);
   await getAuth().setCustomUserClaims(uid, { ...user.customClaims, admin: true });
   ```

   Sign out and back in after changing claims. Never put the Admin SDK or its private keys in this frontend.
7. Add your deployed domain and `localhost` under Authentication > Settings > Authorized domains as needed. Open through XAMPP at `http://localhost/Frontend/`, not directly as a file.

Optional CLI deployment with the Firebase CLI installed and signed in:

```sh
firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,hosting
```

## Data and behavior

- `reservations`: new submissions receive Firestore IDs, the authenticated owner's UID, a server creation timestamp, and pending status. Students query only their own records; admins query all. Approval/decline writes persist to the same collection. Refresh an open page to see updates made elsewhere.
- `venues`: optional documents with a `name` field. When the collection is empty, the existing six venue names are used as the local catalog. Only admins may modify this collection.
- Reservation drafts remain in session storage between steps. Signing in clears the previous draft; logout clears session storage. Demo reservations and localStorage submissions are no longer used.
- The three time slots remain a static schedule. This integration does not enforce conflicting bookings; add a trusted transaction-based booking service before relying on exclusive occupancy.
- Supporting documents currently retain only local filename metadata in the existing form. File contents are not uploaded or attached to the saved reservation.
- The existing admin calendar remains fixed to October 2026 and now displays Firestore reservations for that month.
- No live project was provisioned or deployed by this change. No existing demo data is migrated automatically.

Official references: [Web setup](https://firebase.google.com/docs/web/setup), [Firestore rules](https://firebase.google.com/docs/firestore/security/get-started), [Admin custom claims](https://firebase.google.com/docs/auth/admin/custom-claims).
