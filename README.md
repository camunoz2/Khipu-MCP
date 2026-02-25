# khipu-mcp

Servidor MCP para integrar la [API de Pagos Instantáneos de Khipu v3.0](https://khipu.com) en proyectos web.

Permite que tu asistente de IA (Claude, Cursor, Windsurf, etc.) conozca la API de Khipu en profundidad: puede consultar endpoints, schemas y parámetros mientras te ayuda a escribir el código de integración, sin necesidad de tener una API key.

## ¿Para qué sirve?

El caso de uso principal es **integrar Khipu en tu aplicación web**. En lugar de ir y venir entre la documentación y tu editor, el asistente tiene acceso directo a la spec completa:

- "¿Qué parámetros acepta `POST /v3/payments`?"
- "¿Cómo se ve el objeto que devuelve al crear un pago?"
- "¿Qué significa el campo `status_detail`?"
- "Implementa el flujo de pago en mi app Next.js usando Khipu"

Con API key también puede hacer llamadas reales: crear pagos de prueba, consultar estados, probar reembolsos.

## Modos de operación

| Modo | Requisito | Herramientas disponibles |
|------|-----------|--------------------------|
| Documentación | Sin API key | Consulta de endpoints, schemas y búsqueda en la spec |
| API completa | `KHIPU_API_KEY` | Todo lo anterior + llamadas reales a la API |

---

## Instalación

### Claude Code

```bash
# Solo documentación (recomendado para desarrollo)
claude mcp add khipu -- npx -y khipu-mcp --scope user

# Con acceso a la API real
claude mcp add khipu -e KHIPU_API_KEY=tu-api-key -- npx -y khipu-mcp --scope user
```

### Claude Desktop

Edita `%APPDATA%\Claude\claude_desktop_config.json` (Windows) o `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "khipu": {
      "command": "npx",
      "args": ["-y", "khipu-mcp"],
      "env": {
        "KHIPU_API_KEY": "tu-api-key-de-khipu"
      }
    }
  }
}
```

### Cursor / Windsurf

Agrega en `.cursor/mcp.json` o `.windsurf/mcp.json` de tu proyecto:

```json
{
  "mcpServers": {
    "khipu": {
      "command": "npx",
      "args": ["-y", "khipu-mcp"]
    }
  }
}
```

---

## Herramientas disponibles

### Documentación (siempre disponibles)

| Herramienta | Descripción |
|-------------|-------------|
| `khipu_get_overview` | Descripción general, URL base, autenticación y lista de endpoints |
| `khipu_list_endpoints` | Todos los endpoints con método HTTP, path y resumen |
| `khipu_get_endpoint` | Detalles completos de un endpoint: parámetros, body, responses y schemas |
| `khipu_get_schema` | Definición de un schema por nombre (ej: `payment-post-payment`) |
| `khipu_search_docs` | Búsqueda libre en toda la especificación OpenAPI |

### API real (requieren `KHIPU_API_KEY`)

| Herramienta | Endpoint | Descripción |
|-------------|----------|-------------|
| `khipu_get_banks` | `GET /v3/banks` | Lista los bancos disponibles con límites y logos |
| `khipu_create_payment` | `POST /v3/payments` | Crea un pago y obtiene las URLs de redirección |
| `khipu_get_payment` | `GET /v3/payments/{id}` | Estado completo e información de un pago |
| `khipu_delete_payment` | `DELETE /v3/payments/{id}` | Elimina un pago pendiente |
| `khipu_confirm_payment` | `POST /v3/payments/{id}/confirm` | Confirma un pago (función especial, contactar a Khipu) |
| `khipu_refund_payment` | `POST /v3/payments/{id}/refunds` | Reembolso total o parcial |
| `khipu_predict_payment` | `GET /v3/predict` | Predicción ML del resultado del pago |
| `khipu_get_payment_methods` | `GET /v3/merchants/{id}/paymentMethods` | Métodos de pago disponibles para un comercio |

---

## Ejemplo de uso

Una vez instalado, puedes pedirle directamente a tu asistente:

```
Integra Khipu en mi app Next.js. Necesito un botón de pago que
llame a la API y redirija al usuario a la URL de pago.
```

El asistente consultará la spec, entenderá los parámetros requeridos y escribirá el código correcto sin alucinaciones sobre la API.

---

## Autenticación

Khipu usa autenticación por API key mediante el header `x-api-key`. Obtén tu clave desde el [panel de comercio de Khipu](https://khipu.com).

---

## Requisitos

- Node.js >= 18

## Licencia

MIT
