# Database schema

| Collection | Document ID | Purpose |
|---|---|---|
| users | Auth UID | Email, displayName, studentId, enrollmentStatus, approval actor/time, role, createdAt; no passwords |
| venues | Venue ID | Name, location, capacity, active and ordering |
| timeSlots | Slot ID | Label, startMinutes, endMinutes, active; suggested whole-hour intervals |
| reservations | UUID | Owner, venue/date/slot, startMinutes/endMinutes, event fields, status, requestNumber, bookingId, quotaId, audit reference |
| bookings | venue_date_slot | Full time range with startMinutes/endMinutes and status; pending holds expire after 48 hours |
| bookingDays | venue_date | Server-managed date marker that disables legacy direct browser submissions on that facility/date |
| reservationEvents | Event ID | Immutable submitted/approved/declined/cancelled audit records |
| counters | reservations | Numeric request-number counter and corresponding UUID |
| submissionLimits | UID_Manila-date | Count of new submissions for that user/day, capped at five |

New reservations have no attachment field or document subcollection. File access and uploads are denied in rules. Passwords are managed by Firebase Authentication. Admin privilege uses the trusted admin custom claim.

Create, approve/decline and cancellation operations use transactions. Cancellation retains the reservation and its activity instead of deleting them. Booking locks are released on decline or cancellation, never by modifying a list locally. Only pending reservations can be reviewed. Students cannot cancel after the selected slot starts.

Security Rules enforce enrollment-approved Gmail submissions, canonical catalog fields, valid dates within 90 days, positive capacity-limited guest counts, field size limits, numbering, daily quota, booking consistency and immutable audit. Browser validation helps the user but is not the authorization boundary.

Students register with Gmail and require administrator-approved enrollment to submit. Expired pending locks can be replaced, while approved locks remain exclusive. Students read only their own reservation/profile/activity. Administrators read all reservations. Lists and calendar subscribe to live changes. See ARCHITECTURE.md for state transitions and verification.

After administrator enrollment approval, students must enter the approved student ID in the portal confirmation form. Firestore stores `confirmedStudentId` and `studentIdConfirmedAt`. Submissions require the confirmed ID to match the current approved ID. Approval or rejection through the admin Students page resets confirmation. Students cannot change their approved ID or enrollment status. This is a one-time ID confirmation, not a replacement for checking school records.

Administrator registration requires an invitation issued by an existing authorized administrator. Open Admin → Students → Invite Administrator, enter the intended email, and share the generated code privately. Invitations expire after seven days, are bound to one email, and cannot be redeemed by a second account. A valid invitation enables access immediately without a separate approval wait. Existing pending applicants enter the code under the activation section of Admin Login. Existing authorized accounts continue to work.

`adminInvitations/{sha256(code)}` stores the intended email, issuer, creation/expiry timestamps and redemption UID. The plaintext code is shown only when issued. Browser reads/writes of this collection are denied; the server checks the caller's current Firebase admin claim when issuing invitations and verifies their Firebase session when redeeming one. Server credentials remain in the sensitive Vercel production environment.

Students can choose whole-hour start/end times with AM/PM, including 8-hour and 12-hour bookings. Ranges must be within the same day and start in the future. POST /api/reservation-submit checks current Auth access, enrollment, confirmed ID, venue capacity, dates, quotas and every active booking range for that venue/date inside a Firestore transaction. The shared request counter serializes submissions, including older clients. Adjacent bookings are allowed; overlaps at different venues are allowed. Legacy bookings without range fields use the canonical three-period boundaries. bookingDays blocks older browser writes on server-managed days, preventing legacy clients from bypassing custom-range overlap checks. Server credentials remain in Vercel.

Dashboard recent lists are capped (admin: 10, student: 25), with independent global aggregate counts. The student's next approved booking is queried separately so an older request is not hidden by the recent limit. The calendar subscribes only to the selected month and discards stale results when navigating.
