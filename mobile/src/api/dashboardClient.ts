import apiClient from "./client";
import { DASHBOARD } from "./endpoints";
import { useAuthStore } from "../stores/authStore";

function withSalonHeaders() {
  const salonId = useAuthStore.getState().salonId;
  return salonId ? { "X-Salon-Id": salonId } : {};
}

function dashboardPath(path: string) {
  return `${DASHBOARD.root.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function fetchDashboardStaffList() {
  const { data } = await apiClient.get(dashboardPath("salon-masters"), { headers: withSalonHeaders() });
  return data as any[];
}

export async function fetchDashboardSchedule() {
  const { data } = await apiClient.get(dashboardPath("schedule"), { headers: withSalonHeaders() });
  return data as any;
}

export async function fetchDashboardSalonProfile() {
  const { data } = await apiClient.get(dashboardPath("salon/profile"), { headers: withSalonHeaders() });
  return data as any;
}
