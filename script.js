// Use an import statement to bring in the library
import * as PitchFinder from 'pitchfinder';

// This is the main part of your application.
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const startButton = document.getElementById('startButton');
const pitchDisplay = document.getElementById('pitchDisplay');
const statusMessage = document.querySelector('.status');

let micSource;
let scriptNode;
let pitchFinderInstance;

startButton.addEventListener('click', async () => {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    try {
        // Get microphone access from the user
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create a source node from the microphone stream
        micSource = audioContext.createMediaStreamSource(stream);

        // Create a ScriptProcessorNode to process the audio
        const bufferSize = 8192; // Number of samples to process at a time
        scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
        micSource.connect(scriptNode);

        // Connect the processor node to the audio context (required)
        scriptNode.connect(audioContext.destination);


        // Initialize the pitch finder
        const pitchFinderInstance = new PitchFinder.YIN({ sampleRate: audioContext.sampleRate });

        // Define what happens when the processor node gets new audio data
        scriptNode.onaudioprocess = (audioEvent) => {
            // Get the audio data from the first channel
            const inputBuffer = audioEvent.inputBuffer.getChannelData(0);

            // Find the pitch in the audio data
            const pitch = pitchFinderInstance(inputBuffer);

            // Display the pitch if one was found
            if (pitch) {
                pitchDisplay.textContent = `${pitch.toFixed(2)} Hz`;
            } else {
                pitchDisplay.textContent = 'No pitch detected';
            }
        };

        // Update the UI
        statusMessage.textContent = 'Listening...';
        startButton.disabled = true;

    } catch (err) {
        console.error('Error accessing the microphone:', err);
        statusMessage.textContent = 'Error: could not access microphone. Check your browser permissions.';
    }
});




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
