# FamFilmFav Desktop App

A cross-platform Electron app for managing family film favorites with system tray integration, desktop UI, settings window, and web access.

## Features

- **System Tray Integration**: Minimize to tray with quick access menu
- **Desktop UI**: Full-featured Electron window for native desktop experience
- **Settings Window**: Dedicated settings dialog accessible from the tray
- **Web Server**: Built-in Express server for remote web access at `http://localhost:3000`
- **Cross-platform**: Works on Windows, macOS, and Linux

## Project Structure

```
desktop/
├── src/
│   ├── main.js           # Main process & tray management
│   ├── preload.js        # Security bridge for IPC
│   ├── app.html          # Desktop app UI
│   ├── settings.html     # Settings window UI
│   └── server.js         # Express web server setup
├── public/
│   └── index.html        # Web server UI
├── assets/
│   └── icon.png          # Tray icon (placeholder)
├── package.json
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a placeholder icon (or replace `assets/icon.png` with your own 256x256 PNG icon)

## Running the App

**Development:**
```bash
npm start
```

**With debugging:**
```bash
npm run dev
```

This will start:
- Electron main process
- Desktop app UI
- Web server at http://localhost:3000

## Building

```bash
npm run build
```

This creates installers for Windows, macOS, and Linux.

## Usage

### System Tray Menu
Right-click the tray icon (or double-click on macOS) to access:
- **Open App**: Launch the desktop UI window
- **Settings**: Open the settings dialog
- **Open in Browser**: Visit the web version
- **Quit**: Close the app

### Web Access
The app's web UI is automatically available at `http://localhost:3000` when the app is running.

## Architecture

### Main Process (`main.js`)
- Manages application lifecycle
- Creates and manages windows
- Handles system tray integration
- Runs the Express web server
- Handles IPC messages from renderers

### Preload Script (`preload.js`)
- Provides secure IPC bridge
- Exposes safe APIs to renderer processes
- Uses context isolation for security

### Desktop UI (`app.html`)
- Electron window with full native capabilities
- Access to IPC APIs via `window.electron`
- Settings button to open settings dialog

### Settings Window (`settings.html`)
- Separate window for app configuration
- Isolated settings management
- IPC communication with main process

### Web Server (`server.js` + `public/index.html`)
- Express server listening on localhost:3000
- Serves the same UI accessible from any browser
- RESTful API endpoints (`/api/health`, `/api/version`)
- SPA fallback for routing

## Development Tips

1. **Debug the main process**: Use `npm run dev` and attach Node debugger to port 9222
2. **Debug renderer processes**: Uncomment `webContents.openDevTools()` in `main.js`
3. **Hot reload**: Modify files and restart the app (no auto-reload yet)
4. **Web testing**: Visit http://localhost:3000 in any browser while app is running

## Next Steps

- Add persistent settings storage (JSON file or database)
- Implement actual film data management
- Add data sync between desktop and web versions
- Create proper app icon
- Add more sophisticated UI using a framework like React or Vue
- Implement user authentication for web access
