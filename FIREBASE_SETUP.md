## Local mock data — ready to test

`window.FRMS_DEMO_MODE = true` is currently enabled in `js/firebase/config.js`. In this mode, pages use local sample data and do not initialize Firebase. Start Apache and open `http://localhost/Frontend/login.html`.

| Account | Email | Password |
| --- | --- | --- |
| Student | `student@example.com` | `Demo123!` |
| Second student | `student2@example.com` | `Demo123!` |
| Admin | `admin@example.com` | `Demo123!` |

There are eight venues, three time slots and eight reservations dated relative to the first demo load. The primary student sees seven requests; the second sees one. Admin sees all eight. New submissions, PDF attachments, approvals, declines and activity persist locally in this browser. The banner's Reset demo data button restores the examples and signs out. Local demo data is a preview, not a backend security test.

Set `FRMS_DEMO_MODE` to `false` before testing or deploying the real Firebase integration. Local demo changes are not uploaded to Firebase.

To create sample data in **live Firestore**, complete administrator setup below, then run:

```sh
npm run seed --prefix tools
npm run accounts --prefix tools
npm run mock --prefix tools
```

The cloud importer uses the provisioned test accounts and creates records across all six collections. It preserves existing documents and refuses to replace occupied booking slots. Cloud test accounts use their provisioned passwords, not `Demo123!`. The live mock import completed successfully for frontend-d6606: three test account profiles, eight venues, three time slots, and eight sample reservations with matching bookings and audit events. Local demo mode remains enabled until you set FRMS_DEMO_MODE to false.

# Firebase setup for frontend-d6606

The frontend uses Firebase Authentication, Cloud Firestore, Cloud Storage and two callable Cloud Functions. See `DATABASE_SCHEMA.md` for the collection inventory and behavior.

## 1. Console setup

- Keep your web app config in `js/firebase/config.js`.
- Enable Authentication > Email/Password. Login accepts email addresses. Optional numeric Student IDs require `FIREBASE_STUDENT_EMAIL_DOMAIN` and matching provisioned email accounts.
- Create the default Firestore database (Standard edition).
- Enable Cloud Storage and confirm the web config has the bucket name. Cloud Functions and Storage require the appropriate Firebase billing plan; review the project's billing setup before deployment.
- Add `localhost` and your deployed domain in Authentication's authorized domains where needed.

## 2. Deploy the backend and rules

From this folder, with Node 22 or later and Firebase CLI access to the project:

```sh
npm install --prefix functions
npm install --prefix tools
npx firebase-tools login
npx firebase-tools deploy --project frontend-d6606 --only functions,firestore,storage
```

Deploy functions, Firestore rules/indexes and Storage rules together. Cross-service Storage rules may prompt Firebase to enable the Firestore service-agent permission. The frontend uses functions in `asia-southeast1`.

## 3. Populate the database and test accounts

Run these with project administrator Application Default Credentials. One way is to upload the project to Google Cloud Shell, select project `frontend-d6606`, install the dependencies above, and authenticate:

```sh
gcloud auth application-default login
npm run seed --prefix tools
npm run accounts --prefix tools
```

The seed tool creates missing venue and schedule documents without overwriting existing records. The account tool saves the existing student profile and creates/grants access to `frms-admin-test@example.com`. It prints a new generated admin password only when the Auth account is first created. Existing passwords are preserved. Sign out and back in after granting admin claims. Never store administrator credential keys in this frontend folder.

Your existing student email is `frms-test-027efef2@example.com`; its password was provided in the chat. Passwords are not copied to Firestore or committed to source.

## 4. Test

Start XAMPP Apache and open `http://localhost/Frontend/login.html`.

1. Sign in as the test student.
2. Choose a venue, future date and available slot; enter event details and select a PDF up to 5MB.
3. Submit and check My Reservations. The first submission creates the `reservations`, `bookings`, and `reservationEvents` collections.
4. Sign in at `admin-login.html` with the provisioned admin; inspect the request row and PDF, approve/decline, then refresh the student's list.
5. A declined slot should become available again; pending/approved slots should be unavailable.

Local checks:

```sh
node --test tests/reservation-service.test.cjs
```

Optional Hosting deployment:

```sh
npx firebase-tools deploy --project frontend-d6606 --only hosting
```

Live test account and mock data creation has completed. Backend function deployment and publication of the local rules are separate setup steps; importing data does not deploy them. Existing pre-booking reservations are not migrated by the seed tool.

References: [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Cloud Functions setup](https://firebase.google.com/docs/functions/get-started), [Custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [Cross-service rules](https://firebase.google.com/docs/rules/manage-deploy).
