"use client";

import { useTranslations } from "next-intl";

export function LocalizedText({
  namespace,
  messageKey,
}: {
  namespace: string;
  messageKey: string;
}) {
  const t = useTranslations(namespace);
  return <>{t(messageKey)}</>;
}
