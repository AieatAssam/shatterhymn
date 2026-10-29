import { expect, it } from 'vitest';
import { bestLabel } from '../src/ui/hudModel';
it('bestLabel hides 0 and formats 12400 as "BEST 12,400"',()=>{expect(bestLabel(0)).toBeNull();expect(bestLabel(12400)).toBe('BEST 12,400');});
