const startBtn = document.getElementById('start');
const freqElem = document.getElementById('freq');
const noteElem = document.getElementById('note');
const canvas = document.getElementById('pitchCanvas');
const ctx = canvas.getContext('2d');

let audioContext;
let processor;
let detectPitch;
let reference = []; // reference melody

// Graph parameters
const dataPoints = []; // store user pitch
const maxPoints = canvas.width;

// Load reference melody
fetch('reference.json')
  .then(res => res.json())
  .then(data => { reference = data; });

startBtn.addEventListener('click', init);

function init() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      detectPitch = Pitchfinder.YIN({ sampleRate: audioContext.sampleRate });

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = processAudio;
    });
}

function processAudio(e) {
  const input = e.inputBuffer.getChannelData(0);
  const pitch = detectPitch(input);

  if (pitch) {
    freqElem.textContent = `Frequency: ${pitch.toFixed(2)} Hz`;
    noteElem.textContent = `Note: ${freqToNote(pitch)}`;
    addPitchToGraph(pitch);
  } else {
    addPitchToGraph(null);
  }

  drawGraph();
}

function addPitchToGraph(pitch) {
  dataPoints.push(pitch);
  if (dataPoints.length > maxPoints) dataPoints.shift();
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw reference melody (red line)
  ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1.5;
  dataPoints.forEach((_, i) => {
    const time = i / canvas.width * (reference.length > 0 ? reference[reference.length - 1].time : 1);
    const refFreq = findRefPitchAtTime(time);
    if (refFreq) {
      const y = freqToY(refFreq);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
  });
  ctx.stroke();

  // Draw user pitch with octave-insensitive color coding
  dataPoints.forEach((p, i) => {
    if (!p) return;
    const time = i / canvas.width * (reference.length > 0 ? reference[reference.length - 1].time : 1);
    const refFreq = findRefPitchAtTime(time);
    if (!refFreq) return;

    const y = freqToY(p);

    // Octave-insensitive comparison
    const userNote = noteClass(p);
    const refNote = noteClass(refFreq);

    let semitoneDiff = Math.abs(userNote - refNote);
    if (semitoneDiff > 6) semitoneDiff = 12 - semitoneDiff; // wrap around

    let color;
    if (semitoneDiff === 0) color = 'green';
    else if (semitoneDiff <= 1) color = 'yellow';
    else color = 'red';

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (i === 0 || !dataPoints[i - 1]) ctx.moveTo(i, y);
    else ctx.moveTo(i - 1, freqToY(dataPoints[i - 1]));
    ctx.lineTo(i, y);
    ctx.stroke();
  });
}

// Map frequency to canvas Y coordinate (log scale)
function freqToY(freq) {
  const minFreq = 50;
  const maxFreq = 1000;
  const logMin = Math.log(minFreq);
  const logMax = Math.log(maxFreq);
  const logF = Math.log(freq);
  return canvas.height - ((logF - logMin) / (logMax - logMin)) * canvas.height;
}

// Find closest reference pitch for a given time
function findRefPitchAtTime(time) {
  if (!reference.length) return null;
  let closest = reference[0];
  let minDiff = Math.abs(time - closest.time);
  for (let point of reference) {
    const diff = Math.abs(time - point.time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }
  return closest.freq ? closest.freq : null;
}

// Convert frequency to musical note
function freqToNote(freq) {
  const A4 = 440;
  const semitones = 12 * (Math.log(freq / A4) / Math.log(2));
  const noteIndex = Math.round(semitones) + 69;
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteName = noteNames[noteIndex % 12];
  const octave = Math.floor(noteIndex / 12) - 1;
  return `${noteName}${octave}`;
}

// Octave-insensitive note class (0-11)
function noteClass(freq) {
  const A4 = 440;
  const semitones = Math.round(12 * Math.log2(freq / A4));
  return ((semitones % 12) + 12) % 12;
}
