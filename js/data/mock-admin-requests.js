/* ==========================================================
   mock-admin-requests.js
   Temporary (fake) reservation request data for the Admin
   side. Separate from mockRequests (student side) since the
   fields differ — this includes a requester and room detail.
   Later this will come from the backend API.
   ========================================================== */

const mockAdminRequests = [
  { id: "REQ-2026-001", requester: "Maria S. (Adviser)", venue: "Canteen (2nd Floor)", date: "September 3, 2026", time: "7:00 PM – 10:00 PM", status: "pending" },
  { id: "REQ-2026-002", requester: "Juan Dela Cruz (LCO)", venue: "Multipurpose Hall", date: "September 5, 2026", time: "9:00 AM – 12:00 PM", status: "approved" },
  { id: "REQ-2026-003", requester: "Engr. Santos (Faculty)", venue: "Audio-Visual Room", date: "September 8, 2026", time: "1:00 PM – 4:00 PM", status: "pending" },
  { id: "REQ-2026-004", requester: "Angela Reyes (Adviser)", venue: "Garden", date: "September 10, 2026", time: "3:00 PM – 6:00 PM", status: "approved" },
  { id: "REQ-2026-005", requester: "Mark Dizon (LCO)", venue: "Social Hall", date: "September 12, 2026", time: "10:00 AM – 1:00 PM", status: "declined" },
  { id: "REQ-2026-006", requester: "Dr. Lopez (Faculty)", venue: "Amphitheater", date: "September 15, 2026", time: "8:00 AM – 11:00 AM", status: "approved" },
  { id: "REQ-2026-007", requester: "Bea Fernandez (Adviser)", venue: "Classroom 204", date: "September 18, 2026", time: "1:00 PM – 3:00 PM", status: "pending" },
  { id: "REQ-2026-008", requester: "Carlo Ramos (LCO)", venue: "Gymnasium", date: "September 20, 2026", time: "4:00 PM – 8:00 PM", status: "approved" },
  { id: "REQ-2026-009", requester: "Prof. Villar (Faculty)", venue: "Canteen (2nd Floor)", date: "September 22, 2026", time: "11:00 AM – 1:00 PM", status: "declined" },
  { id: "REQ-2026-010", requester: "Nina Torres (Adviser)", venue: "Garden", date: "September 24, 2026", time: "9:00 AM – 12:00 PM", status: "approved" },
  { id: "REQ-2026-011", requester: "Kevin Uy (LCO)", venue: "Multipurpose Hall", date: "September 28, 2026", time: "2:00 PM – 5:00 PM", status: "approved" },
  { id: "REQ-2026-012", requester: "Ms. Aquino (Faculty)", venue: "Audio-Visual Room", date: "September 30, 2026", time: "10:00 AM – 12:00 PM", status: "pending" },
];