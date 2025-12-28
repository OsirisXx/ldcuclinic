import { Header } from "./Header";
import { Footer } from "./Footer";
import type { Tables } from "~/types/database.types";

interface LayoutProps {
  user: Tables<"profiles"> | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Layout({ user, onLogout, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
