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
    const bar = document.createElement('div');
    bar.className = 'tutorial-bar';
    this.element.append(bar);
    if (canSkip) {
      const skip = document.createElement('button');
      skip.className = 'tutorial-skip';
      skip.type = 'button';
      skip.textContent = 'Skip';
      skip.addEventListener('click', onSkip);
      bar.append(skip);
    }
    const content = document.createElement('div');
    content.className = 'tutorial-content';
    content.append(this.text, this.action);
    this.element.append(content);
    root.append(this.element);
  }
  show(text: string, button?: string): void {
    this.text.textContent = text;
    this.action.hidden = !button;
    this.action.textContent = button ?? '';
  }
  unmount(): void { this.element.remove(); }
}
