document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(false)) return;
      var mockRequests = await FRMS.requests();
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
      "pending";


    /* ==========================================================
       REQUEST DATA
       ========================================================== */

    const requests =
      Array.isArray(mockRequests)
        ? mockRequests
        : [];


    /* ==========================================================
       COUNTS
       ========================================================== */

    const pendingCount =
      countStatus(
        "pending"
      );


    const approvedCount =
      countStatus(
        "approved"
      );


    const declinedCount =
      countStatus(
        "declined"
      );


    document.getElementById(
      "total-count"
    ).textContent =
      requests.length;


    document.getElementById(
      "pending-count"
    ).textContent =
      pendingCount;


    document.getElementById(
      "approved-count"
    ).textContent =
      approvedCount;


    document.getElementById(
      "declined-count"
    ).textContent =
      declinedCount;


    document.getElementById(
      "pending-tab-count"
    ).textContent =
      pendingCount;


    document.getElementById(
      "approved-tab-count"
    ).textContent =
      approvedCount;


    document.getElementById(
      "declined-tab-count"
    ).textContent =
      declinedCount;


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

            const statusMatch =
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
            `You currently have no ${activeStatus} reservation requests.`;

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
                request.id ||
                request.requestId ||
                createRequestId(
                  index
                );


              return `
                <tr>

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

    renderRequests();

  }
);