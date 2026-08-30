export const RTO_SLA_POLICY = {
  pendingApprovalWarningHours: 24,
  pendingApprovalBreachHours: 48,
  highExceptionWarningHours: 24,
  highExceptionBreachHours: 48,
  criticalExceptionWarningHours: 4,
  criticalExceptionBreachHours: 8,
  mediumExceptionWarningHours: 48,
  mediumExceptionBreachHours: 72,
  lowExceptionWarningHours: 72,
  lowExceptionBreachHours: 120,
} as const;

export type RtoSlaState =
  | "ON_TRACK"
  | "WARNING"
  | "BREACHED"
  | "CRITICAL_BREACH";

export function ageHours(
  from: Date,
  now = new Date(),
) {
  return Math.max(
    0,
    (now.getTime() - from.getTime()) / 3_600_000,
  );
}

export function approvalSlaState(
  createdAt: Date,
  now = new Date(),
): RtoSlaState {
  const age = ageHours(createdAt, now);

  if (age >= RTO_SLA_POLICY.pendingApprovalBreachHours) {
    return "BREACHED";
  }

  if (age >= RTO_SLA_POLICY.pendingApprovalWarningHours) {
    return "WARNING";
  }

  return "ON_TRACK";
}

export function exceptionSlaState(
  severity: string,
  createdAt: Date,
  now = new Date(),
): RtoSlaState {
  const age = ageHours(createdAt, now);

  const thresholds =
    severity === "CRITICAL"
      ? {
          warning:
            RTO_SLA_POLICY.criticalExceptionWarningHours,
          breach:
            RTO_SLA_POLICY.criticalExceptionBreachHours,
          critical: true,
        }
      : severity === "HIGH"
        ? {
            warning:
              RTO_SLA_POLICY.highExceptionWarningHours,
            breach:
              RTO_SLA_POLICY.highExceptionBreachHours,
            critical: false,
          }
        : severity === "MEDIUM"
          ? {
              warning:
                RTO_SLA_POLICY.mediumExceptionWarningHours,
              breach:
                RTO_SLA_POLICY.mediumExceptionBreachHours,
              critical: false,
            }
          : {
              warning:
                RTO_SLA_POLICY.lowExceptionWarningHours,
              breach:
                RTO_SLA_POLICY.lowExceptionBreachHours,
              critical: false,
            };

  if (age >= thresholds.breach) {
    return thresholds.critical
      ? "CRITICAL_BREACH"
      : "BREACHED";
  }

  if (age >= thresholds.warning) {
    return "WARNING";
  }

  return "ON_TRACK";
}
