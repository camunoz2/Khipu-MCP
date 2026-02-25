#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDocTools } from "./docs.js";
import { registerApiTools } from "./api.js";

async function main() {
  const server = new McpServer({
    name: "khipu-mcp",
    version: "1.0.0",
  });

  // Documentation tools are always available
  registerDocTools(server);

  // API tools are only available when KHIPU_API_KEY is set
  if (process.env.KHIPU_API_KEY) {
    registerApiTools(server);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting khipu-mcp:", err);
  process.exit(1);
});
