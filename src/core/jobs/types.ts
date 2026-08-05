export type PlatformJobHandlerContext = {
  executionId: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
  correlationId: string | null;
};

export type PlatformJobHandlerResult = {
  summary: string;
  data?: Record<string, unknown>;
};

export type PlatformJobHandler = (
  context: PlatformJobHandlerContext,
) => Promise<PlatformJobHandlerResult>;
