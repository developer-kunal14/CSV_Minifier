// DOM Elements
const dropbox = document.getElementById('dropbox');
const fileInput = document.getElementById('fileInput');
const filePreviews = document.getElementById('filePreviews');
const notification = document.getElementById('notification');
const browseBtn = document.querySelector('.browse-btn');
const uploadStats = document.getElementById('uploadStats');
const fileCountEl = document.getElementById('fileCount');
const totalSizeEl = document.getElementById('totalSize');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadList = document.getElementById('downloadList');
const uploadSection = document.getElementById('uploadSection');
const goBackBtn = document.getElementById('goBackBtn');
const loadingSpinner = document.getElementById("loadingSpinner")

let fileCount = 0;
let totalSize = 0;

// Initialization
initUI();
updateDisplay();

window.addEventListener("beforeunload", (event) => {
  // Use sendBeacon to ensure the request is sent even during reload/close
  const url = "/remove-output";
  const blob = new Blob([], { type: 'application/json' });
  navigator.sendBeacon(url, blob);
});

// Event Listeners
dropbox.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropbox.classList.add('dragover');
});

dropbox.addEventListener('dragleave', () => {
  dropbox.classList.remove('dragover');
});

dropbox.addEventListener('drop', (e) => {
  e.preventDefault();
  dropbox.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

dropbox.addEventListener('click', () => fileInput.click());

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

goBackBtn.addEventListener('click', async () => {
  try {
    const response = await fetch("/remove-output", { method: "POST" });
    if (response.ok) {
      window.location.href = "/";
    }
  } catch (error) {
    showNotification("Error while removing output", "error");
    console.error("Removal failed:", error);
  }
});

// File Handling
function handleFiles(files) {
  const allowedTypes = ['text/csv'];
  const maxSize = 5000 * 1024 * 1024; // 5GB
  let validFiles = 0;
  let invalidFiles = 0;

  Array.from(files).forEach((file) => {
    if (!allowedTypes.includes(file.type)) {
      showNotification(`${file.name} is not a valid CSV file.`, 'error');
      invalidFiles++;
      return;
    }

    if (file.size > maxSize) {
      showNotification(`${file.name} exceeds the 5GB size limit.`, 'error');
      invalidFiles++;
      return;
    }

    displayFilePreview(file);
    readFileInChunks(file);
    validFiles++;
  });

  if (validFiles > 0) {
    showNotification(`${validFiles} file${validFiles > 1 ? 's' : ''} added successfully.`, 'success');
  }

  if (invalidFiles > 0) {
    showNotification(`${invalidFiles} file${invalidFiles > 1 ? 's' : ''} rejected.`, 'error');
  }
}

// Preview Display
function displayFilePreview(file) {
  const reader = new FileReader();
  const fileId = `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  reader.onload = (event) => {
    const preview = document.createElement('div');
    preview.classList.add('file-preview');
    preview.id = fileId;

    const fileSize = formatFileSize(file.size);
    const isImage = file.type.startsWith('image/');
    const previewContent = isImage
      ? `<img src="${event.target.result}" class="preview-img">`
      : `<div class="file-icon">📄</div>`;

    preview.innerHTML = `
      <div class="preview-img-container">${previewContent}</div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-size">${fileSize}</div>
        <div class="file-actions">
          <button class="remove-btn">Remove</button>
        </div>
      </div>`;

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      removeFile(fileId, file.size);
    });

    filePreviews.appendChild(preview);
    fileCount++;
    totalSize += file.size;
    updateDisplay();
  };

  reader.readAsDataURL(file);
}

// Chunk Reader & Upload Handler
function readFileInChunks(file) {
  const CHUNK_SIZE = 1024 * 1024; // 1MB
  let offset = 0;
  let leftover = '';
  const decoder = new TextDecoder('utf-8');
  const reader = new FileReader();

  function readNextChunk() {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    reader.readAsArrayBuffer(slice);
  }

  reader.onload = (e) => {
    const chunkText = decoder.decode(e.target.result, { stream: true });
    const combined = leftover + chunkText;
    const lines = combined.split(/\r?\n/);
    leftover = lines.pop(); // save last incomplete line

    offset += CHUNK_SIZE;
    const progress = Math.min(100, Math.round((offset / file.size) * 100));
    progressBar.value = progress;
    progressText.textContent = `${progress}%`;

    if (offset < file.size) {
      setTimeout(readNextChunk, 50);
    } else {
      progressBar.value = 100;
      progressText.textContent = '100% - Done';
      uploadFile(file);
    }
  };

  reader.onerror = () => {
    showNotification("Error reading file", "error");
    console.error('Reader error:', reader.error);
  };

  readNextChunk();
}

// Upload File
async function uploadFile(file) {
  loadingSpinner.style.display = "block";
  uploadSection.style.display = "none";

  try {
    const formData = new FormData();
    formData.append("input_file", file);

    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.status === "success") {
      showDownloadLinks(data.files);
    } else {
      downloadList.innerHTML = `<p style="color:red;">❌ ${data.message}</p>`;
    }

  } catch (error) {
    showNotification("Upload failed", "error");
    console.error("Upload error:", error);
  } finally {
    loadingSpinner.style.display = "none";

  }
}

// Download Display
function showDownloadLinks(files) {
  uploadSection.style.display = 'none';
  downloadList.style.display = 'block';
  goBackBtn.style.display = 'block';

  downloadList.innerHTML = `
    <div class="download_file">
      <h3>Download Output Files From Here :</h3>
    </div>
  `;

  files.forEach((file) => {
    const linkContainer = document.createElement("div");
    linkContainer.className = "download-link";

    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.textContent = "📄"; // File emoji or use `<i class="fas fa-file-alt"></i>` for Font Awesome

    const link = document.createElement("a");
    link.href = `/downloads/${file}`;
    link.download = file;
    link.className = "download-anchor";
    link.innerHTML = `${file} <span class="download-icon">
    <svg class="w-6 h-6 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13V4M7 14H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2m-1-5-4 5-4-5m9 8h.01"/>
</svg>

</span>`;

    linkContainer.appendChild(icon);
    linkContainer.appendChild(link);
    downloadList.appendChild(linkContainer);
  });
}


// Remove File
function removeFile(fileId, size) {
  const el = document.getElementById(fileId);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.9)';
    setTimeout(() => {
      el.remove();
      fileCount--;
      totalSize -= size;
      updateDisplay();
      showNotification('File removed', 'success');
    }, 300);
  }
  resetFileInput();
}

// Utilities
function updateDisplay() {
  fileCountEl.textContent = fileCount;
  totalSizeEl.textContent = formatFileSize(totalSize);
  toggleVisibility(uploadStats, fileCount > 0);
  toggleVisibility(emptyState, fileCount === 0);
}

function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function toggleVisibility(el, show) {
  el.style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'success') {
  clearTimeout(notification.timeout);
  notification.classList.remove('show', 'success', 'error');
  document.getElementById('notificationText').textContent = message;
  notification.classList.add('show', type);

  const progress = notification.querySelector('.notification-progress');
  progress.style.transition = 'none';
  progress.style.transform = 'scaleX(0)';
  void notification.offsetWidth; // trigger reflow
  progress.style.transition = 'transform 3s linear';
  progress.style.transform = 'scaleX(1)';

  notification.timeout = setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function resetFileInput() {
  fileInput.value = '';
}

function initUI() {
  uploadStats.style.display = 'none';
  emptyState.style.display = 'block';
  downloadList.style.display = 'none';
  goBackBtn.style.display = 'none';
}
