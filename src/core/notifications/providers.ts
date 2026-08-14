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

export async function getNotificationProvider(
  channel: string,
) {
  const registered =
    providers.get(channel);

  if (registered) {
    return registered;
  }

  if (channel === "EMAIL") {
    return getBuiltInEmailProvider();
  }

  return null;
}


let builtInEmailProvider:
  | NotificationProvider
  | null = null;

async function getBuiltInEmailProvider() {
  if (!builtInEmailProvider) {
    const module = await import(
      "./resend-email-provider"
    );
    builtInEmailProvider =
      module.resendEmailNotificationProvider;
  }

  return builtInEmailProvider;
}
