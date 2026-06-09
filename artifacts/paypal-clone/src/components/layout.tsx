import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Logo } from "./logo";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const baseLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/send", label: "Send" },
    { href: "/request", label: "Request" },
    { href: "/wallet", label: "Wallet" },
    { href: "/activity", label: "Activity" },
    { href: "/resolution-centre", label: "Resolution Centre" },
  ];
  const links = (user as any)?.isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin" }]
    : baseLinks;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa]">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold text-xl">
                <Logo className="h-8 w-8" />
                <span className="font-extrabold tracking-tight">PayPal</span>
              </Link>
              
              <nav className="hidden md:flex gap-1">
                {links.map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-white/20 ${location === link.href ? "bg-white/10" : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden md:flex items-center gap-4">
                  <div className="text-sm font-medium opacity-90">Hi, {user.firstName}</div>
                  <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={() => logout()}>
                    Log Out
                  </Button>
                </div>
              )}
              <button 
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-primary text-white py-4 px-4 shadow-lg border-t border-white/10">
          <nav className="flex flex-col gap-2">
            {links.map(link => (
              <Link 
                key={link.href} 
                href={link.href}
                className="px-4 py-3 rounded-md text-base font-medium hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-white/20 my-2" />
            <button className="text-left px-4 py-3 text-base font-medium hover:bg-white/10 rounded-md" onClick={() => logout()}>
              Log Out
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-5 border-b border-gray-200">
            <div className="flex items-center gap-6">
              <span className="font-extrabold text-[#003087] text-xl tracking-tight">PayPal</span>
              <nav className="flex gap-6">
                <a href="#" className="text-sm text-gray-700 hover:text-[#0070ba] font-medium">Help</a>
                <a href="#" className="text-sm text-gray-700 hover:text-[#0070ba] font-medium">Contact</a>
                <a href="#" className="text-sm text-gray-700 hover:text-[#0070ba] font-medium">Security</a>
              </nav>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <p className="text-xs text-gray-500">©1999-{new Date().getFullYear()} PayPal, Inc. All rights reserved.</p>
            <nav className="flex gap-5">
              <a href="#" className="text-xs text-gray-500 hover:text-[#0070ba]">Privacy</a>
              <a href="#" className="text-xs text-gray-500 hover:text-[#0070ba]">Cookies</a>
              <a href="#" className="text-xs text-gray-500 hover:text-[#0070ba]">Legal</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
