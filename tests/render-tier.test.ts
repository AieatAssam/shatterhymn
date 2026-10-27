import { describe, expect, it } from "vitest";
import { EffectComposer, EffectPass } from "postprocessing";
import { PerspectiveCamera } from "three";
import { setPostTier } from "../src/render/renderer";

describe("post-processing tier routing", () => {
  it("routes the last enabled pass to the screen on Low and after restoring High", () => {
    const composer = new EffectComposer();
    const camera = new PerspectiveCamera();
    const main = new EffectPass(camera);
    const post = new EffectPass(camera);
    composer.passes.push(main, post);
    setPostTier(main, post, "low");
    expect(post.enabled).toBe(false);
    expect(composer.passes.filter(pass => pass.enabled).at(-1)?.renderToScreen).toBe(true);
    setPostTier(main, post, "high");
    expect(composer.passes.filter(pass => pass.enabled).at(-1)).toBe(post);
    expect(post.renderToScreen).toBe(true);
    expect(main.renderToScreen).toBe(false);
    composer.dispose();
  });
});
