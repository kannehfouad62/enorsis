CREATE TABLE "ClosedLoopRuntimePolicyAdoption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decisionPath" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "scopeStrategy" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'OFF',
    "defaultThreshold" DOUBLE PRECISION NOT NULL,
    "minimumValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximumValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "lastDecisionAt" TIMESTAMP(3),
    "decisionCount" INTEGER NOT NULL DEFAULT 0,
    "shadowDifferenceCount" INTEGER NOT NULL DEFAULT 0,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClosedLoopRuntimePolicyAdoption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClosedLoopRuntimePolicyAdoptionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromMode" TEXT,
    "toMode" TEXT,
    "message" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClosedLoopRuntimePolicyAdoptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RuntimeAdopt_path_key"
ON "ClosedLoopRuntimePolicyAdoption"("tenantId", "decisionPath");

CREATE INDEX "RuntimeAdopt_mode_idx"
ON "ClosedLoopRuntimePolicyAdoption"("tenantId", "mode", "status");

CREATE INDEX "RuntimeAdoptEvent_idx"
ON "ClosedLoopRuntimePolicyAdoptionEvent"("tenantId", "adoptionId", "createdAt");
