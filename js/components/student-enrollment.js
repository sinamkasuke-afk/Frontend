(() => {
  let notice;
  FRMS.watchEnrollment(profile => {
    notice?.remove();
    notice = null;
    if (profile.enrollmentStatus === 'approved') return;
    notice = document.createElement('section');
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'padding:16px 24px;background:#eef4ef;color:#173f31';
    notice.textContent = profile.enrollmentStatus === 'rejected'
      ? 'Your student account is unavailable. Contact the facilities office.'
      : 'Sign out and sign in again to finish setting up your student account.';
    document.body.prepend(notice);
  }).then(stop => window.addEventListener('pagehide', stop, { once: true })).catch(FRMS.showError);
})();
