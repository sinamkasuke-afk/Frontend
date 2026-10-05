/* ==========================================================
   requests-table.js
   Builds the reservation requests table.

     renderRequestsTable("requests-table", requests);

   requests = array of { id, venue, date, time, status }
   status must be "pending" | "approved" | "declined"
   ========================================================== */

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

function renderRequestsTable(containerId, requests) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rowsHtml =
    requests.length === 0
      ? `<tr class="requests-table__empty"><td colspan="5">No reservation requests in this category yet.</td></tr>`
      : requests
          .map(function (request) {
            return `
              <tr>
                <td class="requests-table__id">${request.id}</td>
                <td>${request.venue}</td>
                <td>${request.date}</td>
                <td>${request.time}</td>
                <td>
                  <span class="status-badge status-badge--${request.status}">
                    ${STATUS_LABELS[request.status]}
                  </span>
                </td>
              </tr>
            `;
          })
          .join("");

  container.innerHTML = `
    <table class="requests-table">
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Venue</th>
          <th>Date</th>
          <th>Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}