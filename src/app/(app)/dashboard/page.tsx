import { StatsCard } from "@/components/dashboard/stats-card";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
import RevenueChart from "@/components/dashboard/revenue-chart";
import RecentSales from "@/components/dashboard/recent-sales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                title="Total Revenue"
                value="$45,231.89"
                description="+20.1% from last month"
                icon={DollarSign}
            />
            <StatsCard
                title="Subscriptions"
                value="+2350"
                description="+180.1% from last month"
                icon={Users}
            />
            <StatsCard
                title="Sales"
                value="+12,234"
                description="+19% from last month"
                icon={CreditCard}
            />
            <StatsCard
                title="Active Now"
                value="+573"
                description="+201 since last hour"
                icon={Activity}
            />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle className="font-headline">Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <RevenueChart />
                </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                    <CardTitle className="font-headline">Recent Sales</CardTitle>
                    <CardDescription>
                        You made 265 sales this month.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentSales />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
