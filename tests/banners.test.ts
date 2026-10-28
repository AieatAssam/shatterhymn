import { describe, expect, it } from "vitest";
import { BannerQueue } from "../src/ui/banners";
describe("contextual banners", () => {
 it("shows one tip at a time for three seconds", () => { let now=0; const q=new BannerQueue(()=>now,new Set()); q.enqueue("chord"); q.enqueue("crack"); expect(q.update()).toBe("chord"); now=2999; expect(q.update()).toBe("chord"); now=3000; expect(q.update()).toBe("crack"); now=6000; expect(q.update()).toBeNull(); });
 it("does not queue seen tips again", () => { const q=new BannerQueue(()=>0,new Set(["chord"])); q.enqueue("chord"); q.enqueue("crack"); q.enqueue("crack"); expect(q.update()).toBe("crack"); expect(q.seen.size).toBe(2); });
 it("does not queue tips when disabled", () => { const seen=new Set<string>(); const q=new BannerQueue(()=>0,seen,false); q.enqueue("chord"); expect(q.update()).toBeNull(); expect(seen.size).toBe(0); });
});
