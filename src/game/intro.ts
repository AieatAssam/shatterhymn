export class IntroTimeline {
 elapsed = 0; struckAt: number | null = null;
 constructor(readonly hold = false) {}
 touch(): boolean { if (this.struckAt !== null) return false; this.struckAt = Math.max(300, this.elapsed); return true; }
 advance(dt: number): { auto: boolean; title: boolean } {
  this.elapsed = Math.min(this.hold ? 1200 : Infinity, this.elapsed + dt);
  let auto = false; if (this.struckAt === null && this.elapsed >= 3500) {this.struckAt=3500;auto=true;}
  return {auto,title:this.struckAt !== null && this.elapsed >= Math.max(2500,this.struckAt+1300)};
 }
}
