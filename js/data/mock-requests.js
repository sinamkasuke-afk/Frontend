/* ==========================================================
   mock-requests.js
   Temporary (fake) reservation request data, shared by
   My Requests and the Dashboard.
   Later this will come from the backend API, filtered to the
   logged-in student.
   ========================================================== */

const mockRequests = [
  {
    id: "REQ-2026-001",
    venue: "Canteen",
    event: "Org Meetup",
    date: "May 7, 2026",
    time: "7:00 PM – 10:00 PM",
    status: "pending",
  },
  {
    id: "REQ-2026-002",
    venue: "Garden",
    event: "IT General Assembly",
    date: "October 15, 2026",
    time: "1:00 PM – 4:00 PM",
    status: "approved",
  },
  {
    id: "REQ-2026-003",
    venue: "Classroom",
    event: "Thesis Defense",
    date: "May 19, 2026",
    time: "9:00 AM – 12:00 PM",
    status: "declined",
  },
];