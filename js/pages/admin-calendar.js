document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(true)) return;
      var firebaseRequests = await FRMS.requests(true);
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       RESERVATIONS
       ========================================================== */

    function reservationDate(request) {
      const value = request.dateISO || request.date;
      // Parse a date-only value in local time so it keeps its selected day.
      return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00" : value);
    }
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedDay = today.getDate();
    let reservations = [];
    let previousMonthDays = [];
    let currentMonthDays = [];
    function refreshMonth() {
      const days = new Date(viewYear, viewMonth + 1, 0).getDate();
      selectedDay = Math.min(selectedDay, days);
      currentMonthDays = Array.from({ length: days }, (_, index) => index + 1);
      const leadingDays = new Date(viewYear, viewMonth, 1).getDay();
      const previousDays = new Date(viewYear, viewMonth, 0).getDate();
      previousMonthDays = Array.from({ length: leadingDays }, (_, index) => previousDays - leadingDays + index + 1);
      reservations = firebaseRequests.filter(request => {
        const date = reservationDate(request);
        return date.getFullYear() === viewYear && date.getMonth() === viewMonth;
      }).map(request => ({ ...request, day: reservationDate(request).getDate() }));
      const label = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      document.getElementById("current-month-button").textContent = label;
      document.querySelector(".mini-calendar__header h3, .mini-calendar-header h3, [data-mini-month]")?.replaceChildren(label);
    }
    function changeMonth(offset) {
      const date = new Date(viewYear, viewMonth + offset, 1);
      viewYear = date.getFullYear(); viewMonth = date.getMonth();
      refreshMonth(); renderAll();
    }

    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const calendarGrid =
      document.getElementById(
        "calendar-grid"
      );


    const miniCalendarGrid =
      document.getElementById(
        "mini-calendar-grid"
      );


    const selectedDateTitle =
      document.getElementById(
        "selected-date-title"
      );


    const selectedReservations =
      document.getElementById(
        "selected-reservations"
      );


    const approvedFilter =
      document.getElementById(
        "filter-approved"
      );


    const pendingFilter =
      document.getElementById(
        "filter-pending"
      );


    const declinedFilter =
      document.getElementById(
        "filter-declined"
      );


    /* ==========================================================
       CALENDAR CELLS
       ========================================================== */

    /* ==========================================================
       FILTER CHECK
       ========================================================== */

    function isStatusVisible(
      status
    ) {

      if (
        status ===
        "approved"
      ) {

        return approvedFilter.checked;

      }


      if (
        status ===
        "pending"
      ) {

        return pendingFilter.checked;

      }


      if (
        status ===
        "declined"
      ) {

        return declinedFilter.checked;

      }


      return true;

    }


    /* ==========================================================
       RENDER MAIN CALENDAR
       ========================================================== */

    function renderCalendar() {

      const cells =
        [];


      previousMonthDays.forEach(
        function (
          day
        ) {

          cells.push({
            day:
              day,

            outside:
              true
          });

        }
      );


      currentMonthDays.forEach(
        function (
          day
        ) {

          cells.push({
            day:
              day,

            outside:
              false
          });

        }
      );


      calendarGrid.innerHTML =
        cells
          .map(
            function (
              cell
            ) {

              const events =
                cell.outside
                  ? []
                  : reservations.filter(
                      function (
                        reservation
                      ) {

                        return (
                          reservation.day ===
                            cell.day &&
                          isStatusVisible(
                            reservation.status
                          )
                        );

                      }
                    );


              const eventHTML =
                events
                  .slice(
                    0,
                    2
                  )
                  .map(
                    function (
                      event
                    ) {

                      return `
                        <div
                          class="
                            calendar-event
                            calendar-event--${event.status}
                          "
                        >

                          <strong>
                            ${escapeHTML(
                              event.time
                            )}
                            ${escapeHTML(
                              event.venue
                            )}
                          </strong>

                          <small>
                            ${escapeHTML(
                              event.event
                            )}
                          </small>

                        </div>
                      `;

                    }
                  )
                  .join("");


              return `
                <div
                  class="
                    calendar-day
                    ${
                      cell.outside
                        ? "calendar-day--outside"
                        : ""
                    }
                    ${
                      !cell.outside &&
                      cell.day ===
                        selectedDay
                        ? "calendar-day--selected"
                        : ""
                    }
                  "
                  ${
                    cell.outside
                      ? ""
                      : `data-day="${cell.day}"`
                  }
                >

                  <span class="calendar-day__number">
                    ${cell.day}
                  </span>

                  ${eventHTML}

                </div>
              `;

            }
          )
          .join("");

    }


    /* ==========================================================
       MINI CALENDAR
       ========================================================== */

    function renderMiniCalendar() {

      const cells =
        [];


      previousMonthDays.forEach(
        function (
          day
        ) {

          cells.push({
            day:
              day,

            outside:
              true
          });

        }
      );


      currentMonthDays.forEach(
        function (
          day
        ) {

          cells.push({
            day:
              day,

            outside:
              false
          });

        }
      );


      miniCalendarGrid.innerHTML =
        cells
          .map(
            function (
              cell
            ) {

              return `
                <div
                  class="
                    mini-date
                    ${
                      cell.outside
                        ? "mini-date--outside"
                        : ""
                    }
                    ${
                      !cell.outside &&
                      cell.day ===
                        selectedDay
                        ? "mini-date--selected"
                        : ""
                    }
                  "
                  ${
                    cell.outside
                      ? ""
                      : `data-mini-day="${cell.day}"`
                  }
                >
                  ${cell.day}
                </div>
              `;

            }
          )
          .join("");

    }


    /* ==========================================================
       SELECTED DATE RESERVATIONS
       ========================================================== */

    function renderSelectedReservations() {

      selectedDateTitle.textContent =
        new Date(viewYear, viewMonth, selectedDay).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });


      const dayReservations =
        reservations.filter(
          function (
            reservation
          ) {

            return (
              reservation.day ===
                selectedDay &&
              isStatusVisible(
                reservation.status
              )
            );

          }
        );


      if (
        dayReservations.length ===
        0
      ) {

        selectedReservations.innerHTML = `
          <div
            style="
              padding:18px 8px;
              text-align:center;
              color:#858c88;
              font-size:9px;
            "
          >
            No reservations for this date.
          </div>
        `;

        return;

      }


      selectedReservations.innerHTML =
        dayReservations
          .map(
            function (
              reservation
            ) {

              return `
                <div class="selected-reservation" data-reservation-id="${escapeHTML(reservation.id)}" tabindex="0" title="View reservation details">

                  <div class="selected-reservation__top">

                    <span
                      class="
                        selected-reservation__dot
                        selected-reservation__dot--${reservation.status}
                      "
                    ></span>

                    <strong>
                      ${escapeHTML(
                        reservation.venue
                      )}
                    </strong>

                  </div>

                  <small>
                    ${escapeHTML(
                      reservation.time
                    )}
                  </small>

                  <small>
                    ${escapeHTML(
                      reservation.event
                    )}
                  </small>
                  <button type="button" data-delete-reservation="${escapeHTML(reservation.id)}"
                    style="margin-top:10px;padding:8px 12px;background:#b42318;color:white;border:0;border-radius:6px;cursor:pointer">Delete</button>

                </div>
              `;

            }
          )
          .join("");

    }


    document.getElementById("prev-month").addEventListener("click", () => changeMonth(-1));
    document.getElementById("next-month").addEventListener("click", () => changeMonth(1));
    document.querySelectorAll(".mini-nav-button").forEach((button, index) => button.addEventListener("click", () => changeMonth(index === 0 ? -1 : 1)));
    refreshMonth();

    /* ==========================================================
       DAY CLICK
       ========================================================== */

    calendarGrid.addEventListener(
      "click",
      function (
        event
      ) {

        const dayCell =
          event.target.closest(
            ".calendar-day[data-day]"
          );


        if (!dayCell) {

          return;

        }


        selectedDay =
          Number(
            dayCell.dataset.day
          );


        renderAll();

      }
    );


    miniCalendarGrid.addEventListener(
      "click",
      function (
        event
      ) {

        const miniDay =
          event.target.closest(
            ".mini-date[data-mini-day]"
          );


        if (!miniDay) {

          return;

        }


        selectedDay =
          Number(
            miniDay.dataset
              .miniDay
          );


        renderAll();

      }
    );


    /* ==========================================================
       FILTER EVENTS
       ========================================================== */

    approvedFilter.addEventListener(
      "change",
      renderAll
    );


    pendingFilter.addEventListener(
      "change",
      renderAll
    );


    declinedFilter.addEventListener(
      "change",
      renderAll
    );


    /* ==========================================================
       PROFILE DROPDOWN
       ========================================================== */

    /* ==========================================================
       ESCAPE HTML
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


    /* ==========================================================
       RENDER ALL
       ========================================================== */

    function renderAll() {

      renderCalendar();

      renderMiniCalendar();

      renderSelectedReservations();

    }


    renderAll();
    window.addEventListener("reservation-deleted", event => {
      firebaseRequests = firebaseRequests.filter(request => request.id !== event.detail.id);
      refreshMonth();
      renderAll();
    });

    selectedReservations.addEventListener("click", async event => {
      const button = event.target.closest("[data-delete-reservation]");
      if (!button) return;
      event.stopPropagation();
      if (!window.confirm("Permanently delete this reservation and its attachment? Its time slot will be released.")) return;
      button.disabled = true;
      try { await FRMS.deleteReservation(button.dataset.deleteReservation); }
      catch (error) { button.disabled = false; FRMS.showError(error); }
    });

  }
);