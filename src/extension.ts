import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  DocumentFilter,
} from "vscode-languageclient/node";

const FIRST_RUN_KEY = "kakehashi.firstRunNoticeShown";

type DocumentSelectorPattern = {
  language?: string;
  scheme?: string;
  pattern?: string;
};

type DocumentSelectorEntry = string | DocumentSelectorPattern;

interface KakehashiConfig {
  command: string[];
  documentSelector: DocumentSelectorEntry[];
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

  try {
    await startClient(context);
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Failed to start kakehashi: ${formatError(error)}`,
    );
  }
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
  const rawSelector = cfg.get<unknown[]>("documentSelector") ?? [];
  const documentSelector: DocumentSelectorEntry[] = [];
  for (const item of rawSelector) {
    if (isDocumentSelectorEntry(item)) {
      documentSelector.push(item);
    } else {
      warnInvalidSelectorEntry(item);
    }
  }
  return {
    command: cfg.get<string[]>("command") ?? ["kakehashi"],
    documentSelector,
    initializationOptions:
      cfg.get<object | null>("initializationOptions") ?? null,
  };
}

function isDocumentSelectorEntry(v: unknown): v is DocumentSelectorEntry {
  if (typeof v === "string") return true;
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  let anyPresent = false;
  for (const key of ["language", "scheme", "pattern"] as const) {
    const val = obj[key];
    if (val === undefined) continue;
    if (typeof val !== "string") return false;
    anyPresent = true;
  }
  return anyPresent;
}

function warnInvalidSelectorEntry(item: unknown): void {
  console.warn("kakehashi: ignoring invalid documentSelector entry:", item);
  void vscode.window.showWarningMessage(
    `kakehashi: ignoring invalid documentSelector entry: ${JSON.stringify(item)}`,
  );
}

function normalizeDocumentSelector(
  entries: DocumentSelectorEntry[],
): DocumentFilter[] {
  return entries.map((entry) =>
    typeof entry === "string"
      ? ({ language: entry } as DocumentFilter)
      : (entry as DocumentFilter),
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
