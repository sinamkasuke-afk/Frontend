document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(false)) return;
      var reservationRequests = FRMS.mountRequestPagination ? [] : await FRMS.requests();
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       NAVBAR
       ========================================================== */

    renderNavbar(
      "navbar",
      "my-requests",
      "student"
    );


    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const tableBody =
      document.getElementById(
        "request-table-body"
      );


    const emptyState =
      document.getElementById(
        "requests-empty"
      );


    const emptyMessage =
      document.getElementById(
        "requests-empty-message"
      );


    const searchInput =
      document.getElementById(
        "request-search"
      );


    const tabs =
      document.querySelectorAll(
        ".request-tab"
      );


    /* ==========================================================
       CURRENT FILTER
       ========================================================== */

    let activeStatus =
      "all";


    /* ==========================================================
       REQUEST DATA
       ========================================================== */

    const requests =
      Array.isArray(reservationRequests)
        ? reservationRequests
        : [];


    /* ==========================================================
       COUNTS
       ========================================================== */

    let summaryCounts = null;
    function updateCounts() {
      document.getElementById("total-count").textContent = summaryCounts?.total ?? requests.length;
      document.getElementById("all-tab-count").textContent = summaryCounts?.total ?? requests.length;
      for (const status of ["pending", "approved", "declined"]) {
        document.getElementById(status + "-count").textContent = summaryCounts?.[status] ?? countStatus(status);
        document.getElementById(status + "-tab-count").textContent = summaryCounts?.[status] ?? countStatus(status);
      }
    }

    /* ==========================================================
       STATUS COUNT
       ========================================================== */

    function countStatus(
      status
    ) {

      return requests.filter(
        function (request) {

          return (
            String(
              request.status
            )
              .toLowerCase() ===
            status
          );

        }
      ).length;

    }


    /* ==========================================================
       TABS
       ========================================================== */

    tabs.forEach(
      function (tab) {

        tab.addEventListener(
          "click",
          function () {

            tabs.forEach(
              function (item) {

                item.classList.remove(
                  "request-tab--active"
                );

              }
            );


            tab.classList.add(
              "request-tab--active"
            );


            activeStatus =
              tab.dataset.status;


            renderRequests();

          }
        );

      }
    );


    /* ==========================================================
       SEARCH
       ========================================================== */

    if (searchInput) {

      searchInput.addEventListener(
        "input",
        function () {

          renderRequests();

        }
      );

    }


    /* ==========================================================
       RENDER REQUESTS
       ========================================================== */

    function renderRequests() {

      const query =
        searchInput
          ? searchInput.value
              .trim()
              .toLowerCase()
          : "";


      const filtered =
        requests.filter(
          function (request) {

            const statusMatch = activeStatus === "all" ||
              String(
                request.status
              )
                .toLowerCase() ===
              activeStatus;


            if (!statusMatch) {

              return false;

            }


            if (!query) {

              return true;

            }


            const searchText = [

              request.id,

              request.requestId,

              request.venue,

              request.event,

              request.date,

              request.time,

              request.status

            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


            return searchText.includes(
              query
            );

          }
        );


      /* NO RESULTS */

      if (
        filtered.length === 0
      ) {

        tableBody.innerHTML =
          "";


        emptyState.hidden =
          false;


        if (query) {

          emptyMessage.textContent =
            "No reservation matches your search.";

        } else {

          emptyMessage.textContent =
            activeStatus === "all" ? "You currently have no reservation requests." : `You currently have no ${activeStatus} reservation requests.`;

        }


        return;

      }


      emptyState.hidden =
        true;


      /* ROWS */

      tableBody.innerHTML =
        filtered
          .map(
            function (
              request,
              index
            ) {

              const status =
                String(
                  request.status ||
                  "pending"
                )
                  .toLowerCase();


              const requestId =
                request.requestNumber || request.id ||
                request.requestId ||
                createRequestId(
                  index
                );


              return `
                <tr data-reservation-id="${escapeHTML(request.id)}" tabindex="0" title="View reservation details" style="cursor:pointer">

                  <td>
                    <span class="request-id">
                      ${escapeHTML(
                        requestId
                      )}
                    </span>
                  </td>


                  <td>
                    ${escapeHTML(
                      getVenueName(
                        request.venue
                      )
                    )}
                  </td>


                  <td>
                    ${escapeHTML(
                      request.event ||
                      "—"
                    )}
                  </td>


                  <td>
                    ${escapeHTML(
                      request.date ||
                      "—"
                    )}
                  </td>


                  <td>
                    ${escapeHTML(
                      request.time ||
                      "—"
                    )}
                  </td>


                  <td>

                    <span
                      class="
                        request-status
                        request-status--${status}
                      "
                    >
                      ${capitalize(
                        status
                      )}
                    </span>

                    ${["pending", "approved"].includes(status) ? `<button type="button" data-cancel-reservation="${escapeHTML(request.id)}"
                      style="margin-left:8px;padding:7px 10px;background:#b42318;color:white;border:0;border-radius:6px;cursor:pointer">Cancel</button>` : ""}
                  </td>

                </tr>
              `;

            }
          )
          .join("");

    }


    /* ==========================================================
       VENUE
       ========================================================== */

    function getVenueName(
      venue
    ) {

      if (!venue) {

        return "—";

      }


      if (
        typeof venue ===
        "string"
      ) {

        return venue;

      }


      return (
        venue.name ||
        venue.venueName ||
        venue.title ||
        "Selected Venue"
      );

    }


    /* ==========================================================
       FALLBACK REQUEST ID
       ========================================================== */

    function createRequestId(
      index
    ) {

      return (
        "REQ-2026-" +
        String(
          index + 1
        ).padStart(
          3,
          "0"
        )
      );

    }


    /* ==========================================================
       CAPITALIZE
       ========================================================== */

    function capitalize(
      value
    ) {

      if (!value) {

        return "";

      }


      return (
        value.charAt(0)
          .toUpperCase() +
        value.slice(1)
      );

    }


    /* ==========================================================
       HTML SAFETY
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
       INITIAL RENDER
       ========================================================== */

    tableBody.addEventListener("click", async event => {
      const button = event.target.closest("[data-cancel-reservation]");
      if (!button) return;
      event.stopPropagation();
      if (!window.confirm("Cancel your reservation and release its time slot? Its history will be kept.")) return;
      button.disabled = true;
      try { await FRMS.cancelReservation(button.dataset.cancelReservation); }
      catch (error) { button.disabled = false; FRMS.showError(error); }
    });
    window.addEventListener("reservation-cancelled", event => {
      const index = requests.findIndex(request => request.id === event.detail.id);
      if (index !== -1) requests[index].status = "cancelled";
      updateCounts();
      renderRequests();
    });
    updateCounts();
    renderRequests();
    if (FRMS.mountRequestPagination) {
      const unsubscribe = await FRMS.mountRequestPagination({
        tableBody, controls: [...tabs], filters: () => ({ status: activeStatus }),
        onChange: records => { requests.splice(0, requests.length, ...records); renderRequests(); },
        onCounts: counts => { summaryCounts = counts; updateCounts(); }
      });
      window.addEventListener("pagehide", unsubscribe, { once: true });
    } else     if (FRMS.watchRequests) {
      try {
        const unsubscribe = await FRMS.watchRequests(records => {
          requests.splice(0, requests.length, ...records);
          updateCounts();
          renderRequests();
        });
        window.addEventListener("pagehide", unsubscribe, { once: true });
      } catch (error) { FRMS.showError(error); }
    }


  }
);