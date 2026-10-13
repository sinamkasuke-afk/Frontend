(() => {
  let notice;
  FRMS.currentUser().then(user => {
    if (!user || user.role !== 'student' || user.emailVerified) return;
    const section = document.createElement('section');
    section.className = 'email-verification-notice';
    section.setAttribute('aria-label', 'Email verification');
    section.style.cssText = 'padding:16px 24px;background:#eef4ef;color:#173f31';
    const text = document.createElement('p');
    text.textContent = 'Verify ' + user.email + ' before submitting a reservation. Your student code is ' + user.studentCode + '.';
    const form = document.createElement('form');
    form.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    const send = document.createElement('button'); send.type = 'button'; send.textContent = 'Send verification code';
    const label = document.createElement('label'); label.textContent = 'Email code'; label.htmlFor = 'email-verification-code';
    const input = document.createElement('input'); input.id = 'email-verification-code'; input.inputMode = 'numeric'; input.pattern = '[0-9]{6}'; input.maxLength = 6; input.required = true; input.autocomplete = 'one-time-code';
    const verify = document.createElement('button'); verify.type = 'submit'; verify.textContent = 'Verify email';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    let timer;
    send.addEventListener('click', async () => {
      send.disabled = true; status.textContent = 'Sending code…';
      try {
        const result = await FRMS.emailVerification('send');
        if (result.verified) { section.remove(); return; }
        status.textContent = 'Code sent. Check your inbox or spam folder. It expires in 10 minutes.';
        input.focus(); send.textContent = 'Resend in 60 seconds';
        timer = setTimeout(() => { send.disabled = false; send.textContent = 'Resend code'; }, 60000);
      } catch (error) { status.textContent = error.message; send.disabled = false; }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); verify.disabled = true; send.disabled = true;
      try { await FRMS.emailVerification('verify', input.value); clearTimeout(timer); section.remove(); }
      catch (error) { status.textContent = error.message; verify.disabled = false; send.disabled = false; }
    });
    form.append(send, label, input, verify); section.append(text, form, status); document.body.prepend(section);
    window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
  }).catch(FRMS.showError);
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
