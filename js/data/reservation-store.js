const RESERVATION_STORAGE_KEY = "frms_reservation";

function getReservation() {
  const savedReservation = sessionStorage.getItem(RESERVATION_STORAGE_KEY);

  if (!savedReservation) {
    return {
      venue: null,
      date: null,
      slot: null,
      eventName: "",
      organization: "",
      eventType: "",
      expectedGuests: "",
      purpose: "",
      contactPerson: "",
      facilityRequirements: "",
      setupNotes: "",
      supportingDocument: null,
    };
  }

  try {
    return JSON.parse(savedReservation);
  } catch (error) {
    console.error("Unable to read reservation data:", error);
    clearReservation();
    return getReservation();
  }
}

function saveReservation(reservation) {
  sessionStorage.setItem(
    RESERVATION_STORAGE_KEY,
    JSON.stringify(reservation)
  );
}

function updateReservation(newData) {
  const reservation = getReservation();

  const updatedReservation = {
    ...reservation,
    ...newData,
  };

  saveReservation(updatedReservation);

  return updatedReservation;
}

function clearReservation() {
  sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
}

// Remove local file drafts left by older versions of the website.
if (typeof indexedDB !== "undefined" && sessionStorage.getItem("frms_document_key")) {
  indexedDB.deleteDatabase("frms-drafts");
  sessionStorage.removeItem("frms_document_key");
}
