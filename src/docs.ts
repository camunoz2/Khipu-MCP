import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "path";

// Load OpenAPI spec — resolveJsonModule allows this import
// eslint-disable-next-line @typescript-eslint/no-var-requires
const spec = require(path.join(__dirname, "../openapi.json")) as Record<string, unknown>;

type PathItem = Record<string, {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses?: unknown;
}>;

type Paths = Record<string, PathItem>;
type Schemas = Record<string, unknown>;

function resolveRef(ref: string, rootSpec: Record<string, unknown>): unknown {
  const parts = ref.replace(/^#\//, "").split("/");
  let current: unknown = rootSpec;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function resolveRefs(obj: unknown, rootSpec: Record<string, unknown>): unknown {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => resolveRefs(item, rootSpec));

  const record = obj as Record<string, unknown>;
  if ("$ref" in record && typeof record["$ref"] === "string") {
    const resolved = resolveRef(record["$ref"], rootSpec);
    return resolveRefs(resolved, rootSpec);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = resolveRefs(value, rootSpec);
  }
  return result;
}

export function registerDocTools(server: McpServer): void {
  // ── khipu_get_overview ──────────────────────────────────────────────────────
  server.tool(
    "khipu_get_overview",
    "Get an overview of the Khipu API: description, base URL, authentication method, and list of available endpoints",
    {},
    async () => {
      const info = spec.info as Record<string, unknown>;
      const servers = spec.servers as Array<{ url: string; description?: string }>;
      const paths = spec.paths as Paths;
      const securitySchemes = (spec.components as Record<string, unknown>)?.securitySchemes as Record<string, unknown> | undefined;

      const endpoints = Object.entries(paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => ({
          method: method.toUpperCase(),
          path,
          operationId: op.operationId,
          summary: op.summary,
        }))
      );

      const overview = {
        title: info.title,
        version: info.version,
        description: info.description,
        baseUrl: servers?.[0]?.url,
        authentication: {
          type: "API Key",
          header: "x-api-key",
          description: "Pass your Khipu API key in the x-api-key request header",
          schemes: securitySchemes,
        },
        endpoints,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      };
    }
  );

  // ── khipu_list_endpoints ────────────────────────────────────────────────────
  server.tool(
    "khipu_list_endpoints",
    "List all Khipu API endpoints with their HTTP method, path, operationId, and summary",
    {},
    async () => {
      const paths = spec.paths as Paths;

      const endpoints = Object.entries(paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => ({
          method: method.toUpperCase(),
          path,
          operationId: op.operationId,
          summary: op.summary,
          description: op.description?.slice(0, 150) + (op.description && op.description.length > 150 ? "…" : ""),
        }))
      );

      return {
        content: [{ type: "text", text: JSON.stringify(endpoints, null, 2) }],
      };
    }
  );

  // ── khipu_get_endpoint ──────────────────────────────────────────────────────
  server.tool(
    "khipu_get_endpoint",
    "Get full details for a specific Khipu API endpoint: parameters, request body schema, response schemas. Provide either operationId (e.g. 'postPayment') or path+method (e.g. '/v3/payments' + 'post')",
    {
      operationId: z.string().optional().describe("The operationId of the endpoint, e.g. 'postPayment'"),
      path: z.string().optional().describe("The path of the endpoint, e.g. '/v3/payments'"),
      method: z.string().optional().describe("The HTTP method, e.g. 'post', 'get', 'delete'"),
    },
    async ({ operationId, path: endpointPath, method }) => {
      const paths = spec.paths as Paths;

      let foundOp: Record<string, unknown> | null = null;
      let foundPath = "";
      let foundMethod = "";

      outer: for (const [p, methods] of Object.entries(paths)) {
        for (const [m, op] of Object.entries(methods)) {
          if (operationId && op.operationId === operationId) {
            foundOp = op as Record<string, unknown>;
            foundPath = p;
            foundMethod = m;
            break outer;
          }
          if (endpointPath && method && p === endpointPath && m.toLowerCase() === method.toLowerCase()) {
            foundOp = op as Record<string, unknown>;
            foundPath = p;
            foundMethod = m;
            break outer;
          }
        }
      }

      if (!foundOp) {
        const available = Object.entries(paths).flatMap(([p, methods]) =>
          Object.keys(methods).map((m) => `${m.toUpperCase()} ${p}`)
        );
        return {
          content: [
            {
              type: "text",
              text: `Endpoint not found. Available endpoints:\n${available.join("\n")}`,
            },
          ],
        };
      }

      const resolved = resolveRefs(foundOp, spec);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { method: foundMethod.toUpperCase(), path: foundPath, ...resolved as object },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── khipu_get_schema ────────────────────────────────────────────────────────
  server.tool(
    "khipu_get_schema",
    "Get the definition of a specific Khipu API schema by name (e.g. 'payment-post-payment', 'bank-get-banks', 'success')",
    {
      name: z.string().describe("Schema name, e.g. 'payment-post-payment'"),
    },
    async ({ name }) => {
      const schemas = ((spec.components as Record<string, unknown>)?.schemas ?? {}) as Schemas;

      if (!(name in schemas)) {
        return {
          content: [
            {
              type: "text",
              text: `Schema '${name}' not found. Available schemas:\n${Object.keys(schemas).join("\n")}`,
            },
          ],
        };
      }

      const resolved = resolveRefs(schemas[name], spec);

      return {
        content: [{ type: "text", text: JSON.stringify(resolved, null, 2) }],
      };
    }
  );

  // ── khipu_search_docs ───────────────────────────────────────────────────────
  server.tool(
    "khipu_search_docs",
    "Search for a keyword or phrase across the entire Khipu API specification. Returns matching paths, operations, and schema names.",
    {
      query: z.string().describe("Text to search for in the API specification"),
    },
    async ({ query }) => {
      const q = query.toLowerCase();
      const paths = spec.paths as Paths;
      const schemas = ((spec.components as Record<string, unknown>)?.schemas ?? {}) as Schemas;

      const matchingEndpoints: Array<{ method: string; path: string; operationId?: string; summary?: string }> = [];
      const matchingSchemas: string[] = [];
      const contextSnippets: string[] = [];

      for (const [p, methods] of Object.entries(paths)) {
        for (const [m, op] of Object.entries(methods)) {
          const opStr = JSON.stringify(op).toLowerCase();
          if (opStr.includes(q) || p.toLowerCase().includes(q)) {
            matchingEndpoints.push({
              method: m.toUpperCase(),
              path: p,
              operationId: op.operationId,
              summary: op.summary,
            });

            // Extract a small context snippet
            const descIdx = (op.description ?? "").toLowerCase().indexOf(q);
            if (descIdx !== -1 && op.description) {
              const start = Math.max(0, descIdx - 40);
              const end = Math.min(op.description.length, descIdx + q.length + 40);
              contextSnippets.push(`[${m.toUpperCase()} ${p}]: …${op.description.slice(start, end)}…`);
            }
          }
        }
      }

      for (const [name, schema] of Object.entries(schemas)) {
        if (name.toLowerCase().includes(q) || JSON.stringify(schema).toLowerCase().includes(q)) {
          matchingSchemas.push(name);
        }
      }

      const result = {
        query,
        matchingEndpoints,
        matchingSchemas,
        contextSnippets,
        totalMatches: matchingEndpoints.length + matchingSchemas.length,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
