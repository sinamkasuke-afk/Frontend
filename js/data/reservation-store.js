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
// Keep the actual PDF locally between wizard pages without putting it in JSON.
function draftDocumentKey() {
  let key = sessionStorage.getItem('frms_document_key');
  if (!key) { key = crypto.randomUUID(); sessionStorage.setItem('frms_document_key', key); }
  return key;
}
async function draftDocumentStore(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('frms-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('documents', mode);
      const request = operation(transaction.objectStore('documents'), draftDocumentKey());
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
function saveDraftDocument(file) {
  return draftDocumentStore('readwrite', (store, key) => file ? store.put(file, key) : store.delete(key));
}
function readDraftDocument() {
  return draftDocumentStore('readonly', (store, key) => store.get(key));
}
