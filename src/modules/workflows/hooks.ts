import { triggerWorkflowEvent } from "./automation";

export interface ProcurementWorkflowEvent {
  tenantId: string;
  event:
    | "purchase_request.submitted"
    | "purchase_request.approved"
    | "supplier.submitted"
    | "supplier.risk_high"
    | "sourcing_event.published"
    | "sourcing_award.recommended"
    | "contract.submitted"
    | "contract.renewal_due"
    | "invoice.exception"
    | "payment_batch.submitted"
    | "ai_agent_task.approval_required";
  resourceType: string;
  resourceId: string;
  startedByUserId: string;
  context: Record<string, unknown>;
}

export async function emitProcurementWorkflowEvent(
  input: ProcurementWorkflowEvent,
) {
  return triggerWorkflowEvent(input);
}
