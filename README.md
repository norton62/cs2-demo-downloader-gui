# CS2 Demo Downloader

![CS2 Demo Downloader Interface](https://github.com/user-attachments/assets/d8947e2b-a1e9-42b1-9d5f-4369ffa42a2e)

A user-friendly desktop application for Windows that simplifies the process of downloading and decompressing Counter-Strike 2 match demos directly from share codes.

## Features

* **Simple Interface:** A clean, modern, and intuitive user interface designed for ease of use.
* **Flexible Input:** Accepts both direct match share codes (e.g., `CSGO-...`) and full Steam run links.
* **Single & Batch Downloads:** Download demos one by one or paste a list of share codes to process them in a batch.
* **Concurrent Downloads:** Utilizes a multi-threaded worker system to download multiple demos simultaneously, significantly speeding up batch processing.
* **Efficient Processing:** Downloads and decompresses files in a streamlined pipeline to save time and disk space.
* **Progress Tracking:** Visual progress bars provide real-time feedback on resolving, downloading, and decompressing demos.
* **Persistent Settings:** Remembers your selected download folder, so you only need to set it once.
* **Error Handling:** Includes a 5-minute timeout on downloads and a "Retry" button for any failed attempts.

## Installation

1.  Go to the [Releases](https://github.com/norton62/cs2-demo-downloader-gui/releases) page of this repository.
2.  Download the latest `.exe` installer (e.g., `CS2-Demo-Downloader-Setup-vX.X.X.exe`).
3.  Run the installer.

**Note:** When you run the installer for the first time, Windows SmartScreen may show a warning because this is a new application. This is expected. To proceed, simply click **"More info"** and then **"Run anyway"**.

## How to Use

### Single Download

1.  Launch the application.
2.  Select your desired download folder.
3.  Paste a share code or Steam link into the "Single Download" input box.
4.  Click **"Download Demo"**.

### Batch Download

1.  Select your desired download folder.
2.  Paste multiple share codes (one per line) into the "Batch Download" text area.
3.  Adjust the number of concurrent workers if desired.
4.  Click **"Find Demos"**.
5.  Once the valid demos are found, you can either copy the direct download links or click **"Download All"** to begin processing the entire batch.

## For Developers

This application is built with [Electron](https://www.electronjs.org/).

### To run in development mode:

1.  Clone the repository:
    ```bash
    git clone [https://github.com/norton62/cs2-demo-downloader-gui.git](https://github.com/norton62/cs2-demo-downloader-gui.git)
    ```
2.  Navigate to the project directory:
    ```bash
    cd your-repo-name
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the application:
    ```bash
    npm start
    ```

### To build the installer:

```bash
npm run dist
```

The installer will be located in the `dist` folder.

## Credits

* **Created by:** Norton
* **CLI Tool:** This application is a graphical wrapper for the [cs2-sharecode-cli](https://github.com/SoulxSlayer/cs2-sharecode-cli) tool by SoulxSlayer.

## License

This project is licensed under the MIT License.
