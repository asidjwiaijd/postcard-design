import { isAdmin } from "@/lib/session";
import { ADMIN_PASSWORD } from "@/lib/adminAuth";
import { AdminLogin } from "./AdminLogin";
import { AdminApp } from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin configured={!!ADMIN_PASSWORD} />;
  }
  return <AdminApp />;
}
