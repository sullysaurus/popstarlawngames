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
/** @type {HTMLInputElement} */
const selectedEventDate = query("#selected-event-date");
/** @type {HTMLInputElement} */
const selectedEventZip = query("#selected-event-zip");
/** @type {HTMLInputElement} */
const selectedEventType = query("#selected-event-type");
/** @type {HTMLHeadingElement} */
const dialogTitle = query("#dialog-title");
/** @type {HTMLParagraphElement} */
const dialogSummary = query("#dialog-summary");
/** @type {HTMLParagraphElement} */
const dialogMessage = query("#dialog-message");
/** @type {HTMLButtonElement} */
const bookingSubmit = query("#booking-submit");

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
  selectedEventDate.value = eventDate.value;
  selectedEventZip.value = eventZip.value;
  selectedEventType.value = eventType.value;
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

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  const formData = new FormData(bookingForm);
  const payload = Object.fromEntries(formData.entries());
  const firstName = String(payload.name).trim().split(" ")[0];
  const endpoint = bookingForm.dataset.endpoint?.trim();
  const bookingEmail = bookingForm.dataset.email?.trim();

  bookingSubmit.disabled = true;
  bookingSubmit.textContent = "Sending…";
  dialogMessage.textContent = "Sending your request…";

  try {
    if (endpoint) {
      const isNetlifyForm = endpoint === "/";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: isNetlifyForm
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : { "Content-Type": "application/json", Accept: "application/json" },
        body: isNetlifyForm
          ? new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)])).toString()
          : JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`);

      dialogMessage.textContent = `Thanks, ${firstName}. Your request is in—we’ll follow up with availability and a complete quote.`;
      bookingSubmit.textContent = "Request sent";
      bookingForm.reset();
      return;
    }

    if (!bookingEmail) throw new Error("No booking email is configured");

    const subject = encodeURIComponent(`Lawn game inquiry: ${String(payload.package)}`);
    const body = encodeURIComponent([
      `Name: ${String(payload.name)}`,
      `Email: ${String(payload.email)}`,
      `Phone: ${String(payload.phone || "Not provided")}`,
      `Package: ${String(payload.package)}`,
      `Event date: ${String(payload.eventDate || "Not selected")}`,
      `Delivery ZIP: ${String(payload.deliveryZip || "Not provided")}`,
      `Event type: ${String(payload.eventType || "Not selected")}`,
      "",
      "Please send availability and a complete quote.",
    ].join("\n"));

    dialogMessage.textContent = `Thanks, ${firstName}. Your email app is opening with the request ready to send.`;
    bookingSubmit.textContent = "Opening email…";
    window.location.href = `mailto:${bookingEmail}?subject=${subject}&body=${body}`;
  } catch (error) {
    console.error("Booking submission failed", error);
    dialogMessage.textContent = `We couldn’t send that request. Email ${bookingEmail || "our booking team"} directly and we’ll take care of it.`;
    bookingSubmit.textContent = "Try again";
  } finally {
    bookingSubmit.disabled = false;
    if (bookingSubmit.textContent === "Opening email…") {
      setTimeout(() => { bookingSubmit.textContent = "Request this package"; }, 1200);
    }
  }
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
