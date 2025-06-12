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
const docUpload = document.getElementById("doc-upload");
let uploadedDocContent = "";

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

  docUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    document.getElementById("doc-file-name").textContent = file.name;
  
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async () => {
        const pdfText = await extractPdfText(reader.result);
        uploadedDocContent = pdfText;
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.name.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const reader = new FileReader();
      reader.onload = async () => {
        const docText = await extractDocxText(reader.result);
        uploadedDocContent = docText;
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file type.");
    }
  });
  
  async function extractPdfText(arrayBuffer) {
    const pdfjsLib = window["pdfjs-dist/build/pdf"];
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";
  
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  }
  
  async function extractDocxText(arrayBuffer) {
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  
  document
    .getElementById("summarize-doc")
    .addEventListener("click", async () => {
      if (!uploadedDocContent) return alert("No file uploaded or parsed yet.");
  
      const summarized = await callGeminiSummarizer(uploadedDocContent);
  
      const { jsPDF } = window.jspdf;

      const doc = new jsPDF();
      doc.text("Ringkasan Dokumen:", 10, 10);
      doc.text(summarized, 10, 20, { maxWidth: 180 });
      doc.save("ringkasan_devo.pdf");

    });
  
  async function callGeminiSummarizer(text) {
    const apiKey = "AIzaSyCulFn7sSwSuXjFiSSNXE_EoZB8RFtxrF4";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Ringkas dokumen ini dengan poin-poin penting yang mudah dibaca:\n\n" +
                    text,
                },
              ],
            },
          ],
        }),
      }
    );
  
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No result.";
  }

// Load existing notes
renderNotes();