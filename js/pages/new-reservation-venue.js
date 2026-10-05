(async () => {
  try {
    if (!await FRMS.requireUser()) return;
    const venues = await FRMS.venues(mockVenues);
/* ==========================================================
   new-reservation-venue.js
   Page script for new-reservation-venue.html.
   Handles venue, date, time slot, search, and next step.
   ========================================================== */


/* ==========================================================
   CURRENT RESERVATION
   ========================================================== */

const reservation = {
  venue: null,
  date: null,
  slot: null,
};


/* ==========================================================
   NAVBAR
   ========================================================== */

renderNavbar(
  "navbar",
  "new-reservation",
  "student"
);


/* ==========================================================
   ELEMENTS
   ========================================================== */

const venueListElement =
  document.getElementById("venue-list");

const venueSearch =
  document.getElementById("venue-search");

const timeSlotsElement =
  document.getElementById("time-slots");

const nextButton =
  document.getElementById("next-button");


/* ==========================================================
   VENUE LIST
   ========================================================== */

function loadVenueList(venues) {

  renderVenueList(
    "venue-list",
    venues,
    function (venue) {

      reservation.venue = venue;

      /*
        When venue changes,
        reset selected slot.
      */
      reservation.slot = null;


      /*
        If a date was already chosen,
        show the time slots again.
      */
      refreshTimeSlots();

    }
  );

}


/* Load all venues initially */

loadVenueList(venues);


/* ==========================================================
   VENUE SEARCH
   ========================================================== */

if (venueSearch) {

  venueSearch.addEventListener(
    "input",
    function () {

      const searchValue =
        venueSearch.value
          .trim()
          .toLowerCase();


      if (!searchValue) {

        loadVenueList(venues);

        return;

      }


      const filteredVenues =
        venues.filter(
          function (venue) {

            const searchableText = [
              venue.name,
              venue.venue,
              venue.title,
              venue.type,
              venue.category,
              venue.description
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


            return searchableText.includes(
              searchValue
            );

          }
        );


      if (filteredVenues.length > 0) {

        loadVenueList(
          filteredVenues
        );

        return;

      }


      venueListElement.innerHTML = `
        <div class="venue-search-empty">

          <strong>
            No venues found
          </strong>

          <p>
            Try searching for another facility.
          </p>

        </div>
      `;

    }
  );

}


/* ==========================================================
   CALENDAR
   ========================================================== */

createCalendar(
  "calendar",
  function (date) {

    reservation.date = date;

    /*
      Changing the date means
      the previous slot is no longer selected.
    */
    reservation.slot = null;


    /*
      Display available time slots.
    */
    refreshTimeSlots();

  }
);


/* ==========================================================
   REFRESH TIME SLOTS
   ========================================================== */

function refreshTimeSlots() {

  if (!timeSlotsElement) {
    return;
  }


  /*
    Clear old slots first.
  */
  timeSlotsElement.innerHTML = "";


  /*
    Require both venue and date
    before showing time slots.
  */
  if (
    !reservation.venue ||
    !reservation.date
  ) {
    return;
  }


  renderTimeSlots(
    "time-slots",
    reservation.date,
    mockSlots,
    function (slot) {

      reservation.slot = slot;

      console.log(
        "Selected time slot:",
        slot
      );

    }
  );

}


/* ==========================================================
   NEXT BUTTON
   ========================================================== */

if (nextButton) {

  nextButton.addEventListener(
    "click",
    function () {


      if (!reservation.venue) {

        alert(
          "Please select a venue."
        );

        return;

      }


      if (!reservation.date) {

        alert(
          "Please select a date."
        );

        return;

      }


      if (!reservation.slot) {

        alert(
          "Please select a time slot."
        );

        return;

      }


      /* ======================================================
         SAVE RESERVATION
         ====================================================== */

      updateReservation({

        venue:
          reservation.venue,

        date:
          reservation.date,

        slot:
          reservation.slot

      });


      /* ======================================================
         NEXT PAGE
         ====================================================== */

      window.location.href =
        "new-reservation-details.html";

    }
  );

}
  } catch (error) { FRMS.showError(error); }
})();
