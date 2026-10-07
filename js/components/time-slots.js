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

  heading.textContent = `Choose a time on ${dateText}:`;
  const custom = document.createElement("div");
  custom.className = "custom-time";
  custom.innerHTML = `<p class="custom-time__hint">Enter whole hours and choose AM or PM. For example, 8 AM–4 PM is 8 hours; 8 AM–8 PM is 12 hours. Start and end must be on the same day.</p>
    <div class="custom-time__fields">
      <label>Start time <span><input aria-label="Start hour" type="number" min="1" max="12" step="1" inputmode="numeric" value="8"><select aria-label="Start AM or PM"><option>AM</option><option>PM</option></select></span></label>
      <label>End time <span><input aria-label="End hour" type="number" min="1" max="12" step="1" inputmode="numeric" value="4"><select aria-label="End AM or PM"><option>AM</option><option selected>PM</option></select></span></label>
    </div><p class="custom-time__feedback" role="status" aria-live="polite"></p>
    <button class="time-slot" type="button">Use this time</button>`;
  const inputs = custom.querySelectorAll("input");
  const periods = custom.querySelectorAll("select");
  const feedback = custom.querySelector(".custom-time__feedback");
  const use = custom.querySelector("button");
  const format = minutes => `${minutes / 60 % 12 || 12}:00 ${minutes < 720 ? "AM" : "PM"}`;
  let chosen = null;
  function validate() {
    const hours = Array.from(inputs, input => Number(input.value));
    chosen = null;
    use.disabled = true;
    if (hours.some((hour, index) => !Number.isInteger(hour) || hour < 1 || hour > 12 || !/^\d{1,2}$/.test(inputs[index].value))) { feedback.textContent = "Enter an hour from 1 to 12 using numbers only."; return; }
    const minutes = hours.map((hour, index) => (hour % 12 + (periods[index].value === "PM" ? 12 : 0)) * 60);
    if (minutes[1] <= minutes[0]) { feedback.textContent = "End time must be later than start time on the same day."; return; }
    if ((slots.blocked || []).some(range => minutes[0] < range.endMinutes && minutes[1] > range.startMinutes)) { feedback.textContent = "This time overlaps an existing reservation. Choose another time or facility."; return; }
    chosen = { id: `hours-${minutes[0]}-${minutes[1]}`, startMinutes: minutes[0], endMinutes: minutes[1], label: `${format(minutes[0])} – ${format(minutes[1])}` };
    feedback.textContent = `${chosen.label} · ${(minutes[1] - minutes[0]) / 60} hours`;
    use.disabled = false;
  }
  inputs.forEach(input => input.addEventListener("keydown", event => { if (["e", "E", "+", "-", "."].includes(event.key)) event.preventDefault(); }));
  custom.addEventListener("input", () => { use.classList.remove("time-slot--selected"); onSlotSelect(null); validate(); });
  custom.addEventListener("change", validate);
  use.addEventListener("click", () => {
    validate();
    if (!chosen) return;
    list.querySelectorAll(".time-slot").forEach(chip => chip.classList.remove("time-slot--selected"));
    use.classList.add("time-slot--selected");
    onSlotSelect(chosen);
  });
  list.addEventListener("click", () => use.classList.remove("time-slot--selected"));
  const presetsTitle = document.createElement("p");
  presetsTitle.className = "custom-time__hint";
  presetsTitle.textContent = slots.length ? "Or choose an available suggested time:" : "No suggested times available. You can check another time above.";
  container.append(heading, custom, presetsTitle, list);
  validate();
}