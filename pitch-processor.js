// pitch-processor.js

// The actual pitchfinder library code, without the UMD wrapper.
var PitchFinder = {
    YIN: (function () {
        var defaults = {
            sampleRate: 44100,
            threshold: 0.1,
        };
        // The YIN method returns the detection function directly
        return function (audioBuffer, options) {
            options = Object.assign({}, defaults, options);
            var tau, t, i, j, period,
                size = audioBuffer.length,
                yinBuffer = new Float32Array(Math.floor(size / 2)),
                delta = 0,
                pitch;
            for (t = 0; t < yinBuffer.length; t++) { yinBuffer[t] = 0; }
            for (t = 1; t < yinBuffer.length; t++) {
                for (i = 0; i < size - t; i++) {
                    delta += (audioBuffer[i] - audioBuffer[i + t]) * (audioBuffer[i] - audioBuffer[i + t]);
                }
                yinBuffer[t] = delta;
                delta = 0;
            }
            yinBuffer = 1;
            t = 1;
            while (t < yinBuffer.length && yinBuffer[t] < options.threshold) { t++; }
            if (t === yinBuffer.length) { return null; }
            i = t + 1;
            while (i < yinBuffer.length && yinBuffer[i] < yinBuffer[t]) { i++; }
            tau = t + ((yinBuffer[t] - yinBuffer[i]) / (2 * (yinBuffer[t] - yinBuffer[i]) + yinBuffer[i]));
            pitch = options.sampleRate / tau;
            return pitch;
        };
    })()
};

// Now, define your AudioWorkletProcessor class and use the PitchFinder library.
class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Correctly instantiate the pitch finder by calling it as a function
        this.pitchFinder = PitchFinder.YIN({ sampleRate: 44100 });
        this.samples = new Float32Array(0);
        this.lastMessageTime = 0;
    }

    process(inputs, outputs, parameters) {
        const inputChannel = inputs[0]; // Access the first channel of the first input

        if (inputChannel) {
            const newSamples = new Float32Array(this.samples.length + inputChannel.length);
            newSamples.set(this.samples);
            newSamples.set(inputChannel, this.samples.length);
            this.samples = newSamples;

            const bufferSize = 4096;
            if (this.samples.length >= bufferSize) {
                // Call the pitchFinder function instance
                const pitch = this.pitchFinder(this.samples.subarray(0, bufferSize));
                
                const currentTime = Date.now();
                if (currentTime - this.lastMessageTime > 100) {
                    this.port.postMessage(pitch);
                    this.lastMessageTime = currentTime;
                }
                this.samples = this.samples.subarray(bufferSize);
            }
        }
        return true;
    }
}

registerProcessor('pitch-processor', PitchProcessor);
