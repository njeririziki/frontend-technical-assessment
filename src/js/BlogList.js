/**
 * BlogList Component
 *
 * This class implements a blog listing UI with support for:
 *   - Fetching blog data from a remote API (with localStorage caching and retry logic)
 *   - Sorting (by date, reading time, or category)
 *   - Filtering (by category or tag)
 *   - Searching (by title or content)
 *   - Robust error handling and loading indicators
 *
 * Usage:
 *   const blogList = new BlogList(document.querySelector("#blog-list"));
 *   blogList.init();
 */
export class BlogList {
  /**
   * @param {HTMLElement} container - The root DOM element containing the blog list and controls.
   */
  constructor(container) {
    // Main container and sub-elements for rendering and controls
    this.container = container;
    this.listContainer = container.querySelector(".blog-list-content"); // Where blog items are rendered
    this.loadingIndicator = container.querySelector(".loading-indicator"); // Loading spinner
    this.errorContainer = container.querySelector(".error-container"); // Error message display

    // UI controls for sorting, filtering, and searching
    this.sortSelect = container.querySelector(".sort-select");
    this.filterSelect = container.querySelector(".filter-select");
    this.searchInput = container.querySelector(".search-input");

    // API endpoint for blog data
    this.apiUrl = "https://frontend-blog-lyart.vercel.app/blogsData.json";

    // Data arrays
    this.items = []; // All fetched blog items
    this.filteredItems = []; // Items after filtering/searching/sorting

    // Pagination state
    this.page = 1;
    this.perPage = 10; // Number of blogs per page

    // Bind event handler methods to this instance
    this.onSortChange = this.onSortChange.bind(this);
    this.onFilterChange = this.onFilterChange.bind(this);
    this.onSearchInput = this.onSearchInput.bind(this);
  }

  /**
   * Initialize the component: fetch data, set up event listeners, and render.
   */
  async init() {
    try {
      this.showLoading();
      await this.fetchData();
      this.setupEventListeners();
      this.render();
    } catch (err) {
      this.showError(err);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Fetch blog data from the API, with localStorage caching and retry logic.
   * - Uses a 10-minute cache TTL.
   * - Retries up to 3 times with exponential backoff on failure.
   * - On success, populates this.items and this.filteredItems.
   */
  async fetchData() {
    const cacheKey = "blogs_cache_v1";
    const cacheTtlMs = 10 * 60 * 1000; // 10 minutes

    // Try to load from cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          Array.isArray(parsed.data) &&
          Date.now() - parsed.timestamp < cacheTtlMs
        ) {
          this.items = parsed.data;
          this.filteredItems = [...parsed.data];
          return;
        }
      }
    } catch (_) {
      // Ignore cache errors and proceed to fetch from network
    }

