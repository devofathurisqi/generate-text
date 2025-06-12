const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const saveBtn = document.getElementById('save-btn');
const transcriptArea = document.getElementById('transcript');
const notesContainer = document.getElementById('notes-container');
const videoInput = document.getElementById('video-upload');
const videoPlayer = document.getElementById('video-player');
const transcribeBtn = document.getElementById('transcribe-video');

let recognition;
let currentTranscript = '';
let notes = JSON.parse(localStorage.getItem('speechNotes')) || [];

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'id-ID'; // Ganti ke 'en-US' kalau mau bahasa Inggris

  recognition.onresult = function(event) {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        currentTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    transcriptArea.value = currentTranscript + interim;
  };

  recognition.onerror = function(event) {
    alert('Error: ' + event.error);
  };

  recognition.onend = function() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };
} else {
  alert('Speech Recognition not supported in this browser.');
}

// Button Events
startBtn.onclick = () => {
  currentTranscript = '';
  transcriptArea.value = '';
  recognition.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  recognition.stop();
};

saveBtn.onclick = () => {
  const text = transcriptArea.value.trim();
  if (text) {
    notes.unshift(text);
    localStorage.setItem('speechNotes', JSON.stringify(notes));
    renderNotes();
    transcriptArea.value = '';
    currentTranscript = '';
  }
};

function renderNotes() {
  notesContainer.innerHTML = '';
  notes.forEach((note, index) => {
    const noteEl = document.createElement('div');
    noteEl.className = 'note';
    noteEl.innerHTML = `
      <button onclick="deleteNote(${index})">Hapus</button>
      ${note}
    `;
    notesContainer.appendChild(noteEl);
  });
}

window.deleteNote = function(index) {
  notes.splice(index, 1);
  localStorage.setItem('speechNotes', JSON.stringify(notes));
  renderNotes();
};

// Load video file
videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      videoPlayer.src = url;
    }
  });
  
  // Transcribe from video (experimental)
  transcribeBtn.addEventListener('click', () => {
    if (!videoPlayer.src) return alert('Please upload a video first!');
    
    if (!('captureStream' in videoPlayer)) {
      return alert('Browser tidak mendukung captureStream(). Coba Chrome terbaru.');
    }
  
    const stream = videoPlayer.captureStream();
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return alert('Video tidak punya audio.');
  
    // Gunakan Web Speech API saat video diputar
    recognition.lang = 'id-ID';
    recognition.start();
    videoPlayer.play();
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
  });

  document.getElementById("export-pdf").addEventListener("click", async () => {
    const notes = document.querySelectorAll('.note');
    if (notes.length === 0) {
      alert('No notes to export!');
      return;
    }
  
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
  
    let y = 20;
    doc.setFontSize(14);
    doc.text("📝 Your Saved Notes", 10, 10);
  
    notes.forEach((note, index) => {
      const text = note.innerText.replace("Delete", "").trim();
      const lines = doc.splitTextToSize(`${index + 1}. ${text}`, 180);
      doc.text(lines, 10, y);
      y += lines.length * 10 + 5;
  
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  
    doc.save("notes.pdf");
  });

  document.getElementById('video-upload').addEventListener('change', function () {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-name').textContent = fileName;
  });

// Load existing notes
renderNotes();