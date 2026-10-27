/**
 * Inline AudioWorklet DSP Processor (`sonobjet-fracture-processor`).
 *
 * Implements sample-level IDM/breakcore signal transformations:
 * 1. Lockable Circular Buffer Stutter / Micro-Grain Repeater (2ms..110ms)
 * 2. Tuned Stereo Waveguide Comb Resonator (with internal tanh limiter)
 * 3. Sample-Rate Decimation + West-Coast Sine Wavefolder + DC Blocker
 */
const WORKLET_SOURCE = /* js */ `
class SonobjetFractureProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'stutterGate', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'grainMs', defaultValue: 28, minValue: 1.8, maxValue: 120, automationRate: 'k-rate' },
      { name: 'combMix', defaultValue: 0, minValue: 0, maxValue: 0.85, automationRate: 'k-rate' },
      { name: 'combFreq', defaultValue: 220, minValue: 45, maxValue: 2400, automationRate: 'k-rate' },
      { name: 'combFeedback', defaultValue: 0.72, minValue: 0, maxValue: 0.94, automationRate: 'k-rate' },
      { name: 'crush', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.maxBuf = Math.ceil(sampleRate * 0.25);
    this.ringL = new Float32Array(this.maxBuf);
    this.ringR = new Float32Array(this.maxBuf);
    this.writeIdx = 0;
    this.stutterRead = 0;
    this.wasStuttering = false;

    this.combMax = Math.ceil(sampleRate * 0.04);
    this.combL = new Float32Array(this.combMax);
    this.combR = new Float32Array(this.combMax);
    this.combIdx = 0;

    this.holdCounter = 0;
    this.heldL = 0;
    this.heldR = 0;
    this.dcInL = 0;
    this.dcOutL = 0;
    this.dcInR = 0;
    this.dcOutR = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output[1] || output[0];
    const inL = input && input[0] ? input[0] : null;
    const inR = input && input[1] ? input[1] : inL;

    const stutterGate = parameters.stutterGate[0];
    const grainMs = parameters.grainMs[0];
    const combMix = parameters.combMix[0];
    const combFreq = parameters.combFreq[0];
    const combFeedback = parameters.combFeedback[0];
    const crush = parameters.crush[0];

    const grainSamples = Math.max(48, Math.min(this.maxBuf - 4, Math.floor((grainMs * 0.001) * sampleRate)));
    const isStuttering = stutterGate > 0.5;
    if (isStuttering && !this.wasStuttering) {
      this.stutterRead = 0;
    }
    this.wasStuttering = isStuttering;

    const combDelayL = Math.max(8, Math.min(this.combMax - 2, Math.floor(sampleRate / combFreq)));
    const combDelayR = Math.max(8, Math.min(this.combMax - 2, Math.floor(sampleRate / (combFreq * 1.013))));
    const holdStep = crush > 0.02 ? 1 + Math.floor(crush * crush * 14) : 1;
    const foldGain = 1 + crush * 2.2;

    for (let i = 0; i < outL.length; i++) {
      let sL = inL ? inL[i] : 0;
      let sR = inR ? inR[i] : sL;

      if (!isStuttering) {
        this.ringL[this.writeIdx] = sL;
        this.ringR[this.writeIdx] = sR;
        this.writeIdx = (this.writeIdx + 1) % this.maxBuf;
      } else {
        const startIdx = (this.writeIdx - grainSamples + this.maxBuf) % this.maxBuf;
        const readIdx = (startIdx + this.stutterRead) % this.maxBuf;
        // Micro-window de-click at grain edges
        let env = 1.0;
        if (this.stutterRead < 24) env = this.stutterRead / 24;
        else if (this.stutterRead > grainSamples - 24) env = (grainSamples - this.stutterRead) / 24;
        sL = this.ringL[readIdx] * env;
        sR = this.ringR[readIdx] * env;
        this.stutterRead = (this.stutterRead + 1) % grainSamples;
      }

      if (combMix > 0.005) {
        const rdL = (this.combIdx - combDelayL + this.combMax) % this.combMax;
        const rdR = (this.combIdx - combDelayR + this.combMax) % this.combMax;
        const delayedL = this.combL[rdL];
        const delayedR = this.combR[rdR];
        const nextL = Math.tanh(sL + delayedL * combFeedback);
        const nextR = Math.tanh(sR + delayedR * combFeedback);
        this.combL[this.combIdx] = nextL;
        this.combR[this.combIdx] = nextR;
        this.combIdx = (this.combIdx + 1) % this.combMax;
        sL = sL * (1 - combMix * 0.45) + delayedL * combMix;
        sR = sR * (1 - combMix * 0.45) + delayedR * combMix;
      }

      if (crush > 0.01) {
        if (this.holdCounter <= 0) {
          this.heldL = Math.sin(Math.max(-1.5, Math.min(1.5, sL * foldGain)));
          this.heldR = Math.sin(Math.max(-1.5, Math.min(1.5, sR * foldGain)));
          this.holdCounter = holdStep;
        }
        this.holdCounter--;
        sL = sL * (1 - crush * 0.75) + this.heldL * (crush * 0.75);
        sR = sR * (1 - crush * 0.75) + this.heldR * (crush * 0.75);
      }

      // Subtle DC blocker
      const yL = sL - this.dcInL + 0.996 * this.dcOutL;
      this.dcInL = sL;
      this.dcOutL = yL;

      const yR = sR - this.dcInR + 0.996 * this.dcOutR;
      this.dcInR = sR;
      this.dcOutR = yR;

      outL[i] = yL;
      if (output[1]) outR[i] = yR;
    }

    return true;
  }
}

registerProcessor('sonobjet-fracture-processor', SonobjetFractureProcessor);
`;

export async function createFractureWorkletNode(
  ctx: AudioContext,
): Promise<AudioWorkletNode | null> {
  if (!ctx.audioWorklet || typeof Blob === 'undefined') {
    return null;
  }
  try {
    const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    return new AudioWorkletNode(ctx, 'sonobjet-fracture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
  } catch {
    return null;
  }
}
