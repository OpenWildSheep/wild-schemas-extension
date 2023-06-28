import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { watch } from 'chokidar';

import * as vscode from 'vscode';
import assert = require('assert');

const execAsync = promisify(exec);
const readFileAsync = promisify(readFile);

function replaceAllChars(text: string, chars: string, replacement: string): string {
	return text.replace(new RegExp("[" + chars.replace(/([/,!\\^${}[\]().*+?|<>\-&])/g,"\\$&") + "]", "g"), replacement.replace(/\$/g,"$$$$"));
}

function getSchemaPathFromConfig(): string|undefined {
	if (existsSync(join(__dirname, "..", "config.json"))){
		console.log("Config file exists");
		const jsonConfigAsync = readFileSync(join(__dirname, "..", "config.json"), "utf-8");
		const configAsync = JSON.parse(jsonConfigAsync);
		return configAsync["schemasPath"]
	}
	return undefined
}

function getSchemaPathFromWorkspace(): string {
	let rootPath: string|undefined = vscode.workspace.getConfiguration("wildschema").get("rootPath");
	if (rootPath === undefined || rootPath == ""){
		throw new Error("rootPath default value needs to be set in workspace configuration (package.json)")
		return ""
	}

	let schemaPath: string|undefined = vscode.workspace.getConfiguration("wildschema").get("schemaPath");
	if (schemaPath === undefined || schemaPath == ""){
		throw new Error("schemaPath default value needs to be set in workspace configuration (package.json)")
		return ""
	}

	return join(rootPath, schemaPath)
}

async function getSchemaRootFolder(): Promise<string> {

	const schemaPath = getSchemaPathFromConfig()
	if (schemaPath != undefined) {
		return schemaPath
	}
	else {
		console.log("No config file found, get schema path from workspace.wildschema configuration");
		return getSchemaPathFromWorkspace()
	}
}

export async function activate({ subscriptions }: vscode.ExtensionContext) {

	// register a content provider for the wildschema scheme
	const schemaRoot = await getSchemaRootFolder();

	if (schemaRoot === "") {
		return
	}

	const wildScheme = 'wildschema';

	const escapedChars: string|undefined = vscode.workspace.getConfiguration("wildschema").get("escapeCharInSchemaName");
	
	const wildProvider = new class implements vscode.TextDocumentContentProvider {
		// emitter and its event to notify when file changed
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
			console.log(`resolving '${uri.toString()}'...`);
			
			let path = uri.path;
			if (escapedChars !== undefined && escapedChars !== "") {
				path = replaceAllChars(path, escapedChars, "_");
			}
			const schemaPath = join(schemaRoot, path);
			const schema = await readFileAsync(schemaPath);
			console.log(`loaded file '${schemaPath}'`);
			
			if (uri.fragment !== '')
			{
				// patch schema to make the root an internal ref to the subschema pointed by fragment
				const schemaJson = JSON.parse(schema.toString());
				schemaJson["$ref"] = "#" + uri.fragment;
				return JSON.stringify(schemaJson);
			}
			return schema.toString();
		}
	};

	// start a file watcher to update schemas when they change
	const watcher = watch(schemaRoot, { persistent: true });
	watcher.on('change', (path) => { 
		const schemaPath = path.replace(schemaRoot, '').replace('\\', '/');
		const uri = vscode.Uri.parse(`wildschema:${schemaPath}`);
		wildProvider.onDidChangeEmitter.fire(uri);
	});

	subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(wildScheme, wildProvider));
}
