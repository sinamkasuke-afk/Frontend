/* ==========================================================
   calendar.js
   Full-month calendar with Previous / Next month buttons.

     createCalendar("calendar", function (date) { ... });

   onDateSelect = function called with the chosen Date object.
   Opens on the current month. Past dates cannot be selected.
   ========================================================== */

function createCalendar(containerId, onDateSelect, initialDate = null, onMonthChange = () => {}) {
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
  let selectedDate = initialDate ? new Date(initialDate) : null;
  if (selectedDate && !Number.isNaN(selectedDate.getTime()) && selectedDate >= today) {
    viewYear = selectedDate.getFullYear(); viewMonth = selectedDate.getMonth();
  } else selectedDate = null;

  let availability = null;
  // Static skeleton (title, buttons, weekday row, empty grid)
  container.innerHTML = `
    <div class="calendar">
      <div class="calendar__header">
        <h3 class="calendar__title"></h3>
        <div class="calendar__nav">
          <button type="button" class="calendar__nav-btn" data-action="prev">Previous</button>
          <button type="button" class="calendar__nav-btn" data-action="today">Today</button>
          <button type="button" class="calendar__nav-btn" data-action="next">Next</button>
        </div>
      </div>
      <div class="calendar__weekdays">
        ${weekdayNames.map(function (day) { return `<span>${day}</span>`; }).join("")}
      </div>
<p class="calendar__status" role="status">Select a venue to see bookings.</p>
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
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      button.dataset.date = iso;
      const ranges = availability?.[iso] || [];
      const full = ranges.length && !Array.from({length: 23}, (_, hour) => hour * 60).some(start => !ranges.some(range => start < range.endMinutes && start + 60 > range.startMinutes));
      const status = availability === null ? "unknown" : full ? "full" : ranges.length ? "booked" : "available";
      button.dataset.status = status;
      button.classList.add(`calendar__day--${status}`);
      button.title = status === "booked" ? "Booked hours — select to see remaining times" : status === "full" ? "Fully booked" : status === "available" ? "Available" : "Select a venue or wait for availability";
      button.setAttribute("aria-label", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + `. ${button.title}`);
      button.setAttribute("aria-pressed", String(!!selectedDate && isSameDay(date, selectedDate)));
      if (isSameDay(date, today)) button.setAttribute("aria-current", "date");

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

  function changeMonth() {
    availability = null;
    renderMonth();
    onMonthChange(viewYear, viewMonth);
  }
  // Previous / Next month buttons
  container.querySelector('[data-action="prev"]').addEventListener("click", function () {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    changeMonth();
  });

  container.querySelector('[data-action="next"]').addEventListener("click", function () {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    changeMonth();
  });

  container.querySelector('[data-action="today"]').addEventListener("click", () => {
    viewYear = today.getFullYear(); viewMonth = today.getMonth(); changeMonth();
  });
  renderMonth();
  return {
    month: () => ({ year: viewYear, month: viewMonth }),
    setAvailability(value, message) {
      availability = value;
      container.querySelector(".calendar__status").textContent = message;
      renderMonth();
    }
  };
}