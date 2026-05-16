import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  DocumentFilter,
} from "vscode-languageclient/node";

const FIRST_RUN_KEY = "kakehashi.firstRunNoticeShown";

interface KakehashiConfig {
  command: string[];
  documentSelector: unknown[];
  initializationOptions: object | null;
}

let client: LanguageClient | undefined;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kakehashi.configureDocumentSelector",
      () =>
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "kakehashi.documentSelector",
        ),
    ),
    vscode.commands.registerCommand("kakehashi.restartServer", () =>
      restartClient(context),
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("kakehashi.command") ||
        e.affectsConfiguration("kakehashi.documentSelector") ||
        e.affectsConfiguration("kakehashi.initializationOptions")
      ) {
        void restartClient(context);
      }
    }),
  );

  await startClient(context);
}

export async function deactivate(): Promise<void> {
  await stopClient();
}

async function startClient(context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();

  if (config.documentSelector.length === 0) {
    await maybeShowFirstRunNotice(context);
    return;
  }
  if (config.command.length === 0) {
    void vscode.window.showErrorMessage(
      "kakehashi.command is empty. Please configure an executable.",
    );
    return;
  }

  const selector = normalizeDocumentSelector(config.documentSelector);
  if (selector.length === 0) {
    void vscode.window.showWarningMessage(
      "kakehashi.documentSelector contained no valid entries.",
    );
    return;
  }

  const [exe, ...args] = config.command;
  const serverOptions: ServerOptions = { command: exe, args };
  const clientOptions: LanguageClientOptions = {
    documentSelector: selector,
    initializationOptions: config.initializationOptions,
  };

  client = new LanguageClient(
    "kakehashi",
    "kakehashi",
    serverOptions,
    clientOptions,
  );
  await client.start();
}

async function stopClient(): Promise<void> {
  if (!client) return;
  const c = client;
  client = undefined;
  await c.stop();
}

async function restartClient(
  context: vscode.ExtensionContext,
): Promise<void> {
  await stopClient();
  await startClient(context);
}

function getConfiguration(): KakehashiConfig {
  const cfg = vscode.workspace.getConfiguration("kakehashi");
  return {
    command: cfg.get<string[]>("command") ?? ["kakehashi"],
    documentSelector: cfg.get<unknown[]>("documentSelector") ?? [],
    initializationOptions:
      cfg.get<object | null>("initializationOptions") ?? null,
  };
}

function normalizeDocumentSelector(input: unknown[]): DocumentFilter[] {
  const out: DocumentFilter[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      out.push({ language: item });
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      const filter: {
        language?: string;
        scheme?: string;
        pattern?: string;
      } = {};
      if (typeof obj.language === "string") filter.language = obj.language;
      if (typeof obj.scheme === "string") filter.scheme = obj.scheme;
      if (typeof obj.pattern === "string") filter.pattern = obj.pattern;
      if (Object.keys(filter).length > 0) {
        out.push(filter as DocumentFilter);
        continue;
      }
    }
    console.warn("kakehashi: ignoring invalid documentSelector entry:", item);
    void vscode.window.showWarningMessage(
      `kakehashi: ignoring invalid documentSelector entry: ${JSON.stringify(item)}`,
    );
  }
  return out;
}

async function maybeShowFirstRunNotice(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (context.globalState.get<boolean>(FIRST_RUN_KEY)) return;
  await context.globalState.update(FIRST_RUN_KEY, true);
  const action = await vscode.window.showInformationMessage(
    "kakehashi is installed but no documentSelector is configured.",
    "Open Settings",
  );
  if (action === "Open Settings") {
    await vscode.commands.executeCommand(
      "kakehashi.configureDocumentSelector",
    );
  }
}
