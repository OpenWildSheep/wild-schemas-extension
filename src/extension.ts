import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile } from 'fs';
import { join } from 'path';
import { watch } from 'chokidar';

import * as vscode from 'vscode';
import assert = require('assert');

const execAsync = promisify(exec);
const readFileAsync = promisify(readFile);

async function getP4Root(): Promise<string> {
	const command = "p4 -F %clientRoot% -ztag info";
	let defaultRoot: string|undefined = vscode.workspace.getConfiguration("wildschema").get("defaultP4Root");
	if (defaultRoot === undefined) {
		defaultRoot = "X:";
	}
	try {
		let workingDir = ".";
		if (vscode.workspace.workspaceFolders !== undefined) {
			workingDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
		}
		const output = await execAsync(command, {
			cwd: workingDir
		});
		const p4Root = output.stdout.trim();
		if (p4Root === '')
		{
			console.error("Could not get P4 root");
			return defaultRoot;
		}
		return p4Root;
	} catch (err) {
		console.error(`Could not get P4 root: "${err}"`);
		return defaultRoot;
	}
}

async function getSchemaRootFolder(): Promise<string> {
	const p4Root = await getP4Root();
	let schemaRootPath: string|undefined = vscode.workspace.getConfiguration("wildschema").get("schemaRootPath");
	if (schemaRootPath === undefined) {
		schemaRootPath = join("Tools", "WildPipeline", "Schema");
	}
	return join(p4Root, schemaRootPath);
}

function replaceAllChars(text: string, chars: string, replacement: string): string {
	return text.replace(new RegExp("[" + chars.replace(/([/,!\\^${}[\]().*+?|<>\-&])/g,"\\$&") + "]", "g"), replacement.replace(/\$/g,"$$$$"));
}

export async function activate({ subscriptions }: vscode.ExtensionContext) {

	// register a content provider for the wildschema scheme
	const schemaRoot = await getSchemaRootFolder();
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
