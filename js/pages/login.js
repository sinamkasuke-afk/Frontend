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
