ALTER TABLE "AuditEvent"
ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "AuditEvent"
SET "searchText" = lower(
  concat_ws(
    ' ',
    coalesce("action", ''),
    coalesce("resourceType", ''),
    coalesce("resourceId", ''),
    coalesce("actorLabel", ''),
    coalesce("reason", ''),
    coalesce("requestId", ''),
    coalesce("before"::text, ''),
    coalesce("after"::text, ''),
    coalesce("metadata"::text, '')
  )
);

UPDATE "AuditEvent" AS audit
SET "searchText" = lower(
  concat_ws(
    ' ',
    audit."searchText",
    offering."name",
    offering."sku",
    offering."shortDescription",
    offering."description"
  )
)
FROM "SupplierMarketplaceOffering" AS offering
WHERE audit."resourceType" = 'SupplierMarketplaceOffering'
  AND audit."resourceId" = offering."id";

CREATE OR REPLACE FUNCTION "enorsis_set_audit_event_search_text"()
RETURNS trigger AS $$
BEGIN
  NEW."searchText" := lower(
    concat_ws(
      ' ',
      coalesce(NEW."action", ''),
      coalesce(NEW."resourceType", ''),
      coalesce(NEW."resourceId", ''),
      coalesce(NEW."actorLabel", ''),
      coalesce(NEW."reason", ''),
      coalesce(NEW."requestId", ''),
      coalesce(NEW."before"::text, ''),
      coalesce(NEW."after"::text, ''),
      coalesce(NEW."metadata"::text, '')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditEvent_search_text_trigger"
ON "AuditEvent";

CREATE TRIGGER "AuditEvent_search_text_trigger"
BEFORE INSERT OR UPDATE OF
  "action",
  "resourceType",
  "resourceId",
  "actorLabel",
  "reason",
  "requestId",
  "before",
  "after",
  "metadata"
ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION "enorsis_set_audit_event_search_text"();

CREATE INDEX "AuditEvent_tenant_action_occurredAt_idx"
ON "AuditEvent"("tenantId", "action", "occurredAt");
