# GitHub Repo Agent - Electron Desktop Build Guide

Transform this web application into a fully-fledged native desktop app with a beautiful frame, desktop-level performance, and support for your local file system.

## Prerequisite: Installing Electron

1. In your project directory, install `electron` and `electron-builder` as development dependencies:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Add the main entrypoint and build configuration to your `package.json`:
   ```json
   {
     "main": "electron-main.js",
     "scripts": {
       "electron:dev": "NODE_ENV=development electron .",
       "electron:build": "npm run build && electron-builder"
     },
     "build": {
       "appId": "com.github.repo.agent",
       "productName": "GitHub Repo Agent",
       "directories": {
         "output": "dist-desktop"
       },
       "files": [
         "dist/**/*",
         "electron-main.js"
       ],
       "mac": {
         "category": "public.app-category.developer-tools"
       },
       "win": {
         "target": "nsis"
       },
       "linux": {
         "target": "AppImage"
       }
     }
   }
   ```

## Development Mode

Run the web server and open the Electron container pointing to the live server:

1. Start the Vite dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run Electron in development mode:
   ```bash
   npm run electron:dev
   ```

## Packing & Compiling to Native Installer (.dmg, .exe, .AppImage)

Compile your app into stand-alone executables ready for distribution:

```bash
npm run electron:build
```

The compiled native executable will be output in the `dist-desktop` directory!
