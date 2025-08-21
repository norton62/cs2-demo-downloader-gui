// main.js - Main Electron Process

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const bz2 = require('unbzip2-stream');
const { pipeline } = require('stream');
const Store = require('electron-store');

// Initialize persistent storage
const store = new Store();

// Function to create the main application window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for electron-store
ipcMain.handle('electron-store', async (event, method, ...args) => {
    if (typeof store[method] === 'function') {
        return store[method](...args);
    }
    return store[method];
});


// IPC handler to open folder selection dialog
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled) {
    return null;
  } else {
    // Save the selected path for next time
    store.set('downloadPath', filePaths[0]);
    return filePaths[0];
  }
});

// IPC handler for the main download logic
ipcMain.on('download-demo', async (event, { shareCode, downloadPath }) => {
  const webContents = event.sender;

  // Helper to send status updates to the renderer process
  const sendStatus = (status, message, isError = false) => {
    webContents.send('download-status', { status, message, isError });
  };

  let downloadedFilePath = ''; // To keep track of the file for cleanup

  try {
    // 1. Fetch Demo URL by executing the CLI tool as a child process
    sendStatus('fetching', 'Fetching demo URL...');
    const demoUrl = await getDemoUrl(shareCode);
    if (!demoUrl) {
        throw new Error("Could not retrieve a valid demo URL. The share code might be invalid or expired.");
    }
    sendStatus('fetching', `Successfully fetched demo URL: ${demoUrl}`);
    
    // Determine filenames from URL
    const bz2Filename = path.basename(new URL(demoUrl).pathname);
    const demFilename = bz2Filename.replace('.bz2', '');
    downloadedFilePath = path.join(downloadPath, bz2Filename);
    const finalDemPath = path.join(downloadPath, demFilename);

    // 2. Download the file
    sendStatus('downloading', `Downloading ${bz2Filename}...`);
    await downloadFile(demoUrl, downloadedFilePath);
    sendStatus('downloading', `File downloaded successfully to ${downloadedFilePath}`);

    // 3. Decompress the .bz2 file
    sendStatus('extracting', `Decompressing ${bz2Filename}...`);
    await decompressFile(downloadedFilePath, finalDemPath);
    sendStatus('extracting', `Successfully decompressed demo to ${finalDemPath}`);

    // 4. Clean up the bz2 file
    fs.unlinkSync(downloadedFilePath);
    sendStatus('complete', 'Download and decompression complete!');

  } catch (error) {
    console.error('An error occurred:', error);
    sendStatus('error', error.message, true);
    // Clean up partially downloaded file on error
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
        fs.unlinkSync(downloadedFilePath);
    }
  }
});


/**
 * Executes the cs2-sharecode-cli tool to get the demo URL.
 * @param {string} shareCode - The CS2 share code.
 * @returns {Promise<string>} - A promise that resolves with the demo URL.
 */
function getDemoUrl(shareCode) {
  return new Promise((resolve, reject) => {
    // Correctly determine the path for both dev and packaged environments
    const isDev = !app.isPackaged;
    const resourcesPath = isDev ? __dirname : process.resourcesPath;
    const cliDirectory = path.join(resourcesPath, 'cs2-sharecode-cli');
    const scriptPath = path.join(cliDirectory, 'dist', 'index.js');
    
    // **FIX**: Use the bundled node.exe when packaged
    const nodeExecutable = isDev ? 'node' : path.join(resourcesPath, 'bin', 'node.exe');
    const command = `"${nodeExecutable}" "${scriptPath}" demo-url "${shareCode}"`;

    // Execute the command with the correct working directory (`cwd`)
    exec(command, { cwd: cliDirectory }, (error, stdout, stderr) => {
      if (error) {
        console.error(`CLI tool execution error: ${error.message}`);
        console.error(`CLI tool stderr: ${stderr}`);
        return reject(new Error(`Failed to execute CLI tool. Stderr: ${stderr}`));
      }
      
      const lines = stdout.trim().split('\n');
      const url = lines.find(line => line.startsWith('http'));
      
      if (url) {
        resolve(url);
      } else {
        console.error(`CLI tool did not return a valid URL. Full output: "${stdout}"`);
        reject(new Error(`CLI tool did not return a valid URL. Check console for details.`));
      }
    });
  });
}

/**
 * Downloads a file from a URL.
 * @param {string} url - The URL of the file to download.
 * @param {string} destPath - The destination path to save the file.
 * @returns {Promise<void>}
 */
async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * Decompresses a .bz2 file using streams.
 * @param {string} inputPath - Path to the .bz2 file.
 * @param {string} outputPath - Path to write the decompressed file.
 * @returns {Promise<void>}
 */
function decompressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(inputPath);
        const writeStream = fs.createWriteStream(outputPath);
        const decompressor = bz2();

        pipeline(
            readStream,
            decompressor,
            writeStream,
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}
