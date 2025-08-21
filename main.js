// main.js - Main Electron Process

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const bz2 = require('unbzip2-stream');
const { pipeline } = require('stream/promises');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
  mainWindow.maximize(); // Start maximized
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- IPC Handlers ---
ipcMain.on('open-external-link', (event, url) => shell.openExternal(url));
ipcMain.handle('electron-store', (event, method, ...args) => store[method](...args));
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (!canceled) store.set('downloadPath', filePaths[0]);
  return canceled ? null : filePaths[0];
});

const sendStatus = (status, message, data = {}) => mainWindow?.webContents.send('download-status', { status, message, ...data });
const sendProgress = (type, current, total) => mainWindow?.webContents.send('progress-update', { type, current, total });

ipcMain.handle('find-demos', async (event, codes) => {
    const results = { found: [], notFound: [] };
    for (let i = 0; i < codes.length; i++) {
        sendProgress('resolving', i + 1, codes.length);
        try {
            const url = await getDemoUrl(codes[i]);
            if (url) results.found.push({ code: codes[i], url });
            else results.notFound.push(codes[i]);
        } catch (error) {
            results.notFound.push(codes[i]);
        }
    }
    return results;
});

ipcMain.on('download-all-demos', async (event, { urls, path: downloadPath, workers }) => {
    const tempDir = path.join(downloadPath, 'temp_demos');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    sendStatus('batch-start', `Starting batch download of ${urls.length} demos...`);
    
    const downloadQueue = [...urls];
    const decompressQueue = [];
    let isDecompressing = false;
    let downloadedCount = 0;
    let decompressedCount = 0;

    const decompressWorker = async () => {
        if (isDecompressing || decompressQueue.length === 0) return;
        isDecompressing = true;
        
        const { tempFilePath, demFilename } = decompressQueue.shift();
        const finalDemPath = path.join(downloadPath, demFilename);
        try {
            await decompressFile(tempFilePath, finalDemPath);
            fs.unlinkSync(tempFilePath);
            decompressedCount++;
            sendProgress('decompressing', decompressedCount, urls.length);
        } catch (error) {
            sendStatus('error', `Failed to decompress ${demFilename}.`, { isError: true });
        } finally {
            isDecompressing = false;
            if (downloadedCount + (urls.length - downloadQueue.length - decompressQueue.length) === urls.length && decompressQueue.length === 0) {
                 sendStatus('complete', 'All tasks finished!');
                 if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            } else {
                decompressWorker();
            }
        }
    };

    const downloadWorker = async () => {
        while (downloadQueue.length > 0) {
            const url = downloadQueue.shift();
            if (!url) continue;

            const bz2Filename = path.basename(new URL(url).pathname);
            const tempFilePath = path.join(tempDir, bz2Filename);
            try {
                await downloadFileWithTimeout(url, tempFilePath);
                downloadedCount++;
                sendProgress('downloading', downloadedCount, urls.length);
                decompressQueue.push({ tempFilePath, demFilename: bz2Filename.replace('.bz2', '') });
                if (!isDecompressing) decompressWorker();
            } catch (error) {
                sendStatus('error', `Download failed for ${bz2Filename}.`, { isError: true, retryUrl: url });
                downloadedCount++; // Count as processed
                sendProgress('downloading', downloadedCount, urls.length);
            }
        }
    };

    const workerPromises = Array.from({ length: workers }, downloadWorker);
    await Promise.all(workerPromises);
});

ipcMain.on('retry-download', async (event, { url, path: downloadPath }) => {
    // Simplified retry - integrates into the single download flow
    sendStatus('info', `Retrying download for ${path.basename(new URL(url).pathname)}...`);
    await pipelineDownloadAndDecompress(url, downloadPath);
});

ipcMain.on('download-demo', async (event, { shareCode, downloadPath }) => {
  try {
    sendStatus('fetching', 'Fetching demo URL...');
    sendProgress('resolving', 1, 1);
    const demoUrl = await getDemoUrl(shareCode);
    if (!demoUrl) throw new Error("Could not retrieve a valid demo URL.");
    
    await pipelineDownloadAndDecompress(demoUrl, downloadPath, () => sendProgress('downloading', 1, 1), () => sendProgress('decompressing', 1, 1));
    sendStatus('complete', 'Download and decompression complete!');
  } catch (error) {
    sendStatus('error', error.message, { isError: true });
  }
});

// --- Core Logic ---
async function pipelineDownloadAndDecompress(demoUrl, downloadPath, onDownload, onDecompress) {
    const demFilename = path.basename(new URL(demoUrl).pathname).replace('.bz2', '');
    const finalDemPath = path.join(downloadPath, demFilename);
    try {
        const response = await axios({ url: demoUrl, method: 'GET', responseType: 'stream' });
        onDownload?.();
        await pipeline(response.data, bz2(), fs.createWriteStream(finalDemPath));
        onDecompress?.();
        sendStatus('success', `Successfully saved ${demFilename}`);
    } catch (error) {
        if (fs.existsSync(finalDemPath)) fs.unlinkSync(finalDemPath);
        throw error;
    }
}

async function downloadFileWithTimeout(url, destPath) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 300000 });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function decompressFile(inputPath, outputPath) {
    return pipeline(fs.createReadStream(inputPath), bz2(), fs.createWriteStream(outputPath));
}

function getDemoUrl(shareCode) {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;
    const resourcesPath = isDev ? __dirname : process.resourcesPath;
    const cliDirectory = path.join(resourcesPath, 'cs2-sharecode-cli');
    const scriptPath = path.join(cliDirectory, 'dist', 'index.js');
    const nodeExecutable = isDev ? 'node' : path.join(resourcesPath, 'bin', 'node.exe');
    const command = `"${nodeExecutable}" "${scriptPath}" demo-url "${shareCode}"`;

    exec(command, { cwd: cliDirectory }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || 'CLI execution failed'));
      const url = stdout.trim().split('\n').find(line => line.startsWith('http'));
      if (url) resolve(url);
      else reject(new Error('No valid URL found in CLI output.'));
    });
  });
}
