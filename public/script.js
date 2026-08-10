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
/** @type {HTMLSelectElement} */
const eventPackage = query("#event-package");
/** @type {HTMLButtonElement} */
const bookingSubmit = query("#booking-submit");

const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
query("#year").textContent = String(new Date().getFullYear());

eventDate.addEventListener("input", () => {
  const digits = eventDate.value.replace(/\D/g, "").slice(0, 8);
  eventDate.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("/");
  eventDate.setCustomValidity("");
});

function validateEventDate() {
  const match = eventDate.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    eventDate.setCustomValidity("Enter the date as MM/DD/YYYY.");
    return;
  }

  const [, month, day, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const isRealDate = parsed.getFullYear() === Number(year)
    && parsed.getMonth() === Number(month) - 1
    && parsed.getDate() === Number(day);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  eventDate.setCustomValidity(
    !isRealDate || parsed < startOfToday ? "Enter a valid future event date." : "",
  );
}

eventDate.addEventListener("blur", validateEventDate);

eventZip.addEventListener("input", () => {
  eventZip.value = eventZip.value.replace(/\D/g, "").slice(0, 5);
});

const customInquiry = /** @type {HTMLDetailsElement} */ (query("#custom-inquiry"));

if (window.location.hash === "#custom-inquiry") {
  customInquiry.open = true;
}

document.querySelectorAll('a[href="#custom-inquiry"]').forEach((link) => {
  link.addEventListener("click", () => {
    customInquiry.open = true;
    if (link instanceof HTMLElement && link.dataset.inquiryPackage) {
      eventPackage.value = link.dataset.inquiryPackage;
    }
  });
});

availabilityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  validateEventDate();
  if (!availabilityForm.checkValidity()) {
    availabilityMessage.textContent = "Complete the required fields so we can check your date.";
    availabilityForm.reportValidity();
    return;
  }

  const formData = new FormData(availabilityForm);
  const payload = Object.fromEntries(formData.entries());
  const firstName = String(payload.name).trim().split(" ")[0];
  const endpoint = availabilityForm.dataset.endpoint?.trim();
  const bookingEmail = availabilityForm.dataset.email?.trim();

  bookingSubmit.disabled = true;
  bookingSubmit.textContent = "Sending…";
  availabilityMessage.textContent = "Sending your request…";

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

      availabilityMessage.textContent = `Thanks, ${firstName}. Your request is in—we’ll follow up with availability and a complete quote.`;
      bookingSubmit.textContent = "Request sent";
      const analytics = /** @type {{ gtag?: (...args: unknown[]) => void }} */ (window);
      if (typeof analytics.gtag === "function") {
        analytics.gtag("event", "generate_lead", {
          form_name: "booking-inquiry",
          package_name: String(payload.package),
        });
      }
      availabilityForm.reset();
      return;
    }

    if (!bookingEmail) throw new Error("No booking email is configured");

    const subject = encodeURIComponent(`Lawn game inquiry: ${String(payload.package)}`);
    const body = encodeURIComponent([
      `Name: ${String(payload.name)}`,
      `Email: ${String(payload.email)}`,
      `Package: ${String(payload.package)}`,
      `Event date: ${String(payload.eventDate || "Not selected")}`,
      `Delivery ZIP: ${String(payload.deliveryZip || "Not provided")}`,
      `Event type: ${String(payload.eventType || "Not selected")}`,
      `Event notes: ${String(payload.message || "Not provided")}`,
      "",
      "Please send availability and a complete quote.",
    ].join("\n"));

    availabilityMessage.textContent = `Thanks, ${firstName}. Your email app is opening with the request ready to send.`;
    bookingSubmit.textContent = "Opening email…";
    window.location.href = `mailto:${bookingEmail}?subject=${subject}&body=${body}`;
  } catch (error) {
    console.error("Booking submission failed", error);
    availabilityMessage.textContent = `We couldn’t send that request. Email ${bookingEmail || "our booking team"} directly and we’ll take care of it.`;
    bookingSubmit.textContent = "Try again";
  } finally {
    bookingSubmit.disabled = false;
    if (bookingSubmit.textContent === "Opening email…") {
      setTimeout(() => { bookingSubmit.textContent = "Request availability"; }, 1200);
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
