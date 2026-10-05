/* ==========================================================
   venue-list.js
   Builds the list of venue buttons. Only one can be selected.

     renderVenueList("venue-list", venues, function (venue) { ... });

   venues   = array of { id, name }
   onSelect = function called with the chosen venue
   ========================================================== */

function renderVenueList(containerId, venues, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "venue-list";

  venues.forEach(function (venue) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "venue-item";

    const name = document.createElement("span");
    name.textContent = venue.name;

    // Check mark (only visible on the selected venue)
    const check = document.createElement("span");
    check.className = "venue-item__check";
    check.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    item.append(name, check);

    item.addEventListener("click", function () {
      list.querySelectorAll(".venue-item").forEach(function (other) {
        other.classList.remove("venue-item--selected");
      });
      item.classList.add("venue-item--selected");
      onSelect(venue);
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}