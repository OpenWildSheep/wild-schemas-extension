# Wild Schemas Provider

This is an extension that allows vscode to resolve `wildshema:://` urls.

## Configure

The extension needs to have access to your Schemas paths to work.  
You need to set it into Preferences > Settings > Extensions > Wild Schemas > schemaPath.

## Running the extension in debug

- In VSCode's terminal, from the `wild-schemas-extension` repository's folder:
  - Run `npm install` in terminal to install dependencies

- In the `JavaScript Debug Terminal` (ctrl + shift + p > `Debug: JavaScript Debug Terminal`)
	- Launch `npm run compile`
		- Build all the needed files into `/out` folder
		- Create a file watcher

- From `Run and Debug`:
  - Select `Client + Server`
  - Click on `Start debugging` (or F5)
	- Run the extension in a new VS Code window
