"use client"

import DashboardNavbar from "@/components/dashboard-navbar"
import { usePathname } from "next/navigation"
import { Beaker, FileText, BarChart3, Calendar, AlertTriangle, LayoutDashboard } from "lucide-react"

const navItems = [
  {
    title: "Overview",
    href: "/logistics/cmo",
    icon: <Beaker className="h-5 w-5" />,
    exact: true,
  },
  {
    title: "Chemical Inventory",
    href: "/logistics/cmo/chemical-inventory",
    icon: <Beaker className="h-5 w-5" />,
  },
  {
    title: "Safety Data Sheets",
    href: "/logistics/cmo/safety-data-sheets",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Usage Analytics",
    href: "/logistics/cmo/usage-analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Order Management",
    href: "/logistics/cmo/order-management",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Hazard Management",
    href: "/logistics/cmo/hazard-management",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    title: "Dashboard",
    href: "/logistics/cmo/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
]

export function CMONavbar() {
  const pathname = usePathname()

  return <DashboardNavbar />
}
