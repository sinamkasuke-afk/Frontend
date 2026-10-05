/* ==========================================================
   time-slots.js
   Shows "Available Slots on <date>:" and the time chips.

     renderTimeSlots("time-slots", date, slots, function (slot) { ... });

   date       = the chosen Date (pass null to clear the section)
   slots      = array of { id, label }
   onSlotSelect = function called with the chosen slot
   ========================================================== */

function renderTimeSlots(containerId, date, slots, onSlotSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!date) return;

  const dateText = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const heading = document.createElement("p");
  heading.className = "time-slots__title";
  heading.textContent = `Available Slots on ${dateText}:`;

  const list = document.createElement("div");
  list.className = "time-slots__list";

  slots.forEach(function (slot) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "time-slot";
    chip.textContent = slot.label;

    chip.addEventListener("click", function () {
      list.querySelectorAll(".time-slot").forEach(function (other) {
        other.classList.remove("time-slot--selected");
      });
      chip.classList.add("time-slot--selected");
      onSlotSelect(slot);
    });

    list.appendChild(chip);
  });

  container.append(heading, list);
}