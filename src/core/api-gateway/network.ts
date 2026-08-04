import { isIP } from "node:net";

function ipv4ToNumber(address: string) {
  const octets = address.split(".").map(Number);

  if (
    octets.length !== 4 ||
    octets.some((value) => value < 0 || value > 255 || Number.isNaN(value))
  ) {
    return null;
  }

  return (
    ((octets[0] << 24) >>> 0) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0;
}

function matchesIpv4Cidr(address: string, cidr: string) {
  const [network, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const addressNumber = ipv4ToNumber(address);
  const networkNumber = ipv4ToNumber(network);

  if (
    addressNumber === null ||
    networkNumber === null ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return false;
  }

  const mask =
    prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

  return (addressNumber & mask) === (networkNumber & mask);
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export function isRequestIpAllowed(
  request: Request,
  allowedCidrs: string[],
) {
  if (allowedCidrs.length === 0) return true;

  const address = getRequestIp(request);
  if (!address) return false;

  return allowedCidrs.some((entry) => {
    const rule = entry.trim();

    if (!rule) return false;
    if (rule.includes("/")) {
      return isIP(address) === 4 && matchesIpv4Cidr(address, rule);
    }

    return address === rule;
  });
}
