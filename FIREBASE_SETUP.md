# Firebase setup — no file uploads or paid backend

The app uses Firebase Authentication and Firestore transactions. It does not upload PDFs, call Cloud Functions, or use Cloud Storage. Keep the project on Spark; its usage quotas still apply.

## Accounts

Students register with a `gmail.com` email, full name, school student ID, password (at least eight characters), and matching confirmation. Registration saves a student profile without sending a verification email. Students can sign in immediately; an administrator must check the student ID against school records and approve enrollment on the Students page before reservations can be submitted.

Administrator privileges come from an Auth custom claim set by a trusted provisioning script, not the Firestore profile's role field. Existing test accounts can sign in, but the example.com student accounts cannot submit under the new Gmail policy. Use a real Gmail account for student submission testing. Passwords are never stored in Firestore.

Forgot Password on either login page sends an Authentication reset email. Sessions are tab-specific; the unsupported Remember me checkbox has been removed.

## Reservation policy

- Valid Manila dates, from today through 90 days ahead.
- At most five new submissions per account per Manila day.
- Pending requests hold the venue/date/slot immediately.
- Only administrators approve or decline a pending request.
- Students cancel only their own pending/approved request before its start time; administrators can cancel after start.
- Cancellation releases the booking and writes an audit record in the same transaction. Closed requests cannot be reopened or permanently deleted through the app.
- Numeric request numbers are unique and range from 1 to 99999.

Pending holds expire after 48 hours. Slot availability ignores expired holds, and Security Rules allow a new reservation to replace only a proven expired pending booking. This works even with no administrator online. The original record is displayed as expired; administrators later reconcile the stored status and audit, without deleting any replacement booking. No paid scheduler is used.

## Deploy and test

```
node --test tests/*.test.cjs
npx firebase-tools deploy --project frontend-d6606 --only firestore
```

Redeploy the static website separately to Vercel after frontend changes. See ARCHITECTURE.md for the role matrix and Security Rules emulator test instructions. Emulator tests need Java 21 and the Firebase test dependencies; they use a demo project and do not touch production.

## Credentials and cleanup

Service-account credentials must stay outside the repository. The previously shared private key was revoked on 2026-10-06 after validating a replacement saved outside the repository. Use the replacement credential file for maintenance scripts. `.gitignore` excludes typical service-account filenames.

`tools/remove-legacy-pdfs.cjs` removes legacy supporting-document records and attachment metadata using trusted Admin SDK credentials. `tools/assign-request-numbers.cjs` numbers legacy reservations without changing their UUID references. Existing maintenance scripts require an external service-account file via GOOGLE_APPLICATION_CREDENTIALS.

Student reservations, admin requests, history and student enrollment use cursor pagination (25 rows plus one lookahead). Status and month filters run in Firestore; text search applies to the visible page. Summary counts use database aggregation queries rather than the loaded page. Admin lists, calendar and student reservations receive live updates.

After administrator enrollment approval, students must enter the approved student ID in the portal confirmation form. Firestore stores `confirmedStudentId` and `studentIdConfirmedAt`. Submissions require the confirmed ID to match the current approved ID. Approval or rejection through the admin Students page resets confirmation. Students cannot change their approved ID or enrollment status. This is a one-time ID confirmation, not a replacement for checking school records.

Administrator registration is available below Admin Login and grants immediate access, as requested. Firebase Authentication stores credentials; `adminApplications/{uid}` is a registration record. The Vercel `/api/admin-register` endpoint verifies the caller's Firebase ID token, checks their registration record, creates the admin profile, and grants the `admin` custom claim. Existing pending applicants are activated when they next sign in through Admin Login. No project-owner approval step is required.

The Firebase Admin service account is stored only in the Vercel production server environment variable `FIREBASE_ADMIN_SERVICE_ACCOUNT`; never place it in frontend config or Git. Firestore still forbids browser-side privilege changes. This endpoint uses Vercel server functions, not Firebase Cloud Functions. Public administrator registration means anyone registering there can manage the database's reservations.
