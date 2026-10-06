function escapeFacilityText(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function createFacilityCard(record) {
  const space = {
    name: escapeFacilityText(record.name),
    capacity: record.capacity ? `${Number(record.capacity)} guests` : "Contact PFMO for capacity",
    description: escapeFacilityText(record.description),
    image: /^https:\/\//.test(record.image || "") ? escapeFacilityText(record.image) : "",
    tags: (record.tags || []).map(escapeFacilityText)
  };

  const card = document.createElement("article");

  card.className = "facility-card";


  card.innerHTML = `

    <div class="facility-card__image-wrap">

      <img
        class="facility-card__image"
        src="${space.image}"
        alt="${space.name}"
      />

      <span class="facility-card__capacity">
        ♙ ${space.capacity}
      </span>

    </div>


    <div class="facility-card__body">

      <h3 class="facility-card__title">
        ${space.name}
      </h3>

      <p class="facility-card__description">
        ${space.description}
      </p>


      <button
        type="button"
        class="facility-card__button"
        aria-label="Reserve ${space.name}"
      >
        →
      </button>


      <div class="facility-card__tags">

        ${space.tags
          .map(
            tag =>
              `<span class="facility-card__tag">
                ${tag}
              </span>`
          )
          .join("")}

      </div>

    </div>

  `;


  const reserveButton =
    card.querySelector(".facility-card__button");


  reserveButton.addEventListener("click", () => {

    sessionStorage.setItem(
      "selectedFacility",
      record.name
    );


    window.location.href =
      `new-reservation-venue.html?venue=${encodeURIComponent(record.name)}`;

  });


  return card;

}


async function renderFeaturedSpaces() {

  const grid =
    document.getElementById("featured-spaces");


  if (!grid) return;


  try {
    const featuredSpaces = (await FRMS.venues()).filter(space => space.featured);
    grid.innerHTML = "";
    if (!featuredSpaces.length) grid.textContent = "Facilities will appear here once the catalog is configured.";
    featuredSpaces.forEach(space => {

    grid.appendChild(
      createFacilityCard(space)
    );

  });
  } catch (error) { grid.textContent = "Unable to load facilities."; FRMS.showError(error); }
}


function setupLandingButtons() {

  const viewAll =
    document.getElementById("view-all-facilities");


  if (viewAll) {

    viewAll.addEventListener("click", () => {

      window.location.href =
        "new-reservation-venue.html";

    });

  }

}


renderNavbar(
  "navbar",
  "portal-home",
  "public"
);


renderFeaturedSpaces();

setupLandingButtons();