/* ==========================================================
   space-card.js
   Creates ONE space card from a data object:

     createSpaceCard({ name: "Social Hall", description: "..." });

   Returns a DOM element you can append anywhere.
   ========================================================== */

function createSpaceCard(space) {
  const card = document.createElement("article");
  card.className = "space-card";

  const title = document.createElement("h4");
  title.className = "space-card__title";
  title.textContent = space.name;

  const description = document.createElement("p");
  description.className = "space-card__description";
  description.textContent = space.description;

  card.append(title, description);
  return card;
}