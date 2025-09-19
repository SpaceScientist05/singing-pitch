    const canvas = document.getElementById('pitchCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let dataPoints = [];
    let referenceMelody = [];
    let currentSongId = null;

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

    function drawGraph() {
      ctx.clearRect(0,0,width,height);

      // Draw reference melody (red line)
      if (referenceMelody.length>0) {
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        for (let i=0; i<referenceMelody.length; i++) {
          const y = height - (Math.log2(referenceMelody[i].freq/55)/Math.log2(2))*30;
          if (i===0) ctx.moveTo(i,y);
          else ctx.lineTo(i,y);
        }
        ctx.stroke();
      }

      // Draw user pitch (green/yellow/red)
      ctx.beginPath();
      for (let i=0; i<dataPoints.length; i++) {
        const dp = dataPoints[i];
        const ref = referenceMelody[i] ? referenceMelody[i].freq : dp.freq;
        const y = height - (Math.log2(dp.freq/55)/Math.log2(2))*30;

        const diff = Math.abs(noteClass(dp.freq) - noteClass(ref));
        if (diff === 0) ctx.strokeStyle = 'green';
        else if (diff <= 1) ctx.strokeStyle = 'yellow';
        else ctx.strokeStyle = 'red';

        if (i===0) ctx.moveTo(i,y);
        else ctx.lineTo(i,y);
      }
      ctx.stroke();
    }

    // ===== Pitch Detection =====
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
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
          noteElem.textContent = `Note: ${freqToNoteName(pitch)}`;

          dataPoints.push({freq:pitch});
          if (dataPoints.length>width) dataPoints.shift();

          drawGraph();
        }
      };
    }).catch(err => console.error('Mic error:', err));

    // ===== Backend Integration =====
    const songSelect = document.getElementById('songSelect');
    const backendURL = 'http://127.0.0.1:5000'; // adjust if deployed

    async function loadSongs() {
      const res = await fetch(`${backendURL}/api/songs`);
      const songs = await res.json();
      songs.forEach(song => {
        const opt = document.createElement('option');
        opt.value = song.id;
        opt.textContent = song.name;
        songSelect.appendChild(opt);
      });
    }

    songSelect.addEventListener('change', async () => {
      currentSongId = songSelect.value;
      if (!currentSongId) return;
      try {
        const res = await fetch(`${backendURL}/api/songs/${currentSongId}/reference`);
        if (!res.ok) {
          referenceMelody = [];
          console.log('No reference JSON found');
          return;
        }
        const json = await res.json();
        if (Array.isArray(json)) {
          referenceMelody = json.map((f,i)=>({
            x:i, freq: f.freq || f
          }));
        }
      } catch (err) {
        console.error('Failed to load reference JSON', err);
        referenceMelody = [];
      }
    });

    loadSongs();

    // ===== Upload Section =====
    const uploadForm = document.getElementById('uploadForm');
    const uploadResult = document.getElementById('uploadResult');

    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(uploadForm);

      try {
        const res = await fetch(`${backendURL}/api/songs`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        uploadResult.textContent = JSON.stringify(data, null, 2);

        songSelect.innerHTML = '<option value="">-- Select --</option>';
        loadSongs();
      } catch (err) {
        uploadResult.textContent = 'Upload failed: ' + err.message;
      }
    });
