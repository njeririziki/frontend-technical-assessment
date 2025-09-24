## Implementation Summary

### Completed Features

- Sticky navigation header that remains at the top while scrolling.
- Smooth scrolling to sections when navigation tabs are clicked.
- Dynamic highlighting of navigation tabs based on the section in view using IntersectionObserver.
- Mobile responsive navigation header with hamburger menu.
- Keyboard accessibility and ARIA attributes for navigation (keyboard navigation, screen reader support, focus management).
- Drag and Drop component under the main section:
  - CSS styling improved to closely match the provided screenshots.
  - Drag and drop functionality for items (Item 1, Item 2, Item 3) into designated drop zones.
  - Efficient, non-blocking drag animations without external libraries.
- Blog List component:
  - Fetches and displays 10 blogs from the external API (`https://frontend-blog-lyart.vercel.app/blogsData.json`).
  - Dropdown filter for sorting blogs by Date, Reading Time, and Category.
  - Second dropdown filter for filtering by Writing, Gadgets, and Startups.
  - Keyword search functionality for blog titles.
  - Responsive and visually matches the provided design references.
- All code uses ES2015+ features and includes JSDoc comments for methods.
- Error handling for API fetch and UI interactions.

### Technical Challenges

- Ensuring drag-and-drop animations remained smooth and did not freeze.
- Handling edge cases for keyboard accessibility and ARIA roles in the navigation.
- Ensuring accuracy when smooth scrollinh.

### AI Usage

- Used GitHub Copilot and ChatGPT for code suggestions, JSDoc comment generation, and troubleshooting specific JavaScript and CSS issues.
