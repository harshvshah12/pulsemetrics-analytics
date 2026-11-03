import { createAdminClient } from "@/lib/supabase/admin";

export async function evaluateWorkspaceAlerts(workspaceId: string) {
  try {
    const { error } = await createAdminClient().rpc("evaluate_pulsemetrics_alerts", { p_workspace_id: workspaceId });
    if (error) console.error("Alert evaluation failed:", error.message);
  } catch (error) {
    // A notification/alert subsystem outage must not reject a successfully stored event.
    console.error("Alert evaluation unavailable:", error);
  }
}