# Database schema

| Collection | Document ID | Purpose |
|---|---|---|
| users | Auth UID | Email, displayName, studentId, enrollmentStatus, approval actor/time, role, createdAt; no passwords |
| venues | Venue ID | Name, location, capacity, active and ordering |
| timeSlots | Slot ID | Label, startMinutes, endMinutes, active; fixed nonoverlapping intervals |
| reservations | UUID | Owner, canonical venue/date/slot, event fields, status, requestNumber, bookingId, quotaId, audit reference |
| bookings | venue_date_slot | Venue/date/slot lock with status; pending holds expire after 48 hours |
| reservationEvents | Event ID | Immutable submitted/approved/declined/cancelled audit records |
| counters | reservations | Numeric request-number counter and corresponding UUID |
| submissionLimits | UID_Manila-date | Count of new submissions for that user/day, capped at five |

New reservations have no attachment field or document subcollection. File access and uploads are denied in rules. Passwords are managed by Firebase Authentication. Admin privilege uses the trusted admin custom claim.

Create, approve/decline and cancellation operations use transactions. Cancellation retains the reservation and its activity instead of deleting them. Booking locks are released on decline or cancellation, never by modifying a list locally. Only pending reservations can be reviewed. Students cannot cancel after the selected slot starts.

Security Rules enforce enrollment-approved Gmail submissions, canonical catalog fields, valid dates within 90 days, positive capacity-limited guest counts, field size limits, numbering, daily quota, booking consistency and immutable audit. Browser validation helps the user but is not the authorization boundary.

Students register with Gmail and require administrator-approved enrollment to submit. Expired pending locks can be replaced, while approved locks remain exclusive. Students read only their own reservation/profile/activity. Administrators read all reservations. Lists and calendar subscribe to live changes. See ARCHITECTURE.md for state transitions and verification.

After administrator enrollment approval, students must enter the approved student ID in the portal confirmation form. Firestore stores `confirmedStudentId` and `studentIdConfirmedAt`. Submissions require the confirmed ID to match the current approved ID. Approval or rejection through the admin Students page resets confirmation. Students cannot change their approved ID or enrollment status. This is a one-time ID confirmation, not a replacement for checking school records.

Administrator registration is available below Admin Login. It creates a Firebase Authentication account and a pending `adminApplications/{uid}` document; passwords are handled by Authentication. Registration does not grant administrator access. The project owner checks the applicant and runs the trusted approval tool using credentials outside the website:

```sh
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json" NODE_PATH=./functions/node_modules node tools/approve-admin-account.cjs administrator@example.com
```

The tool writes an administrator profile, grants the Firebase `admin` custom claim, and marks the application approved. The applicant then signs in through Admin Login. Browser users cannot approve administrator applications or grant themselves administrator claims. This uses no paid Cloud Functions backend.
