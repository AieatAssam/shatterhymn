export class TutorialOverlay {
  private readonly element: HTMLElement;
  private readonly text: HTMLElement;
  private readonly action: HTMLButtonElement;
  constructor(root: HTMLElement, canSkip: boolean, onSkip: () => void, onAction: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'tutorial-overlay';
    this.text = document.createElement('p');
    this.text.className = 'tutorial-text';
    this.text.setAttribute('aria-live', 'polite');
    this.action = document.createElement('button');
    this.action.className = 'tutorial-action';
    this.action.type = 'button';
    this.action.addEventListener('click', onAction);
    this.element.append(this.text, this.action);
    if (canSkip) {
      const skip = document.createElement('button');
      skip.className = 'tutorial-skip';
      skip.type = 'button';
      skip.textContent = 'Skip';
      skip.addEventListener('click', onSkip);
      this.element.append(skip);
    }
    root.append(this.element);
  }
  show(text: string, button?: string): void {
    this.text.textContent = text;
    this.action.hidden = !button;
    this.action.textContent = button ?? '';
  }
  unmount(): void { this.element.remove(); }
}
