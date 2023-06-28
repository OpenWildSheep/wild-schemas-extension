# Wild Schemas Provider

This is an extension that allows vscode to resolve `wildshema:://` urls.

## Configure

The extension needs to have access to your Schemas paths to work.

You have two manners to set it:
- Rename `config_example.json` and set `schemasPath` to your Schemas path
or
- In `package.json`:
	- Set `wildschema.rootPath.default` to the drive where are your schemas (eg: D:)
	- Set `wildschema.schemaPath.default` to the path where are your schemas, relative to the drive (eg: /schema)

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
