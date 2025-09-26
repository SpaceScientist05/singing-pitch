// pitch-processor.js

// This is the entire pitchfinder library code,
// copied from the correct UMD build.
// This is the most reliable way to ensure it is available in the worklet's scope.
// You do not need a separate pitchfinder.js file.
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.PitchFinder = factory());
}(this, (function () { 'use strict';

    var yin = (function () {
        var defaults = {
            sampleRate: 44100,
            threshold: 0.1,
        };
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
    })();

    var PitchFinder = { YIN: yin };
    return PitchFinder;
})));

// Now, define your AudioWorkletProcessor class and use the PitchFinder library.
class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Instantiate the pitch finder inside the worklet processor
        this.pitchFinder = new PitchFinder.YIN({ sampleRate: 44100 });
        this.samples = new Float32Array(0);
        this.lastMessageTime = 0;
    }

    process(inputs, outputs, parameters) {
        // inputs[0] is the first input connection, [0] is the first channel
        const inputChannel = inputs[0][0];

        if (inputChannel) {
            const newSamples = new Float32Array(this.samples.length + inputChannel.length);
            newSamples.set(this.samples);
            newSamples.set(inputChannel, this.samples.length);
            this.samples = newSamples;

            // Use a larger buffer for better pitch accuracy
            const bufferSize = 4096;
            if (this.samples.length >= bufferSize) {
                const pitch = this.pitchFinder(this.samples.subarray(0, bufferSize));
                
                // Send a message back to the main thread with the pitch
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





/*
const handleSuccess = async function(stream) {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);

    await context.audioWorklet.addModule("processor.js");
    const worklet = new AudioWorkletNode(context, "worklet-processor");

    source.connect(worklet);
    worklet.connect(context.destination);
  };

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(handleSuccess);
*/


/*
// ===== Pitch Detection =====
const audioContext = new window.AudioContext();
const analyser = audioContext.createAnalyser();

navigator.getUserMedia(
  { audio: true },
  stream => {
    audioContext.createMediaStreamSource(stream).connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteTimeDomainData(dataArray);

    // Log the contents of the analyzer ever 500ms. 
    setInterval(() => {
      console.log(dataArray.length);
    }, 500);
  },
  err => console.log(err)
);

async function startMicrophoneAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const microphoneSource = audioContext.createMediaStreamSource(stream);

        // Connect the microphone to the speakers (destination)
        microphoneSource.connect(audioContext.destination);

        console.log('Microphone audio is now recording.');
    } catch (error) {
        console.error('Failed to start microphone audio:', error);
    }
}
const processor = audioContext.createScriptProcessor(1024, 1, 1);
const detectPitch = Pitchfinder.YIN({ sampleRate: audioContext.sampleRate });
const frequencies = Pitchfinder.frequencies(detectPitch, float32Array, {
    tempo: 130, // in BPM, defaults to 120
    quantization: 4, // samples per beat, defaults to 4 (i.e. 16th notes)
  });
source.connect(processor);
processor.connect(audioContext.destination)
*/
