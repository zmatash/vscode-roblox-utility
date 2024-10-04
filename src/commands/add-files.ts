import { writeFile } from "node:fs/promises";
import path from "node:path";
import { commands, Position, RelativePattern, Selection, Uri, window, workspace } from "vscode";

const CONFIG_SECTION = "roblox-utility";
const USE_STRICT_KEY = "useStrict";
const FILE_EXTENSION = ".luau";
const NEWLINE = "\n";
const STRICT_ANNOTATION = "--!strict";
const EMPTY_LINES_AFTER_STRICT = 2;
const EMPTY_LINES_BEFORE_RETURN = 4;
const CURSOR_LINE = 4;

function getConfig() {
	return workspace.getConfiguration(CONFIG_SECTION);
}

function getModuleContents(name: string): string {
	const config = getConfig();
	const useStrict = config.get<boolean>(USE_STRICT_KEY, true);

	let finalContents = "";
	if (useStrict) {
		finalContents += STRICT_ANNOTATION;
		finalContents += NEWLINE.repeat(EMPTY_LINES_AFTER_STRICT);
	}

	finalContents += `local ${name} = {}`;
	finalContents += NEWLINE.repeat(EMPTY_LINES_BEFORE_RETURN);
	finalContents += `return ${name}`;
	return finalContents;
}

async function createFileAsync(uri: Uri) {
	if (!uri) {
		window.showErrorMessage("Please right-click on a folder in the explorer.");
		return;
	}

	const folderPath = uri.fsPath;

	await commands.executeCommand("workbench.view.explorer");
	await commands.executeCommand("revealInExplorer", uri);
	await commands.executeCommand("explorer.newFile");
	return workspace.createFileSystemWatcher(new RelativePattern(folderPath, "*"));
}

export async function addModuleAsync(uri: Uri): Promise<void> {
	if (!uri) {
		window.showErrorMessage("Please right-click on a folder in the explorer.");
		return;
	}

	try {
		const watcher = await createFileAsync(uri);
		if (watcher === undefined) {
			window.showErrorMessage("Watcher could not be created.");
			return;
		}

		const createdUri = await new Promise<Uri>((resolve) => {
			const listener = watcher.onDidCreate((createdUri) => {
				watcher.dispose();
				listener.dispose();
				resolve(createdUri);
			});
		});

		const fileName = path.basename(createdUri.fsPath);
		const newName = path.join(path.dirname(createdUri.fsPath), `${fileName}${FILE_EXTENSION}`);

		await workspace.fs.rename(createdUri, Uri.file(newName));
		await writeFile(newName, getModuleContents(path.parse(fileName).name), { encoding: "utf8" });

		const document = await workspace.openTextDocument(newName);
		const editor = await window.showTextDocument(document);

		const position = new Position(CURSOR_LINE, 0);
		editor.selection = new Selection(position, position);
	} catch (error) {
		window.showErrorMessage(
			`Failed to create module: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
