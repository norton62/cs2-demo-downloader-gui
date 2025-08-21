// renderer.js - UI logic for the renderer process

// --- Elements ---
const shareCodeInput = document.getElementById('share-code');
const downloadFolderInput = document.getElementById('download-folder');
const selectFolderBtn = document.getElementById('select-folder-btn');
const downloadBtn = document.getElementById('download-btn');
const statusLine = document.getElementById('status-line');
const multiShareCodeInput = document.getElementById('multi-share-code');
const findDemosBtn = document.getElementById('find-demos-btn');
const resultsContainer = document.getElementById('results-container');
const downloadAllBtn = document.getElementById('download-all-btn');
const copyLinksBtn = document.getElementById('copy-links-btn');
const workerCountInput = document.getElementById('worker-count');
const steamLink = document.getElementById('steam-link');
const batchResultsArea = document.getElementById('batch-results-area');
const progressArea = document.getElementById('progress-area');
const resolvingProgress = { container: document.getElementById('resolving-progress-container'), bar: document.getElementById('resolving-progress-bar') };
const downloadingProgress = { container: document.getElementById('downloading-progress-container'), bar: document.getElementById('downloading-progress-bar') };
const decompressingProgress = { container: document.getElementById('decompressing-progress-container'), bar: document.getElementById('decompressing-progress-bar') };

let foundDemoUrls = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    const savedPath = await window.electronAPI.store.get('downloadPath');
    if (savedPath) downloadFolderInput.value = savedPath;
});

// --- Event Listeners ---
selectFolderBtn.addEventListener('click', async () => {
  const folderPath = await window.electronAPI.selectFolder();
  if (folderPath) downloadFolderInput.value = folderPath;
});

downloadBtn.addEventListener('click', () => {
  const shareCode = extractShareCode(shareCodeInput.value);
  const downloadPath = downloadFolderInput.value;
  if (!shareCode || !downloadPath) {
    addStatusMessage({ message: 'Please provide a valid share code and a download folder.', isError: true });
    return;
  }
  resetUIState();
  setUIDisabled(true);
  window.electronAPI.downloadDemo({ shareCode, downloadPath });
});

findDemosBtn.addEventListener('click', async () => {
    const codes = multiShareCodeInput.value.split('\n').map(extractShareCode).filter(Boolean);
    if (codes.length === 0 || !downloadFolderInput.value) {
        addStatusMessage({ message: 'Please provide share codes and a download folder.', isError: true });
        return;
    }
    resetUIState();
    setUIDisabled(true);
    updateProgressBar('resolving', 0, codes.length);
    
    const results = await window.electronAPI.findDemos(codes);
    foundDemoUrls = results.found.map(r => r.url);
    displayBatchResults(results);

    if (foundDemoUrls.length > 0) {
        batchResultsArea.classList.remove('hidden');
    }
    setUIDisabled(false);
});

downloadAllBtn.addEventListener('click', () => {
    const downloadPath = downloadFolderInput.value;
    const workers = parseInt(workerCountInput.value, 10) || 4;
    if (foundDemoUrls.length === 0 || !downloadPath) return;
    
    setUIDisabled(true);
    updateProgressBar('downloading', 0, foundDemoUrls.length);
    updateProgressBar('decompressing', 0, foundDemoUrls.length);
    window.electronAPI.downloadAllDemos(foundDemoUrls, downloadPath, workers);
});

copyLinksBtn.addEventListener('click', () => {
    if (foundDemoUrls.length > 0) {
        navigator.clipboard.writeText(foundDemoUrls.join('\n')).then(() => {
            addStatusMessage({ message: `Copied ${foundDemoUrls.length} links to clipboard.`, status: 'success' });
            copyLinksBtn.textContent = 'Copied!';
            setTimeout(() => { copyLinksBtn.textContent = 'Copy Links'; }, 2000);
        });
    }
});

steamLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.electronAPI.openExternalLink(steamLink.href);
});

statusLine.addEventListener('click', (event) => {
    if (event.target.classList.contains('retry-btn')) {
        const url = event.target.dataset.url;
        const downloadPath = downloadFolderInput.value;
        if (url && downloadPath) {
            event.target.textContent = 'Retrying...';
            event.target.disabled = true;
            window.electronAPI.retryDownload(url, downloadPath);
        }
    }
});

// --- IPC Listeners ---
window.electronAPI.onDownloadStatus((data) => {
  addStatusMessage(data);
  if (data.status === 'complete' || (data.status === 'error' && !data.retryUrl)) {
    setUIDisabled(false);
  }
});

window.electronAPI.onProgressUpdate(({ type, current, total }) => {
    updateProgressBar(type, current, total);
});

// --- UI Helper Functions ---
function resetUIState() {
    addStatusMessage({ message: 'Waiting for input...' });
    batchResultsArea.classList.add('hidden');
    progressArea.classList.add('hidden');
    [resolvingProgress, downloadingProgress, decompressingProgress].forEach(p => {
        p.container.classList.add('hidden');
        p.bar.style.width = '0%';
    });
}

function updateProgressBar(type, current, total) {
    const progressMap = {
        resolving: resolvingProgress,
        downloading: downloadingProgress,
        decompressing: decompressingProgress
    };
    const progress = progressMap[type];
    if (!progress) return;

    progressArea.classList.remove('hidden');
    progress.container.classList.remove('hidden');
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progress.bar.style.width = `${percentage}%`;
}

function setUIDisabled(isDisabled) {
    [downloadBtn, findDemosBtn, downloadAllBtn, copyLinksBtn, workerCountInput, selectFolderBtn, shareCodeInput, multiShareCodeInput].forEach(el => el.disabled = isDisabled);
}

function extractShareCode(rawInput) {
    if (!rawInput) return null;
    const match = rawInput.trim().match(/(CSGO-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5})/);
    return match ? match[0] : null;
}

function displayBatchResults(results) {
    resultsContainer.innerHTML = '';
    if (results.found.length === 0 && results.notFound.length === 0) {
        resultsContainer.innerHTML = '<p class="text-gray-500 p-2">No valid codes found.</p>';
        return;
    }
    results.found.forEach(item => {
        resultsContainer.innerHTML += `<div class="result-item p-2 text-sm"><span class="text-green-400">✓ Found:</span> <span class="text-gray-400">${item.code}</span></div>`;
    });
    results.notFound.forEach(code => {
        resultsContainer.innerHTML += `<div class="result-item p-2 text-sm"><span class="text-red-400">✗ Failed:</span> <span class="text-gray-400">${code}</span></div>`;
    });
    addStatusMessage({ message: `Found ${results.found.length} valid demos. ${results.notFound.length} codes failed.` });
}

function addStatusMessage({ message, isError, retryUrl, status }) {
    let colorClass = 'text-gray-400';
    if (isError) colorClass = 'text-red-400';
    else if (status === 'success' || status === 'complete') colorClass = 'text-green-400';

    let html = `<span class="${colorClass}">${message}</span>`;
    if (retryUrl) {
        html += ` <button data-url="${retryUrl}" class="retry-btn ml-2 px-2 py-0.5 text-xs bg-yellow-600 hover:bg-yellow-700 rounded">Retry</button>`;
    }
    statusLine.innerHTML = html;
}
