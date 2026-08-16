import { redirect } from "next/navigation";

export default function SettlementsPage() {
  redirect(
    "/app/requisition-to-order/payments?view=settlements",
  );
}
