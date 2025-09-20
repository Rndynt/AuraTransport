import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Masters",
    items: [
      { name: "Stops", path: "/masters", icon: "fas fa-map-marker-alt" },
      { name: "Outlets", path: "/masters", icon: "fas fa-store" },
      { name: "Vehicles", path: "/masters", icon: "fas fa-shuttle-van" },
      { name: "Layouts", path: "/masters", icon: "fas fa-th-large" },
      { name: "Trip Patterns", path: "/masters", icon: "fas fa-route" },
      { name: "Trips", path: "/masters", icon: "fas fa-calendar-alt" },
      { name: "Price Rules", path: "/masters", icon: "fas fa-money-bill-wave" },
    ]
  },
  {
    title: "Operations",
    items: [
      { name: "CSO Booking", path: "/cso", icon: "fas fa-ticket-alt" },
      { name: "All Bookings", path: "/bookings", icon: "fas fa-list" },
    ]
  }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const [location] = useLocation();

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div 
      id="mobile-sidebar"
      role={isMobile ? "dialog" : "navigation"}
      aria-modal={isMobile ? "true" : undefined}
      aria-label="Main navigation"
      className={cn(
        "bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
        isMobile ? [
          "fixed left-0 top-0 bottom-0 z-50 w-64 transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ] : "w-64 relative"
      )}
    >
      {/* Header with close button for mobile */}
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-primary">
              <i className="fas fa-bus mr-2"></i>
              <span className="hidden sm:inline">BusTicket Pro</span>
              <span className="sm:hidden">BTP</span>
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1 hidden lg:block">
              Multi-Stop Travel System
            </p>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
            >
              <i className="fas fa-times text-lg"></i>
            </Button>
          )}
        </div>
      </div>
      
      <nav className="flex-1 p-3 lg:p-4 overflow-y-auto">
        <div className="space-y-4 lg:space-y-6">
          {navigationItems.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 lg:mb-3">
                {section.title}
              </h3>
              <ul className="space-y-1 lg:space-y-2">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <Link href={item.path}>
                      <div
                        className={cn(
                          "flex items-center px-2 lg:px-3 py-2 lg:py-2 text-sm rounded-md transition-colors w-full cursor-pointer",
                          location === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={handleLinkClick}
                      >
                        <i className={`${item.icon} w-4 lg:w-5 mr-2 lg:mr-3 text-center`}></i>
                        <span className="truncate">{item.name}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      
      <div className="p-3 lg:p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p className="truncate">Demo Transport</p>
          <p className="hidden lg:block">Version: 1.0.0-MVP</p>
        </div>
      </div>
    </div>
  );
}
