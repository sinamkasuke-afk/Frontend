const featuredSpaces = [

  {
    id: "multipurpose-hall",
    name: "Multipurpose Hall",
    capacity: "300 guests",

    description:
      "Ideal for seminars and organizational conferences.",

    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",

    tags: [
      "Seminars",
      "Conferences",
      "Events"
    ]
  },


  {
    id: "school-gymnasium",
    name: "School Gymnasium",
    capacity: "1000 guests",

    description:
      "Perfect for sports tournaments, pep rallies, and large events.",

    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",

    tags: [
      "Sports",
      "Tournaments",
      "Exhibitions"
    ]
  },


  {
    id: "social-hall",
    name: "Social Hall",
    capacity: "150 guests",

    description:
      "Tailored for banquets and academic celebrations.",

    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80",

    tags: [
      "Banquets",
      "Academic Events",
      "Meetings"
    ]
  },


  {
    id: "open-courtyard",
    name: "Open Courtyard",
    capacity: "400 guests",

    description:
      "Ideal for outdoor fairs, concerts, and campus festivals.",

    image:
      "https://images.unsplash.com/photo-1574958269340-fa927503f3dd?auto=format&fit=crop&w=900&q=80",

    tags: [
      "Fairs",
      "Concerts",
      "Outdoor Events"
    ]
  }

];


function createFacilityCard(space) {

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
      space.name
    );


    window.location.href =
      `new-reservation-venue.html?venue=${encodeURIComponent(space.name)}`;

  });


  return card;

}


function renderFeaturedSpaces() {

  const grid =
    document.getElementById("featured-spaces");


  if (!grid) return;


  featuredSpaces.forEach(space => {

    grid.appendChild(
      createFacilityCard(space)
    );

  });

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