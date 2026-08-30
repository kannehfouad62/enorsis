import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  isSupportedLocale,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const requestedLocale =
    cookieStore.get("ENORSIS_LOCALE")?.value;

  const locale = isSupportedLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;

  return {
    locale,
    messages: (
      await import(`../../messages/${locale}.json`)
    ).default,
  };
});
