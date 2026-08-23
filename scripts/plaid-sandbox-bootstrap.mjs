import "dotenv/config";

const BASE_URL = "https://sandbox.plaid.com";
const INSTITUTION_ID =
  process.env.PLAID_SANDBOX_INSTITUTION_ID ??
  "ins_109508";

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

if (!clientId || !secret) {
  console.error(
    [
      "Missing Plaid Sandbox credentials.",
      "",
      "Set these environment variables first:",
      "  PLAID_CLIENT_ID=...",
      "  PLAID_SECRET=...",
      "",
      "Do not commit these values to Git.",
    ].join("\n"),
  );
  process.exit(1);
}

async function plaidPost(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
    body: JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error(
      `Plaid returned HTTP ${response.status}:`,
    );
    console.error(
      JSON.stringify(payload, null, 2),
    );
    process.exit(1);
  }

  return payload;
}

console.log(
  `Creating Plaid Sandbox Item with ${INSTITUTION_ID}...`,
);

const publicTokenResponse = await plaidPost(
  "/sandbox/public_token/create",
  {
    institution_id: INSTITUTION_ID,
    initial_products: ["transactions"],
    options: {
      webhook: null,
    },
  },
);

const publicToken =
  publicTokenResponse.public_token;

if (!publicToken) {
  console.error(
    "Plaid did not return a public_token.",
  );
  process.exit(1);
}

const exchangeResponse = await plaidPost(
  "/item/public_token/exchange",
  {
    public_token: publicToken,
  },
);

const accessToken =
  exchangeResponse.access_token;
const itemId = exchangeResponse.item_id;

if (!accessToken || !itemId) {
  console.error(
    "Plaid did not return the expected access_token/item_id.",
  );
  process.exit(1);
}

const accountsResponse = await plaidPost(
  "/accounts/balance/get",
  {
    access_token: accessToken,
  },
);

const accounts = Array.isArray(
  accountsResponse.accounts,
)
  ? accountsResponse.accounts
  : [];

console.log("");
console.log(
  "SUCCESS: Plaid Sandbox Item created and real-time balance request passed.",
);
console.log("");
console.log("Store this value securely in Vercel:");
console.log(
  `PLAID_ACCESS_TOKEN=${accessToken}`,
);
console.log("");
console.log(`Plaid Item ID: ${itemId}`);
console.log("");
console.log("Sandbox accounts available for Treasury mapping:");

for (const account of accounts) {
  const balances =
    account.balances ?? {};
  const currency =
    balances.iso_currency_code ??
    balances.unofficial_currency_code ??
    "N/A";

  console.log(
    [
      `- ${account.name ?? "Account"}`,
      `account_id=${account.account_id}`,
      `type=${account.type ?? "unknown"}`,
      `current=${balances.current ?? "N/A"}`,
      `available=${balances.available ?? "N/A"}`,
      `currency=${currency}`,
    ].join(" | "),
  );
}

console.log("");
console.log("Next Enorsis configuration:");
console.log("  Provider: Plaid Treasury / Bank Balance");
console.log("  Environment: SANDBOX");
console.log(
  '  Configuration JSON: {"environment":"sandbox","treasuryAccountMap":{}}',
);
console.log("  Credential name: PLAID_CLIENT_ID");
console.log("  Secret reference: env:PLAID_CLIENT_ID");
console.log("  Credential name: PLAID_SECRET");
console.log("  Secret reference: env:PLAID_SECRET");
console.log("  Credential name: PLAID_ACCESS_TOKEN");
console.log("  Secret reference: env:PLAID_ACCESS_TOKEN");
console.log("");
console.log(
  "Do not commit client_id, secret, or access_token values to the repository.",
);
