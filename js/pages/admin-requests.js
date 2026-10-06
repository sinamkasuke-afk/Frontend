document.addEventListener(
  "DOMContentLoaded",
  async function () {
    let summaryCounts = null;
    try {
      if (!await FRMS.requireUser(true)) return;
      var firebaseRequests = FRMS.mountRequestPagination ? [] : await FRMS.requests(true);
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       REQUEST DATA
       ========================================================== */

    const requests = firebaseRequests;


    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const rows =
      document.getElementById(
        "request-rows"
      );


    const searchInput =
      document.getElementById(
        "request-search"
      );


    const globalSearch =
      document.getElementById(
        "global-search"
      );


    const statusFilter =
      document.getElementById(
        "status-filter"
      );


    const dateFilter =
      document.getElementById(
        "date-filter"
      );


    const emptyState =
      document.getElementById(
        "requests-empty"
      );


    const resultText =
      document.getElementById(
        "request-result-text"
      );


    /* ==========================================================
       COUNTS
       ========================================================== */

    updateCounts();


    for (let offset = -24; offset <= 3; offset++) {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const option = document.createElement("option");
      option.value = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      option.textContent = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      dateFilter.append(option);
    }
    function updateCounts() {
      document.getElementById("all-count").textContent = summaryCounts?.total ?? requests.length;
      for (const status of ["pending", "approved", "declined"]) {
        document.getElementById(status + "-count").textContent = summaryCounts?.[status] ?? requests.filter(request => request.status === status).length;
      }
    }

    /* ==========================================================
       RENDER
       ========================================================== */

    function renderRequests() {

      const search =
        searchInput.value
          .trim()
          .toLowerCase();


      const status =
        statusFilter.value;


      const month =
        dateFilter.value;


      const filtered =
        requests.filter(
          function (request) {

            const text = [
              request.requestNumber,
              request.id,
              request.requester,
              request.type,
              request.venue,
              request.venueDetail,
              request.date,
              request.time,
              request.status
            ]
              .join(" ")
              .toLowerCase();


            const matchesSearch =
              !search ||
              text.includes(
                search
              );


            const matchesStatus =
              status === "all" ||
              request.status === status;


            const matchesMonth =
              month === "all" ||
              String(request.dateISO || request.date).slice(0, 7) === month;


            return (
              matchesSearch &&
              matchesStatus &&
              matchesMonth
            );

          }
        );


      if (
        filtered.length === 0
      ) {

        rows.innerHTML =
          "";

        emptyState.hidden =
          false;

        resultText.textContent =
          "Showing 0 requests";

        return;

      }


      emptyState.hidden =
        true;


      rows.innerHTML =
        filtered
          .map(
            function (request) {

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

                    <div class="requester">

                      <div class="requester__avatar">
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

                        <small>
                          ${escapeHTML(
                            request.type
                          )}
                        </small>

                      </div>

                    </div>

                  </td>


                  <td>

                    <div class="venue-cell">

                      <strong>
                        ${escapeHTML(
                          request.venue
                        )}
                      </strong>

                      <span>
                        ${escapeHTML(
                          request.venueDetail
                        )}
                      </span>

                    </div>

                  </td>


                  <td>
                    ${escapeHTML(
                      request.date
                    )}
                  </td>


                  <td>
                    ${escapeHTML(
                      request.time
                    )}
                  </td>


                  <td>

                    <span
                      class="
                        request-status
                        request-status--${request.status}
                      "
                    >
                      ${capitalize(
                        request.status
                      )}
                    </span>

                  </td>


                  <td>

                    ${
                      request.status ===
                      "pending"

                        ? `
                          <div class="request-actions">

                            <button
                              type="button"
                              class="approve-button"
                              data-id="${request.id}"
                            >
                              ✓ Approve
                            </button>

                            <button
                              type="button"
                              class="decline-button"
                              data-id="${request.id}"
                            >
                              × Decline
                            </button>

                          </div>
                        `

                        : `
                          <span class="processed-label">
                            Processed
                          </span>
                        `
                    }

                  </td>

                </tr>
              `;

            }
          )
          .join("");


      resultText.textContent =
        `Showing ${filtered.length} of ${requests.length} requests on this page`;

    }


    /* ==========================================================
       FILTER EVENTS
       ========================================================== */

    searchInput.addEventListener(
      "input",
      renderRequests
    );


    statusFilter.addEventListener(
      "change",
      renderRequests
    );


    dateFilter.addEventListener(
      "change",
      renderRequests
    );


    /* ==========================================================
       GLOBAL SEARCH
       ========================================================== */

    globalSearch.addEventListener(
      "input",
      function () {

        searchInput.value =
          globalSearch.value;

        renderRequests();

      }
    );


    /* ==========================================================
       APPROVE / DECLINE
       ========================================================== */

    rows.addEventListener(
      "click",
      function (event) {

        const approveButton =
          event.target.closest(
            ".approve-button"
          );


        const declineButton =
          event.target.closest(
            ".decline-button"
          );


        if (approveButton) {

          updateRequestStatus(
            approveButton.dataset.id,
            "approved"
          );

        }


        if (declineButton) {

          updateRequestStatus(
            declineButton.dataset.id,
            "declined"
          );

        }

      }
    );


    async function updateRequestStatus(
      id,
      status
    ) {

      const request =
        requests.find(
          item =>
            item.id === id
        );


      if (!request) {

        return;

      }


      try { await FRMS.updateStatus(id, status); }
      catch (error) { FRMS.showError(error); return; }
      request.status = status;


      updateCounts();

      renderRequests();

    }


    /* ==========================================================
       PROFILE DROPDOWN
       ========================================================== */

    /* ==========================================================
       HELPERS
       ========================================================== */

    function capitalize(
      value
    ) {

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


    /* ==========================================================
       FIRST RENDER
       ========================================================== */

    renderRequests();

    if (FRMS.mountRequestPagination) {
      const unsubscribe = await FRMS.mountRequestPagination({ isAdmin: true, tableBody: rows,
        controls: [statusFilter, dateFilter], filters: () => ({ status: statusFilter.value, month: dateFilter.value }),
        onChange: records => { requests.splice(0, requests.length, ...records); renderRequests(); },
        onCounts: counts => { summaryCounts = counts; updateCounts(); }
      });
      window.addEventListener("pagehide", unsubscribe, { once: true });
    } else     if (FRMS.watchRequests) {
      try {
        const unsubscribe = await FRMS.watchRequests(records => {
          requests.splice(0, requests.length, ...records);
          updateCounts(); renderRequests();
        }, true);
        window.addEventListener("pagehide", unsubscribe, { once: true });
      } catch (error) { FRMS.showError(error); }
    }

  }
);