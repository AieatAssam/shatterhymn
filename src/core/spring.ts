export class Spring1D {
  v = 0;
  target: number;
  constructor(public x = 0, public f = 1, public zeta = 1) { this.target = x; }
  step(dtSec: number): number {
    const omega = 2 * Math.PI * this.f;
    this.v += (-omega * omega * (this.x - this.target) - 2 * this.zeta * omega * this.v) * dtSec;
    this.x += this.v * dtSec;
    return this.x;
  }
}
export class Spring2D {
  readonly x: Spring1D;
  readonly y: Spring1D;
  constructor(x = 0, y = 0, f = 1, zeta = 1) { this.x = new Spring1D(x, f, zeta); this.y = new Spring1D(y, f, zeta); }
  step(dtSec: number): void { this.x.step(dtSec); this.y.step(dtSec); }
}
