import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage, default to false
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const isMobile = useIsMobile();

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen && isMobile) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen, isMobile]);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 lg:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Desktop collapse toggle button */}
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 h-10 w-10 text-foreground hover:bg-muted border border-border focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  data-testid="toggle-sidebar-collapse"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-5 h-5" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5" />
                  )}
                </Button>
              )}
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 h-10 w-10 text-foreground hover:bg-muted border border-border focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-expanded={sidebarOpen}
                  aria-controls="mobile-sidebar"
                  aria-label="Toggle sidebar"
                  data-testid="open-sidebar"
                >
                  <Menu className="w-5 h-5" style={{ fill: 'currentColor' }} />
                </Button>
              )}
              <div>
                <h2 className="text-base lg:text-lg font-semibold text-foreground">
                  CSO Booking Terminal
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
                  Issue tickets for multi-stop routes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="text-xs lg:text-sm text-muted-foreground hidden md:flex items-center">
                <i className="fas fa-user-circle mr-1 lg:mr-2"></i>
                <span className="hidden lg:inline">CSO User</span>
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground flex items-center">
                <i className="fas fa-calendar mr-1 lg:mr-2"></i>
                <span className="hidden sm:inline">{new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
