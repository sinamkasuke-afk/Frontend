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
