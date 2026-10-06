document.addEventListener("DOMContentLoaded", async function () {
    try {
      if (!await FRMS.requireUser(false)) return;
      var [reservationRequests, globalCounts, upcomingRecord] = await Promise.all([FRMS.requests(false, { limit:25 }), FRMS.requestCounts(false), FRMS.upcomingReservation(false)]);
    } catch (error) { FRMS.showError(error); return; }


  const stopCounts = FRMS.watchCounts(() => window.location.reload(), false, globalCounts);
  window.addEventListener('pagehide', stopCounts, {once:true});

  renderNavbar(
    "navbar",
    "dashboard",
    "student"
  );


  const dashboardBody =
    document.getElementById("dashboard-body");

  const helpButton =
    document.getElementById("help-button");

  const helpPopover =
    document.getElementById("help-popover");

  const helpClose =
    document.getElementById("help-close");


  /* ==========================================================
     STATUS LABELS
     ========================================================== */

  const statusLabels = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined"
  };


  /* ==========================================================
     HELP & SUPPORT
     ========================================================== */

  if (
    helpButton &&
    helpPopover
  ) {

    helpButton.addEventListener(
      "click",
      function () {

        helpPopover.classList.toggle(
          "help-popover--open"
        );

      }
    );

  }


  if (
    helpClose &&
    helpPopover
  ) {

    helpClose.addEventListener(
      "click",
      function () {

        helpPopover.classList.remove(
          "help-popover--open"
        );

      }
    );

  }


  /*
    Close help popover when clicking
    outside of it.
  */

  document.addEventListener(
    "click",
    function (event) {

      if (
        !helpPopover ||
        !helpButton
      ) {
        return;
      }


      const clickedInsidePopover =
        helpPopover.contains(
          event.target
        );

      const clickedHelpButton =
        helpButton.contains(
          event.target
        );


      if (
        !clickedInsidePopover &&
        !clickedHelpButton
      ) {

        helpPopover.classList.remove(
          "help-popover--open"
        );

      }

    }
  );


  /*
    Escape also closes help popover.
  */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {

        helpPopover?.classList.remove(
          "help-popover--open"
        );

      }

    }
  );


  if (FRMS.watchRequests) {
    let signature = JSON.stringify(reservationRequests.map(request => [request.id, request.status]));
    try {
      const unsubscribe = await FRMS.watchRequests(records => {
        const next = JSON.stringify(records.map(request => [request.id, request.status]));
        if (next !== signature) { signature = next; window.location.reload(); }
      }, false, { limit:25 });
      const stopUpcoming = await FRMS.watchUpcoming(record => { if ((record?.id || null) !== (upcomingRecord?.id || null) || record?.status !== upcomingRecord?.status) window.location.reload(); });
      window.addEventListener("pagehide", stopUpcoming, {once:true});
      window.addEventListener("pagehide", unsubscribe, { once: true });
    } catch (error) { FRMS.showError(error); }
  }

  /* ==========================================================
     CHECK DASHBOARD BODY
     ========================================================== */

  if (!dashboardBody) {

    console.error(
      "Dashboard body element was not found."
    );

    return;

  }


  /* ==========================================================
     CHECK REQUEST DATA
     ========================================================== */

  if (
    typeof reservationRequests === "undefined" ||
    !Array.isArray(reservationRequests)
  ) {

    console.error(
      "reservationRequests is not available."
    );


    dashboardBody.innerHTML = `
      <div class="dashboard-empty">

        <h2>
          Unable to load reservations
        </h2>

        <p>
          Reservation data could not be loaded.
          Please refresh the page.
        </p>

      </div>
    `;

    return;

  }


  /* ==========================================================
     EMPTY STATE
     ========================================================== */

  if (
    reservationRequests.length === 0
  ) {

    dashboardBody.innerHTML = `
      <div class="dashboard-empty">

        <h2>
          No reservations yet
        </h2>

        <p>
          Once you submit a reservation,
          your requests will appear here.
        </p>

        <a href="new-reservation-venue.html">
          Create Your First Reservation →
        </a>

      </div>
    `;

    return;

  }


  /* ==========================================================
     COUNTS
     ========================================================== */

  const totalCount =
    globalCounts.total;


  const pendingCount =
    globalCounts.pending;


  const approvedCount =
    globalCounts.approved;


  const declinedCount =
    globalCounts.declined;


  const upcoming =
    upcomingRecord;


  const recent =
    reservationRequests.slice(
      0,
      3
    );


  /* ==========================================================
     RENDER DASHBOARD
     ========================================================== */

  dashboardBody.innerHTML = `

    <!-- STAT CARDS -->

    <section class="dashboard-stats">

      ${renderStatCard(
        "total",
        "▣",
        totalCount,
        "Total Reservations"
      )}


      ${renderStatCard(
        "pending",
        "◷",
        pendingCount,
        "Pending Requests"
      )}


      ${renderStatCard(
        "approved",
        "✓",
        approvedCount,
        "Approved Reservations"
      )}


      ${renderStatCard(
        "declined",
        "×",
        declinedCount,
        "Declined Reservations"
      )}

    </section>


    <!-- MAIN CONTENT -->

    <div class="dashboard-content-grid">


      <!-- LEFT COLUMN -->

      <div class="dashboard-left-column">

        ${
          upcoming
            ? renderUpcoming(
                upcoming
              )
            : renderNoUpcoming()
        }


        ${renderRecent(
          recent
        )}

      </div>


      <!-- RIGHT COLUMN -->

      <aside class="dashboard-right-column">

        ${renderQuickActions()}

        ${renderCategories()}

      </aside>


    </div>

  `;


  /* ==========================================================
     COUNT STATUS
     ========================================================== */

  function countStatus(
    status
  ) {

    return reservationRequests.filter(
      function (request) {

        return (
          request.status ===
          status
        );

      }
    ).length;

  }


  /* ==========================================================
     UPCOMING RESERVATION
     ========================================================== */

  function getUpcomingReservation() {

    const today =
      new Date();


    today.setHours(
      0,
      0,
      0,
      0
    );


    const approvedRequests =
      reservationRequests.filter(
        function (request) {

          return (
            request.status ===
            "approved"
          );

        }
      );


    const futureApproved =
      approvedRequests.find(
        function (request) {

          const requestDate =
            parseRequestDate(
              request.date
            );


          if (!requestDate) {

            return false;

          }


          requestDate.setHours(
            0,
            0,
            0,
            0
          );


          return (
            requestDate >=
            today
          );

        }
      );


    return (
      futureApproved ||
      approvedRequests[0] ||
      null
    );

  }


  /* ==========================================================
     DATE PARSER
     ========================================================== */

  function parseRequestDate(
    value
  ) {

    if (!value) {

      return null;

    }


    const directDate =
      new Date(
        value
      );


    if (
      !Number.isNaN(
        directDate.getTime()
      )
    ) {

      return directDate;

    }


    return null;

  }


  /* ==========================================================
     STAT CARD
     ========================================================== */

  function renderStatCard(
    type,
    icon,
    value,
    label
  ) {

    return `
      <article
        class="
          dashboard-stat
          dashboard-stat--${type}
        "
      >

        <div
          class="dashboard-stat__icon"
        >
          ${icon}
        </div>


        <div>

          <div
            class="dashboard-stat__value"
          >
            ${value}
          </div>


          <div
            class="dashboard-stat__label"
          >
            ${label}
          </div>

        </div>

      </article>
    `;

  }


  /* ==========================================================
     UPCOMING RESERVATION CARD
     ========================================================== */

  function renderUpcoming(
    request
  ) {

    return `
      <section class="dashboard-panel">

        <div
          class="dashboard-panel__header"
        >

          <h2>
            Upcoming Reservation
          </h2>


          <a
            href="my-requests.html"
            class="dashboard-panel__link"
          >
            View Details →
          </a>

        </div>


        <article
          class="upcoming-reservation"
        >

          <img
            class="upcoming-reservation__image"
            src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=900&q=80"
            alt="${escapeHTML(
              request.venue ||
              "Reserved facility"
            )}"
          >


          <div
            class="upcoming-reservation__content"
          >

            <span
              class="upcoming-reservation__status"
            >
              Approved
            </span>


            <h3>
              ${escapeHTML(
                request.venue ||
                "Facility"
              )}
            </h3>


            <div
              class="upcoming-meta"
            >

              <span>
                ▣
                ${escapeHTML(
                  request.date ||
                  "No date"
                )}
              </span>


              <span>
                ◷
                ${escapeHTML(
                  request.time ||
                  "No time"
                )}
              </span>

            </div>


            <p
              class="upcoming-event"
            >
              ⌖
              ${escapeHTML(
                request.event ||
                "Reservation"
              )}
            </p>

          </div>

        </article>

      </section>
    `;

  }


  /* ==========================================================
     NO UPCOMING RESERVATION
     ========================================================== */

  function renderNoUpcoming() {

    return `
      <section class="dashboard-panel">

        <div
          class="dashboard-panel__header"
        >

          <h2>
            Upcoming Reservation
          </h2>

        </div>


        <div class="dashboard-empty">

          <h2>
            No upcoming reservation
          </h2>

          <p>
            You currently have no
            approved upcoming
            reservations.
          </p>

          <a
            href="new-reservation-venue.html"
          >
            Make a Reservation →
          </a>

        </div>

      </section>
    `;

  }


  /* ==========================================================
     RECENT RESERVATIONS
     ========================================================== */

  function renderRecent(
    requests
  ) {

    const rows =
      requests
        .map(
          function (request) {

            const status =
              request.status ||
              "pending";


            const statusLabel =
              statusLabels[
                status
              ] ||
              status;


            return `
              <tr data-reservation-id="${escapeHTML(request.id)}" tabindex="0" title="View reservation details" style="cursor:pointer">

                <td>
                  ${escapeHTML(
                    request.venue ||
                    "-"
                  )}
                </td>


                <td>
                  ${escapeHTML(
                    request.event ||
                    "-"
                  )}
                </td>


                <td>
                  ${escapeHTML(
                    request.date ||
                    "-"
                  )}
                </td>


                <td>

                  <span
                    class="
                      status-badge
                      status-badge--${status}
                    "
                  >
                    ${escapeHTML(
                      statusLabel
                    )}
                  </span>

                </td>


                <td>

                  <a
                    href="my-requests.html"
                  >
                    View
                  </a>

                </td>

              </tr>
            `;

          }
        )
        .join("");


    return `
      <section class="dashboard-panel">

        <div
          class="dashboard-panel__header"
        >

          <h2>
            Recent Reservations
          </h2>


          <a
            class="dashboard-panel__link"
            href="my-requests.html"
          >
            View All →
          </a>

        </div>


        <div
          class="dashboard-table-wrap"
        >

          <table
            class="dashboard-table"
          >

            <thead>

              <tr>

                <th>
                  Venue
                </th>

                <th>
                  Event
                </th>

                <th>
                  Date
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>


            <tbody>
              ${rows}
            </tbody>

          </table>

        </div>

      </section>
    `;

  }


  /* ==========================================================
     QUICK ACTIONS
     ========================================================== */

  function renderQuickActions() {

    return `
      <section
        class="
          dashboard-panel
          quick-actions
        "
      >

        <div
          class="dashboard-panel__header"
        >

          <div>

            <h2>
              Quick Actions
            </h2>

            <p
              class="quick-actions__subtitle"
            >
              What would you
              like to do?
            </p>

          </div>

        </div>


        <!-- NEW RESERVATION -->

        <a
          href="new-reservation-venue.html"
          class="quick-action"
        >

          <span
            class="quick-action__icon"
          >
            ▣
          </span>


          <div>

            <strong>
              New Reservation
            </strong>

            <p>
              Book a facility
              for your event.
            </p>

          </div>


          <span
            class="quick-action__arrow"
          >
            →
          </span>

        </a>


        <!-- BROWSE FACILITIES -->

        <a
          href="new-reservation-venue.html"
          class="quick-action"
        >

          <span
            class="quick-action__icon"
          >
            ▥
          </span>


          <div>

            <strong>
              Browse Facilities
            </strong>

            <p>
              Explore available
              spaces.
            </p>

          </div>


          <span
            class="quick-action__arrow"
          >
            →
          </span>

        </a>


        <!-- MY RESERVATIONS -->

        <a
          href="my-requests.html"
          class="quick-action"
        >

          <span
            class="quick-action__icon"
          >
            ▤
          </span>


          <div>

            <strong>
              My Reservations
            </strong>

            <p>
              View and manage
              your requests.
            </p>

          </div>


          <span
            class="quick-action__arrow"
          >
            →
          </span>

        </a>

      </section>
    `;

  }


  /* ==========================================================
     FACILITY CATEGORIES
     ========================================================== */

  function renderCategories() {

    return `
      <section
        class="dashboard-panel"
      >

        <div
          class="dashboard-panel__header"
        >

          <h2>
            Browse by Category
          </h2>


          <a
            href="new-reservation-venue.html"
            class="dashboard-panel__link"
          >
            →
          </a>

        </div>


        <div class="category-grid">

          ${renderCategory(
            "▥",
            "Classrooms"
          )}


          ${renderCategory(
            "♙",
            "Meeting Rooms"
          )}


          ${renderCategory(
            "◉",
            "Auditoriums"
          )}


          ${renderCategory(
            "♧",
            "Outdoor Spaces"
          )}


          ${renderCategory(
            "◌",
            "Sports Facilities"
          )}


          ${renderCategory(
            "▦",
            "View All"
          )}

        </div>

      </section>
    `;

  }


  /* ==========================================================
     CATEGORY
     ========================================================== */

  function renderCategory(
    icon,
    label
  ) {

    return `
      <a
        href="new-reservation-venue.html"
        class="category-item"
      >

        <div
          class="category-icon"
        >
          ${icon}
        </div>


        <span>
          ${escapeHTML(
            label
          )}
        </span>

      </a>
    `;

  }


  /* ==========================================================
     BASIC HTML ESCAPE
     ========================================================== */

  function escapeHTML(
    value
  ) {

    return String(
      value ?? ""
    )

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }

});