## このMCPについて

このMCPサーバーは、Google Gemini 2.5 Flash Image Preview API を使って、テキストからの画像生成や、画像+テキストでの編集・合成・スタイル転写を提供します。

# Gemini 2.5 Flash MCP

A Model Context Protocol (MCP) server for conversational image generation and editing with Google's Gemini 2.5 Flash Image Preview. Designed to be easy to install and use from Claude Code and other MCP clients.

## Key Features

- **Text-to-Image**: Generate images from detailed prompts
- **Image Editing**: Edit images with natural language instructions
- **Multi-Image Composition / Style Transfer**: Combine images or transfer styles
- **File Save Option**: Return base64 image and optionally save to file
- **Provider-Agnostic MCP**: Works in any MCP-enabled client

## Requirements

- Node.js 18 or newer
- An MCP client (Claude Code, Cursor, VS Code, Windsurf, etc.)
- Google Gemini API Key: set `GEMINI_API_KEY`

## Getting Started

First, install the MCP server with your client. The following examples center on Claude Code usage.

**Standard config** works in most tools:

```json
{
  "mcpServers": {
    "gemini-2-5-flash-mcp": {
      "command": "npx",
      "args": ["gemini-2-5-flash-mcp@latest"]
    }
  }
}
```

### Quick usage (Claude Code 推奨)

```bash
# npx（非対話フラグ付き）
claude mcp add gemini-2-5-flash-mcp -s user -- npx -y gemini-2-5-flash-mcp@latest

# グローバルインストール
npm i -g gemini-2-5-flash-mcp \
  && claude mcp add gemini-2-5-flash-mcp -s user -- gemini-2-5-flash-mcp
```

### Streamable HTTP mode（実験的）

STDIO の代わりに Streamable HTTP を使うこともできます。MCP クライアントが Streamable HTTP に対応している場合のみ利用してください。

1) サーバーを HTTP モードで起動

```bash
export MCP_TRANSPORT=http
export GEMINI_API_KEY=YOUR_API_KEY
# 任意（既定: 7801, /mcp, SSE）
export MCP_HTTP_PORT=7801
export MCP_HTTP_PATH=/mcp
export MCP_HTTP_ENABLE_JSON=false

npm run build
node ./build/index.js
# => HTTP transport listening on http://localhost:7801/mcp
```

2) クライアント側設定（例: Streamable HTTP対応クライアント）

- Type: HTTP (Streamable)
- URL: `http://localhost:7801/mcp`

注:
- SSE ストリーミングが既定。JSONレスポンスで使いたい場合は `MCP_HTTP_ENABLE_JSON=true`。
- セッションはサーバー側で生成（stateful）。完全 stateless にしたい場合はコード側で `sessionIdGenerator: undefined` に変更可能です。

<details>
<summary><b>Claude Code (Recommended)</b></summary>

Use the Claude Code CLI to add the MCP server:

```bash
claude mcp add gemini-2-5-flash-mcp -s user -- npx gemini-2-5-flash-mcp@latest
```

Remove if needed:
```bash
claude mcp remove gemini-2-5-flash-mcp
```
</details>

<details>
<summary>Claude Desktop</summary>

Follow the MCP install guide and use the standard config above.

- Guide: https://modelcontextprotocol.io/quickstart/user
</details>

<details>
<summary>Cursor</summary>

Go to `Cursor Settings` → `MCP` → `Add new MCP Server`.

Use the following:
- Name: gemini-2-5-flash-mcp
- Type: command
- Command: npx
- Args: gemini-2-5-flash-mcp@latest
- Auto start: on (optional)
</details>

<details>
<summary>VS Code</summary>

Add via CLI:

```bash
code --add-mcp '{"name":"gemini-2-5-flash-mcp","command":"npx","args":["gemini-2-5-flash-mcp@latest"]}'
```

Or use the standard config in settings.
</details>

<details>
<summary>LM Studio</summary>

Add MCP Server with:
- Command: npx
- Args: ["gemini-2-5-flash-mcp@latest"]
</details>

<details>
<summary>Goose</summary>

Advanced settings → Extensions → Add custom extension:
- Type: STDIO
- Command: npx
- Args: gemini-2-5-flash-mcp@latest
- Enabled: true
</details>

<details>
<summary>opencode</summary>

Example `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gemini-2-5-flash-mcp": {
      "type": "local",
      "command": [
        "npx",
        "gemini-2-5-flash-mcp@latest"
      ],
      "enabled": true
    }
  }
}
```
</details>

<details>
<summary>Qodo Gen</summary>

Open Qodo Gen → Connect more tools → + Add new MCP → Paste the standard config above → Save.
</details>

<details>
<summary>Windsurf</summary>

Follow Windsurf MCP documentation and use the standard config above.
- Docs: https://docs.windsurf.com/windsurf/cascade/mcp
</details>

## Environment Variables

- `GEMINI_API_KEY` (required)
- `GEMINI_IMAGE_ENDPOINT` (optional) default:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent`
- `MCP_NAME` (optional, default: `gemini-2-5-flash-mcp`)

## Available Tools

### 1. generate_image
Generate an image from a text prompt.

Parameters:
- `prompt` (required): Detailed description to generate
- `saveToFilePath` (optional): Path to save the image

Example input:
```json
{
  "prompt": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",
  "saveToFilePath": "./gemini-native-image.png"
}
```

### 2. edit_image
Edit an image using a prompt.

Parameters:
- `prompt` (required): Edit instruction
- `image` (required): `{ dataBase64?: string, path?: string, mimeType?: string }`
- `saveToFilePath` (optional)

Example input:
```json
{
  "prompt": "Add a small, knitted wizard hat to the cat",
  "image": { "path": "./cat.jpeg", "mimeType": "image/jpeg" },
  "saveToFilePath": "./gemini-edited-image.png"
}
```

### 3. compose_images
Combine elements from multiple images.

Parameters:
- `prompt` (required)
- `images` (required): Array of image inputs (2-3 recommended)
- `saveToFilePath` (optional)

### 4. style_transfer
Transfer the style of one image to another.

Parameters:
- `prompt` (optional)
- `baseImage` (required)
- `styleImage` (required)
- `saveToFilePath` (optional)

## Development

Run locally:

```bash
npm install
npm run build
npx .
```

## Name Consistency & Troubleshooting

- Always use CANONICAL_ID (`gemini-2-5-flash-mcp`) for identifiers and keys.
- Use CANONICAL_DISPLAY (`Gemini 2.5 Flash MCP`) only for UI labels.
- Do not mix different names across clients.

Consistency Matrix:
- npm package name → `gemini-2-5-flash-mcp`
- Binary name → `gemini-2-5-flash-mcp`
- MCP server name (SDK metadata) → `gemini-2-5-flash-mcp`
- Env default MCP_NAME → `gemini-2-5-flash-mcp`
- Client registry key → `gemini-2-5-flash-mcp`
- UI label → `Gemini 2.5 Flash MCP`

Conflict Cleanup:
- Remove any old entries like "GeminiFlash" and re-add with `gemini-2-5-flash-mcp`.
- Ensure global registries only use `gemini-2-5-flash-mcp` for keys.
- Cursor: configure in the UI only. This project does not include `.cursor/mcp.json`.

## References

- MCP SDK: https://modelcontextprotocol.io/docs/sdks
- Architecture: https://modelcontextprotocol.io/docs/learn/architecture
- Server concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- Server spec (2025-06-18): https://modelcontextprotocol.io/specification/2025-06-18/server/index
- Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation

