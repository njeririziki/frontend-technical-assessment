/**
 * Navigation class for managing section highlighting and smooth scrolling.
 *
 * Implementation improvements:
 * - No global state: all state is encapsulated in the class instance.
 * - Proper event listener and observer cleanup via `destroy()`.
 * - Uses IntersectionObserver for section visibility and highlighting.
 * - Simplified scroll behavior: remove transform accumulation that caused drift.
 * - Adds hamburger toggle logic for responsive nav.
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

    // Responsive nav elements
    /** @private {HTMLButtonElement|null} */
    this.navToggle = document.querySelector(".nav-toggle");
    /** @private {HTMLUListElement|null} */
    this.navList = document.querySelector("#nav-list");

    /** @private */
    this.linkHandlers = [];
    /** @private */
    this.scrollHandler = null;
    /** @private */
    this.navToggleHandler = null;
    /** @private */
    this.outsideClickHandler = null;
    /** @private */
    this.escapeHandler = null;
    /** @private */
    this.resizeHandler = null;

    this.init();
  }

  /**
   * Initializes observers and event listeners.
   * @private
   */
  init() {
    // IntersectionObserver for section highlighting (no transforms applied)
    this.sectionObserver = new IntersectionObserver(
      this.handleSectionIntersect.bind(this),
      { threshold: 0.5 }
    );
    this.sections.forEach((section) => this.sectionObserver.observe(section));

    // Attach click handlers for smooth scrolling
    this.links.forEach((link) => {
      const handler = this.handleLinkClick.bind(this, link);
      link.addEventListener("click", handler);
      this.linkHandlers.push({ link, handler });
    });

    // Responsive nav toggle
    if (this.navToggle && this.navList) {
      this.navToggleHandler = this.handleNavToggle.bind(this);
      this.navToggle.addEventListener("click", this.navToggleHandler);

      // Close on outside click
      this.outsideClickHandler = (e) => {
        const expanded =
          this.navToggle.getAttribute("aria-expanded") === "true";
        if (!expanded) return;
        if (
          !this.navList.contains(e.target) &&
          !this.navToggle.contains(e.target)
        ) {
          this.setNavExpanded(false);
        }
      };
      document.addEventListener("click", this.outsideClickHandler);

      // Close on Escape
      this.escapeHandler = (e) => {
        if (e.key === "Escape") this.setNavExpanded(false);
      };
      window.addEventListener("keydown", this.escapeHandler);

      // Reset state on resize ≥ 768px
      this.resizeHandler = () => {
        if (window.innerWidth >= 768) this.setNavExpanded(false, true);
      };
      window.addEventListener("resize", this.resizeHandler);
    }
  }

  /**
   * Handles section intersection changes for state.
   * @param {IntersectionObserverEntry[]} entries
   * @private
   */
  handleSectionIntersect(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.currentSection = entry.target.id;
      }
    });
  }

  /**
   * Handles anchor link clicks for smooth scrolling (no transform side-effects).
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

    // Account for sticky header using scrollMarginTop if available
    // Fallback to manual offset
    const header = document.querySelector("header");
    const headerHeight = header ? header.offsetHeight : 0;
    const targetTop =
      window.pageYOffset + target.getBoundingClientRect().top - headerHeight;

    window.scrollTo({ top: targetTop, behavior: "smooth" });

    // Close mobile nav after navigation
    this.setNavExpanded(false);

    // End scrolling flag after timeout
    window.setTimeout(() => {
      this.isScrolling = false;
    }, 500);
  }

  /**
   * Toggle handler for hamburger button
   * @private
   */
  handleNavToggle() {
    const expanded = this.navToggle.getAttribute("aria-expanded") === "true";
    this.setNavExpanded(!expanded);
  }

  /**
   * Sets nav expanded state with ARIA and class sync
   * @param {boolean} expanded
   * @param {boolean} [silent=false] if true, only reset ARIA without animation
   * @private
   */
  setNavExpanded(expanded, silent = false) {
    if (!this.navToggle || !this.navList) return;
    this.navToggle.setAttribute("aria-expanded", String(expanded));
    if (expanded) {
      this.navList.classList.add("open");
      if (silent) this.navList.style.transition = "none";
      // restore transition next frame
      requestAnimationFrame(() => {
        this.navList.style.transition = "";
      });
    } else {
      this.navList.classList.remove("open");
      this.navList.style.transition = "";
    }
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

    // Remove nav toggle related listeners
    if (this.navToggle && this.navToggleHandler) {
      this.navToggle.removeEventListener("click", this.navToggleHandler);
    }
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
    }
    if (this.escapeHandler) {
      window.removeEventListener("keydown", this.escapeHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }
  }
}
