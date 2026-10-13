document.addEventListener(
  "DOMContentLoaded",
  async function () {
    try {
      if (!await FRMS.requireUser(false)) return;

    } catch (error) { FRMS.showError(error); return; }


    renderNavbar(
      "navbar",
      "new-reservation",
      "student"
    );


    /* ==========================================================
       ELEMENTS
       ========================================================== */

    const form =
      document.getElementById(
        "reservation-details-form"
      );


    const eventNameInput =
      document.getElementById(
        "event-name"
      );


    const organizationInput =
      document.getElementById(
        "organization"
      );


    const eventTypeInput =
      document.getElementById(
        "event-type"
      );


    const expectedGuestsInput =
      document.getElementById(
        "expected-guests"
      );


    const purposeInput =
      document.getElementById(
        "purpose"
      );


    const contactPersonInput =
      document.getElementById(
        "contact-person"
      );


    const facilityRequirementsInput =
      document.getElementById(
        "facility-requirements"
      );


    const setupNotesInput =
      document.getElementById(
        "setup-notes"
      );


    const backButton =
      document.getElementById(
        "back-button"
      );


    /* ==========================================================
       LOAD SAVED RESERVATION
       ========================================================== */

    const savedReservation =
      getReservation();


    if (!savedReservation.venue || !savedReservation.date || !savedReservation.slot) {
      location.replace("new-reservation-venue.html");
      return;
    }
    for (const input of [eventNameInput, organizationInput, eventTypeInput, purposeInput, contactPersonInput, facilityRequirementsInput, setupNotesInput]) {
      input.maxLength = 4000;
      input.setAttribute("aria-describedby", input.id + "-error");
      input.addEventListener("input", () => clearError(input, input.id + "-error"));
    }
    expectedGuestsInput.setAttribute("aria-describedby", "expected-guests-error");
    expectedGuestsInput.addEventListener("input", () => clearError(expectedGuestsInput, "expected-guests-error"));

    eventNameInput.value =
      savedReservation.eventName ||
      "";


    organizationInput.value =
      savedReservation.organization ||
      "";


    eventTypeInput.value =
      savedReservation.eventType ||
      "";


    expectedGuestsInput.value =
      savedReservation.expectedGuests ||
      "";


    purposeInput.value =
      savedReservation.purpose ||
      "";


    contactPersonInput.value =
      savedReservation.contactPerson ||
      "";


    facilityRequirementsInput.value =
      savedReservation.facilityRequirements ||
      "";


    setupNotesInput.value =
      savedReservation.setupNotes ||
      "";


    /* ==========================================================
       BACK
       ========================================================== */

    backButton.addEventListener(
      "click",
      function () {

        saveCurrentForm(
          false
        );


        window.location.href =
          "new-reservation-venue.html";

      }
    );


    /* ==========================================================
       SUBMIT
       ========================================================== */

    form.addEventListener(
      "submit",
      function (event) {

        event.preventDefault();


        clearAllErrors();


        if (
          !validateForm()
        ) {

          focusFirstError();

          return;

        }


        saveCurrentForm(
          true
        );


        window.location.href =
          "new-reservation-review.html";

      }
    );


    /* ==========================================================
       VALIDATION
       ========================================================== */

    function validateForm() {

      let valid =
        true;


      if (
        !eventNameInput.value.trim()
      ) {

        showError(
          eventNameInput,
          "event-name-error",
          "Event name is required."
        );

        valid =
          false;

      }


      if (
        !organizationInput.value.trim()
      ) {

        showError(
          organizationInput,
          "organization-error",
          "Organization is required."
        );

        valid =
          false;

      }


      if (
        !eventTypeInput.value.trim()
      ) {

        showError(
          eventTypeInput,
          "event-type-error",
          "Event type is required."
        );

        valid =
          false;

      }


      const guests =
        Number(
          expectedGuestsInput.value
        );


      if (
        !expectedGuestsInput.value ||
        !Number.isInteger(
          guests
        ) ||
        guests < 1
      ) {

        showError(
          expectedGuestsInput,
          "expected-guests-error",
          "Enter a valid number of guests."
        );

        valid =
          false;

      }


      if (
        !purposeInput.value.trim()
      ) {

        showError(
          purposeInput,
          "purpose-error",
          "Purpose of event is required."
        );

        valid =
          false;

      }


      if (
        !contactPersonInput.value.trim()
      ) {

        showError(
          contactPersonInput,
          "contact-person-error",
          "Contact information is required."
        );

        valid =
          false;

      }


      const capacity = Number(savedReservation.venue.capacity);
      if (capacity > 0 && guests > capacity) {
        showError(expectedGuestsInput, "expected-guests-error", `This facility accommodates up to ${capacity} guests.`);
        valid = false;
      }
      for (const input of [eventNameInput, organizationInput, eventTypeInput, purposeInput, contactPersonInput, facilityRequirementsInput, setupNotesInput]) {
        if (input.value.trim().length > 4000) {
          showError(input, input.id + "-error", "Use no more than 4,000 characters.");
          valid = false;
        }
      }
      return valid;

    }


    /* ==========================================================
       SAVE FORM
       ========================================================== */

    function saveCurrentForm(
      includeDocument
    ) {

      const details = {

        eventName:
          eventNameInput
            .value
            .trim(),

        organization:
          organizationInput
            .value
            .trim(),

        eventType:
          eventTypeInput
            .value
            .trim(),

        expectedGuests:
          expectedGuestsInput
            .value === ""
            ? ""
            : Number(
                expectedGuestsInput
                  .value
              ),

        purpose:
          purposeInput
            .value
            .trim(),

        contactPerson:
          contactPersonInput
            .value
            .trim(),

        facilityRequirements:
          facilityRequirementsInput
            .value
            .trim(),

        setupNotes:
          setupNotesInput
            .value
            .trim()

      };


      if (includeDocument) {
        details.supportingDocument = null;
      }

      updateReservation(
        details
      );

    }


    /* ==========================================================
       ERROR HELPERS
       ========================================================== */

    function showError(
      input,
      errorId,
      message
    ) {

      input.setAttribute("aria-invalid", "true");
      const errorElement = document.getElementById(errorId);


      if (errorElement) {

        errorElement.textContent =
          message;

      }


      if (
        input.type !==
        "file"
      ) {

        input.classList.add(
          "input-error"
        );

      }

    }


    function clearError(
      input,
      errorId
    ) {

      input.removeAttribute("aria-invalid");
      const errorElement =
        document.getElementById(
          errorId
        );


      if (errorElement) {

        errorElement.textContent =
          "";

      }


      if (
        input.type !==
        "file"
      ) {

        input.classList.remove(
          "input-error"
        );

      }

    }


    function clearAllErrors() {

      document
        .querySelectorAll(
          ".field-error"
        )
        .forEach(
          function (error) {

            error.textContent =
              "";

          }
        );


      document
        .querySelectorAll(
          ".input-error"
        )
        .forEach(
          function (input) {

            input.removeAttribute("aria-invalid");
            input.classList.remove(
              "input-error"
            );

          }
        );

    }


    function focusFirstError() {

      const firstInvalid =
        document.querySelector(
          ".input-error"
        );


      if (firstInvalid) {

        firstInvalid.focus();

        firstInvalid.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      }

    }

  }
);