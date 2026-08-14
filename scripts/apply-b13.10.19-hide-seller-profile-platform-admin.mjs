#!/usr/bin/env node
import fs from "node:fs";

const path = "src/components/app-shell/AppShell.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(
  `        {["SUPPLIER", "BUYER_SUPPLIER"].includes(
          user.commercialPersona,
        ) ? (`,
  `        {!isPlatformOperator &&
        ["SUPPLIER", "BUYER_SUPPLIER"].includes(
          user.commercialPersona,
        ) ? (`,
);

const oldFilter = `            .filter(
              (item) =>
                isPlatformOperator ||
                (
                  (!("sellerOnly" in item) ||
                    !item.sellerOnly ||
                    ["SUPPLIER", "BUYER_SUPPLIER"].includes(
                      user.commercialPersona,
                    )) &&
                  isHrefAllowedForCommercialPersona(
                    item.href,
                    user.commercialPersona,
                  )
                ),
            )`;

const newFilter = `            .filter((item) => {
              const sellerOnly =
                "sellerOnly" in item &&
                item.sellerOnly === true;

              if (sellerOnly) {
                return (
                  !isPlatformOperator &&
                  ["SUPPLIER", "BUYER_SUPPLIER"].includes(
                    user.commercialPersona,
                  )
                );
              }

              return (
                isPlatformOperator ||
                isHrefAllowedForCommercialPersona(
                  item.href,
                  user.commercialPersona,
                )
              );
            })`;

if (!source.includes(oldFilter)) {
  throw new Error(
    "Current AppShell navigation filter did not match the expected B13.10.17 structure.",
  );
}

source = source.replace(oldFilter, newFilter);

fs.writeFileSync(path, source);

console.log(
  "B13.10.19 Platform Admin seller-profile visibility hardening complete.",
);
