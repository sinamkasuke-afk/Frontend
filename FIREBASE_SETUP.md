# Firebase setup — free Spark plan

The live frontend now uses Firebase Authentication and Cloud Firestore directly. Cloud Functions and Cloud Storage are not required, and no billing upgrade is needed. Demo mode is disabled.

## What is working

The deployed Firestore rules allow authenticated students to submit reservations through atomic transactions. Each transaction saves the reservation, its exclusive booking lock, its activity event and any small supporting PDF. Admin decisions update the status and audit history together; declining releases the slot. Student submission with a PDF and admin decline were verified against live Firebase.

PDFs are stored in `reservations/{id}/documents/proposal`, encoded within Firestore's document size limit. Maximum upload size is **500KB**. The document's data field is excluded from indexes. Files larger than this need compression or an external file-hosting service. This is suitable for small proposals and testing, within Firestore's free quotas.

## Test accounts

Use the real test account credentials provided in chat:

- `frms-test-027efef2@example.com` — student
- `frms-student2-test@example.com` — second student
- `frms-admin-test@example.com` — admin

Start Apache and open `http://localhost/Frontend/login.html` or `admin-login.html`. Choose a venue, date, available slot, event details and optionally attach a PDF up to 500KB, then submit. Admin can review the request and open its document from the detail view.

## Updating rules and indexes

```sh
npx firebase-tools login
npx firebase-tools deploy --project frontend-d6606 --only firestore
```

Do not deploy the old `functions` or `storage` files for this free-plan flow. They are no longer referenced by the frontend or deployment configuration.

## Sample data and local preview

The live project already contains three test profiles, eight venues, three time slots and eight sample reservations with matching booking locks and activity records. The trusted import tools remain available; they require administrator credentials. They preserve existing records.

```sh
npm install --prefix tools
npm run seed --prefix tools
npm run accounts --prefix tools
npm run mock --prefix tools
```

To use local samples, set `window.FRMS_DEMO_MODE = true` in `js/firebase/config.js`. Student `student@example.com`, second student `student2@example.com`, and admin `admin@example.com` all use `Demo123!` in local preview only. The public index loads live services. Use false for live testing.

## Checks

```sh
node --test tests/*.test.cjs
```

Firestore has free storage, read and write quotas. Monitor Firebase Console > Firestore > Usage; free quota is finite. Passwords remain in Firebase Authentication, never in user profiles. Keep service-account private keys outside the web folder.

References: [Firestore pricing](https://firebase.google.com/docs/firestore/pricing), [Transactions and rules](https://firebase.google.com/docs/firestore/manage-data/transactions), [Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
