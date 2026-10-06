renderNavbar(
  "navbar",
  "",
  "public"
);

const loginForm =
  document.getElementById("login-form");

const identifier =
  document.getElementById("identifier");

const password =
  document.getElementById("password");

const togglePassword =
  document.getElementById("toggle-password");


togglePassword.addEventListener(
  "click",
  () => {

    if (password.type === "password") {

      password.type = "text";
      togglePassword.textContent = "Hide";

    } else {

      password.type = "password";
      togglePassword.textContent = "Show";

    }

  }
);


loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();
  const button = loginForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await FRMS.login(identifier.value, password.value, false);
    location.href = "dashboard.html";
  } catch (error) { FRMS.showError(error); }
  finally { button.disabled = false; }
});

const registerSection = document.getElementById("register-section");
const openRegister = document.getElementById("open-register");
const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");
const backToLogin = document.getElementById("back-to-login");
function showRegistration(open) {
  loginForm.hidden = open;
  registerSection.hidden = !open;
  openRegister.setAttribute("aria-expanded", String(open));
  document.getElementById("login-title").textContent = open ? "Join the Student Portal" : "Welcome Back!";
  document.getElementById("login-label").textContent = open ? "STUDENT REGISTRATION" : "STUDENT LOGIN";
  document.getElementById("login-description").textContent = open ? "Create an account to reserve school facilities." : "Sign in to continue to the School Facilities Reservation System.";
  (open ? document.getElementById("register-name") : identifier).focus();
}
openRegister.addEventListener("click", () => showRegistration(true));
backToLogin.addEventListener("click", () => showRegistration(false));
registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  registerError.hidden = true;
  const enteredPassword = document.getElementById("register-password").value;
  if (enteredPassword !== document.getElementById("register-confirm").value) {
    registerError.textContent = "Passwords do not match.";
    registerError.hidden = false;
    document.getElementById("register-confirm").focus();
    return;
  }
  const submit = document.getElementById("register-submit");
  submit.disabled = true; backToLogin.disabled = true;
  submit.textContent = "Creating account…";
  try {
    await FRMS.register(document.getElementById("register-name").value, document.getElementById("register-email").value, enteredPassword);
    location.href = "dashboard.html";
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "An account already uses this email. Sign in instead.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/weak-password": "Choose a stronger password.",
      "auth/network-request-failed": "Check your internet connection and try again."
    };
    registerError.textContent = messages[error.code] || error.message || "Unable to create your account. Please try again.";
    registerError.hidden = false;
  } finally {
    submit.disabled = false; backToLogin.disabled = false;
    submit.textContent = "Create Student Account →";
  }
});
