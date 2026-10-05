const HISTORY_STATUS_LABELS = {
  approved: "Approved",
  declined: "Declined"
};


document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(true)) return;
      var firebaseRequests = await FRMS.requests(true);
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
                <tr>

                  <td>
                    <strong>
                      ${escapeHTML(
                        request.id
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
        }`;

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

    function getMonthKey(
      dateValue
    ) {

      const text =
        String(
          dateValue || ""
        )
          .toLowerCase();


      if (
        text.includes(
          "september"
        ) ||
        text.includes(
          "sep"
        )
      ) {

        return "september";

      }


      if (
        text.includes(
          "october"
        ) ||
        text.includes(
          "oct"
        )
      ) {

        return "october";

      }


      return "";

    }


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

  }
);