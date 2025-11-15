import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

const salesData = [
    { name: "Olivia Martin", email: "olivia.martin@email.com", amount: "+$1,999.00", avatar: "https://picsum.photos/seed/olivia/40/40" },
    { name: "Jackson Lee", email: "jackson.lee@email.com", amount: "+$39.00", avatar: "https://picsum.photos/seed/jackson/40/40" },
    { name: "Isabella Nguyen", email: "isabella.nguyen@email.com", amount: "+$299.00", avatar: "https://picsum.photos/seed/isabella/40/40" },
    { name: "William Kim", email: "will@email.com", amount: "+$99.00", avatar: "https://picsum.photos/seed/william/40/40" },
    { name: "Sofia Davis", email: "sofia.davis@email.com", amount: "+$39.00", avatar: "https://picsum.photos/seed/sofia/40/40" },
]

function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`;
    }
    return names[0].substring(0, 2);
}

export default function RecentSales() {
  return (
    <div className="space-y-8">
      {salesData.map((sale) => (
        <div className="flex items-center" key={sale.email}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={sale.avatar} alt="Avatar" />
            <AvatarFallback>{getInitials(sale.name)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.name}</p>
            <p className="text-sm text-muted-foreground">{sale.email}</p>
          </div>
          <div className="ml-auto font-medium">{sale.amount}</div>
        </div>
      ))}
    </div>
  )
}
