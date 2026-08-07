import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const definitions = [
  {
    metricKey: "inventory.on_hand_quantity",
    name: "Inventory On-Hand Quantity",
    domain: "Inventory",
    category: "Availability",
    metricType: "SUM" as const,
    unit: "units",
    higherIsBetter: true,
    sourceModule: "inventory-operations",
    drilldownPath: "/app/inventory-operations",
  },
  {
    metricKey: "inventory.available_quantity",
    name: "Inventory Available Quantity",
    domain: "Inventory",
    category: "Availability",
    metricType: "SUM" as const,
    unit: "units",
    higherIsBetter: true,
    sourceModule: "inventory-operations",
    drilldownPath: "/app/inventory-operations",
  },
  {
    metricKey: "inventory.active_reservations",
    name: "Active Inventory Reservations",
    domain: "Inventory",
    category: "Reservations",
    metricType: "COUNT" as const,
    unit: "reservations",
    higherIsBetter: false,
    sourceModule: "inventory-operations",
    drilldownPath: "/app/inventory-operations",
  },
  {
    metricKey: "inventory.open_exceptions",
    name: "Open Inventory Exceptions",
    domain: "Inventory",
    category: "Risk",
    metricType: "COUNT" as const,
    unit: "exceptions",
    higherIsBetter: false,
    sourceModule: "inventory-operations",
    drilldownPath: "/app/inventory-operations",
  },
  {
    metricKey: "warehouse.open_putaway_tasks",
    name: "Open Putaway Tasks",
    domain: "Warehouse",
    category: "Work Queue",
    metricType: "COUNT" as const,
    unit: "tasks",
    higherIsBetter: false,
    sourceModule: "warehouse-operations",
    drilldownPath: "/app/warehouse-operations",
  },
  {
    metricKey: "warehouse.open_pick_tasks",
    name: "Open Pick Tasks",
    domain: "Warehouse",
    category: "Work Queue",
    metricType: "COUNT" as const,
    unit: "tasks",
    higherIsBetter: false,
    sourceModule: "warehouse-fulfillment",
    drilldownPath: "/app/warehouse-fulfillment",
  },
  {
    metricKey: "inventory.financial_value",
    name: "Inventory Financial Value",
    domain: "Inventory",
    category: "Finance",
    metricType: "CURRENCY" as const,
    unit: "currency",
    currencyCode: "USD",
    higherIsBetter: false,
    sourceModule: "inventory-financial-valuation",
    drilldownPath: "/app/inventory-financial-valuation",
  },
  {
    metricKey: "inventory.active_trace_holds",
    name: "Active Traceability Holds",
    domain: "Inventory",
    category: "Traceability",
    metricType: "COUNT" as const,
    unit: "holds",
    higherIsBetter: false,
    sourceModule: "inventory-traceability",
    drilldownPath: "/app/inventory-traceability",
  },
];

export async function ensureEnterpriseAnalyticsDefinitions(
  tenantId: string,
) {
  for (const definition of definitions) {
    await prisma.enterpriseAnalyticsMetricDefinition.upsert({
      where: {
        tenantId_metricKey: {
          tenantId,
          metricKey: definition.metricKey,
        },
      },
      create: {
        tenantId,
        ...definition,
        metadata: toJson({
          foundationVersion: "B2.8.1.1",
        }),
      },
      update: {
        name: definition.name,
        domain: definition.domain,
        category: definition.category,
        metricType: definition.metricType,
        unit: definition.unit,
        currencyCode:
          "currencyCode" in definition
            ? definition.currencyCode
            : null,
        higherIsBetter: definition.higherIsBetter,
        sourceModule: definition.sourceModule,
        drilldownPath: definition.drilldownPath,
        active: true,
      },
    });
  }
}
