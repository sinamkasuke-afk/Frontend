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


    const documentInput =
      document.getElementById(
        "supporting-document"
      );


    const uploadBox =
      document.getElementById(
        "upload-box"
      );


    const uploadTitle =
      document.getElementById(
        "upload-title"
      );


    const backButton =
      document.getElementById(
        "back-button"
      );


    let selectedDocument =
      null;


    /* ==========================================================
       LOAD SAVED RESERVATION
       ========================================================== */

    const savedReservation =
      getReservation();


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


    if (
      savedReservation.supportingDocument
    ) {

      uploadTitle.textContent =
        savedReservation
          .supportingDocument
          .name;

      uploadBox?.classList.add(
        "upload-box--selected"
      );

    }


    /* ==========================================================
       DOCUMENT UPLOAD
       ========================================================== */

    documentInput.addEventListener(
      "change",
      function () {

        clearError(
          documentInput,
          "supporting-document-error"
        );


        const file =
          documentInput.files[0];


        if (!file) {

          selectedDocument =
            null;

          uploadTitle.textContent =
            "Upload Proposal PDF";

          uploadBox?.classList.remove(
            "upload-box--selected"
          );

          return;

        }


        const maximumSize =
          5 * 1024 * 1024;


        const isPDF =
          file.type ===
            "application/pdf" ||
          file.name
            .toLowerCase()
            .endsWith(".pdf");


        if (!isPDF) {

          documentInput.value =
            "";

          selectedDocument =
            null;

          uploadTitle.textContent =
            "Upload Proposal PDF";

          uploadBox?.classList.remove(
            "upload-box--selected"
          );


          showError(
            documentInput,
            "supporting-document-error",
            "Please upload a PDF file."
          );

          return;

        }


        if (
          file.size >
          maximumSize
        ) {

          documentInput.value =
            "";

          selectedDocument =
            null;

          uploadTitle.textContent =
            "Upload Proposal PDF";

          uploadBox?.classList.remove(
            "upload-box--selected"
          );


          showError(
            documentInput,
            "supporting-document-error",
            "The PDF must not exceed 5MB."
          );

          return;

        }


        selectedDocument = {
          name: file.name,
          size: file.size,
          type:
            file.type ||
            "application/pdf"
        };


        uploadTitle.textContent =
          file.name;


        uploadBox?.classList.add(
          "upload-box--selected"
        );

      }
    );


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
        !Number.isFinite(
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


      if (
        !selectedDocument &&
        !savedReservation
          .supportingDocument
      ) {

        showError(
          documentInput,
          "supporting-document-error",
          "A supporting proposal PDF is required."
        );

        valid =
          false;

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


      if (
        includeDocument &&
        selectedDocument
      ) {

        details.supportingDocument =
          selectedDocument;

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

      const errorElement =
        document.getElementById(
          errorId
        );


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