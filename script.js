// Get audio input
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

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
            noteElem.textContent = `Note: ${freqToNote(pitch)}`;
          }
        };

        // Utility: convert frequency to musical note
        function freqToNote(freq) {
          const A4 = 440;
          const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          let n = 12 * (Math.log(freq / A4) / Math.log(2));
          let noteIndex = Math.round(n) + 57; // 57 = A4 index
          let octave = Math.floor(noteIndex / 12);
          let noteName = noteNames[noteIndex % 12];
          return `${noteName}${octave}`;
        }
      })
      .catch(err => console.error('Mic error:', err));
