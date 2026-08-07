import type { AnalyticsMetricCalculation, AnalyticsPeriod } from "./types";
import { prisma } from "@/lib/prisma";

export type AnalyticsCalculator = (input: {
  tenantId: string;
  period: AnalyticsPeriod;
}) => Promise<AnalyticsMetricCalculation[]>;

export const enterpriseAnalyticsCalculators: Record<
  string,
  AnalyticsCalculator
> = {
  "inventory.on_hand_quantity": async ({ tenantId }) => {
    const rows = await prisma.inventoryAvailabilitySnapshot.findMany({
      where: { tenantId },
      select: {
        inventoryItemId: true,
        locationId: true,
        onHandQuantity: true,
      },
    });

    return [
      {
        metricKey: "inventory.on_hand_quantity",
        value: rows.reduce(
          (sum, row) => sum + Number(row.onHandQuantity),
          0,
        ),
        sourceRecordCount: rows.length,
      },
    ];
  },

  "inventory.available_quantity": async ({ tenantId }) => {
    const rows = await prisma.inventoryAvailabilitySnapshot.findMany({
      where: { tenantId },
      select: {
        availableQuantity: true,
      },
    });

    return [
      {
        metricKey: "inventory.available_quantity",
        value: rows.reduce(
          (sum, row) => sum + Number(row.availableQuantity),
          0,
        ),
        sourceRecordCount: rows.length,
      },
    ];
  },

  "inventory.active_reservations": async ({ tenantId }) => {
    const count = await prisma.inventoryReservation.count({
      where: {
        tenantId,
        status: {
          in: ["ACTIVE", "PARTIALLY_FULFILLED"],
        },
      },
    });

    return [
      {
        metricKey: "inventory.active_reservations",
        value: count,
        sourceRecordCount: count,
      },
    ];
  },

  "inventory.open_exceptions": async ({ tenantId }) => {
    const count = await prisma.inventoryOperationException.count({
      where: {
        tenantId,
        status: {
          in: ["OPEN", "INVESTIGATING"],
        },
      },
    });

    return [
      {
        metricKey: "inventory.open_exceptions",
        value: count,
        sourceRecordCount: count,
      },
    ];
  },

  "warehouse.open_putaway_tasks": async ({ tenantId }) => {
    const count = await prisma.putawayTask.count({
      where: {
        tenantId,
        status: {
          in: ["OPEN", "IN_PROGRESS"],
        },
      },
    });

    return [
      {
        metricKey: "warehouse.open_putaway_tasks",
        value: count,
        sourceRecordCount: count,
      },
    ];
  },

  "warehouse.open_pick_tasks": async ({ tenantId }) => {
    const count = await prisma.warehousePickTask.count({
      where: {
        tenantId,
        status: {
          in: ["OPEN", "IN_PROGRESS"],
        },
      },
    });

    return [
      {
        metricKey: "warehouse.open_pick_tasks",
        value: count,
        sourceRecordCount: count,
      },
    ];
  },

  "inventory.financial_value": async ({ tenantId }) => {
    const rows =
      await prisma.inventoryFinancialValuationSnapshot.findMany({
        where: { tenantId },
        select: { inventoryValue: true },
      });

    return [
      {
        metricKey: "inventory.financial_value",
        value: rows.reduce(
          (sum, row) => sum + Number(row.inventoryValue),
          0,
        ),
        sourceRecordCount: rows.length,
      },
    ];
  },

  "inventory.active_trace_holds": async ({ tenantId }) => {
    const count = await prisma.inventoryTraceHold.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    });

    return [
      {
        metricKey: "inventory.active_trace_holds",
        value: count,
        sourceRecordCount: count,
      },
    ];
  },
};
