(() => {
  let notice;
  FRMS.watchEnrollment(profile => {
    notice?.remove();
    notice = null;
    if (profile.enrollmentStatus === 'approved' && profile.confirmedStudentId === profile.studentId) return;
    notice = document.createElement('section');
    notice.setAttribute('aria-label', 'Student enrollment');
    notice.style.cssText = 'padding:16px 24px;background:#eef4ef;color:#173f31';
    if (profile.enrollmentStatus !== 'approved') {
      notice.textContent = profile.enrollmentStatus === 'rejected'
        ? 'Your enrollment was rejected. Contact the facilities office to check your student ID.'
        : 'Your student enrollment needs administrator approval before you can reserve. Contact the facilities office with your student ID.';
    } else {
      const form = document.createElement('form');
      form.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';
      const label = document.createElement('label');
      label.htmlFor = 'confirm-student-id';
      label.textContent = 'Enrollment approved. Enter the student ID confirmed by your administrator:';
      const input = document.createElement('input');
      input.id = 'confirm-student-id'; input.name = 'studentId'; input.required = true;
      input.maxLength = 50; input.autocomplete = 'off'; input.placeholder = 'Student ID';
      input.style.cssText = 'padding:10px;border:1px solid #ccc;border-radius:8px';
      const button = document.createElement('button');
      button.type = 'submit'; button.textContent = 'Confirm Student ID';
      button.style.cssText = 'padding:10px 16px;background:#173f31;color:white;border:0;border-radius:8px;cursor:pointer';
      const error = document.createElement('span'); error.setAttribute('role', 'alert');
      form.append(label, input, button, error);
      form.addEventListener('submit', async event => {
        event.preventDefault(); button.disabled = true; error.textContent = '';
        try { await FRMS.confirmStudentId(input.value); }
        catch (failure) { error.textContent = failure.message; }
        finally { button.disabled = false; }
      });
      notice.append(form);
    }
    document.body.prepend(notice);
  }).then(stop => window.addEventListener('pagehide', stop, { once: true })).catch(FRMS.showError);
})();
