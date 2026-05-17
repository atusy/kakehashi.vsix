# kakehashi for VSCode

VSCode client for the [kakehashi](https://github.com/atusy/kakehashi) language server.

This extension does **not** attach to any document by default. Configure
`kakehashi.documentSelector` to tell the extension which documents to attach to.

## Minimal configuration

```json
{
  "kakehashi.command": ["kakehashi"],
  "kakehashi.documentSelector": [
    "markdown",
    { "scheme": "file", "language": "rust" }
  ],
  "kakehashi.env": null,
  "kakehashi.initializationOptions": null
}
```

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `kakehashi.command` | `string[]` | `["kakehashi"]` | Argv used to spawn the server. First element is the executable; the rest are arguments. |
| `kakehashi.documentSelector` | `(string \| object)[]` | `[]` | Documents to attach to. Each entry is either a language id string or a `{ language?, scheme?, pattern? }` object. Empty disables the client. |
| `kakehashi.env` | `Record<string, string> \| null` | `null` | Environment variables merged onto the extension process environment when spawning the server. |
| `kakehashi.initializationOptions` | `object \| null` | `null` | Passed verbatim as LSP `initializationOptions`. |

Changing any of these settings restarts the language client automatically.

## Commands

- `kakehashi: Configure Document Selector` — opens settings filtered to `kakehashi.documentSelector`.
- `kakehashi: Restart Server` — stops and restarts the language client.

## Requirements

- VSCode `>= 1.82.0`
- The `kakehashi` binary on `PATH` (or set `kakehashi.command` to an absolute path)

## License

MIT
