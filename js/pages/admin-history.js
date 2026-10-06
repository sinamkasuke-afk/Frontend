const HISTORY_STATUS_LABELS = {
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired"
};


document.addEventListener(
  "DOMContentLoaded",
  async function () {
    let summaryCounts = null;
    try {
      if (!await FRMS.requireUser(true)) return;
      var firebaseRequests = FRMS.mountRequestPagination ? [] : await FRMS.requests(true);
    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       DATA
       ========================================================== */

    const historyRequests =
      Array.isArray(
        firebaseRequests
      )
        ? firebaseRequests
        : [];


    /* ==========================================================
       STATE
       ========================================================== */

    let activeStatus =
      "approved";


    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const tableBody =
      document.getElementById(
        "history-table-body"
      );


    const approvedCount =
      document.getElementById(
        "approved-count"
      );


    const declinedCount =
      document.getElementById(
        "declined-count"
      );


    const monthFilter =
      document.getElementById(
        "history-month-filter"
      );


    const globalSearch =
      document.getElementById(
        "global-search"
      );


    const emptyState =
      document.getElementById(
        "history-empty"
      );


    const resultText =
      document.getElementById(
        "history-result-text"
      );


    const tabs =
      document.querySelectorAll(
        ".history-tab"
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
      monthFilter.append(option);
    }
    function updateCounts() {

      approvedCount.textContent =
        countByStatus(
          "approved"
        );


      declinedCount.textContent =
        countByStatus(
          "declined"
        );

    }


    function countByStatus(
      status
    ) {

      if (summaryCounts) return summaryCounts[status] || 0;
      return historyRequests.filter(
        function (
          request
        ) {

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
      function (
        tab
      ) {

        tab.addEventListener(
          "click",
          function () {

            tabs.forEach(
              function (
                item
              ) {

                item.classList.remove(
                  "history-tab--active"
                );

              }
            );


            tab.classList.add(
              "history-tab--active"
            );


            activeStatus =
              tab.dataset.status;


            renderHistory();

          }
        );

      }
    );


    /* ==========================================================
       MONTH FILTER
       ========================================================== */

    monthFilter.addEventListener(
      "change",
      renderHistory
    );


    /* ==========================================================
       GLOBAL SEARCH
       ========================================================== */

    globalSearch.addEventListener(
      "input",
      renderHistory
    );


    /* ==========================================================
       RENDER HISTORY
       ========================================================== */

    function renderHistory() {

      const query =
        globalSearch.value
          .trim()
          .toLowerCase();


      const selectedMonth =
        monthFilter.value;


      const filtered =
        historyRequests.filter(
          function (
            request
          ) {

            const status =
              String(
                request.status ||
                ""
              )
                .toLowerCase();


            if (
              status !==
              activeStatus
            ) {

              return false;

            }


            if (
              selectedMonth !==
              "all"
            ) {

              const requestMonth =
                getMonthKey(
                  request.date
                );


              if (
                requestMonth !==
                selectedMonth
              ) {

                return false;

              }

            }


            if (query) {

              const searchText = [

                request.requestNumber,
              request.id,
                request.requester,
                request.venue,
                request.date,
                request.time,
                request.status

              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase();


              if (
                !searchText.includes(
                  query
                )
              ) {

                return false;

              }

            }


            return true;

          }
        );


      /* EMPTY */

      if (
        filtered.length ===
        0
      ) {

        tableBody.innerHTML =
          "";


        emptyState.hidden =
          false;


        resultText.textContent =
          `Showing 0 ${activeStatus} records`;


        return;

      }


      emptyState.hidden =
        true;


      /* ROWS */

      tableBody.innerHTML =
        filtered
          .map(
            function (
              request
            ) {

              const requester =
                getRequesterData(
                  request.requester
                );


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

                    <div class="history-requester">

                      <div class="history-avatar">
                        ${escapeHTML(
                          requester.initials
                        )}
                      </div>


                      <div>

                        <strong>
                          ${escapeHTML(
                            requester.name
                          )}
                        </strong>

                        <small>
                          ${escapeHTML(
                            requester.role
                          )}
                        </small>

                      </div>

                    </div>

                  </td>


                  <td>

                    <div class="history-venue">

                      <strong>
                        ${escapeHTML(
                          request.venue ||
                          "—"
                        )}
                      </strong>

                      <span>
                        ${escapeHTML(
                          getVenueLocation(
                            request.venue
                          )
                        )}
                      </span>

                    </div>

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
                        history-status
                        history-status--${activeStatus}
                      "
                    >
                      ${
                        HISTORY_STATUS_LABELS[
                          activeStatus
                        ]
                      }
                    </span>

                  </td>

                </tr>
              `;

            }
          )
          .join("");


      resultText.textContent =
        `Showing ${filtered.length} ${activeStatus} record${
          filtered.length === 1
            ? ""
            : "s"
        } on this page`;

    }


    /* ==========================================================
       REQUESTER INFO
       ========================================================== */

    function getRequesterData(
      requester
    ) {

      const fullText =
        String(
          requester || "Unknown"
        );


      const name =
        fullText;


      let role =
        "Requester";


      if (
        fullText
          .toLowerCase()
          .includes(
            "faculty"
          )
      ) {

        role =
          "Faculty";

      } else if (
        fullText
          .toLowerCase()
          .includes(
            "adviser"
          )
      ) {

        role =
          "Faculty";

      } else if (
        fullText
          .toLowerCase()
          .includes(
            "lco"
          )
      ) {

        role =
          "Student Org";

      }


      const cleanName =
        fullText
          .replace(
            /\([^)]*\)/g,
            ""
          )
          .trim();


      const parts =
        cleanName
          .split(/\s+/)
          .filter(Boolean);


      const initials =
        parts.length >= 2
          ? (
              parts[0][0] +
              parts[
                parts.length - 1
              ][0]
            )
              .toUpperCase()

          : cleanName
              .slice(
                0,
                2
              )
              .toUpperCase();


      return {
        name:
          fullText,

        role:
          role,

        initials:
          initials
      };

    }


    /* ==========================================================
       VENUE LOCATION
       ========================================================== */

    function getVenueLocation(
      venue
    ) {

      const venueName =
        String(
          venue || ""
        )
          .toLowerCase();


      if (
        venueName.includes(
          "garden"
        )
      ) {

        return "Outdoor Area";

      }


      if (
        venueName.includes(
          "gym"
        )
      ) {

        return "Sports Building";

      }


      return "Main Building";

    }


    /* ==========================================================
       MONTH
       ========================================================== */

    function getMonthKey(value) {
      if (/^\d{4}-\d{2}/.test(value || "")) return value.slice(0, 7);
      const date = new Date(value);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    }

    /* ==========================================================
       PROFILE DROPDOWN
       ========================================================== */

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
       FIRST RENDER
       ========================================================== */

    renderHistory();

    if (FRMS.mountRequestPagination) {
      const unsubscribe = await FRMS.mountRequestPagination({ isAdmin: true, tableBody,
        controls: [...tabs, monthFilter], filters: () => ({ status: activeStatus, month: monthFilter.value }),
        onChange: records => { historyRequests.splice(0, historyRequests.length, ...records); renderHistory(); },
        onCounts: counts => { summaryCounts = counts; updateCounts(); }
      });
      window.addEventListener("pagehide", unsubscribe, { once: true });
    } else     if (FRMS.watchRequests) {
      try {
        const unsubscribe = await FRMS.watchRequests(records => {
          historyRequests.splice(0, historyRequests.length, ...records);
          updateCounts(); renderHistory();
        }, true);
        window.addEventListener("pagehide", unsubscribe, { once: true });
      } catch (error) { FRMS.showError(error); }
    }

  }
);