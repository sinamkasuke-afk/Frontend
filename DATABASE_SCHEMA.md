# Database inventory

The folder has public facility browsing; student login, a three-step reservation form, a dashboard and request lists; and admin login, dashboard, decisions, history, and a calendar. These features use the following collections. History and dashboard counts are views of reservation records, not duplicate collections.

| Collection | Document ID | Purpose | Created by |
| --- | --- | --- | --- |
| `users` | Firebase Auth UID | Email, display name, student/admin profile label, creation time | Login or trusted account tool |
| `venues` | Stable slug, e.g. `multipurpose-hall` | Public catalog, location, active state, capacity, featured images and tags | Trusted seed tool; admins can manage catalog |
| `timeSlots` | `morning`, `midday`, `afternoon` | Fixed non-overlapping schedule with start/end minutes | Trusted seed tool |
| `reservations` | Draft UUID | Event form fields, owner, status, selected venue/date/slot, optional attachment metadata | `submitReservation` callable |
| `bookings` | `{venueId}_{YYYY-MM-DD}_{slotId}` | Exclusive occupancy, linked reservation ID; no student details | Submission/review transactions |
| `reservationEvents` | Submission ID or generated event ID | Immutable submission and approval/decline audit events | Submission/review transactions |

Actual PDFs live in Cloud Storage at `supportingDocuments/{uid}/{requestId}/proposal.pdf`. Firestore holds the path and metadata, not file contents. Passwords belong to Firebase Authentication, not Firestore. Admin authorization uses a trusted custom claim, not an editable database role label.

## Operations connected to the UI

- Landing page: query active venues and render featured facilities.
- Student login: Firebase Auth, then create a missing `users/{uid}` profile.
- Venue step: active venues, active time slots minus booking records for the selected venue/date. Pending requests hold a slot until reviewed.
- Details/review steps: validate fields, keep the PDF temporarily in IndexedDB, upload it, then call the backend. A stable draft UUID makes retries safe.
- Submit callable: validates identity, date, capacity and catalog IDs. A Firestore transaction writes the reservation, occupancy and submission event together. Competing submissions cannot take the same slot.
- Admin review callable: validates the admin claim and atomically records the decision, updates/releases occupancy, and appends an event. Repeated identical decisions are idempotent.
- Student dashboard/list: owner-filtered reservations; admin pages: all reservations. Click a reservation row or focus it and press Enter for form details, PDF access and activity.
- Admin calendar: real records filtered by the selected month, with previous/next navigation.

## Deployment boundary

These files do not provision a live project on their own. The client now requires deployed callable functions, published Firestore/Storage rules, and seeded venue/time-slot documents. Cloud Functions and Cloud Storage require an appropriately configured billing plan and enabled services. Publishing the rules without the functions will block direct reservation writes by design.

Firestore creates collections when their first document is written. The seed tool populates `venues` and `timeSlots`; the account tool populates `users`; the first real reservation populates `reservations`, `bookings`, and `reservationEvents`. Do not create fake reservations just to display empty collection names.

Local transaction-service tests cover writes, retries, competing submissions, slot release/reapproval, authorization, date validation, capacity, and attachment metadata. These use a serialized in-memory transaction adapter; they do not replace a live or Emulator Suite deployment test. Legacy reservations created before booking locks were added are read-only for review until migrated. Refresh list pages to see changes made by another session. Profile and notification placeholders in the original admin header do not require additional collections until those features are implemented.

## Mock data

`js/data/sample-data.js` generates eight sample reservations, users, venues, slots, locks and events. Explicit demo mode in `js/firebase/config.js` runs all pages against browser-local copies. The trusted `tools/seed-mock-data.cjs` importer uses real test account UIDs to populate Firestore; see `FIREBASE_SETUP.md`.
