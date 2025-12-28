import { Link, useNavigate, NavLink } from "@remix-run/react";
import { LogOut, Menu, X, Calendar, User, Settings, History, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui";

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Calendar },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "My Appointments", href: "/appointments", icon: History },
  ];

  const adminNavigation = [
    { name: "Admin", href: "/admin", icon: Settings },
    { name: "Users", href: "/users", icon: Users },
  ];

  return (
    <header className="bg-maroon-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-maroon-900 font-bold text-lg">L</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">Liceo Clinic</h1>
                <p className="text-xs text-gold-300">Scheduling System</p>
              </div>
            </Link>
          </div>

          {user && (
            <>
              <nav className="hidden md:flex items-center space-x-4">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    prefetch="intent"
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700 transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
                {(user.role === "admin" || user.role === "doctor" || user.role === "nurse") &&
                  adminNavigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      prefetch="intent"
                      className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
              </nav>

              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-maroon-900" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gold-300 capitalize">{user.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-white hover:bg-maroon-700"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>

              <button
                className="md:hidden p-2 rounded-lg hover:bg-maroon-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          )}

          {!user && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-white hover:bg-maroon-700"
              >
                Login
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/register")}
              >
                Register
              </Button>
            </div>
          )}
        </div>

        {mobileMenuOpen && user && (
          <div className="md:hidden py-4 border-t border-maroon-700">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              {(user.role === "admin" || user.role === "doctor" || user.role === "nurse") &&
                adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700 text-left w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
