function renderNavbar(containerId, activePage, variant = "public") {

  const container = document.getElementById(containerId);

  if (!container) return;


  /* ==========================================================
     PUBLIC NAVBAR
     ========================================================== */

  if (variant === "public") {

    container.innerHTML = `
      <header class="navbar">

        <div class="navbar__brand">

          <div class="navbar__logo">
            <span>▥</span>
          </div>

          <div class="navbar__brand-text">
            <strong>SCHOOL</strong>
            <span class="navbar__separator">|</span>
            <span>Facilities Reservation System</span>
          </div>

        </div>


        <nav class="navbar__links">

          <a
            href="index.html"
            class="navbar__link ${
              activePage === "portal-home"
                ? "navbar__link--active"
                : ""
            }"
          >
            Portal Home
          </a>


          <div class="navbar__contact-wrapper">

            <button
              type="button"
              class="navbar__link navbar__contact-button"
              id="contact-button"
            >
              Contact
            </button>


            <div
              class="contact-popover"
              id="contact-popover"
            >

              <div class="contact-popover__header">

                <div class="contact-popover__icon">
                  ☏
                </div>

                <div>
                  <span class="contact-popover__label">
                    NEED ASSISTANCE?
                  </span>

                  <h3>
                    Contact PFMO
                  </h3>
                </div>

              </div>


              <div class="contact-popover__item">

                <div class="contact-popover__item-icon">
                  ✉
                </div>

                <div>

                  <span>
                    Email
                  </span>

                  <a href="mailto:pfmo@national-u.edu.ph">
                    pfmo@national-u.edu.ph
                  </a>

                </div>

              </div>


              <div class="contact-popover__item">

                <div class="contact-popover__item-icon">
                  ◷
                </div>

                <div>

                  <span>
                    Office Hours
                  </span>

                  <p>
                    Monday – Friday
                    <br>
                    8:00 AM – 5:00 PM
                  </p>

                </div>

              </div>


              <div class="contact-popover__item">

                <div class="contact-popover__item-icon">
                  ⌖
                </div>

                <div>

                  <span>
                    Department
                  </span>

                  <p>
                    Physical Facilities
                    <br>
                    Management Office
                  </p>

                </div>

              </div>


              <a
                href="mailto:pfmo@national-u.edu.ph"
                class="contact-popover__button"
              >
                Send Email
                <span>→</span>
              </a>

            </div>

          </div>


          <a
            href="pfmo.html"
            class="navbar__department ${
              activePage === "pfmo"
                ? "navbar__department--active"
                : ""
            }"
          >
            PFMO Department
            <span>→</span>
          </a>

        </nav>

      </header>
    `;


    /* ==========================================================
       CONTACT POPOVER
       ========================================================== */

    const contactButton =
      document.getElementById("contact-button");

    const contactPopover =
      document.getElementById("contact-popover");


    contactButton?.addEventListener("click", (event) => {

      event.stopPropagation();

      contactPopover?.classList.toggle(
        "contact-popover--open"
      );

      contactButton.classList.toggle(
        "navbar__link--active"
      );

    });


    contactPopover?.addEventListener("click", (event) => {

      event.stopPropagation();

    });


    document.addEventListener("click", () => {

      contactPopover?.classList.remove(
        "contact-popover--open"
      );

      contactButton?.classList.remove(
        "navbar__link--active"
      );

    });


    return;
  }



  /* ==========================================================
     STUDENT / ADMIN LINKS
     ========================================================== */

  const linkSets = {

    student: [
      {
        label: "Dashboard",
        href: "dashboard.html"
      },
      {
        label: "New Reservation",
        href: "new-reservation-venue.html"
      },
      {
        label: "My Reservations",
        href: "my-requests.html"
      },
      {
        label: "Logout",
        href: "index.html"
      }
    ],


    admin: [
      {
        label: "Dashboard",
        href: "admin-dashboard.html"
      },
      {
        label: "Requests",
        href: "admin-requests.html"
      },
      {
        label: "History",
        href: "admin-history.html"
      },
      {
        label: "Calendar",
        href: "admin-calendar.html"
      },
      {
        label: "Logout",
        href: "index.html"
      }
    ]

  };


  const links = linkSets[variant] || [];


  /* ==========================================================
     STUDENT / ADMIN NAVBAR
     ========================================================== */

  container.innerHTML = `
    <header class="navbar">

      <div class="navbar__brand">

        <div class="navbar__logo">
          <span>▥</span>
        </div>

        <div class="navbar__brand-text">
          <strong>SCHOOL</strong>
          <span class="navbar__separator">|</span>
          <span>Facilities Reservation System</span>
        </div>

      </div>


      <nav class="navbar__links">

        ${links
          .map(
            (link) => variant === "student" && link.label === "Logout" ? `
              <div class="navbar__student-profile">
                <button type="button" class="navbar__student-toggle" aria-expanded="false" aria-controls="student-logout-menu">
                  <span class="navbar__student-name">Student</span>
                  <span class="navbar__student-arrow" aria-hidden="true">⌄</span>
                </button>
                <div id="student-logout-menu" class="navbar__student-menu" hidden>
                  <a href="index.html" data-logout>↪ Logout</a>
                </div>
              </div>
            ` : `
              <a
                href="${link.href}"
                class="navbar__link"
              >
                ${link.label}
              </a>
            `
          )
          .join("")}

      </nav>

    </header>
  `;

  if (variant === "student") {
    const wrapper = container.querySelector(".navbar__student-profile");
    const button = wrapper.querySelector("button");
    const menu = wrapper.querySelector(".navbar__student-menu");
    const setOpen = open => {
      button.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
    };
    button.addEventListener("click", () => setOpen(menu.hidden));
    document.addEventListener("click", event => {
      if (!wrapper.contains(event.target)) setOpen(false);
    });
    wrapper.addEventListener("focusout", event => {
      if (!wrapper.contains(event.relatedTarget)) setOpen(false);
    });
    wrapper.addEventListener("keydown", event => {
      if (event.key === "Escape") { setOpen(false); button.focus(); }
      if (event.key === "ArrowDown" && event.target === button) {
        event.preventDefault(); setOpen(true); menu.querySelector("a").focus();
      }
    });
  }
  if (variant === "student" && window.FRMS) {
    FRMS.currentUser().then(user => {
      const name = container.querySelector(".navbar__student-name");
      if (!name || !user) return;
      if (user.role === "admin") { location.replace("admin-dashboard.html"); return; }
      name.textContent = user.displayName || user.email || "Student";
      name.title = name.textContent;
      name.hidden = false;
    }).catch(FRMS.showError);
  }

}