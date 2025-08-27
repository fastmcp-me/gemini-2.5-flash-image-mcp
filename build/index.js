#!/usr/bin/env node
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
// Canonical naming derived from mcp_name "gemini-2.5 flash mcp"
const CANONICAL_ID = 'gemini-2-5-flash-mcp';
const CANONICAL_DISPLAY = 'Gemini 2.5 Flash MCP';
const CANONICAL_CONST = 'GEMINI_2_5_FLASH_MCP';
// Env
const MCP_NAME = process.env.MCP_NAME ?? CANONICAL_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_ENDPOINT = process.env.GEMINI_IMAGE_ENDPOINT ?? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';
if (!GEMINI_API_KEY) {
    console.error(`[${CANONICAL_DISPLAY}] Missing GEMINI_API_KEY environment variable.`);
}
async function fileToBase64(pathOrRelative) {
    const full = resolve(pathOrRelative);
    const buf = await readFile(full);
    return buf.toString('base64');
}
async function toInlineDataParts(inputs) {
    if (!inputs || inputs.length === 0)
        return [];
    const parts = [];
    for (const input of inputs) {
        const mime = input.mimeType ?? 'image/png';
        let dataBase64 = input.dataBase64;
        if (!dataBase64 && input.path) {
            dataBase64 = await fileToBase64(input.path);
        }
        if (!dataBase64) {
            throw new Error('InlineImageInput requires either dataBase64 or path');
        }
        parts.push({ inline_data: { mime_type: mime, data: dataBase64 } });
    }
    return parts;
}
async function callGeminiGenerate(request) {
    const textPart = { text: request.prompt };
    const imageParts = await toInlineDataParts(request.images);
    const parts = [textPart, ...imageParts];
    const fetchResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    parts,
                },
            ],
        }),
    });
    if (!fetchResponse.ok) {
        const text = await fetchResponse.text();
        throw new Error(`Gemini API error ${fetchResponse.status}: ${text}`);
    }
    const json = (await fetchResponse.json());
    const images = [];
    const first = json.candidates?.[0]?.content?.parts ?? [];
    for (const part of first) {
        if (part.inlineData?.data) {
            images.push({ imageBase64: part.inlineData.data, mimeType: part.inlineData.mimeType ?? 'image/png' });
        }
    }
    if (images.length === 0) {
        // Fallback: if API returns interleaved text etc.
        throw new Error('No image data returned by Gemini API');
    }
    return images;
}
async function maybeSaveImage(base64, mimeType, targetPath) {
    if (!targetPath)
        return undefined;
    const { writeFile } = await import('node:fs/promises');
    const { extname } = await import('node:path');
    const extension = extname(targetPath) || (mimeType === 'image/jpeg' ? '.jpg' : '.png');
    const resolved = resolve(targetPath.endsWith(extension) ? targetPath : `${targetPath}${extension}`);
    const buffer = Buffer.from(base64, 'base64');
    await writeFile(resolved, buffer);
    return resolved;
}
const mcp = new McpServer({ name: MCP_NAME, version: '0.1.0' });
// Tool: generate_image (text-to-image)
mcp.tool('generate_image', 'Generate an image from a text prompt using Gemini 2.5 Flash Image', {
    prompt: z.string().describe('Detailed scene description. Use photographic terms for photorealism.'),
    saveToFilePath: z.string().optional().describe('Optional path to save the image (png/jpeg by extension)'),
}, async (args) => {
    const { prompt, saveToFilePath } = args;
    const results = await callGeminiGenerate({ prompt, saveToFilePath });
    const first = results[0];
    const savedPath = await maybeSaveImage(first.imageBase64, first.mimeType, saveToFilePath);
    const dataUrl = `data:${first.mimeType};base64,${first.imageBase64}`;
    return {
        content: [
            { type: 'text', text: `Generated image${savedPath ? ` saved to ${savedPath}` : ''}` },
            { type: 'image', mimeType: first.mimeType, data: first.imageBase64 },
            { type: 'text', text: dataUrl },
        ],
    };
});
// Tool: edit_image (text + image to image)
mcp.tool('edit_image', 'Edit an image using a prompt. Provide one input image via base64 or file path.', {
    prompt: z.string().describe('Describe the edit; the model matches original style and lighting.'),
    image: z
        .object({
        dataBase64: z.string().optional().describe('Base64 without data URL prefix'),
        path: z.string().optional().describe('Path to the input image file'),
        mimeType: z.string().optional().describe('image/png or image/jpeg'),
    })
        .describe('One input image'),
    saveToFilePath: z.string().optional().describe('Optional path to save the edited image'),
}, async (args) => {
    const { prompt, image, saveToFilePath } = args;
    const results = await callGeminiGenerate({ prompt, images: [image] });
    const first = results[0];
    const savedPath = await maybeSaveImage(first.imageBase64, first.mimeType, saveToFilePath);
    const dataUrl = `data:${first.mimeType};base64,${first.imageBase64}`;
    return {
        content: [
            { type: 'text', text: `Edited image${savedPath ? ` saved to ${savedPath}` : ''}` },
            { type: 'image', mimeType: first.mimeType, data: first.imageBase64 },
            { type: 'text', text: dataUrl },
        ],
    };
});
// Tool: compose_images (combine multiple images with prompt)
mcp.tool('compose_images', 'Compose a new image using multiple input images and a guiding prompt.', {
    prompt: z.string().describe('Describe how to compose the elements of the input images.'),
    images: z
        .array(z.object({
        dataBase64: z.string().optional(),
        path: z.string().optional(),
        mimeType: z.string().optional(),
    }))
        .min(2),
    saveToFilePath: z.string().optional().describe('Optional path to save the composed image'),
}, async (args) => {
    const { prompt, images, saveToFilePath } = args;
    const results = await callGeminiGenerate({ prompt, images });
    const first = results[0];
    const savedPath = await maybeSaveImage(first.imageBase64, first.mimeType, saveToFilePath);
    const dataUrl = `data:${first.mimeType};base64,${first.imageBase64}`;
    return {
        content: [
            { type: 'text', text: `Composed image${savedPath ? ` saved to ${savedPath}` : ''}` },
            { type: 'image', mimeType: first.mimeType, data: first.imageBase64 },
            { type: 'text', text: dataUrl },
        ],
    };
});
// Tool: style_transfer (apply style image to base image)
mcp.tool('style_transfer', 'Transfer style from a style image to a base image, guided by an optional prompt.', {
    prompt: z.string().optional().describe('Optional additional instruction for the style transfer.'),
    baseImage: z.object({
        dataBase64: z.string().optional(),
        path: z.string().optional(),
        mimeType: z.string().optional(),
    }),
    styleImage: z.object({
        dataBase64: z.string().optional(),
        path: z.string().optional(),
        mimeType: z.string().optional(),
    }),
    saveToFilePath: z.string().optional().describe('Optional path to save the output'),
}, async (args) => {
    const { prompt = 'Apply the style of the second image to the first image while preserving the original content', baseImage, styleImage, saveToFilePath } = args;
    const results = await callGeminiGenerate({ prompt, images: [baseImage, styleImage] });
    const first = results[0];
    const savedPath = await maybeSaveImage(first.imageBase64, first.mimeType, saveToFilePath);
    const dataUrl = `data:${first.mimeType};base64,${first.imageBase64}`;
    return {
        content: [
            { type: 'text', text: `Style transferred image${savedPath ? ` saved to ${savedPath}` : ''}` },
            { type: 'image', mimeType: first.mimeType, data: first.imageBase64 },
            { type: 'text', text: dataUrl },
        ],
    };
});
async function main() {
    const transportMode = (process.env.MCP_TRANSPORT ?? 'stdio').toLowerCase();
    if (transportMode === 'http') {
        const port = Number(process.env.MCP_HTTP_PORT ?? 7801);
        const path = process.env.MCP_HTTP_PATH ?? '/mcp';
        const enableJson = (process.env.MCP_HTTP_ENABLE_JSON ?? 'false').toLowerCase() === 'true';
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: enableJson,
        });
        await mcp.connect(transport);
        const server = http.createServer(async (req, res) => {
            try {
                if (!req.url?.startsWith(path)) {
                    res.statusCode = 404;
                    res.end('Not Found');
                    return;
                }
                let parsedBody = undefined;
                if (req.method === 'POST') {
                    const chunks = [];
                    for await (const chunk of req)
                        chunks.push(chunk);
                    const raw = Buffer.concat(chunks).toString('utf8');
                    try {
                        parsedBody = raw ? JSON.parse(raw) : undefined;
                    }
                    catch {
                        res.statusCode = 400;
                        res.end('Invalid JSON');
                        return;
                    }
                }
                await transport.handleRequest(req, res, parsedBody);
            }
            catch (err) {
                console.error(`[${CANONICAL_DISPLAY}] HTTP error:`, err);
                if (!res.headersSent) {
                    res.statusCode = 500;
                    res.end('Internal Server Error');
                }
            }
        });
        server.listen(port, () => {
            console.error(`[${CANONICAL_DISPLAY}] HTTP transport listening on http://localhost:${port}${path}`);
        });
    }
    else {
        console.error(`[${CANONICAL_DISPLAY}] Starting '${MCP_NAME}' over stdio`);
        await mcp.connect(new StdioServerTransport());
    }
}
main().catch((err) => {
    console.error(`[${CANONICAL_DISPLAY}] Fatal error:`, err);
    process.exit(1);
});
