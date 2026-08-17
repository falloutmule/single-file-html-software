/* global CustomEvent, EventTarget, structuredClone */
export class PictureHistory extends EventTarget {
  constructor(limit = 20) {
    super();
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  push(snapshot) {
    this.undoStack.push(structuredClone(snapshot));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.emit();
  }

  undo(current) {
    const prior = this.undoStack.pop();
    if (!prior) return null;
    this.redoStack.push(structuredClone(current));
    this.emit();
    return structuredClone(prior);
  }

  redo(current) {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(structuredClone(current));
    this.emit();
    return structuredClone(next);
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  emit() {
    this.dispatchEvent(new CustomEvent('change', { detail: { canUndo: this.undoStack.length > 0, canRedo: this.redoStack.length > 0 } }));
  }
}
