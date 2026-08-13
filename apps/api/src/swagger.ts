import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Global Business Suite (GBS) Enterprise API Gateway",
      version: "1.0.0",
      description:
        "High-Availability Multi-Tenant Enterprise Microservices & REST API Gateway Platform",
    },
    servers: [
      {
        url: "/api/v1",
        description: "Primary Production V1 API Gateway",
      },
      {
        url: "/api",
        description: "Legacy Backward-Compatible API Gateway",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      headers: {
        "X-Request-ID": {
          description: "Unique correlation ID for distributed tracing",
          schema: { type: "string", format: "uuid" },
        },
        "X-Idempotency-Key": {
          description: "Idempotency key to safely replay mutating requests",
          schema: { type: "string" },
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                requestId: { type: "string", format: "uuid" },
              },
            },
          },
        },
        StandardErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                code: { type: "string" },
                details: { type: "object" },
              },
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                requestId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/routes/v1/*.ts", "./src/index.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
