let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let microphoneStream = null;
let analyserNode = audioCtx.createAnalyser()
let audioData = new Float32Array(analyserNode.fftSize);;
let corrolatedSignal = new Float32Array(analyserNode.fftSize);;
let localMaxima = new Array(10);
const frequencyDisplayElement = document.querySelector('#frequency');

function startPitchDetection()
{
    navigator.mediaDevices.getUserMedia ({audio: true})
        .then((stream) =>
        {
            microphoneStream = audioCtx.createMediaStreamSource(stream);
            microphoneStream.connect(analyserNode);

            audioData = new Float32Array(analyserNode.fftSize);
            corrolatedSignal = new Float32Array(analyserNode.fftSize);

            setInterval(() => {
                analyserNode.getFloatTimeDomainData(audioData);

                let pitch = getAutocorrolatedPitch();

                frequencyDisplayElement.innerHTML = `${pitch}`;
            }, 300);
        })
        .catch((err) =>
        {
            console.log(err);
        });
}

function getAutocorrolatedPitch()
{
    // First: autocorrolate the signal

    let maximaCount = 0;

    for (let l = 0; l < analyserNode.fftSize; l++) {
        corrolatedSignal[l] = 0;
        for (let i = 0; i < analyserNode.fftSize - l; i++) {
            corrolatedSignal[l] += audioData[i] * audioData[i + l];
        }
        if (l > 1) {
            if ((corrolatedSignal[l - 2] - corrolatedSignal[l - 1]) < 0
                && (corrolatedSignal[l - 1] - corrolatedSignal[l]) > 0) {
                localMaxima[maximaCount] = (l - 1);
                maximaCount++;
                if ((maximaCount >= localMaxima.length))
                    break;
            }
        }
    }

    // Second: find the average distance in samples between maxima

    let maximaMean = localMaxima[0];

    for (let i = 1; i < maximaCount; i++)
        maximaMean += localMaxima[i] - localMaxima[i - 1];

    maximaMean /= maximaCount;

    return audioCtx.sampleRate / maximaMean;
}


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
