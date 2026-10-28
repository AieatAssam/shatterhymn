import {expect,it} from 'vitest';
import {shareText,shareUrl} from '../src/meta/share';
import {result} from './metaHelpers';
it('shares mode-specific text and links',()=>{const tap=result({score:18420,biggest:9,longestChain:14,timeMs:134000});tap.daily=true;expect(shareText(tap,{dailyNo:12,url:'url'})).toContain('Shatterhymn Tap · Daily #12: 18,420');expect(shareUrl('https://example.com/',tap)).toContain('?daily=1&mode=tap');const slice=result({biggest:6,longestChain:4},'slice');expect(shareText(slice,{url:'url'})).toContain('Most in one swipe: 6 · Chain: 4');expect(shareUrl('https://example.com/',slice)).toContain('&mode=slice');});
