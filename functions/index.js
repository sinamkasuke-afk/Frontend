const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { ReservationError, submitReservation, reviewReservation } = require('./reservation-service.cjs');
initializeApp();
const options = { region: 'asia-southeast1', maxInstances: 10 };
function actor(request) {
  return request.auth && { uid: request.auth.uid, email: request.auth.token.email,
    name: request.auth.token.name, admin: request.auth.token.admin === true };
}
async function execute(task) {
  try { return await task(); }
  catch (error) {
    if (error instanceof ReservationError) throw new HttpsError(error.code, error.message);
    console.error(error);
    throw new HttpsError('internal', 'The request could not be saved. Please try again.');
  }
}
async function verifyAttachment(uid, id) {
  const path = `supportingDocuments/${uid}/${id}/proposal.pdf`;
  let metadata;
  try { [metadata] = await getStorage().bucket().file(path).getMetadata(); }
  catch (error) { if (error.code === 404) throw new ReservationError('failed-precondition', 'Upload the supporting PDF again.'); throw error; }
  if (metadata.contentType !== 'application/pdf' || Number(metadata.size) > 5 * 1024 * 1024) {
    throw new ReservationError('invalid-argument', 'Supporting document must be a PDF no larger than 5MB.');
  }
  return { path, name: metadata.metadata?.originalName || 'proposal.pdf', size: Number(metadata.size), contentType: metadata.contentType };
}
exports.submitReservation = onCall(options, request => execute(() => submitReservation({
  db: getFirestore(), actor: actor(request), data: request.data || {},
  timestamp: () => FieldValue.serverTimestamp(), verifyAttachment
})));
exports.reviewReservation = onCall(options, request => execute(() => reviewReservation({
  db: getFirestore(), actor: actor(request), data: request.data || {}, timestamp: () => FieldValue.serverTimestamp()
})));
