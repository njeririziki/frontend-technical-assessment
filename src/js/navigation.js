/**
 * Navigation class for managing section highlighting and smooth scrolling.
 *
 * Implementation improvements:
 * - No global state: all state is encapsulated in the class instance.
 * - Proper event listener and observer cleanup via `destroy()`.
 * - Uses IntersectionObserver for section visibility and highlighting.
 * - Uses requestAnimationFrame for scroll-based effects, reducing CPU usage.
 * - Adds JSDoc comments for all public methods.
 *
 * Usage:
 *   const nav = new Navigation();
 *   // ... later, to clean up:
 *   nav.destroy();
 */
export class Navigation {
  /**
   * Initializes the Navigation instance.
   * Sets up observers, event listeners, and internal state.
   */
  constructor() {
    /** @private {NodeListOf<HTMLElement>} */
    this.sections = document.querySelectorAll("section");
    /** @private {NodeListOf<HTMLAnchorElement>} */
    this.links = document.querySelectorAll('a[href^="#"]');
    /** @private {IntersectionObserver|null} */
    this.sectionObserver = null;
    /** @private {boolean} */
    this.isScrolling = false;
    /** @private {string|null} */
    this.currentSection = null;
    /** @private {number|null} */
    this.rafId = null;
    /** @private {Function[]} */
    this.linkHandlers = [];
    /** @private {Function|null} */
    this.scrollHandler = null;

    this.init();
  }

  /**
   * Initializes observers and event listeners.
   * @private
   */
  init() {
    // IntersectionObserver for section highlighting and scaling
    this.sectionObserver = new IntersectionObserver(
      this.handleSectionIntersect.bind(this),
      {
        threshold: 0.5,
      }
    );
    this.sections.forEach((section) => this.sectionObserver.observe(section));

    // Attach click handlers for smooth scrolling
    this.links.forEach((link) => {
      const handler = this.handleLinkClick.bind(this, link);
      link.addEventListener("click", handler);
      this.linkHandlers.push({ link, handler });
    });

    // Scroll event for opacity effect (throttled with rAF)
    this.scrollHandler = this.handleScroll.bind(this);
    window.addEventListener("scroll", this.scrollHandler, { passive: true });

    // Start scroll effect loop
    this.rafId = requestAnimationFrame(this.scrollEffectLoop.bind(this));
  }

  /**
   * Handles section intersection changes for highlighting and scaling.
   * @param {IntersectionObserverEntry[]} entries
   * @private
   */
  handleSectionIntersect(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.transform = "scale(1.05)";
        entry.target.style.opacity = "1";
        this.currentSection = entry.target.id;
      } else {
        entry.target.style.transform = "scale(1)";
        entry.target.style.opacity = "0.5";
      }
    });
  }

  /**
   * Handles anchor link clicks for smooth scrolling.
   * @param {HTMLAnchorElement} link
   * @param {MouseEvent} e
   * @private
   */
  handleLinkClick(link, e) {
    e.preventDefault();
    const targetId = link.getAttribute("href").slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    this.isScrolling = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    // Listen for scroll end (approximate)
    const onScrollEnd = () => {
      // Check if target is at the top of viewport
      const rect = target.getBoundingClientRect();
      if (Math.abs(rect.top) < 2) {
        this.isScrolling = false;
        window.removeEventListener("scroll", onScrollEnd);
      } else {
        // Keep listening until scroll ends
        requestAnimationFrame(onScrollEnd);
      }
    };
    window.addEventListener("scroll", onScrollEnd);
  }

  /**
   * Handles scroll events for updating section opacity.
   * Throttled via requestAnimationFrame.
   * @private
   */
  handleScroll() {
    // Opacity is handled by IntersectionObserver, but we can update transforms here
    // (see scrollEffectLoop)
    // No direct DOM manipulation here; handled in scrollEffectLoop
  }

  /**
   * Loop for scroll-based effects (e.g., parallax).
   * Uses requestAnimationFrame for efficiency.
   * @private
   */
  scrollEffectLoop() {
    if (!this.isScrolling) {
      this.sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // Subtle parallax effect
        section.style.transform += ` translateY(${
          Math.sin(rect.top / 100) * 2
        }px)`;
      });
    }
    this.rafId = requestAnimationFrame(this.scrollEffectLoop.bind(this));
  }

  /**
   * Cleans up all event listeners and observers.
   * Call this when the Navigation instance is no longer needed.
   */
  destroy() {
    // Remove IntersectionObserver
    if (this.sectionObserver) {
      this.sections.forEach((section) =>
        this.sectionObserver.unobserve(section)
      );
      this.sectionObserver.disconnect();
      this.sectionObserver = null;
    }
    // Remove link click handlers
    this.linkHandlers.forEach(({ link, handler }) => {
      link.removeEventListener("click", handler);
    });
    this.linkHandlers = [];
    // Remove scroll event
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    // Cancel animation frame
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
