/**
 * DocumentHistory manages undo and redo operations across editing modes.
 * Complies with Spec 006 FR-011 through FR-019.
 */

export class DocumentHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private current: string;
  private lastTypingTimestamp: number = 0;
  private readonly maxDepth: number = 200;
  private readonly typingDebounceMs: number = 500;

  constructor(initialText: string = '') {
    this.current = initialText;
  }

  public reset(text: string): void {
    this.current = text;
    this.undoStack = [];
    this.redoStack = [];
    this.lastTypingTimestamp = 0;
  }

  public barrier(text: string): void {
    this.current = text;
    this.undoStack = [];
    this.redoStack = [];
    this.lastTypingTimestamp = 0;
  }

  public recordChange(newText: string, isTyping = false): void {
    if (newText === this.current) return;

    const now = Date.now();

    if (isTyping && now - this.lastTypingTimestamp < this.typingDebounceMs && this.undoStack.length > 0) {
      // Group rapid typing strokes into the same undo step
      this.current = newText;
      this.lastTypingTimestamp = now;
      this.redoStack = [];
      return;
    }

    // Save previous state to undo stack
    this.undoStack.push(this.current);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.current = newText;
    this.lastTypingTimestamp = now;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(): string | null {
    if (!this.canUndo()) return null;

    const previous = this.undoStack.pop()!;
    this.redoStack.push(this.current);
    this.current = previous;
    this.lastTypingTimestamp = 0;
    return previous;
  }

  public redo(): string | null {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop()!;
    this.undoStack.push(this.current);
    this.current = next;
    this.lastTypingTimestamp = 0;
    return next;
  }

  public getCurrent(): string {
    return this.current;
  }
}
