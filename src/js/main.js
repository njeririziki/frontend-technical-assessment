import { DragDrop } from "./dragDrop.js";
import { BlogList } from "./BlogList.js";
import { Navigation } from "./navigation.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Navigation
  new Navigation();

  //Initialize Drag & Drop
  const dragDropContainer = document.querySelector(".drag-drop-container");
  if (dragDropContainer) {
    const dragDrop = new DragDrop();
    dragDrop.init();
  }

  // Initialize Blog List (partial)
  const blogListContainer = document.querySelector(".blog-list-container");
  if (blogListContainer) {
    const blogList = new BlogList(blogListContainer);
    blogList.init();
  }
});
