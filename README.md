# khipu-mcp

MCP (Model Context Protocol) server for the [Khipu](https://khipu.com) Instant Payments API v3.0.

Allows AI assistants (Claude, Cursor, etc.) to query Khipu API documentation and — when an API key is provided — interact with the real Khipu API to create payments, check statuses, issue refunds, and more.

## Dual mode

| Mode | Requirement | Available tools |
|------|-------------|-----------------|
| Documentation only | No API key needed | 5 docs tools |
| Full API access | `KHIPU_API_KEY` set | 5 docs tools + 8 API tools |

---

## Installation

### Option 1 — Claude Desktop / Cursor (with API key)

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "khipu": {
      "command": "npx",
      "args": ["khipu-mcp"],
      "env": {
        "KHIPU_API_KEY": "tu-api-key-de-khipu"
      }
    }
  }
}
```

### Option 2 — Documentation only (no API key)

```json
{
  "mcpServers": {
    "khipu": {
      "command": "npx",
      "args": ["khipu-mcp"]
    }
  }
}
```

**Config file locations:**
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
- Cursor: `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally

---

## Available tools

### Documentation tools (always available)

| Tool | Description |
|------|-------------|
| `khipu_get_overview` | API description, base URL, authentication, endpoint list |
| `khipu_list_endpoints` | All endpoints with method, path, and summary |
| `khipu_get_endpoint` | Full details for one endpoint: params, request body, responses |
| `khipu_get_schema` | Definition of a schema by name (e.g. `payment-post-payment`) |
| `khipu_search_docs` | Free-text search across the entire API specification |

### API tools (require `KHIPU_API_KEY`)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `khipu_get_banks` | `GET /v3/banks` | List available banks |
| `khipu_create_payment` | `POST /v3/payments` | Create a payment, get redirect URLs |
| `khipu_get_payment` | `GET /v3/payments/{id}` | Full payment status and details |
| `khipu_delete_payment` | `DELETE /v3/payments/{id}` | Delete a pending payment |
| `khipu_confirm_payment` | `POST /v3/payments/{id}/confirm` | Confirm payment (special feature) |
| `khipu_refund_payment` | `POST /v3/payments/{id}/refunds` | Full or partial refund |
| `khipu_predict_payment` | `GET /v3/predict` | ML prediction of payment success |
| `khipu_get_payment_methods` | `GET /v3/merchants/{id}/paymentMethods` | Payment methods for a merchant |

---

## Authentication

Khipu uses API key authentication. Pass your key in the `KHIPU_API_KEY` environment variable. The server forwards it as the `x-api-key` HTTP header on every API call.

Get your API key from the [Khipu merchant dashboard](https://khipu.com).

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run the server
npm start

# Watch mode during development
npm run dev
```

### Requirements

- Node.js >= 18 (uses native `fetch`)

---

## License

MIT
