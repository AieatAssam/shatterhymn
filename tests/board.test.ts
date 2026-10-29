import { expect, it } from 'vitest';
import { Scene, Points } from 'three';
import { BOARD, SHATTER, TAP_STAGE, CRYSTAL_EDGE, FINISH, NOTE_COLORS } from '../src/render/fxConfig';
import { stageUniforms } from '../src/render/background';
import { Motes } from '../src/render/motes';

it('uses the living board values and one motes draw call', () => {
  expect(BOARD.boardSat).toBe(1); expect(BOARD.bakeScale).toBe(.5); expect(SHATTER.flashOpacity).toEqual([.12,.18,.24,.32]);
  const scene = new Scene(); const motes = new Motes(scene); expect(scene.children.filter(x => x instanceof Points)).toHaveLength(1); motes.dispose();
});
it('Tap stage palette equals POLISH P2', () => {
  expect(TAP_STAGE).toEqual({ skyTop:0x3d2c8f,skyMid:0x6c46c0,skyBottom:0xb8509e,skyMidY:.55,vignette:0x2a1f6e,vignetteAmt:.45,hubCentre:0x40307f,hubEdge:0x4e3a9c,petalLight:[0x7650dc,0x7b5ae8,0x7650dc,0x6e4cd0],petalDark:[0x6947c8,0x6d4cd6,0x6947c8,0x6446c2],lead:0xb8843a,leadAlpha:1,leadPx:2,frame:0xb8843a,frameGlow:0xc8642a,frameR:[.95,1.02],frameCorePx:3,frameGlowPx:10,frameGlowAlpha:.35,shaft:0xffc070,shaftGain:.16,twinkleAmt:.06,twinklePeriodS:4,sweepColor:0xffb050,sweepGain:.10,sweepWidthRad:.55,sweepPeriodS:12,glintGain:.5,glintPeriodS:3,frameBreath:.08,framePeriodS:2.5,breathAmt:.05,hueDriftDeg:6,hueDriftPeriodS:24,gain:1 });
});
function hsv(hex: number): { h:number; s:number; y:number } {
  const r=(hex>>16)&255, g=(hex>>8)&255, b=hex&255, max=Math.max(r,g,b), min=Math.min(r,g,b), delta=max-min;
  const h=delta===0?0:max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
  return { h:(h+360)%360, s:max===0?0:delta/max, y:.2126*r+.7152*g+.0722*b };
}
const glass = [...TAP_STAGE.petalLight,...TAP_STAGE.petalDark,TAP_STAGE.hubCentre,TAP_STAGE.hubEdge];
it('every TAP_STAGE petal and hub colour has HSV saturation ≤ .65 and Y between 50 and 145', () => {
  for (const c of glass) { const {s,y}=hsv(c); expect(s).toBeLessThanOrEqual(.65); expect(y).toBeGreaterThanOrEqual(50); expect(y).toBeLessThanOrEqual(145); }
});
it('notes 0-2 differ in hue by ≥ 90° from every petal colour', () => {
  for (const note of NOTE_COLORS.slice(0,3)) for (const c of [...TAP_STAGE.petalLight,...TAP_STAGE.petalDark]) { const d=Math.abs(hsv(note).h-hsv(c).h); expect(Math.min(d,360-d)).toBeGreaterThanOrEqual(90); }
});
it('stageUniforms disables motion when reduced and gives the normal sweep angle', () => {
  for (const t of [0,1,12,51]) { expect(stageUniforms(t,true).uStageMotion).toBe(0); expect(stageUniforms(t,false).uStageMotion).toBe(1); expect(stageUniforms(t,false).sweepAngle).toBeCloseTo(2*Math.PI*t/12); }
});
it('crystal edge config', () => {
  expect(CRYSTAL_EDGE).toEqual({facetLo:.75,facetHi:1.15,facetLight:[.15,.85],topFacet:[.6,.95],topFacetLift:.55,topFacetGain:.55,edgeSil:[.80,.97],edgeMix:.55,edgeGain:.85,specSoft:[16,.12],specSharp:[64,1.2],outline:0x1a0f2e,faceNz:[.93,.97],rim:[.94,1],rimGain:.8,bodyMaxChannel:.92,bodyMaxLum:.36,poolAlpha:.20,haloColor:0x241445,haloScale:1.30,haloAlpha:.55,shadowAlpha:.55,lightLuma:[.45,.75],lightEdgeGain:.15,lightEdgeWidth:.06,sheenAt:[-.2,.24],sheenR:.13,sheenGain:.32}); expect(FINISH.gemBodyMax).toBe(.92);
});

it('every crystal colour contrasts with the stage', () => {
  for (const color of [...NOTE_COLORS, 0xffd27a]) {
    // Under a crystal the leading is always seen through the contact halo, so test the halo-darkened lead; bright gems must also clear the raw lead.
    const mixHex=(a:number,b:number,t:number)=>{const ch=(x:number,s:number)=>(x>>s)&255;return [16,8,0].reduce((acc,s)=>acc|(Math.round(ch(a,s)*(1-t)+ch(b,s)*t)<<s),0);};
    const gem=hsv(color), lead=hsv(mixHex(TAP_STAGE.lead,CRYSTAL_EDGE.haloColor,CRYSTAL_EDGE.haloAlpha)), raw=hsv(TAP_STAGE.lead);
    const diff=(a:number,b:number)=>{const d=Math.abs(a-b);return Math.min(d,360-d);};
    const dy=Math.abs(gem.y-lead.y);
    expect(dy>=40 || (diff(gem.h,lead.h)>=60 && dy>=20)).toBe(true);
    if (gem.y>raw.y) expect(gem.y-raw.y>=40 || diff(gem.h,raw.h)>=60).toBe(true);
    for (const petal of TAP_STAGE.petalLight) {const p=hsv(petal);expect(Math.abs(gem.y-p.y)>=40 || diff(gem.h,p.h)>=60).toBe(true);}
  }
});
