export type MarketplaceCartItem = {
  offeringId: string;
  sellerTenantId: string;
  sellerSupplierId: string;
  supplierName: string;
  offeringName: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  currencyCode: string;
  minimumOrderQty: number | null;
  leadTimeDays: number | null;
  imageRef: string | null;
};

export type MarketplaceCheckoutInput = {
  title: string;
  businessJustification: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  neededByDate?: string;
  originalCurrency: string;
  exchangeRateToUsd: number;
  exchangeRateSource: string;
  legalEntityId?: string;
  siteId?: string;
  departmentId?: string;
  preferredApproverId?: string;
  items: MarketplaceCartItem[];
};
