"use client";

import {
  Check,
  ChevronDown,
  Globe2,
  MapPin,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import { useRouter } from "next/navigation";

type RegionCode =
  | "US"
  | "GB"
  | "EU"
  | "CA"
  | "AU"
  | "AF_ME"
  | "GLOBAL";

type LanguageCode =
  | "en"
  | "fr"
  | "es"
  | "ar";

const regions: Array<{
  code: RegionCode;
  label: string;
  currency: string;
}> = [
  {
    code: "GLOBAL",
    label: "Global",
    currency: "USD",
  },
  {
    code: "US",
    label: "United States",
    currency: "USD",
  },
  {
    code: "GB",
    label: "United Kingdom",
    currency: "GBP",
  },
  {
    code: "EU",
    label: "European Union",
    currency: "EUR",
  },
  {
    code: "CA",
    label: "Canada",
    currency: "CAD",
  },
  {
    code: "AU",
    label: "Australia",
    currency: "AUD",
  },
  {
    code: "AF_ME",
    label: "Africa & Middle East",
    currency: "USD",
  },
];

const languages: Array<{
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}> = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
  },
];

const STORAGE_KEY =
  "enorsis.public-preferences";

function detectRegion(): RegionCode {
  const locale =
    typeof navigator === "undefined"
      ? ""
      : navigator.language.toUpperCase();

  if (locale.includes("-GB")) return "GB";

  if (
    locale.includes("-FR") ||
    locale.includes("-DE") ||
    locale.includes("-ES") ||
    locale.includes("-IT") ||
    locale.includes("-NL") ||
    locale.includes("-IE") ||
    locale.includes("-PT")
  ) {
    return "EU";
  }

  if (locale.includes("-CA")) return "CA";
  if (locale.includes("-AU")) return "AU";
  if (locale.includes("-US")) return "US";

  return "GLOBAL";
}

export function LanguageRegionMenu() {
  const router = useRouter();

  const activeLocale =
    useLocale() as LanguageCode;

  const t =
    useTranslations("languageRegion");

  const rootRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] =
    useState(false);

    const language = activeLocale;

    const [region, setRegion] =
    useState<RegionCode>("GLOBAL");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored =
          window.localStorage.getItem(
            STORAGE_KEY,
          );

        if (stored) {
          const parsed = JSON.parse(
            stored,
          ) as {
            region?: RegionCode;
          };

          if (
            parsed.region &&
            regions.some(
              (item) =>
                item.code ===
                  parsed.region,
            )
          ) {
            setRegion(parsed.region);
            return;
          }
        }

        setRegion(detectRegion());
      } catch {
        setRegion(detectRegion());
      }
    }, 0);

    return () =>
      window.clearTimeout(timeout);
  }, []);


  useEffect(() => {
    const handler = (
      event: MouseEvent,
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handler,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handler,
      );
  }, []);

  useEffect(() => {
    document.documentElement.lang =
      language;

    document.documentElement.dir =
      language === "ar"
        ? "rtl"
        : "ltr";

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          language,
          region,
        }),
      );
    } catch {
      // Preference persistence is best-effort.
    }
  }, [language, region]);

  function selectLanguage(
    nextLanguage: LanguageCode,
  ) {
    if (nextLanguage === language) {
      setOpen(false);
      return;
    }
  
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          language: nextLanguage,
          region,
        }),
      );
  
      window.localStorage.setItem(
        "enorsis.locale",
        nextLanguage,
      );
    } catch {
      // Preference persistence is best-effort.
    }
  
    setOpen(false);
  
    window.location.assign(
      `/api/locale?locale=${encodeURIComponent(
        nextLanguage,
      )}&redirect=${encodeURIComponent(
        window.location.pathname +
          window.location.search,
      )}`,
    );
  }

  const selectedRegion =
    regions.find(
      (item) =>
        item.code === region,
    ) ?? regions[0];

  const selectedLanguage =
    languages.find(
      (item) =>
        item.code === language,
    ) ?? languages[0];

  return (
    <div
      ref={rootRef}
      className="relative hidden sm:block"
    >
      <button
        type="button"
        aria-label={t("title")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
        className="flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
      >
        <Globe2 size={19} />

        <span className="hidden text-xs font-black lg:inline">
          {region === "GLOBAL"
            ? "Global"
            : region.replace(
                "_",
                "/",
              )}
        </span>

        <ChevronDown
          size={13}
          className={`transition ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.18)]"
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-sm font-black text-slate-950">
                {t("title")}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t("description")}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close language and region menu"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-500">
              {t("interfaceLanguage")}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {languages.map(
                (item) => {
                  const selected =
                    language === item.code;

                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() =>
                        selectLanguage(
                          item.code,
                        )
                      }
                      className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-black text-slate-900">
                          {
                            item.nativeLabel
                          }
                        </span>

                        <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">
                          {selected
                            ? t(
                                "selected",
                              )
                            : t(
                                "select",
                              )}
                        </span>
                      </span>

                      {selected ? (
                        <Check
                          size={16}
                          className="text-blue-700"
                        />
                      ) : null}
                    </button>
                  );
                },
              )}
            </div>

            <div className="my-5 border-t border-slate-100" />

            <div className="flex items-center gap-2">
              <MapPin
                size={14}
                className="text-blue-700"
              />

              <p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-500">
                {t("regionCurrency")}
              </p>
            </div>

            <div className="mt-3 grid gap-2">
              {regions.map(
                (item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() =>
                      setRegion(
                        item.code,
                      )
                    }
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      region ===
                      item.code
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold">
                      {item.label}
                    </span>

                    <span
                      className={`text-xs font-black ${
                        region ===
                        item.code
                          ? "text-cyan-300"
                          : "text-slate-400"
                      }`}
                    >
                      {
                        item.currency
                      }
                    </span>
                  </button>
                ),
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-900">
                {t(
                  "currentPreference",
                )}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {
                  selectedLanguage.nativeLabel
                }{" "}
                ·{" "}
                {
                  selectedRegion.label
                }{" "}
                ·{" "}
                {
                  selectedRegion.currency
                }
              </p>

              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                {t("storageNote")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}