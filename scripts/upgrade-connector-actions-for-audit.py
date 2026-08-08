from pathlib import Path

path = Path(
    "src/modules/enterprise-automation/connector-actions.ts"
)
content = path.read_text()

if "recordAutomationConnectorAudit" in content:
    print("Connector administration audit integration already applied.")
    raise SystemExit(0)

content = content.replace(
    'import { testAutomationConnector } from "@/core/enterprise-automation/connectors/test-service";',
    'import { testAutomationConnector } from "@/core/enterprise-automation/connectors/test-service";\n'
    'import { recordAutomationConnectorAudit } from "@/core/enterprise-automation/connectors/audit-service";',
    1,
)

content = content.replace(
    '  await prisma.enterpriseAutomationConnector.create({',
    '  const created =\n    await prisma.enterpriseAutomationConnector.create({',
    1,
)

create_end = '''      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/automation/connectors");
}'''

create_new = '''      updatedByUserId: user.id,
      ownerUserId: user.id,
    },
  });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId: created.id,
    type: "CREATED",
    actorUserId: user.id,
    message: "Connector registered.",
  });

  revalidatePath("/app/automation/connectors");
}'''

if create_end not in content:
    raise SystemExit("Could not locate connector create completion anchor.")

content = content.replace(create_end, create_new, 1)

status_old = '''  await prisma.enterpriseAutomationConnector.updateMany({
    where: {
      id: field(data, "connectorId"),
      tenantId: user.tenantId,
    },
    data: {
      status: field(data, "status") as
        | "ACTIVE"
        | "DISABLED"
        | "ARCHIVED",
      updatedByUserId: user.id,
    },
  });

  revalidatePath("/app/automation/connectors");
}'''

status_new = '''  const connectorId = field(
    data,
    "connectorId",
  );

  const nextStatus = field(
    data,
    "status",
  ) as
    | "ACTIVE"
    | "DISABLED"
    | "ARCHIVED";

  await prisma.enterpriseAutomationConnector.updateMany({
    where: {
      id: connectorId,
      tenantId: user.tenantId,
    },
    data: {
      status: nextStatus,
      updatedByUserId: user.id,
    },
  });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId,
    type:
      nextStatus === "ACTIVE"
        ? "ACTIVATED"
        : nextStatus === "DISABLED"
          ? "DISABLED"
          : "ARCHIVED",
    actorUserId: user.id,
    message: `Connector status changed to ${nextStatus}.`,
  });

  revalidatePath("/app/automation/connectors");
}'''

if status_old not in content:
    raise SystemExit("Could not locate connector status action anchor.")

content = content.replace(status_old, status_new, 1)

test_old = '''  await testAutomationConnector({
    tenantId: user.tenantId,
    connectorId: field(data, "connectorId"),
  });

  revalidatePath("/app/automation/connectors");
}'''

test_new = '''  const connectorId = field(
    data,
    "connectorId",
  );

  const result =
    await testAutomationConnector({
      tenantId: user.tenantId,
      connectorId,
    });

  await recordAutomationConnectorAudit({
    tenantId: user.tenantId,
    connectorId,
    type: "TESTED",
    actorUserId: user.id,
    message:
      result.message ??
      (result.ok
        ? "Connector test passed."
        : "Connector test failed."),
    metadata: {
      ok: result.ok,
    },
  });

  revalidatePath("/app/automation/connectors");
}'''

if test_old not in content:
    raise SystemExit("Could not locate connector test action anchor.")

content = content.replace(test_old, test_new, 1)
path.write_text(content)
print("Connector administration audit integration applied.")
