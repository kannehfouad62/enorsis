export type PolicyValue =
  | boolean
  | string
  | number
  | Record<string, unknown>
  | unknown[];

export type FeatureFlagDecision = {
  enabled: boolean;
  source:
    | "TENANT_OVERRIDE"
    | "MANAGED_PAAS_ONLY"
    | "REQUIRED_FEATURE"
    | "ROLLOUT"
    | "DEFAULT"
    | "INACTIVE"
    | "UNKNOWN";
};
