# Database inventory

The folder has public facility browsing; student login, a three-step reservation form, a dashboard and request lists; and admin login, dashboard, decisions, history, and a calendar. These features use the following collections. History and dashboard counts are views of reservation records, not duplicate collections.

| Collection | Document ID | Purpose | Created by |
| --- | --- | --- | --- |
| `users` | Firebase Auth UID | Email, display name, student/admin profile label, creation time | Login or trusted account tool |
| `venues` | Stable slug, e.g. `multipurpose-hall` | Public catalog, location, active state, capacity, featured images and tags | Trusted seed tool; admins can manage catalog |
| `timeSlots` | `morning`, `midday`, `afternoon` | Fixed non-overlapping schedule with start/end minutes | Trusted seed tool |
| `reservations` | Draft UUID | Event form fields, owner, status, selected venue/date/slot, optional attachment metadata | Student Firestore transaction |
| `bookings` | `{venueId}_{YYYY-MM-DD}_{slotId}` | Exclusive occupancy, linked reservation ID; no student details | Student/admin Firestore transactions |
| `reservationEvents` | Submission ID or generated event ID | Immutable submission and approval/decline audit events | Student/admin Firestore transactions |

Small PDFs up to 500KB live in the Firestore subcollection `reservations/{id}/documents/proposal`. Parent reservations hold their path and metadata; the child document holds base64 content excluded from indexes. Cloud Storage is not used. Passwords belong to Firebase Authentication, not Firestore. Admin authorization uses a trusted custom claim, not an editable database role label.

## Operations connected to the UI

- Landing page: query active venues and render featured facilities.
- Student login: Firebase Auth, then create a missing `users/{uid}` profile.
- Venue step: active venues, active time slots minus booking records for the selected venue/date. Pending requests hold a slot until reviewed.
- Details/review steps: validate fields, keep the PDF temporarily in IndexedDB, upload it, then write a secured Firestore transaction. A stable draft UUID makes retries safe.
- Student transaction: validates identity, date, capacity and catalog IDs. A Firestore transaction writes the reservation, occupancy and submission event together. Competing submissions cannot take the same slot.
- Admin transaction: validates the admin claim and atomically records the decision, updates/releases occupancy, and appends an event. Repeated identical decisions are idempotent.
- Student dashboard/list: owner-filtered reservations; admin pages: all reservations. Click a reservation row or focus it and press Enter for form details, PDF access and activity.
- Admin calendar: real records filtered by the selected month, with previous/next navigation.

## Free-plan deployment

The frontend requires only Firebase Authentication, Firestore rules and indexes. These have been deployed without upgrading to Blaze. The previously prepared callable functions and Storage files are unused. All cross-document reservation, booking and activity writes are validated by Firestore Security Rules using getAfter().

The seed tool populates venues and time slots; the account tool populates users. Submissions create reservations, bookings, events and the optional documents subcollection. No duplicate history collection is needed. Existing sample records are preserved. Refresh pages to see another session's updates.

Local tests cover the transaction logic and client behavior. A live student commit with a PDF followed by an admin decline and slot release succeeded. The temporary verification records were removed afterward.

## Mock data

`js/data/sample-data.js` generates eight sample reservations, users, venues, slots, locks and events. Explicit demo mode in `js/firebase/config.js` runs all pages against browser-local copies. The trusted `tools/seed-mock-data.cjs` importer uses real test account UIDs to populate Firestore; see `FIREBASE_SETUP.md`.
