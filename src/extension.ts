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


async function getSchemaRootFolder(): Promise<string> {

	let schemaPath: string|undefined = vscode.workspace.getConfiguration("wildschema").get("schemaPath");
	if (schemaPath === undefined || schemaPath == ""){
		throw new Error("schemaPath default value needs to be set in VSCode configuration")
		return ""
	}
	return schemaPath
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
