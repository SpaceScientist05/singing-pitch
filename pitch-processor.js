// pitch-processor.js

// Simple, correct YIN detector factory for use inside an AudioWorklet
const PitchFinder = {
  // Call PitchFinder.YIN({ sampleRate, threshold }) to get a detector function(audioBuffer)
  YIN: function (opts = {}) {
    const defaults = {
      sampleRate: (typeof sampleRate !== 'undefined') ? sampleRate : 44100,
      threshold: 0.10
    };
    const options = Object.assign({}, defaults, opts);

    function parabolicInterpolation(buffer, tau) {
      const x0 = (tau <= 0) ? tau : tau - 1;
      const x2 = (tau + 1 < buffer.length) ? tau + 1 : tau;
      const s0 = buffer[x0], s1 = buffer[tau], s2 = buffer[x2];
      const denom = (s0 + s2 - 2 * s1);
      if (denom === 0) return tau;
      return tau + (s0 - s2) / (2 * denom);
    }

    return function detect(audioBuffer) {
      const bufferSize = audioBuffer.length;
      if (bufferSize < 2) return null;

      const halfBuffer = Math.floor(bufferSize / 2);
      const yin = new Float32Array(halfBuffer);

      // 1) Difference function
      for (let tau = 0; tau < halfBuffer; tau++) {
        let sum = 0;
        for (let i = 0; i < bufferSize - tau; i++) {
          const diff = audioBuffer[i] - audioBuffer[i + tau];
          sum += diff * diff;
        }
        yin[tau] = sum;
      }

      // 2) Cumulative mean normalized difference function (CMNDF)
      yin[0] = 1;
      let runningSum = 0;
      for (let tau = 1; tau < halfBuffer; tau++) {
        runningSum += yin[tau];
        // avoid division by zero - runningSum should be > 0
        yin[tau] = (runningSum === 0) ? 1 : (yin[tau] * tau / runningSum);
      }

      // 3) Absolute threshold: find first dip below threshold
      let tauEstimate = -1;
      for (let tau = 1; tau < halfBuffer; tau++) {
        if (yin[tau] < options.threshold) {
          // refine to local minimum
          while (tau + 1 < halfBuffer && yin[tau + 1] < yin[tau]) tau++;
          tauEstimate = tau;
          break;
        }
      }

      if (tauEstimate === -1) return null;

      // 4) Parabolic interpolation to improve precision
      const betterTau = parabolicInterpolation(yin, tauEstimate);
      if (!betterTau || betterTau === 0) return null;

      const pitch = options.sampleRate / betterTau;
      return pitch;
    };
  }
};


class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // choose processing buffer size for detection (2048 or 4096 often used)
    this._frameSize = 2048;
    this._buffer = new Float32Array(0);

    // Create a detector instance using the worklet's sampleRate
    this._detector = PitchFinder.YIN({ sampleRate: sampleRate, threshold: 0.12 });

    // throttle messaging to the main thread (ms)
    this._throttleMs = 80;
    this._lastPost = 0;
  }

  process(inputs) {
    // inputs: array of inputs; each input is array of channels
    const input = inputs[0];
    if (!input || !input[0]) {
      // no data
      return true;
    }

    const channelData = input[0]; // Float32Array
    // append to our internal buffer
    const newBuf = new Float32Array(this._buffer.length + channelData.length);
    newBuf.set(this._buffer, 0);
    newBuf.set(channelData, this._buffer.length);
    this._buffer = newBuf;

    // while we have enough samples, analyse in chunks
    while (this._buffer.length >= this._frameSize) {
      const segment = this._buffer.subarray(0, this._frameSize);

      // run detector
      let pitch = null;
      try {
        pitch = this._detector(segment);
      } catch (e) {
        // detector error -> return no pitch for this frame
        pitch = null;
      }

      const now = Date.now();
      if (now - this._lastPost > this._throttleMs) {
        this.port.postMessage(pitch); // number or null
        this._lastPost = now;
      }

      // drop processed samples
      this._buffer = this._buffer.subarray(this._frameSize);
    }

    return true;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
