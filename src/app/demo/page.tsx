import { DemoDashboardShell } from "@/components/demo/demo-dashboard-shell";
import { demoDashboardData } from "@/lib/demo-data";

export default function DemoPage() {
  return <DemoDashboardShell data={demoDashboardData} />;
}

