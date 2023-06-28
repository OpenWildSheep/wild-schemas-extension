# Wild Schemas Provider

This is an extension that allows vscode to resolve `wildshema:://` urls.

## Configure

The extension needs to have access to your Schemas paths to work.  
You need to set it into Preferences > Settings > Extensions > Wild Schemas > schemaPath.

## Running the extension in debug

- From `Debug: JavaScript Debug Terminal` from Command Palette (Ctrl + Shift + P)
	- Launch `npm install` command
	- Launch `npm run compile` command

- From `Run and Debug`:
  - Select `Client + Server`
  - Click on `Start debugging` (or F5)
	- Run the extension in a new VS Code window
