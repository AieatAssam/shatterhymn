import { describe, expect, it } from 'vitest';
import { sliceCutText, slicePopY, sliceSwipeScale, swipeCallout } from '../src/ui/popText';
import { SLICE_FX } from '../src/render/fxConfig';

describe('Slice pop models',()=>{
 it('uses the specified swipe words and sub line',()=>{expect([2,3,4,5,6,9].map(n=>swipeCallout(n,80)?.main??null)).toEqual([null,'Nice!','Great!','Amazing!','Incredible!','Incredible!']);expect(swipeCallout(4,80)?.sub).toBe('4 in one swipe! +80');});
 it.each([[390,844],[320,568],[844,390]])('keeps callout bounds between HUD and bell at %i by %i',(width,height)=>{const top=Math.max(64,.09*height)+10,bottom=height*(1-(SLICE_FX.bellY+.10))-12;for(const labelHeight of [22,80,112]){expect(slicePopY(-100,width,height,10,labelHeight)).toBe(top);expect(slicePopY(9999,width,height,10,labelHeight)+labelHeight).toBeCloseTo(bottom);}});
 it('formats the cut score',()=>{expect(sliceCutText(30)).toBe('+30');});
 it('springs from 1.4 to rest over 180 ms',()=>{expect(sliceSwipeScale(0)).toBe(1.4);expect(sliceSwipeScale(90)).toBeLessThan(1);expect(sliceSwipeScale(180)).toBe(1);});
});
