import { Loop } from "../core/loop";
import { Input } from "../input/input";
import { GameRenderer } from "../render/renderer";
import { Sim } from "../sim/sim";

export class Controller {
  private sim = this.newSim(); private readonly input: Input; private readonly renderer: GameRenderer; private readonly loop: Loop; private restartMs = 0;
  constructor(canvas: HTMLCanvasElement, surface: HTMLElement) {
    this.input = new Input(surface, { onFirstGesture: () => {}, iosSwitch: false });
    this.renderer = new GameRenderer(canvas, () => this.sim.state);
    this.loop = new Loop({ now: () => performance.now(), tick: () => this.tick(), frame: (real, sim) => this.frame(real, sim) });
    this.loop.start();
  }
  private newSim(): Sim { return new Sim({seed: (Math.random()*0x100000000) >>> 0, mode: "run", slowDial: false}); }
  private tick(): void { if (this.sim.state.over) { this.input.consume(); return; } for (const event of this.sim.step(this.input.consume())) { this.renderer.event(event); if (event.type === "gameOver") this.restartMs=1000; } }
  private frame(real: number, sim: number): void { this.renderer.frame(real, sim); if (this.sim.state.over) { this.restartMs-=real; if (this.restartMs<=0) { this.input.cancelHold(); this.sim=this.newSim(); this.renderer.reset(); } } }
}
