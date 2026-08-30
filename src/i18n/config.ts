export const supportedLocales = [
  "en",
  "fr",
  "es",
  "ar",
] as const;

export type SupportedLocale =
  (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export function isSupportedLocale(
  value: string | undefined | null,
): value is SupportedLocale {
  return supportedLocales.includes(
    value as SupportedLocale,
  );
}
