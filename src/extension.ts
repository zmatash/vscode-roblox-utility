import { type ExtensionContext, commands } from "vscode";
import { addModuleAsync } from "./commands/add-files";

export function activate(context: ExtensionContext) {
	const newModule = commands.registerCommand("roblox-utility.newModule", addModuleAsync);

	context.subscriptions.push(newModule);
}

export function deactivate() {}
