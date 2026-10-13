(async () => {
  const form = document.getElementById('verification-form');
  const input = document.getElementById('verification-code');
  const verify = document.getElementById('verify-button');
  const resend = document.getElementById('resend-code');
  const status = document.getElementById('verification-status');
  const error = document.getElementById('verification-error');
  let timer, cooldownUntil = 0, sending = false, verifying = false;
  const showError = message => { error.textContent = message; error.hidden = false; };
  function refreshResend() {
    const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    resend.disabled = sending || verifying || remaining > 0;
    resend.textContent = remaining ? `Resend in ${remaining}s` : 'Resend code';
  }
  function cooldown(key) {
    cooldownUntil = Date.now() + 60000;
    sessionStorage.setItem(key, String(cooldownUntil));
    refreshResend();
  }
  try {
    if (!await FRMS.requireUser(false, true)) return;
    const user = await FRMS.currentUser();
    if (!user) return;
    if (user.role === 'admin') { location.replace('admin-dashboard.html'); return; }
    if (user.emailVerified) { location.replace('dashboard.html'); return; }
    document.getElementById('verification-email').textContent = user.email;
    const key = 'frms_verification_resend_' + user.email;
    cooldownUntil = Number(sessionStorage.getItem(key)) || 0;
    input.disabled = verify.disabled = false;
    input.focus();
    timer = setInterval(refreshResend, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
    async function sendCode() {
      if (sending || verifying) return;
      sending = true; verify.disabled = true; error.hidden = true; refreshResend();
      status.textContent = 'Sending your verification code…';
      try {
        const result = await FRMS.emailVerification('send');
        if (result.verified) { location.replace('dashboard.html'); return; }
        cooldown(key);
        status.textContent = 'Code sent. Check your inbox or spam folder.';
        input.focus();
      } catch (failure) {
        if (failure.status === 429) cooldown(key);
        status.textContent = '';
        showError(failure.message);
      } finally { sending = false; verify.disabled = verifying; refreshResend(); }
    }
    resend.addEventListener('click', sendCode);
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      input.removeAttribute('aria-invalid'); error.hidden = true;
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (verifying || sending) return;
      if (!/^\d{6}$/.test(input.value)) { showError('Enter the six-digit code from your email.'); input.focus(); return; }
      verifying = true; verify.disabled = true; refreshResend(); error.hidden = true;
      verify.textContent = 'Verifying…';
      try {
        const result = await FRMS.emailVerification('verify', input.value);
        if (!result.verified) throw new Error('Email could not be verified. Please try again.');
        sessionStorage.removeItem(key);
        location.replace('dashboard.html');
      } catch (failure) { showError(failure.message); input.setAttribute('aria-invalid', 'true'); input.focus(); }
      finally { verifying = false; verify.disabled = false; verify.textContent = 'Verify & continue →'; refreshResend(); }
    });
    if (cooldownUntil > Date.now()) {
      status.textContent = 'Enter the latest code from your email.'; refreshResend();
    } else await sendCode();
  } catch (failure) { status.textContent = ''; showError(failure.message || 'Unable to load verification. Please sign in again.'); }
})();