    // Fetch from network with retry logic
    const maxAttempts = 3;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(this.apiUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch blogs");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected API response");
        this.items = data;
        this.filteredItems = [...data];
        // Save to cache (ignore storage errors)
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        } catch (_) {}
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          // Exponential backoff: 300ms, 600ms, ...
          await new Promise((r) => setTimeout(r, 300 * attempt));
        } else {
          throw lastError;
        }
      }
    }
  }

  /**
   * Set up event listeners for sorting, filtering, and searching.
   * - Sorting and filtering are handled on "change" events.
   * - Search input is debounced (250ms).
   */
  setupEventListeners() {
    this.sortSelect?.addEventListener("change", this.onSortChange);
    this.filterSelect?.addEventListener("change", this.onFilterChange);

    // Debounce search input to avoid excessive filtering
    let t;
    this.searchInput?.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => this.onSearchInput(e), 250);
    });
  }

  /**
   * Render the current page of filtered blog items into the DOM.
   * - If no items, shows a "No blogs found" message.
   */
  render() {
    const end = this.page * this.perPage;
    const slice = this.filteredItems.slice(0, end);

    // Render each blog item as an article
    this.listContainer.innerHTML = slice
      .map(
        (item) => `
                <article class="blog-item">
                    <img src="${item.image}" alt="" class="blog-image" />
                    <div class="blog-content">
                        <h3 class="blog-title">${item.title}</h3>
                        <div class="blog-meta">
                            <span class="blog-author">${item.author}</span>
                            <time class="blog-date">${new Date(
                              item.published_date
                            ).toLocaleDateString()}</time>
                            <span class="blog-reading-time">${
                              item.reading_time
                            }</span>
                        </div>
                        <p class="blog-excerpt">${item.content}</p>
                        <div class="blog-tags">${(item.tags || [])
                          .map((t) => `<span class="tag">${t}</span>`)
                          .join("")}</div>
                    </div>
                </article>
        `
      )
      .join("");

    // Show "no results" if nothing to display
    if (slice.length === 0) {
      this.listContainer.innerHTML = '<p class="no-results">No blogs found</p>';
    }
  }

  /**
   * Handle sort dropdown changes.
   * - Sorts filteredItems in-place by the selected criterion.
   * - Supported: date (newest first), reading_time (ascending), category (A-Z).
   * - Resets to first page and re-renders.
   * @param {Event} e
   */
  onSortChange(e) {
    const by = e.target?.value || "";
    const items = [...this.filteredItems];

    // Helper to parse reading time (e.g., "5 min read" -> 5)
    const parseMinutes = (val) => {
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const m = val.match(/(\d+)(?=\s*min)/i) || val.match(/\d+/);
        return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
      }
      return Number.MAX_SAFE_INTEGER;
    };

    switch (by) {
      case "date":
        // Sort by published date, newest first
        items.sort(
          (a, b) => new Date(b.published_date) - new Date(a.published_date)
        );
        break;
      case "reading_time":
        // Sort by reading time (ascending)
        items.sort(
          (a, b) => parseMinutes(a.reading_time) - parseMinutes(b.reading_time)
        );
        break;
      case "category":
        // Sort alphabetically by category
        items.sort((a, b) => {
          const ac = (a.category || "").toString().toLowerCase();
          const bc = (b.category || "").toString().toLowerCase();
          return ac.localeCompare(bc);
        });
        break;
      default:
        // No sorting (original order)
        items.sort((a, b) => 0);
    }
    this.filteredItems = items;
    this.page = 1;
    this.render();
  }

  /**
   * Handle filter dropdown changes.
   * - Filters items by category or tag (case-insensitive).
   * - If no filter selected, shows all items.
   * - Resets to first page and re-renders.
   * @param {Event} e
   */
  onFilterChange(e) {
    const val = (e.target?.value || "").toString(); // e.g., "Gadgets" | "Startups" | "Writing" | ''
    if (!val) {
      // No filter: show all items
      this.filteredItems = [...this.items];
    } else {
      const needle = val.toLowerCase();
      this.filteredItems = this.items.filter((it) => {
        const category = (it.category || "").toString().toLowerCase();
        const tags = Array.isArray(it.tags)
          ? it.tags.map((t) => t.toString().toLowerCase())
          : [];
        // Match either category or any tag
        return category === needle || tags.includes(needle);
      });
    }
    this.page = 1;
    this.render();
  }

  /**
   * Handle search input.
   * - Filters items by title or content (case-insensitive substring match).
   * - If search is cleared, re-applies current filter selection.
   * - Resets to first page and re-renders.
   * @param {Event} e
   */
  onSearchInput(e) {
    const q = (e.target?.value || "").toString().trim().toLowerCase();
    if (!q) {
      // If query cleared, respect current filter dropdown selection
      const fakeEvent = { target: this.filterSelect };
      this.onFilterChange(fakeEvent);
    } else {
      this.filteredItems = this.items.filter((it) => {
        const title = (it.title || "").toString().toLowerCase();
        const content = (it.content || "").toString().toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }
    this.page = 1;
    this.render();
  }

  /**
   * Show the loading indicator (spinner).
   */
  showLoading() {
    this.loadingIndicator?.classList.remove("hidden");
  }

  /**
   * Hide the loading indicator (spinner).
   */
  hideLoading() {
    this.loadingIndicator?.classList.add("hidden");
  }

  /**
   * Display an error message in the error container.
   * @param {Error} err
   */
  showError(err) {
    if (!this.errorContainer) return;
    this.errorContainer.classList.remove("hidden");
    this.errorContainer.textContent = `Error: ${err.message}`;
  }
}
