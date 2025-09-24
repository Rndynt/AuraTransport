import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Store, Truck, LayoutGrid, Route, Calendar, DollarSign, Ticket, List, X } from "lucide-react";

// ======= Transity Mark (Tri-Hub Y-Node) =======
// Mono (stroke + nodes) mengikuti currentColor agar otomatis adaptif light/dark.
function TransityMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      role="img"
      aria-label="Transity logo"
      className={className}
    >
      <title>Transity — Tri-Hub mark</title>
      <g fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round">
        <path d="M128 140 L84 188" />
        <path d="M128 140 L172 188" />
        <path d="M128 140 L156 84" />
      </g>
      <g fill="currentColor">
        <circle cx="128" cy="140" r="12" />
        <circle cx="84" cy="188" r="10" />
        <circle cx="172" cy="188" r="10" />
        <circle cx="156" cy="84" r="10" />
      </g>
    </svg>
  );
}

const navigationItems = [
  {
    title: "Operations",
    items: [
      { name: "Reservasi", path: "/cso", icon: Ticket },
      { name: "All Bookings", path: "/bookings", icon: List },
    ]
  },
  {
    title: "Masters",
    items: [
      { name: "Stops", path: "/masters?tab=stops", icon: MapPin },
      { name: "Outlets", path: "/masters?tab=outlets", icon: Store },
      { name: "Vehicles", path: "/masters?tab=vehicles", icon: Truck },
      { name: "Layouts", path: "/masters?tab=layouts", icon: LayoutGrid },
      { name: "Trip Patterns", path: "/masters?tab=patterns", icon: Route },
      { name: "Trips", path: "/masters?tab=trips", icon: Calendar },
      { name: "Price Rules", path: "/masters?tab=pricing", icon: DollarSign },
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
            <h1 className="text-lg lg:text-xl font-bold text-primary flex items-center">
              {/* Replaced Bus icon with TransityMark */}
              <TransityMark
                className="w-8 h-8 mr-2 shrink-0"
                data-testid="logo-transity"
              />
              {/* Logo text */}
              <span className="hidden sm:inline">Transity</span>
              <span className="sm:hidden">Transity</span>
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
              className="p-1 h-8 w-8"
              data-testid="close-sidebar"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
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
                        <item.icon className="w-4 lg:w-5 h-4 lg:h-5 mr-2 lg:mr-3" />
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

