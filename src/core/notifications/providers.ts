export type NotificationProviderResult = {
  provider: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationProvider = {
  send(input: {
    destination: string;
    title: string;
    message: string;
    actionUrl?: string | null;
  }): Promise<NotificationProviderResult>;
};

const providers = new Map<string, NotificationProvider>();

export function registerNotificationProvider(
  channel: string,
  provider: NotificationProvider,
) {
  providers.set(channel, provider);
}

export function getNotificationProvider(channel: string) {
  return providers.get(channel) ?? null;
}
