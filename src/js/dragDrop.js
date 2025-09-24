// This implementation has issues with event handling and touch support
/**
 * DragDrop class - Approach and Limitations
 *
 * This implementation provides basic drag-and-drop functionality for elements with the `.draggable-item` class
 * and drop zones with the `.drop-zone` class. The approach is as follows:
 *
 * 1. **Event Handling**:
 *    - For mouse and desktop browsers, standard HTML5 drag-and-drop events (`dragstart`, `dragend`, `dragover`, `dragenter`, `dragleave`, `drop`)
 *      are used to manage the drag state and move items between drop zones.
 *    - For touch and pointer devices, `pointerdown` and `pointerup` events are used to simulate drag-and-drop behavior,
 *      since native HTML5 drag events are not well supported on touch devices.
 *    - The code attempts to track the currently dragged item and its origin zone in the `state` object.
 *    - Event listeners are dynamically bound and unbound for both items and zones, and are tracked in the `bound` maps for cleanup.
 *
 * 2. **Touch Support and Limitations**:
 *    - The implementation tries to support touch devices by using pointer events, but this is only a partial solution.
 *    - There is no long-press detection or drag image for touch, and the drag operation is triggered immediately on pointer down.
 *    - The drop target is determined on `pointerup` by checking the element under the pointer, which may not always be reliable.
 *    - There is no support for multi-touch or more advanced gestures.
 *    - Some mobile browsers may not fully support pointer events or may have quirks with capturing/releasing pointers.
 *
 * 3. **Accessibility**:
 *    - Items are given `role="button"` and `tabindex="0"` for basic keyboard accessibility, but keyboard drag-and-drop is not implemented.
 *
 * 4. **Other Notes**:
 *    - The `safeAppend` method prevents self-nesting of items.
 *    - The `destroy` method ensures all event listeners are properly removed and state is reset.
 *
 * **Known Issues**:
 *    - Touch support is incomplete and may not work consistently across all devices/browsers.
 *    - There is no visual feedback for touch drag, and no support for keyboard-based drag-and-drop.
 *    - Dragging may feel unintuitive on mobile due to lack of long-press or drag image.
 *    - The implementation is best suited for simple desktop use cases.
 */
export class DragDrop {
  constructor() {
    this.state = {
      isDragging: false,
      currentItem: null,
      originZone: null,
    };
    this.items = Array.from(document.querySelectorAll(".draggable-item"));
    this.dropZones = Array.from(document.querySelectorAll(".drop-zone"));
    this.bound = { items: new Map(), zones: new Map() };
  }

  init() {
    if (!Array.isArray(this.items) || !Array.isArray(this.dropZones)) return;

    // Bind item events
    this.items.forEach((item) => {
      if (!(item instanceof Element)) return;
      item.setAttribute("draggable", "true");
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");

      const onDragStart = (e) => {
        this.state.isDragging = true;
        this.state.currentItem = item;
        this.state.originZone = item.closest(".drop-zone");
        item.classList.add("dragging");
        try {
          e.dataTransfer?.setData("text/plain", "");
        } catch (_) {}
      };
      const onDragEnd = () => {
        this.state.isDragging = false;
        this.state.currentItem = null;
        this.state.originZone = null;
        item.classList.remove("dragging");
      };

      // Pointer/touch fallback: allow long-press drag simulation
      let pointerId = null;
      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        pointerId = e.pointerId ?? null;
        item.setPointerCapture?.(pointerId);
        this.state.isDragging = true;
        this.state.currentItem = item;
        this.state.originZone = item.closest(".drop-zone");
        item.classList.add("dragging");
      };
      const onPointerUp = (e) => {
        if (!this.state.isDragging) return;
        item.releasePointerCapture?.(pointerId);
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const zone = dropTarget?.closest?.(".drop-zone");
        if (zone) this.safeAppend(zone, item);
        onDragEnd();
      };

      item.addEventListener("dragstart", onDragStart);
      item.addEventListener("dragend", onDragEnd);
      item.addEventListener("pointerdown", onPointerDown);
      item.addEventListener("pointerup", onPointerUp);

      this.bound.items.set(item, {
        onDragStart,
        onDragEnd,
        onPointerDown,
        onPointerUp,
      });
    });

    // Bind zone events
    this.dropZones.forEach((zone) => {
      if (!(zone instanceof Element)) return;
      const onDragOver = (e) => {
        e.preventDefault();
      };
      const onDragEnter = (e) => {
        e.preventDefault();
        zone.classList.add("drop-hover");
      };
      const onDragLeave = () => {
        zone.classList.remove("drop-hover");
      };
      const onDrop = (e) => {
        e.preventDefault();
        zone.classList.remove("drop-hover");
        if (this.state.currentItem)
          this.safeAppend(zone, this.state.currentItem);
      };

      zone.addEventListener("dragover", onDragOver);
      zone.addEventListener("dragenter", onDragEnter);
      zone.addEventListener("dragleave", onDragLeave);
      zone.addEventListener("drop", onDrop);

      this.bound.zones.set(zone, {
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
      });
    });
  }

  safeAppend(zone, item) {
    try {
      if (!zone || !item) return;
      if (item.contains(zone)) return; // prevent self-nesting
      zone.appendChild(item);
    } catch (_) {
      /* no-op */
    }
  }

  destroy() {
    // Unbind item events
    this.bound.items.forEach((handlers, item) => {
      item.removeEventListener("dragstart", handlers.onDragStart);
      item.removeEventListener("dragend", handlers.onDragEnd);
      item.removeEventListener("pointerdown", handlers.onPointerDown);
      item.removeEventListener("pointerup", handlers.onPointerUp);
    });
    this.bound.items.clear();

    // Unbind zone events
    this.bound.zones.forEach((handlers, zone) => {
      zone.removeEventListener("dragover", handlers.onDragOver);
      zone.removeEventListener("dragenter", handlers.onDragEnter);
      zone.removeEventListener("dragleave", handlers.onDragLeave);
      zone.removeEventListener("drop", handlers.onDrop);
      zone.classList.remove("drop-hover");
    });
    this.bound.zones.clear();

    // Reset state
    this.state = { isDragging: false, currentItem: null, originZone: null };
  }
}
