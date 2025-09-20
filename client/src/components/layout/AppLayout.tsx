import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">CSO Booking Terminal</h2>
              <p className="text-sm text-muted-foreground">Issue tickets for multi-stop routes</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                <i className="fas fa-user-circle mr-2"></i>
                CSO User
              </div>
              <div className="text-sm text-muted-foreground">
                <i className="fas fa-calendar mr-2"></i>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
