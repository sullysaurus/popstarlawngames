/**
 * @template {Element} T
 * @param {string} selector
 * @returns {T}
 */
function query(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return /** @type {T} */ (element);
}

/** @type {HTMLFormElement} */
const availabilityForm = query("#availability-form");
/** @type {HTMLParagraphElement} */
const availabilityMessage = query("#availability-message");
/** @type {HTMLInputElement} */
const eventDate = query("#event-date");
/** @type {HTMLInputElement} */
const eventZip = query("#event-zip");
/** @type {HTMLSelectElement} */
const eventType = query("#event-type");
/** @type {HTMLDialogElement} */
const bookingDialog = query("#booking-dialog");
/** @type {HTMLFormElement} */
const bookingForm = query("#booking-form");
/** @type {HTMLInputElement} */
const selectedPackage = query("#selected-package");
/** @type {HTMLHeadingElement} */
const dialogTitle = query("#dialog-title");
/** @type {HTMLParagraphElement} */
const dialogSummary = query("#dialog-summary");
/** @type {HTMLParagraphElement} */
const dialogMessage = query("#dialog-message");
/** @type {HTMLButtonElement} */
const bookingSubmit = query("#booking-form button[type='submit']");

const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
eventDate.min = today.toISOString().split("T")[0];
query("#year").textContent = String(new Date().getFullYear());

eventZip.addEventListener("input", () => {
  eventZip.value = eventZip.value.replace(/\D/g, "").slice(0, 5);
});

availabilityForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!availabilityForm.checkValidity()) {
    availabilityMessage.textContent = "Add a valid date, five-digit ZIP code, and event type to continue.";
    availabilityForm.reportValidity();
    return;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${eventDate.value}T00:00:00Z`));

  availabilityMessage.textContent = `Great news—we’re building options for ${formattedDate} in ${eventZip.value}. Choose a package below.`;
  query("#packages").scrollIntoView({ behavior: "smooth", block: "start" });
});

/**
 * @param {string} packageName
 * @param {string} price
 */
function openBookingDialog(packageName, price) {
  selectedPackage.value = packageName;
  dialogTitle.textContent = `${packageName} looks good on you.`;

  const eventDetails = eventDate.value
    ? ` for your ${eventType.value || "event"} on ${eventDate.value}`
    : "";

  dialogSummary.textContent = `Starting at ${price}${eventDetails}. Tell us where to send availability and a complete quote.`;
  dialogMessage.textContent = "No payment required yet.";
  bookingForm.reset();
  selectedPackage.value = packageName;
  bookingDialog.showModal();
}

/** @type {NodeListOf<HTMLButtonElement>} */
const packageButtons = document.querySelectorAll(".package-select");
packageButtons.forEach((button) => {
  button.addEventListener("click", () =>
    openBookingDialog(button.dataset.package ?? "Selected package", button.dataset.price ?? "custom pricing"),
  );
});

query(".dialog-close").addEventListener("click", () => bookingDialog.close());
bookingDialog.addEventListener("click", (event) => {
  if (event.target === bookingDialog) bookingDialog.close();
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  const formData = new FormData(bookingForm);
  const firstName = String(formData.get("name")).trim().split(" ")[0];
  dialogMessage.textContent = `Thanks, ${firstName}! This prototype is ready to connect to your booking system.`;
  bookingSubmit.disabled = true;
  setTimeout(() => {
    bookingSubmit.disabled = false;
  }, 1200);
});

const cardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate(
          [
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
        );
        cardObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal-card").forEach((card) => cardObserver.observe(card));

/** @type {NodeListOf<HTMLVideoElement>} */
const ambientVideos = document.querySelectorAll(".ambient-video");
ambientVideos.forEach((video) => {
  const shell = video.parentElement;
  if (!shell) return;
  video.addEventListener("loadeddata", () => shell.classList.add("has-video"));
  video.addEventListener("error", () => shell.classList.remove("has-video"));
});
