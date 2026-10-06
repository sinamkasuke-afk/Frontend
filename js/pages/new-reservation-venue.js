(async () => {
  try {
    if (!await FRMS.requireUser()) return;
    const venues = await FRMS.venues();
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
if (!venues.length) venueListElement.textContent = "No facilities are configured yet. Ask your administrator to populate the venue catalog.";
const selectedName = new URLSearchParams(location.search).get("venue");
if (selectedName) {
  const selectedIndex = venues.findIndex(venue => venue.name === selectedName);
  if (selectedIndex >= 0) venueListElement.querySelectorAll(".venue-item")[selectedIndex]?.click();
}

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

let slotLoadVersion = 0;
async function refreshTimeSlots() {
  const version = ++slotLoadVersion;

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


  timeSlotsElement.textContent = "Loading available slots…";
  try {
    const dateISO = `${reservation.date.getFullYear()}-${String(reservation.date.getMonth() + 1).padStart(2, "0")}-${String(reservation.date.getDate()).padStart(2, "0")}`;
    const slots = await FRMS.availableSlots(reservation.venue.id, dateISO);
    if (version !== slotLoadVersion) return;
    if (!slots.length) { timeSlotsElement.textContent = "No slots are available for this date."; return; }
    renderTimeSlots(
    "time-slots",
    reservation.date,
    slots,
    function (slot) {

      reservation.slot = slot;

      console.log(
        "Selected time slot:",
        slot
      );

    }
  );

  } catch (error) { if (version === slotLoadVersion) { timeSlotsElement.textContent = "Unable to load available slots."; FRMS.showError(error); } }
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
