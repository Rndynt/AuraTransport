import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

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

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">
          <i className="fas fa-bus mr-2"></i>
          BusTicket Pro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-Stop Travel System</p>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-6">
          {navigationItems.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <Link href={item.path}>
                      <a
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                          location === item.path
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <i className={`${item.icon} w-5 mr-3`}></i>
                        {item.name}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>Tenant: Demo Transport</p>
          <p>Version: 1.0.0-MVP</p>
        </div>
      </div>
    </div>
  );
}
