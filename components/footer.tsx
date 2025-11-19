import { Separator } from "@/components/ui/separator"

export default function Footer() {
  return (
    <div className="bg-footer text-footer-foreground text-center py-2">
      <Separator className="bg-footer-separator mb-3" />
      <p className="text-xs">© 2025 Laboratory Management System. Built with ❤️ for agricultural excellence.</p>
      <p className="text-[0.65rem] text-footer-version mt-1">Version 1.0.0 | Last updated: July 2025</p>
    </div>
  )
}
