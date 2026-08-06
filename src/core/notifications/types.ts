export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "MOBILE_PUSH"
  | "SMS"
  | "MICROSOFT_TEAMS"
  | "SLACK"
  | "WEBHOOK";

export type CreateNotificationInput = {
  tenantId: string;
  eventType: string;
  recipientUserId?: string | null;
  recipientAddress?: string | null;
  title: string;
  message: string;
  actionUrl?: string | null;
  channels?: NotificationChannel[];
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  data?: Record<string, unknown>;
  correlationId?: string | null;
  eventId?: string | null;
  templateId?: string | null;
};
