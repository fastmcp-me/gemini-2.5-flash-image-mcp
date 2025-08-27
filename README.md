# Gemini 2.5 Flash MCP

Provider-agnostic MCP server that talks to Google Gemini 2.5 Flash Image Preview for text-to-image and image editing via the Gemini API. Ships with tools for generation, editing, composition, and style transfer.

## Features
- Text-to-Image with high-fidelity text rendering
- Text+Image editing (in-context edits)
- Multi-image composition and style transfer
- Outputs image data and a data URL; optionally saves to a file
- Name consistency policy for zero-drift across clients

## Requirements
- Node.js >= 18
- A Gemini API key available as `GEMINI_API_KEY`

## Installation & Run
```bash
npm install
npm run build
# Run via npx (from the project root)
npx .
```

To run from source directly after build:
```bash
node ./build/index.js
```

Environment variables:
- `MCP_NAME` (default: `gemini-2-5-flash-mcp`)
- `GEMINI_API_KEY` (required)
- `GEMINI_IMAGE_ENDPOINT` (optional, default Gemini image preview endpoint)

## Client Examples
This project does not ship client configuration files. Configure your client UI with the binary name `gemini-2-5-flash-mcp` or with `npx`.

Example (conceptual):
```json
{
  "mcpServers": {
    "gemini-2-5-flash-mcp": {
      "command": "npx",
      "args": ["gemini-2-5-flash-mcp"]
    }
  }
}
```

## Build
```bash
npm run build
```

## Publish
```bash
npm pack --dry-run
npm publish
```

## Tools
The server registers four tools:

1) `generate_image`
- Input: `{ prompt: string, saveToFilePath?: string }`
- Output: image content (binary base64) + a data URL + status text

2) `edit_image`
- Input: `{ prompt: string, image: { dataBase64?: string, path?: string, mimeType?: string }, saveToFilePath?: string }`
- Output: edited image

3) `compose_images`
- Input: `{ prompt: string, images: InlineImageInput[], saveToFilePath?: string }`
- Output: composed image

4) `style_transfer`
- Input: `{ prompt?: string, baseImage: InlineImageInput, styleImage: InlineImageInput, saveToFilePath?: string }`
- Output: style-transferred image

## References
- MCP SDK: https://modelcontextprotocol.io/docs/sdks
- Architecture: https://modelcontextprotocol.io/docs/learn/architecture
- Server concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- Server spec (2025-06-18): https://modelcontextprotocol.io/specification/2025-06-18/server/index
- Gemini image generation docs: https://ai.google.dev/gemini-api/docs/image-generation

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

## Verification
```bash
node -v              # >=18
npm install
npm run build
npx .                # run server over stdio
npm pack --dry-run   # inspect publish artifacts
```
