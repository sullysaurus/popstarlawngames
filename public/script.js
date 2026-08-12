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

query("#year").textContent = String(new Date().getFullYear());

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
