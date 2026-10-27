export interface Voice { oscillators: OscillatorNode[]; release(time: number): void }
export function playBell(ctx: AudioContext, dest: AudioNode, hz: number, when: number, gain: number, decayMul = 1, lowpassHz?: number): Voice {
 const ratios = [1, 2, 2.76, 5.4, 8.93], gains = [1, .45, .30, .16, .08], decays = [1.6, 1.1, .8, .45, .25];
 const output = ctx.createGain(); output.connect(dest);
 if (lowpassHz !== undefined) { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = lowpassHz; output.disconnect(); output.connect(filter); filter.connect(dest); }
 const oscillators: OscillatorNode[] = [];
 for (let i = 0; i < ratios.length; i++) { if (hz * ratios[i]! > 16000) continue; const osc = ctx.createOscillator(), envelope = ctx.createGain(); const end = when + decays[i]! * decayMul; osc.frequency.value = hz * ratios[i]!; envelope.gain.setValueAtTime(0, when); envelope.gain.linearRampToValueAtTime(gain * gains[i]!, when + .003); envelope.gain.exponentialRampToValueAtTime(.0001, end); osc.connect(envelope); envelope.connect(output); osc.start(when); osc.stop(end + .05); oscillators.push(osc); }
 return { oscillators, release(time) { output.gain.cancelScheduledValues(time); output.gain.setValueAtTime(output.gain.value, time); output.gain.linearRampToValueAtTime(0, time + .01); for (const osc of oscillators) osc.stop(time + .01); } };
}
