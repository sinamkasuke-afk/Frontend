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
    const reservations = firebaseRequests
      .filter(request => {
        const date = reservationDate(request);
        return date.getFullYear() === 2026 && date.getMonth() === 9;
      })
      .map(request => ({ ...request, day: reservationDate(request).getDate() }));


    /* ==========================================================
       STATE
       ========================================================== */

    let selectedDay =
      4;


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

    const previousMonthDays = [
      27,
      28,
      29,
      30
    ];


    const currentMonthDays =
      Array.from(
        {
          length: 31
        },
        function (
          _,
          index
        ) {

          return index + 1;

        }
      );


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
        `October ${selectedDay}, 2026`;


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
                <div class="selected-reservation">

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

                </div>
              `;

            }
          )
          .join("");

    }


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

    const profileWrapper =
      document.querySelector(
        ".admin-profile-wrapper"
      );


    const profileButton =
      document.getElementById(
        "admin-profile-button"
      );


    if (
      profileWrapper &&
      profileButton
    ) {

      profileButton.addEventListener(
        "click",
        function (
          event
        ) {

          event.stopPropagation();


          profileWrapper
            .classList
            .toggle(
              "admin-profile-wrapper--open"
            );

        }
      );


      document.addEventListener(
        "click",
        function (
          event
        ) {

          if (
            !profileWrapper.contains(
              event.target
            )
          ) {

            profileWrapper
              .classList
              .remove(
                "admin-profile-wrapper--open"
              );

          }

        }
      );

    }


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

  }
);