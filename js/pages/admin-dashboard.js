document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(true)) return;
      var firebaseRequests = await FRMS.requests(true);
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       SAMPLE REQUESTS
       ========================================================== */

    const adminRequests = firebaseRequests;


    /* ==========================================================
       COUNTS
       ========================================================== */

    const dashboardCounts = { total: adminRequests.length, pending: adminRequests.filter(r => r.status === "pending").length, approved: adminRequests.filter(r => r.status === "approved").length, declined: adminRequests.filter(r => r.status === "declined").length };


    document.getElementById(
      "total-requests"
    ).textContent =
      dashboardCounts.total;


    document.getElementById(
      "pending-requests"
    ).textContent =
      dashboardCounts.pending;


    document.getElementById(
      "approved-requests"
    ).textContent =
      dashboardCounts.approved;


    document.getElementById(
      "declined-requests"
    ).textContent =
      dashboardCounts.declined;


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
                <tr>

                  <td>
                    <strong>
                      ${escapeHTML(
                        request.id
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
                        request.id
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


          profileWrapper.classList.toggle(
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

            profileWrapper.classList.remove(
              "admin-profile-wrapper--open"
            );

          }

        }
      );

    }


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

  }
);