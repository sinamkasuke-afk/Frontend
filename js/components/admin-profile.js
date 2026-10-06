(() => {
  const button = document.getElementById('admin-profile-button');
  const wrapper = document.querySelector('.admin-profile-wrapper');
  const menu = document.getElementById('admin-profile-menu');
  if (!button || !wrapper || !menu) return;
  function setOpen(open) {
    wrapper.classList.toggle('admin-profile-wrapper--open', open);
    button.setAttribute('aria-expanded', String(open));
    menu.inert = !open;
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', event => {
    if (!wrapper.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  wrapper.addEventListener('focusout', event => {
    if (!wrapper.contains(event.relatedTarget)) setOpen(false);
  });
  FRMS.currentUser().then(user => {
    if (!user) return;
    const name = user.displayName || user.email || 'Administrator';
    document.getElementById('admin-display-name').textContent = name;
    document.getElementById('admin-avatar').textContent = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }).catch(FRMS.showError);
})();
