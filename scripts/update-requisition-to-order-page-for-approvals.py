from pathlib import Path


QUERY_PATH = Path(
    "src/modules/requisition-to-order/queries.ts"
)
PAGE_PATH = Path(
    "src/app/app/requisition-to-order/page.tsx"
)


def find_matching_brace(
    content: str,
    opening_index: int,
) -> int:
    depth = 0

    for index in range(opening_index, len(content)):
        character = content[index]

        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1

            if depth == 0:
                return index

    raise SystemExit("Could not locate matching closing brace.")


def update_query() -> None:
    if not QUERY_PATH.exists():
        raise SystemExit(
            f"Could not locate {QUERY_PATH}."
        )

    content = QUERY_PATH.read_text()

    if "approvalRoutes:" in content:
        print(
            "Approval routes are already included in the query."
        )
        return

    assessments_anchor = "submissionAssessments:"

    if assessments_anchor in content:
        start = content.find(assessments_anchor)
        opening = content.find("{", start)

        if opening == -1:
            raise SystemExit(
                "Could not locate submissionAssessments opening brace."
            )

        closing = find_matching_brace(content, opening)

        comma = content.find(",", closing)

        if comma == -1:
            raise SystemExit(
                "Could not locate submissionAssessments trailing comma."
            )

        insertion_index = comma + 1
    else:
        exceptions_anchor = "exceptions:"

        if exceptions_anchor not in content:
            raise SystemExit(
                "Could not locate submissionAssessments "
                "or exceptions query anchor."
            )

        start = content.find(exceptions_anchor)
        opening = content.find("{", start)

        if opening == -1:
            raise SystemExit(
                "Could not locate exceptions opening brace."
            )

        closing = find_matching_brace(content, opening)
        comma = content.find(",", closing)

        if comma == -1:
            raise SystemExit(
                "Could not locate exceptions trailing comma."
            )

        insertion_index = comma + 1

    relation = """
      approvalRoutes: {
        include: {
          steps: {
            include: {
              decisions: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
            orderBy: {
              sequence: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },"""

    content = (
        content[:insertion_index]
        + relation
        + content[insertion_index:]
    )

    QUERY_PATH.write_text(content)
    print(
        "Added approvalRoutes to the "
        "Requisition-to-Order query."
    )


def update_page() -> None:
    if not PAGE_PATH.exists():
        raise SystemExit(
            f"Could not locate {PAGE_PATH}."
        )

    content = PAGE_PATH.read_text()

    import_statement = (
        'import { ApprovalOrchestrationPanel } '
        'from "./approval-orchestration-panel";\n'
    )

    if "ApprovalOrchestrationPanel" not in content:
        import_anchor = (
            'import { getRequisitionToOrderWorkspace }'
        )

        start = content.find(import_anchor)

        if start == -1:
            raise SystemExit(
                "Could not locate page import anchor."
            )

        line_end = content.find("\n", start)

        if line_end == -1:
            raise SystemExit(
                "Could not locate end of query import."
            )

        content = (
            content[: line_end + 1]
            + import_statement
            + content[line_end + 1 :]
        )

    panel_marker = (
        "approvalRoutes={journey.approvalRoutes}"
    )

    if panel_marker not in content:
        purchase_request_marker = (
            "assessments={journey.submissionAssessments}"
        )

        marker_index = content.find(
            purchase_request_marker
        )

        if marker_index != -1:
            component_end = content.find(
                "/>",
                marker_index,
            )

            if component_end == -1:
                raise SystemExit(
                    "Could not locate end of "
                    "PurchaseRequestPanel."
                )

            insertion_index = component_end + 2
        else:
            milestones_anchor = (
                '<div className="mt-5 border-t '
                'border-slate-200 pt-4">'
            )

            insertion_index = content.find(
                milestones_anchor
            )

            if insertion_index == -1:
                raise SystemExit(
                    "Could not locate page panel anchor."
                )

        panel = """

              <ApprovalOrchestrationPanel
                journeyId={journey.id}
                purchaseRequestId={
                  journey.purchaseRequestId
                }
                approvalRoutes={
                  journey.approvalRoutes
                }
              />
"""

        content = (
            content[:insertion_index]
            + panel
            + content[insertion_index:]
        )

    PAGE_PATH.write_text(content)
    print(
        "Added ApprovalOrchestrationPanel "
        "to the Requisition-to-Order page."
    )


update_query()
update_page()

print(
    "Approval orchestration page integration completed."
)
