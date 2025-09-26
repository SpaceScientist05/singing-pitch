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
