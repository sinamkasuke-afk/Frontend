/* ==========================================================
   calendar.js
   Full-month calendar with Previous / Next month buttons.

     createCalendar("calendar", function (date) { ... });

   onDateSelect = function called with the chosen Date object.
   Opens on the current month. Past dates cannot be selected.
   ========================================================== */

function createCalendar(containerId, onDateSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Today at midnight (used to disable past dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calendar state
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = null;

  // Static skeleton (title, buttons, weekday row, empty grid)
  container.innerHTML = `
    <div class="calendar">
      <div class="calendar__header">
        <h3 class="calendar__title"></h3>
        <div class="calendar__nav">
          <button type="button" class="calendar__nav-btn" data-action="prev">Previous</button>
          <button type="button" class="calendar__nav-btn" data-action="next">Next</button>
        </div>
      </div>
      <div class="calendar__weekdays">
        ${weekdayNames.map(function (day) { return `<span>${day}</span>`; }).join("")}
      </div>
      <div class="calendar__grid"></div>
    </div>
  `;

  const title = container.querySelector(".calendar__title");
  const grid = container.querySelector(".calendar__grid");

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // Draws the title and all day cells for the month being viewed
  function renderMonth() {
    title.textContent = `Availability Calendar – ${monthNames[viewMonth]} ${viewYear}`;
    grid.innerHTML = "";

    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Empty cells before the 1st of the month
    for (let i = 0; i < firstWeekday; i++) {
      grid.appendChild(document.createElement("div"));
    }

    // One button per day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar__day";
      button.textContent = day;

      if (date < today) {
        button.disabled = true;
      }

      if (selectedDate && isSameDay(date, selectedDate)) {
        button.classList.add("calendar__day--selected");
      }

      button.addEventListener("click", function () {
        selectedDate = date;
        renderMonth();
        onDateSelect(date);
      });

      grid.appendChild(button);
    }
  }

  // Previous / Next month buttons
  container.querySelector('[data-action="prev"]').addEventListener("click", function () {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderMonth();
  });

  container.querySelector('[data-action="next"]').addEventListener("click", function () {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderMonth();
  });

  renderMonth();
}