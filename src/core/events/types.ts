export type DomainEventInput = {
  tenantId?: string | null;
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  sourceModule: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
  causationId?: string | null;
  actorUserId?: string | null;
};
