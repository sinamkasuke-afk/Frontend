/* ==========================================================
   stepper.js
   Builds the 3-step progress bar. Reuse it on the next screens:

     renderStepper("stepper", 1);   // 1 = "Venue & Date" is active
     renderStepper("stepper", 2);   // 2 = "Details" is active

   containerId = id of the empty <div> to fill
   currentStep = number of the active step (1, 2 or 3)
   ========================================================== */

function renderStepper(containerId, currentStep) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const steps = ["Venue & Date", "Details", "Review"];

  const itemsHtml = steps
    .map((label, index) => {
      const stepNumber = index + 1;
      const activeClass = stepNumber === currentStep ? " stepper__step--active" : "";
      const arrow = stepNumber < steps.length ? `<li class="stepper__arrow" aria-hidden="true">→</li>` : "";

      return `
        <li class="stepper__step${activeClass}">
          <span class="stepper__circle">${stepNumber}</span>
          <span class="stepper__label">${label}</span>
        </li>
        ${arrow}
      `;
    })
    .join("");

  container.innerHTML = `
    <nav class="stepper" aria-label="Reservation steps">
      <ol class="stepper__list">${itemsHtml}</ol>
    </nav>
  `;
}