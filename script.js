function freqToNoteNumber(freq) {
  return 69 + 12 * Math.log2(freq/440);
}

function noteClass(freq) {
  const noteNumber = Math.round(freqToNoteNumber(freq));
  return (noteNumber % 12 + 12) % 12;
}

function freqToNoteName(freq) {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const noteNumber = Math.round(freqToNoteNumber(freq));
  const name = notes[(noteNumber % 12 + 12) % 12];
  const octave = Math.floor(noteNumber/12 - 1);
  return name + octave;
}

// ===== Pitch Detection =====
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(1024, 1, 1);

  const detectPitch = Pitchfinder.YIN({ sampleRate: audioContext.sampleRate });

  source.connect(processor);
  processor.connect(audioContext.destination);

  const freqElem = document.getElementById('freq');
  const noteElem = document.getElementById('note');

  processor.onaudioprocess = function(e) {
    const input = e.inputBuffer.getChannelData(0);
    const pitch = detectPitch(input);

    if (pitch) {
      freqElem.textContent = `Frequency: ${pitch.toFixed(2)} Hz`;
      noteElem.textContent = `Note: ${freqToNoteName(pitch)}`;
    }
  };
}).catch(err => console.error('Mic error:', err));
