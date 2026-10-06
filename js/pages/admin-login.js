renderNavbar(
  "navbar",
  "",
  "public"
);


const adminLoginForm =
  document.getElementById(
    "admin-login-form"
  );

const adminUsername =
  document.getElementById(
    "admin-username"
  );

const adminPassword =
  document.getElementById(
    "admin-password"
  );

const adminPasswordToggle =
  document.getElementById(
    "admin-password-toggle"
  );


adminPasswordToggle.addEventListener(
  "click",
  () => {

    if (
      adminPassword.type === "password"
    ) {

      adminPassword.type = "text";

      adminPasswordToggle.textContent =
        "Hide";

    }

    else {

      adminPassword.type =
        "password";

      adminPasswordToggle.textContent =
        "Show";

    }

  }
);


adminLoginForm.addEventListener("submit", async function(event) {
  event.preventDefault();
  const button = adminLoginForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await FRMS.login(adminUsername.value, adminPassword.value, true);
    location.href = "admin-dashboard.html";
  } catch (error) { FRMS.showError(error); }
  finally { button.disabled = false; }
});

document.getElementById("forgot-password").addEventListener("click", async event => {
  event.preventDefault();
  try { await FRMS.resetPassword(adminUsername.value); window.alert("If an account exists, check your email for a password reset link."); }
  catch (error) { FRMS.showError(error); }
});

const adminRegisterSection = document.getElementById('admin-register-section');
const adminRegisterOpen = document.getElementById('open-admin-register');
const adminRegisterBack = document.getElementById('admin-register-back');
const adminRegisterForm = document.getElementById('admin-register-form');
function showAdminRegistration(open) {
  adminLoginForm.hidden = open;
  adminRegisterSection.hidden = !open;
  adminRegisterOpen.setAttribute('aria-expanded', String(open));
  document.getElementById(open ? 'admin-register-name' : 'admin-username').focus();
}
adminRegisterOpen.addEventListener('click', () => showAdminRegistration(true));
adminRegisterBack.addEventListener('click', () => showAdminRegistration(false));
adminRegisterForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.getElementById('admin-register-message');
  const password = document.getElementById('admin-register-password').value;
  if (password !== document.getElementById('admin-register-confirm').value) { message.textContent = 'Passwords do not match.'; return; }
  const button = document.getElementById('admin-register-submit');
  button.disabled = adminRegisterBack.disabled = true;
  message.textContent = 'Creating account…';
  try {
    await FRMS.registerAdmin(document.getElementById('admin-register-name').value, document.getElementById('admin-register-email').value, password);
    adminRegisterForm.reset();
    message.textContent = 'Account registered. Ask the project owner to approve administrator access, then return to Admin Login.';
  } catch (error) { message.textContent = error.code === 'auth/email-already-in-use' ? 'This email already has an account. Contact the project owner if you need administrator access.' : error.message; }
  finally { button.disabled = adminRegisterBack.disabled = false; }
});
