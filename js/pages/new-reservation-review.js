document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(false)) return;

    } catch (error) { FRMS.showError(error); return; }



    /* ==========================================================
       NAVBAR
       ========================================================== */

    renderNavbar(
      "navbar",
      "new-reservation",
      "student"
    );


    /* ==========================================================
       LOAD RESERVATION
       ========================================================== */

    const reservation =
      getReservation();


    /* ==========================================================
       REVIEW ELEMENTS
       ========================================================== */

    const venueElement =
      document.getElementById(
        "review-venue"
      );


    const scheduleElement =
      document.getElementById(
        "review-schedule"
      );


    const eventNameElement =
      document.getElementById(
        "review-event-name"
      );


    const organizationTypeElement =
      document.getElementById(
        "review-organization-type"
      );


    const guestsElement =
      document.getElementById(
        "review-guests"
      );


    const purposeElement =
      document.getElementById(
        "review-purpose"
      );


    const contactElement =
      document.getElementById(
        "review-contact"
      );


    const requirementsElement =
      document.getElementById(
        "review-requirements"
      );


    const setupNotesElement =
      document.getElementById(
        "review-setup-notes"
      );





    const backButton =
      document.getElementById(
        "back-details-button"
      );


    const submitButton =
      document.getElementById(
        "submit-reservation-button"
      );


    const conditionsCheckbox =
      document.getElementById(
        "conditions-checkbox"
      );


    /* ==========================================================
       MODAL ELEMENTS
       ========================================================== */

    const modalOverlay =
      document.getElementById(
        "reservation-modal-overlay"
      );


    const confirmationModal =
      document.getElementById(
        "confirmation-modal"
      );


    const loadingModal =
      document.getElementById(
        "loading-modal"
      );


    const successModal =
      document.getElementById(
        "success-modal"
      );


    const errorModal =
      document.getElementById(
        "error-modal"
      );


    const confirmationClose =
      document.getElementById(
        "confirmation-close"
      );


    const confirmationCancel =
      document.getElementById(
        "confirmation-cancel"
      );


    const confirmationSubmit =
      document.getElementById(
        "confirmation-submit"
      );


    const successClose =
      document.getElementById(
        "success-close"
      );


    const errorClose =
      document.getElementById(
        "error-close"
      );


    const tryAgainButton =
      document.getElementById(
        "try-again-button"
      );


    const errorBackButton =
      document.getElementById(
        "error-back-button"
      );


    const viewReservationsButton =
      document.getElementById(
        "view-reservations-button"
      );


    const copyRequestIdButton =
      document.getElementById(
        "copy-request-id"
      );


    const successRequestId =
      document.getElementById(
        "success-request-id"
      );


    const confirmVenue =
      document.getElementById(
        "modal-confirm-venue"
      );


    const confirmSchedule =
      document.getElementById(
        "modal-confirm-schedule"
      );


    const progressBar =
      document.getElementById(
        "submission-progress-bar"
      );


    /* ==========================================================
       DISPLAY RESERVATION
       ========================================================== */

    const venueName =
      getVenueName(
        reservation.venue
      );


    const scheduleText =
      buildSchedule(
        reservation.date,
        reservation.slot
      );


    venueElement.textContent =
      venueName;


    scheduleElement.textContent =
      scheduleText;


    eventNameElement.textContent =
      reservation.eventName ||
      "Not provided";


    organizationTypeElement.textContent =
      buildOrganizationLine(
        reservation.organization,
        reservation.eventType
      );


    guestsElement.textContent =
      reservation.expectedGuests ||
      "Not provided";


    purposeElement.textContent =
      reservation.purpose ||
      "Not provided";


    contactElement.textContent =
      reservation.contactPerson ||
      "Not provided";


    requirementsElement.textContent =
      reservation.facilityRequirements ||
      "No additional facility requirements.";


    setupNotesElement.textContent =
      reservation.setupNotes ||
      "No additional setup notes.";


    /* Modal preview */

    confirmVenue.textContent =
      venueName;


    confirmSchedule.textContent =
      scheduleText;


    /* ==========================================================
       BACK
       ========================================================== */

    backButton.addEventListener(
      "click",
      function () {

        window.location.href =
          "new-reservation-details.html";

      }
    );


    /* ==========================================================
       MAIN SUBMIT BUTTON
       ========================================================== */

    submitButton.addEventListener(
      "click",
      function () {


        if (
          !conditionsCheckbox.checked
        ) {

          conditionsCheckbox.focus();


          const confirmArea =
            conditionsCheckbox.closest(
              ".conditions-confirm"
            );


          if (confirmArea) {

            confirmArea.classList.add(
              "conditions-confirm--error"
            );


            setTimeout(
              function () {

                confirmArea.classList.remove(
                  "conditions-confirm--error"
                );

              },
              1200
            );

          }


          return;

        }


        showModal(
          confirmationModal
        );

      }
    );


    /* ==========================================================
       CONFIRMATION MODAL
       ========================================================== */

    confirmationCancel.addEventListener(
      "click",
      closeAllModals
    );


    confirmationClose.addEventListener(
      "click",
      closeAllModals
    );


    confirmationSubmit.addEventListener(
      "click",
      function () {

        showModal(
          loadingModal
        );


        runSubmission();

      }
    );


    /* ==========================================================
       SUBMIT RESERVATION
       ========================================================== */

    let submitting = false;
    async function runSubmission() {
      if (submitting) return;
      submitting = true;
      confirmationSubmit.disabled = true;
      const progressText = document.getElementById("submission-progress-text");
      let currentProgress = 0;
      const updateProgress = (percent, message) => {
        currentProgress = Math.max(currentProgress, percent);
        progressBar.style.width = currentProgress + "%";
        progressBar.setAttribute("aria-valuenow", String(currentProgress));
        progressBar.setAttribute("aria-valuetext", message);
        progressBar.classList.toggle("submission-progress__bar--waiting", currentProgress < 100);
        progressText.textContent = message;
      };
      updateProgress(0, "Preparing your reservation…");
      try {
        const id = await saveSubmittedRequest(updateProgress);
        updateProgress(100, "Reservation saved successfully.");
        await new Promise(resolve => setTimeout(resolve, 350));
        successRequestId.textContent = FRMS.requestLabel ? FRMS.requestLabel(id) : id;
        showModal(successModal);
        clearReservation();

      } catch (error) {
        FRMS.showError(error);
        const message = document.getElementById("submission-error-message");
        if (message) message.textContent = error.message || "Your reservation could not be submitted. Please try again.";
        showModal(errorModal);
      } finally { progressBar.classList.remove("submission-progress__bar--waiting"); submitting = false; confirmationSubmit.disabled = false; }
    }

    /* ==========================================================
       STORE SUBMITTED REQUEST
       ========================================================== */

    async function saveSubmittedRequest(onProgress) {

      const submittedRequest = {

        venue:
          venueName,

        event:
          reservation.eventName ||
          "Reservation",

        date:
          formatReservationDate(
            reservation.date
          ),

        time:
          formatReservationSlot(
            reservation.slot
          ),

        status:
          "pending",

        organization:
          reservation.organization ||
          "",

        eventType:
          reservation.eventType ||
          "",

        expectedGuests:
          reservation.expectedGuests ||
          "",

        purpose:
          reservation.purpose ||
          "",

        contactPerson:
          reservation.contactPerson ||
          "",

        facilityRequirements:
          reservation.facilityRequirements ||
          "",

        setupNotes:
          reservation.setupNotes ||
          ""

      };


      const selectedDate = new Date(reservation.date);
      submittedRequest.dateISO = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      submittedRequest.slotId = String(reservation.slot.id);
      submittedRequest.startMinutes = reservation.slot.startMinutes;
      submittedRequest.endMinutes = reservation.slot.endMinutes;
      let submissionId = reservation.submissionId;
      if (!submissionId) { submissionId = crypto.randomUUID(); updateReservation({ submissionId }); reservation.submissionId = submissionId; }
      submittedRequest.requestId = submissionId;
      submittedRequest.venueId = reservation.venue?.id || null;
      return FRMS.submit(submittedRequest, onProgress);
    }


    /* ==========================================================
       SUCCESS
       ========================================================== */

    viewReservationsButton.addEventListener(
      "click",
      function () {

        window.location.href =
          "my-requests.html";

      }
    );


    successClose.addEventListener(
      "click",
      function () {

        window.location.href =
          "my-requests.html";

      }
    );


    /* ==========================================================
       COPY REQUEST ID
       ========================================================== */

    copyRequestIdButton.addEventListener(
      "click",
      async function () {

        const requestId =
          successRequestId
            .textContent
            .trim();


        try {

          await navigator
            .clipboard
            .writeText(
              requestId
            );


          const original =
            copyRequestIdButton
              .textContent;


          copyRequestIdButton
            .textContent =
            "✓";


          setTimeout(
            function () {

              copyRequestIdButton
                .textContent =
                original;

            },
            1200
          );

        } catch (error) {

          console.log(
            "Unable to copy request ID.",
            error
          );

        }

      }
    );


    /* ==========================================================
       ERROR MODAL
       ========================================================== */

    tryAgainButton.addEventListener(
      "click",
      function () {

        showModal(
          loadingModal
        );


        runSubmission();

      }
    );


    errorBackButton.addEventListener(
      "click",
      closeAllModals
    );


    errorClose.addEventListener(
      "click",
      closeAllModals
    );


    /* ==========================================================
       MODAL HELPERS
       ========================================================== */

    function showModal(
      modal
    ) {

      hideModal(
        confirmationModal
      );


      hideModal(
        loadingModal
      );


      hideModal(
        successModal
      );


      hideModal(
        errorModal
      );


      modal.hidden =
        false;


      modalOverlay.classList.add(
        "reservation-modal-overlay--open"
      );


      modalOverlay.setAttribute(
        "aria-hidden",
        "false"
      );


      document.body.style.overflow =
        "hidden";

    }


    function hideModal(
      modal
    ) {

      if (modal) {

        modal.hidden =
          true;

      }

    }


    function closeAllModals() {

      hideModal(
        confirmationModal
      );


      hideModal(
        loadingModal
      );


      hideModal(
        successModal
      );


      hideModal(
        errorModal
      );


      modalOverlay.classList.remove(
        "reservation-modal-overlay--open"
      );


      modalOverlay.setAttribute(
        "aria-hidden",
        "true"
      );


      document.body.style.overflow =
        "";

    }


    /* Click backdrop to cancel confirmation */

    modalOverlay.addEventListener(
      "click",
      function (event) {

        if (
          event.target ===
          modalOverlay &&
          !confirmationModal.hidden
        ) {

          closeAllModals();

        }

      }
    );


    /* Escape */

    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key ===
          "Escape" &&
          !confirmationModal.hidden
        ) {

          closeAllModals();

        }

      }
    );


    /* ==========================================================
       REQUEST ID
       ========================================================== */

    /* ==========================================================
       VENUE
       ========================================================== */

    function getVenueName(
      venue
    ) {

      if (!venue) {

        return "Not selected";

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
       ORGANIZATION + EVENT TYPE
       ========================================================== */

    function buildOrganizationLine(
      organization,
      eventType
    ) {

      const values =
        [];


      if (organization) {

        values.push(
          organization
        );

      }


      if (eventType) {

        values.push(
          eventType
        );

      }


      if (
        values.length ===
        0
      ) {

        return "Not provided";

      }


      return values.join(
        " • "
      );

    }


    /* ==========================================================
       SCHEDULE
       ========================================================== */

    function buildSchedule(
      date,
      slot
    ) {

      const formattedDate =
        formatReservationDate(
          date
        );


      const formattedSlot =
        formatReservationSlot(
          slot
        );


      if (
        formattedDate ===
          "Date not selected" &&
        formattedSlot ===
          "Time not selected"
      ) {

        return "Schedule not selected";

      }


      if (
        formattedSlot ===
        "Time not selected"
      ) {

        return formattedDate;

      }


      if (
        formattedDate ===
        "Date not selected"
      ) {

        return formattedSlot;

      }


      return (
        formattedDate +
        " • " +
        formattedSlot
      );

    }


    /* ==========================================================
       DATE
       ========================================================== */

    function formatReservationDate(
      dateValue
    ) {

      if (!dateValue) {

        return "Date not selected";

      }


      let date;


      if (
        typeof dateValue ===
          "string" &&
        /^\d{4}-\d{2}-\d{2}$/
          .test(
            dateValue
          )
      ) {

        date =
          new Date(
            dateValue +
            "T00:00:00"
          );

      } else {

        date =
          new Date(
            dateValue
          );

      }


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return String(
          dateValue
        );

      }


      return date.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        }
      );

    }


    /* ==========================================================
       SLOT
       ========================================================== */

    function formatReservationSlot(
      slot
    ) {

      if (!slot) {

        return "Time not selected";

      }


      if (
        typeof slot ===
        "string"
      ) {

        return slot;

      }


      if (slot.label) {

        return slot.label;

      }


      if (slot.time) {

        return slot.time;

      }


      if (
        slot.start &&
        slot.end
      ) {

        return (
          slot.start +
          " – " +
          slot.end
        );

      }


      if (
        slot.startTime &&
        slot.endTime
      ) {

        return (
          slot.startTime +
          " – " +
          slot.endTime
        );

      }


      return "Selected time slot";

    }

  }
);