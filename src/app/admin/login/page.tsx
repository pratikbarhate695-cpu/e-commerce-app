import { AdminLoginForm } from "@/components/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-6">
      <div className="w-full max-w-xs">
        <p className="text-sm text-slate-500">Store operator access</p>
        <h1 className="mt-1 text-2xl font-medium text-slate-100">
          Admin sign in
        </h1>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
