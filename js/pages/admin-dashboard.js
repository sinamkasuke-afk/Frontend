document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(true)) return;
      var [firebaseRequests, globalCounts] = await Promise.all([FRMS.requests(true, { limit: 10 }), FRMS.requestCounts(true)]);
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       SAMPLE REQUESTS
       ========================================================== */

    const adminRequests = firebaseRequests;


    /* ==========================================================
       COUNTS
       ========================================================== */

    function refreshCounts() {
      document.getElementById("total-requests").textContent = globalCounts.total;
      for (const status of ["pending", "approved", "declined"]) {
        document.getElementById(status + "-requests").textContent = globalCounts[status];
      }
    }
    refreshCounts();
    const stopCounts = FRMS.watchCounts(counts => { globalCounts = counts; refreshCounts(); }, true, globalCounts);
    window.addEventListener('pagehide', stopCounts, {once:true});

    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const rowsContainer =
      document.getElementById(
        "admin-request-rows"
      );


    const searchInput =
      document.getElementById(
        "global-search"
      );


    /* ==========================================================
       DATE AND TIME
       ========================================================== */

    function updateDateTime() {

      const now =
        new Date();


      document.getElementById(
        "admin-current-date"
      ).textContent =
        now.toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          }
        );


      document.getElementById(
        "admin-current-time"
      ).textContent =
        now.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit"
          }
        );

    }


    updateDateTime();


    setInterval(
      updateDateTime,
      30000
    );


    /* ==========================================================
       RENDER REQUESTS
       ========================================================== */

    function renderRequests(
      requests
    ) {

      if (
        requests.length ===
        0
      ) {

        rowsContainer.innerHTML = `
          <tr>

            <td
              colspan="6"
              style="
                text-align:center;
                padding:35px;
                color:#8a908c;
              "
            >
              No reservation requests found.
            </td>

          </tr>
        `;

        return;

      }


      rowsContainer.innerHTML =
        requests
          .map(
            function (
              request
            ) {

              return `
                <tr data-reservation-id="${escapeHTML(request.id)}" tabindex="0" title="View reservation details" style="cursor:pointer">

                  <td>
                    <strong>
                      ${escapeHTML(
                        request.requestNumber || request.id
                      )}
                    </strong>
                  </td>


                  <td>

                    <div class="requester-cell">

                      <div class="requester-avatar">
                        ${escapeHTML(
                          request.initials
                        )}
                      </div>


                      <div>

                        <strong>
                          ${escapeHTML(
                            request.requester
                          )}
                        </strong>

                        <span>
                          ${escapeHTML(
                            request.requesterType
                          )}
                        </span>

                      </div>

                    </div>

                  </td>


                  <td>

                    <strong>
                      ${escapeHTML(
                        request.venue
                      )}
                    </strong>

                    ${
                      request.venueDetail
                        ? `
                          <div
                            style="
                              margin-top:3px;
                              color:#858b87;
                              font-size:9px;
                            "
                          >
                            ${escapeHTML(
                              request.venueDetail
                            )}
                          </div>
                        `
                        : ""
                    }

                  </td>


                  <td>

                    <div class="request-date">

                      <strong>
                        ${escapeHTML(
                          request.date
                        )}
                      </strong>

                      <span>
                        ${escapeHTML(
                          request.time
                        )}
                      </span>

                    </div>

                  </td>


                  <td>

                    <span
                      class="
                        admin-status
                        admin-status--${request.status}
                      "
                    >
                      ${capitalize(
                        request.status
                      )}
                    </span>

                  </td>


                  <td>

                    <button
                      type="button"
                      class="row-action"
                      data-request-id="${escapeHTML(
                        request.requestNumber || request.id
                      )}"
                    >
                      •••
                    </button>

                  </td>

                </tr>
              `;

            }
          )
          .join("");

    }


    renderRequests(
      adminRequests
    );


    /* ==========================================================
       SEARCH
       ========================================================== */

    if (searchInput) {

      searchInput.addEventListener(
        "input",
        function () {

          const query =
            searchInput
              .value
              .trim()
              .toLowerCase();


          if (!query) {

            renderRequests(
              adminRequests
            );

            return;

          }


          const filtered =
            adminRequests.filter(
              function (
                request
              ) {

                const searchableText = [

                  request.requestNumber,
              request.id,
                  request.requester,
                  request.requesterType,
                  request.venue,
                  request.date,
                  request.time,
                  request.status

                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();


                return searchableText.includes(
                  query
                );

              }
            );


          renderRequests(
            filtered
          );

        }
      );

    }


    /* ==========================================================
       ROW ACTIONS
       ========================================================== */

    rowsContainer.addEventListener(
      "click",
      function (
        event
      ) {

        const button =
          event.target.closest(
            ".row-action"
          );


        if (!button) {

          return;

        }


        window.location.href =
          "admin-requests.html";

      }
    );


    /* ==========================================================
       PROFILE DROPDOWN
       ========================================================== */

    /* ==========================================================
       HELPERS
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

    if (FRMS.watchRequests) {
      try {
        const unsubscribe = await FRMS.watchRequests(async records => {
          adminRequests.splice(0, adminRequests.length, ...records);
          renderRequests(adminRequests);
          try { globalCounts = await FRMS.requestCounts(true); refreshCounts(); } catch(error) { FRMS.showError(error); }
        }, true, { limit: 10 });
        window.addEventListener("pagehide", unsubscribe, { once: true });
      } catch (error) { FRMS.showError(error); }
    }

  }
);