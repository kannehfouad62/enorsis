"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const reconciliationRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function reconciliationPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/reconciliation${query ? `?${query}` : ""}`;
}

export async function recordBankReconciliationAction(data: FormData) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const paymentBatchId = field(data, "paymentBatchId");
  const statementReference = field(data, "statementReference");
  const bankReference = field(data, "bankReference") || null;
  const reconciliationDateRaw = field(data, "reconciliationDate");
  const settledAmountRaw = field(data, "settledAmount");
  const classification = field(data, "classification") as
    | "MATCHED"
    | "PARTIAL"
    | "UNMATCHED"
    | "DUPLICATE";
  const notes = field(data, "notes") || null;

  let errorMessage: string | null = null;
  let batchNumber: string | null = null;

  try {
    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: { in: ["PROCESSING", "COMPLETED"] },
      },
    });

    if (!batch) {
      throw new Error(
        "Only processing or completed payment runs can be reconciled.",
      );
    }

    const existing = await prisma.bankPaymentReconciliation.findUnique({
      where: { paymentBatchId: batch.id },
    });

    if (existing) {
      throw new Error(
        `Payment run ${batch.batchNumber} already has a reconciliation record.`,
      );
    }

    if (!statementReference) {
      throw new Error(
        "A bank statement or settlement reference is required.",
      );
    }

    const settledAmount = Number(settledAmountRaw);
    if (!Number.isFinite(settledAmount) || settledAmount < 0) {
      throw new Error("Enter a valid settled amount.");
    }

    const reconciliationDate = reconciliationDateRaw
      ? new Date(`${reconciliationDateRaw}T12:00:00`)
      : new Date();

    if (Number.isNaN(reconciliationDate.getTime())) {
      throw new Error("The reconciliation date is invalid.");
    }

    const expectedAmount = Number(batch.totalAmount);
    const variance = Math.abs(expectedAmount - settledAmount);

    if (classification === "MATCHED" && variance > 0.005) {
      throw new Error(
        "A MATCHED reconciliation requires the settled amount to equal the payment-run total.",
      );
    }

    if (
      classification === "PARTIAL" &&
      !(settledAmount > 0 && settledAmount < expectedAmount)
    ) {
      throw new Error(
        "A PARTIAL reconciliation requires a positive settled amount below the payment-run total.",
      );
    }

    if (classification === "DUPLICATE" && !bankReference) {
      throw new Error(
        "A bank reference is required when classifying a duplicate settlement.",
      );
    }

    await prisma.bankPaymentReconciliation.create({
      data: {
        tenantId: user.tenantId,
        paymentBatchId: batch.id,
        statementReference,
        bankReference,
        currencyCode: batch.currencyCode,
        expectedAmount: batch.totalAmount,
        settledAmount,
        status: classification,
        resolutionStatus:
          classification === "MATCHED"
            ? "RESOLVED"
            : "OPEN",
        reconciliationDate,
        notes,
        recordedByUserId: user.id,
        resolvedByUserId:
          classification === "MATCHED"
            ? user.id
            : null,
        resolvedAt:
          classification === "MATCHED"
            ? new Date()
            : null,
      },
    });

    batchNumber = batch.batchNumber;

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        classification === "MATCHED"
          ? "PaymentReconciliation.Matched"
          : "PaymentReconciliation.Exception",
      recipientUserId: user.id,
      recipientAddress: null,
      title:
        classification === "MATCHED"
          ? "Payment reconciliation matched"
          : "Payment reconciliation exception recorded",
      message:
        `Payment run ${batch.batchNumber} was reconciled as ${classification}. Expected ${batch.currencyCode} ${expectedAmount.toFixed(
          2,
        )}; bank settlement ${batch.currencyCode} ${settledAmount.toFixed(2)}.`,
      actionUrl: "/app/requisition-to-order/reconciliation",
      priority: classification === "MATCHED" ? "NORMAL" : "HIGH",
      channels: ["IN_APP"],
      data: {
        paymentBatchId: batch.id,
        classification,
        statementReference,
        bankReference,
      },
    });

    revalidatePath("/app/requisition-to-order/reconciliation");
    revalidatePath("/app/requisition-to-order/payments");
  } catch (error) {
    console.error("Bank reconciliation recording failed", {
      paymentBatchId,
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation record could not be saved.";
  }

  if (errorMessage) {
    redirect(reconciliationPath(undefined, errorMessage));
  }

  redirect(
    reconciliationPath(
      `Payment run ${batchNumber ?? ""} reconciled successfully.`,
    ),
  );
}

export async function updateReconciliationResolutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const reconciliationId = field(
    data,
    "reconciliationId",
  );
  const resolutionStatus = field(
    data,
    "resolutionStatus",
  ) as
    | "ACKNOWLEDGED"
    | "INVESTIGATING"
    | "RESOLVED";
  const resolutionNote = field(
    data,
    "resolutionNote",
  );

  let errorMessage: string | null = null;

  try {
    if (
      ![
        "ACKNOWLEDGED",
        "INVESTIGATING",
        "RESOLVED",
      ].includes(resolutionStatus)
    ) {
      throw new Error(
        "Select a valid reconciliation resolution action.",
      );
    }

    if (resolutionNote.length < 5) {
      throw new Error(
        "Provide a short corrective or investigation note.",
      );
    }

    const reconciliation =
      await prisma.bankPaymentReconciliation.findFirst({
        where: {
          id: reconciliationId,
          tenantId: user.tenantId,
          status: {
            in: [
              "PARTIAL",
              "UNMATCHED",
              "DUPLICATE",
            ],
          },
        },
      });

    if (!reconciliation) {
      throw new Error(
        "This reconciliation exception is not available for resolution.",
      );
    }

    if (
      reconciliation.resolutionStatus ===
      "RESOLVED"
    ) {
      throw new Error(
        "This reconciliation exception is already resolved.",
      );
    }

    const historyLine =
      `[${new Date().toISOString()}] ${resolutionStatus} by ${user.id}: ${resolutionNote}`;

    const resolutionNotes = [
      reconciliation.resolutionNotes,
      historyLine,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.bankPaymentReconciliation.update({
      where: {
        id: reconciliation.id,
      },
      data: {
        resolutionStatus,
        resolutionNotes,
        ...(resolutionStatus === "RESOLVED"
          ? {
              resolvedByUserId: user.id,
              resolvedAt: new Date(),
            }
          : {
              resolvedByUserId: null,
              resolvedAt: null,
            }),
      },
    });

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        resolutionStatus === "RESOLVED"
          ? "PaymentReconciliation.ExceptionResolved"
          : "PaymentReconciliation.ExceptionProgressed",
      recipientUserId: user.id,
      recipientAddress: null,
      title:
        resolutionStatus === "RESOLVED"
          ? "Reconciliation exception resolved"
          : "Reconciliation exception updated",
      message:
        `Reconciliation ${reconciliation.statementReference} is now ${resolutionStatus}. ${resolutionNote}`,
      actionUrl:
        "/app/requisition-to-order/reconciliation",
      priority:
        resolutionStatus === "RESOLVED"
          ? "NORMAL"
          : "HIGH",
      channels: ["IN_APP"],
      data: {
        reconciliationId: reconciliation.id,
        paymentBatchId:
          reconciliation.paymentBatchId,
        classification: reconciliation.status,
        resolutionStatus,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
  } catch (error) {
    console.error(
      "Reconciliation exception resolution failed",
      {
        reconciliationId,
        tenantId: user.tenantId,
        actorUserId: user.id,
        resolutionStatus,
        error,
      },
    );

    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation exception could not be updated.";
  }

  if (errorMessage) {
    redirect(
      reconciliationPath(undefined, errorMessage),
    );
  }

  redirect(
    reconciliationPath(
      `Reconciliation exception updated to ${resolutionStatus}.`,
    ),
  );
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let fieldValue = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        fieldValue += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(fieldValue);
      fieldValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(fieldValue);
      fieldValue = "";
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    fieldValue += char;
  }

  row.push(fieldValue);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeReference(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function firstHeaderIndex(
  headers: string[],
  aliases: string[],
) {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index >= 0) return index;
  }
  return -1;
}

export async function importBankStatementCsvAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const file = data.get("statementFile");
  const statementReference = field(
    data,
    "statementReference",
  );

  let errorMessage: string | null = null;
  let resultMessage: string | null = null;

  try {
    if (!(file instanceof File)) {
      throw new Error("Select a CSV bank statement file.");
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error(
        "Bank statement import currently supports CSV files only.",
      );
    }

    if (file.size <= 0 || file.size > 5_000_000) {
      throw new Error(
        "The CSV file must be larger than 0 bytes and no more than 5 MB.",
      );
    }

    if (!statementReference) {
      throw new Error(
        "Provide a statement reference for this import.",
      );
    }

    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length < 2) {
      throw new Error(
        "The CSV must contain a header row and at least one transaction row.",
      );
    }

    if (parsed.length > 5001) {
      throw new Error(
        "A single import is limited to 5,000 transaction rows.",
      );
    }

    const headers = parsed[0].map(normalizeHeader);

    const mappingProfileId =
      field(data, "mappingProfileId") || null;

    const mappingProfile = mappingProfileId
      ? await prisma.bankStatementMappingProfile.findFirst({
          where: {
            id: mappingProfileId,
            tenantId: user.tenantId,
            active: true,
          },
        })
      : null;

    if (mappingProfileId && !mappingProfile) {
      throw new Error(
        "The selected bank statement mapping profile is not active or is unavailable.",
      );
    }

    const customIndex = (
      column: string | null | undefined,
    ) => {
      if (!column) return -1;
      return headers.indexOf(
        normalizeHeader(column),
      );
    };

    const dateIndex = mappingProfile
      ? customIndex(mappingProfile.dateColumn)
      : firstHeaderIndex(headers, [
          "transaction_date",
          "date",
          "posted_date",
          "settlement_date",
        ]);

    const referenceIndex = mappingProfile
      ? customIndex(
          mappingProfile.referenceColumn,
        )
      : firstHeaderIndex(headers, [
          "reference",
          "bank_reference",
          "payment_reference",
          "transaction_reference",
        ]);

    const amountIndex = mappingProfile
      ? customIndex(mappingProfile.amountColumn)
      : firstHeaderIndex(headers, [
          "amount",
          "settled_amount",
          "transaction_amount",
          "credit",
        ]);

    const currencyIndex = mappingProfile
      ? customIndex(mappingProfile.currencyColumn)
      : firstHeaderIndex(headers, [
          "currency",
          "currency_code",
          "ccy",
        ]);

    const descriptionIndex = mappingProfile
      ? customIndex(
          mappingProfile.descriptionColumn,
        )
      : firstHeaderIndex(headers, [
          "description",
          "memo",
          "details",
          "narrative",
        ]);

    if (referenceIndex < 0 || amountIndex < 0) {
      throw new Error(
        mappingProfile
          ? `The selected mapping profile could not find its reference and/or amount column in this CSV. Expected "${mappingProfile.referenceColumn}" and "${mappingProfile.amountColumn}".`
          : "The CSV must include reference and amount columns. Supported date/currency/description columns are optional.",
      );
    }

    const batches = await prisma.paymentBatch.findMany({
      where: {
        tenantId: user.tenantId,
        status: {
          in: ["PROCESSING", "COMPLETED"],
        },
        exportReference: {
          not: null,
        },
      },
      select: {
        id: true,
        batchNumber: true,
        exportReference: true,
        currencyCode: true,
        totalAmount: true,
      },
    });

    const batchByReference = new Map<
      string,
      (typeof batches)[number]
    >();

    for (const batch of batches) {
      const key = normalizeReference(batch.exportReference);
      if (key) batchByReference.set(key, batch);
    }

    const existingReconciliations =
      await prisma.bankPaymentReconciliation.findMany({
        where: {
          tenantId: user.tenantId,
        },
        select: {
          id: true,
          paymentBatchId: true,
        },
      });

    const reconciliationByBatchId = new Map(
      existingReconciliations.map((item) => [
        item.paymentBatchId,
        item,
      ]),
    );

    const seenReferences = new Set<string>();

    const result = await prisma.$transaction(
      async (tx) => {
        const statementImport =
          await tx.bankStatementImport.create({
            data: {
              tenantId: user.tenantId,
              fileName: file.name,
              statementReference,
              status: "PROCESSED",
              totalRows: parsed.length - 1,
              importedByUserId: user.id,
            },
          });

        let matchedRows = 0;
        let exceptionRows = 0;

        for (
          let rowIndex = 1;
          rowIndex < parsed.length;
          rowIndex += 1
        ) {
          const values = parsed[rowIndex];
          const rawReference =
            values[referenceIndex]?.trim() ?? "";
          const normalizedReference =
            normalizeReference(rawReference);
          const amountText =
            values[amountIndex]?.trim() ?? "";
          const amount = Number(
            amountText.replace(/[$,\s]/g, ""),
          );
          const currency =
            currencyIndex >= 0
              ? values[currencyIndex]?.trim().toUpperCase() ||
                null
              : null;
          const description =
            descriptionIndex >= 0
              ? values[descriptionIndex]?.trim() || null
              : null;
          const rawDate =
            dateIndex >= 0
              ? values[dateIndex]?.trim() || ""
              : "";
          const transactionDate = rawDate
            ? new Date(rawDate)
            : null;

          const rawData = Object.fromEntries(
            headers.map((header, index) => [
              header || `column_${index + 1}`,
              values[index] ?? "",
            ]),
          );

          let rowStatus:
            | "MATCHED"
            | "PARTIAL"
            | "UNMATCHED"
            | "DUPLICATE"
            | "INVALID" = "UNMATCHED";
          let paymentBatchId: string | null = null;
          let reconciliationId: string | null = null;
          let exceptionReason: string | null = null;

          if (
            !normalizedReference ||
            !Number.isFinite(amount) ||
            amount < 0 ||
            (transactionDate &&
              Number.isNaN(transactionDate.getTime()))
          ) {
            rowStatus = "INVALID";
            exceptionReason =
              "Required reference/amount/date data is invalid.";
          } else if (seenReferences.has(normalizedReference)) {
            rowStatus = "DUPLICATE";
            exceptionReason =
              "Duplicate transaction reference appears within this uploaded statement.";
          } else {
            seenReferences.add(normalizedReference);

            const batch =
              batchByReference.get(normalizedReference);

            if (!batch) {
              rowStatus = "UNMATCHED";
              exceptionReason =
                "No PROCESSING or COMPLETED Enorsis payment run has this execution reference.";
            } else {
              paymentBatchId = batch.id;

              const existing =
                reconciliationByBatchId.get(batch.id);

              if (existing) {
                rowStatus = "DUPLICATE";
                reconciliationId = existing.id;
                exceptionReason =
                  "This payment run already has a reconciliation record.";
              } else {
                const expected = Number(batch.totalAmount);
                const variance = Math.abs(expected - amount);

                if (variance <= 0.005) {
                  rowStatus = "MATCHED";
                } else if (amount > 0 && amount < expected) {
                  rowStatus = "PARTIAL";
                  exceptionReason =
                    `Bank settled less than expected by ${batch.currencyCode} ${(expected - amount).toFixed(2)}.`;
                } else {
                  rowStatus = "UNMATCHED";
                  exceptionReason =
                    "Reference matched, but settlement amount does not satisfy matched or partial rules.";
                }

                const reconciliation =
                  await tx.bankPaymentReconciliation.create({
                    data: {
                      tenantId: user.tenantId,
                      paymentBatchId: batch.id,
                      statementReference,
                      bankReference: rawReference,
                      currencyCode:
                        currency ?? batch.currencyCode,
                      expectedAmount: batch.totalAmount,
                      settledAmount: amount,
                      status:
                        rowStatus === "MATCHED"
                          ? "MATCHED"
                          : rowStatus === "PARTIAL"
                            ? "PARTIAL"
                            : "UNMATCHED",
                      resolutionStatus:
                        rowStatus === "MATCHED"
                          ? "RESOLVED"
                          : "OPEN",
                      reconciliationDate:
                        transactionDate ?? new Date(),
                      notes:
                        description ??
                        "Created automatically from bank statement CSV import.",
                      recordedByUserId: user.id,
                      resolvedByUserId:
                        rowStatus === "MATCHED"
                          ? user.id
                          : null,
                      resolvedAt:
                        rowStatus === "MATCHED"
                          ? new Date()
                          : null,
                    },
                  });

                reconciliationId = reconciliation.id;
                reconciliationByBatchId.set(batch.id, {
                  id: reconciliation.id,
                  paymentBatchId: batch.id,
                });
              }
            }
          }

          if (rowStatus === "MATCHED") {
            matchedRows += 1;
          } else {
            exceptionRows += 1;
          }

          await tx.bankStatementImportRow.create({
            data: {
              tenantId: user.tenantId,
              importId: statementImport.id,
              rowNumber: rowIndex + 1,
              transactionDate:
                transactionDate &&
                !Number.isNaN(transactionDate.getTime())
                  ? transactionDate
                  : null,
              reference: rawReference || null,
              description,
              currencyCode: currency,
              amount:
                Number.isFinite(amount) && amount >= 0
                  ? amount
                  : null,
              status: rowStatus,
              paymentBatchId,
              reconciliationId,
              exceptionReason,
              rawData,
            },
          });
        }

        const finalStatus =
          exceptionRows === 0
            ? "PROCESSED"
            : matchedRows === 0
              ? "FAILED"
              : "PARTIAL";

        await tx.bankStatementImport.update({
          where: {
            id: statementImport.id,
          },
          data: {
            status: finalStatus,
            matchedRows,
            exceptionRows,
          },
        });

        return {
          importId: statementImport.id,
          matchedRows,
          exceptionRows,
          totalRows: parsed.length - 1,
          finalStatus,
        };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType: "PaymentReconciliation.StatementImported",
      recipientUserId: user.id,
      recipientAddress: null,
      title: "Bank statement import completed",
      message:
        `${file.name}: ${result.matchedRows} matched and ${result.exceptionRows} exception row(s) out of ${result.totalRows}.`,
      actionUrl:
        "/app/requisition-to-order/reconciliation",
      priority:
        result.exceptionRows > 0
          ? "HIGH"
          : "NORMAL",
      channels: ["IN_APP"],
      data: {
        importId: result.importId,
        status: result.finalStatus,
        matchedRows: result.matchedRows,
        exceptionRows: result.exceptionRows,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );

    resultMessage =
      `Imported ${result.totalRows} bank transaction(s): ${result.matchedRows} matched, ${result.exceptionRows} requiring review.`;
  } catch (error) {
    console.error("Bank statement CSV import failed", {
      tenantId: user.tenantId,
      actorUserId: user.id,
      error,
    });

    errorMessage =
      error instanceof Error
        ? error.message
        : "The bank statement could not be imported.";
  }

  if (errorMessage) {
    redirect(
      reconciliationPath(undefined, errorMessage),
    );
  }

  redirect(
    reconciliationPath(
      resultMessage ??
        "Bank statement import completed.",
    ),
  );
}

export async function manuallyMatchBankStatementRowAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const statementRowId = field(
    data,
    "statementRowId",
  );
  const paymentBatchId = field(
    data,
    "paymentBatchId",
  );
  const reviewNote = field(
    data,
    "reviewNote",
  );

  let errorMessage: string | null = null;
  let resultMessage: string | null = null;

  try {
    if (reviewNote.length < 5) {
      throw new Error(
        "Provide a short note explaining the manual match decision.",
      );
    }

    const row =
      await prisma.bankStatementImportRow.findFirst({
        where: {
          id: statementRowId,
          tenantId: user.tenantId,
          status: {
            in: [
              "UNMATCHED",
              "INVALID",
              "PARTIAL",
            ],
          },
        },
      });

    if (!row) {
      throw new Error(
        "This statement row is not available for manual matching.",
      );
    }

    if (row.reconciliationId) {
      throw new Error(
        "This statement row is already linked to a reconciliation record.",
      );
    }

    if (row.amount === null) {
      throw new Error(
        "This row does not contain a valid amount and cannot be manually matched.",
      );
    }

    const batch = await prisma.paymentBatch.findFirst({
      where: {
        id: paymentBatchId,
        tenantId: user.tenantId,
        status: {
          in: ["PROCESSING", "COMPLETED"],
        },
      },
    });

    if (!batch) {
      throw new Error(
        "The selected payment run is not eligible for reconciliation.",
      );
    }

    const existing =
      await prisma.bankPaymentReconciliation.findUnique({
        where: {
          paymentBatchId: batch.id,
        },
      });

    if (existing) {
      throw new Error(
        `Payment run ${batch.batchNumber} already has reconciliation evidence and cannot be matched to another statement row.`,
      );
    }

    const statementImport =
      await prisma.bankStatementImport.findFirst({
        where: {
          id: row.importId,
          tenantId: user.tenantId,
        },
      });

    if (!statementImport) {
      throw new Error(
        "The source bank statement import could not be verified.",
      );
    }

    const settledAmount = Number(row.amount);
    const expectedAmount = Number(batch.totalAmount);
    const variance = Math.abs(
      expectedAmount - settledAmount,
    );

    const classification =
      variance <= 0.005
        ? "MATCHED"
        : settledAmount > 0 &&
            settledAmount < expectedAmount
          ? "PARTIAL"
          : "UNMATCHED";

    const now = new Date();

    const reconciliation =
      await prisma.$transaction(async (tx) => {
        const created =
          await tx.bankPaymentReconciliation.create({
            data: {
              tenantId: user.tenantId,
              paymentBatchId: batch.id,
              statementReference:
                statementImport.statementReference,
              bankReference: row.reference,
              currencyCode:
                row.currencyCode ??
                batch.currencyCode,
              expectedAmount:
                batch.totalAmount,
              settledAmount,
              status: classification,
              resolutionStatus:
                classification === "MATCHED"
                  ? "RESOLVED"
                  : "OPEN",
              reconciliationDate:
                row.transactionDate ?? now,
              notes:
                `Manual statement-row match. ${reviewNote}`,
              recordedByUserId: user.id,
              resolvedByUserId:
                classification === "MATCHED"
                  ? user.id
                  : null,
              resolvedAt:
                classification === "MATCHED"
                  ? now
                  : null,
            },
          });

        await tx.bankStatementImportRow.update({
          where: {
            id: row.id,
          },
          data: {
            paymentBatchId: batch.id,
            reconciliationId: created.id,
            status: classification,
            exceptionReason:
              classification === "MATCHED"
                ? `Manually matched to ${batch.batchNumber}. ${reviewNote}`
                : `Manually linked to ${batch.batchNumber}; reconciliation remains ${classification}. ${reviewNote}`,
          },
        });

        const remainingExceptions =
          await tx.bankStatementImportRow.count({
            where: {
              importId: row.importId,
              tenantId: user.tenantId,
              status: {
                in: [
                  "PARTIAL",
                  "UNMATCHED",
                  "DUPLICATE",
                  "INVALID",
                ],
              },
            },
          });

        const matchedRows =
          await tx.bankStatementImportRow.count({
            where: {
              importId: row.importId,
              tenantId: user.tenantId,
              status: "MATCHED",
            },
          });

        await tx.bankStatementImport.update({
          where: {
            id: row.importId,
          },
          data: {
            matchedRows,
            exceptionRows:
              remainingExceptions,
            status:
              remainingExceptions === 0
                ? "PROCESSED"
                : matchedRows > 0
                  ? "PARTIAL"
                  : "FAILED",
          },
        });

        return created;
      });

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        classification === "MATCHED"
          ? "PaymentReconciliation.ManualMatch"
          : "PaymentReconciliation.ManualExceptionLink",
      recipientUserId: user.id,
      recipientAddress: null,
      title:
        classification === "MATCHED"
          ? "Bank row manually matched"
          : "Bank row manually linked with exception",
      message:
        `Statement row ${row.rowNumber} was linked to payment run ${batch.batchNumber} as ${classification}.`,
      actionUrl:
        "/app/requisition-to-order/reconciliation",
      priority:
        classification === "MATCHED"
          ? "NORMAL"
          : "HIGH",
      channels: ["IN_APP"],
      data: {
        statementRowId: row.id,
        paymentBatchId: batch.id,
        reconciliationId:
          reconciliation.id,
        classification,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );

    resultMessage =
      `Statement row ${row.rowNumber} linked to ${batch.batchNumber} as ${classification}.`;
  } catch (error) {
    console.error(
      "Manual bank statement row matching failed",
      {
        statementRowId,
        paymentBatchId,
        tenantId: user.tenantId,
        actorUserId: user.id,
        error,
      },
    );

    errorMessage =
      error instanceof Error
        ? error.message
        : "The statement row could not be manually matched.";
  }

  if (errorMessage) {
    redirect(
      reconciliationPath(undefined, errorMessage),
    );
  }

  redirect(
    reconciliationPath(
      resultMessage ??
        "Statement row matched successfully.",
    ),
  );
}

export async function confirmDuplicateBankStatementRowAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reconciliationRoles]);

  const statementRowId = field(
    data,
    "statementRowId",
  );
  const reviewNote = field(
    data,
    "reviewNote",
  );

  let errorMessage: string | null = null;

  try {
    if (reviewNote.length < 5) {
      throw new Error(
        "Provide a short note explaining why this row is a confirmed duplicate.",
      );
    }

    const row =
      await prisma.bankStatementImportRow.findFirst({
        where: {
          id: statementRowId,
          tenantId: user.tenantId,
          status: "DUPLICATE",
        },
      });

    if (!row) {
      throw new Error(
        "This bank statement row is not available for duplicate confirmation.",
      );
    }

    const marker =
      `[DUPLICATE_CONFIRMED:${user.id}:${new Date().toISOString()}] ${reviewNote}`;

    await prisma.bankStatementImportRow.update({
      where: {
        id: row.id,
      },
      data: {
        exceptionReason: [
          row.exceptionReason,
          marker,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType:
        "PaymentReconciliation.DuplicateConfirmed",
      recipientUserId: user.id,
      recipientAddress: null,
      title: "Duplicate bank transaction confirmed",
      message:
        `Statement row ${row.rowNumber} was confirmed as a duplicate. ${reviewNote}`,
      actionUrl:
        "/app/requisition-to-order/reconciliation",
      priority: "NORMAL",
      channels: ["IN_APP"],
      data: {
        statementRowId: row.id,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The duplicate transaction could not be confirmed.";
  }

  if (errorMessage) {
    redirect(
      reconciliationPath(undefined, errorMessage),
    );
  }

  redirect(
    reconciliationPath(
      "Duplicate bank transaction confirmed.",
    ),
  );
}
