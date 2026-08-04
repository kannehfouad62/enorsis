import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return NextResponse.json(
    {
      openapi: "3.1.0",
      info: {
        title: "Enorsis Enterprise Procurement API",
        version: "1.0.0",
        description:
          "Tenant-scoped procurement data APIs secured with Enorsis API keys.",
      },
      servers: [{ url: origin }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "Enorsis API Key",
          },
        },
        schemas: {
          ApiError: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  requestId: { type: "string" },
                },
                required: ["code", "requestId"],
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      paths: {
        "/api/v1/suppliers": {
          get: {
            summary: "List suppliers",
            tags: ["Suppliers"],
            responses: {
              "200": { description: "Supplier collection" },
              "401": { description: "Invalid API key" },
              "403": { description: "Insufficient scope or network denied" },
              "429": { description: "Rate limit exceeded" },
            },
          },
        },
        "/api/v1/purchase-orders": {
          get: {
            summary: "List purchase orders",
            tags: ["Purchasing"],
            responses: { "200": { description: "Purchase-order collection" } },
          },
        },
        "/api/v1/invoices": {
          get: {
            summary: "List supplier invoices",
            tags: ["Invoices"],
            responses: { "200": { description: "Invoice collection" } },
          },
        },
        "/api/v1/contracts": {
          get: {
            summary: "List contracts",
            tags: ["Contracts"],
            responses: { "200": { description: "Contract collection" } },
          },
        },
        "/api/v1/sourcing-events": {
          get: {
            summary: "List sourcing events",
            tags: ["Sourcing"],
            responses: { "200": { description: "Sourcing-event collection" } },
          },
        },
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
