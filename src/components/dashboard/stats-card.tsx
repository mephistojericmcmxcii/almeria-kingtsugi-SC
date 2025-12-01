
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface StatsCardProps {
    title: string;
    value: string | number | React.ReactNode;
    description: string;
    icon: LucideIcon | React.ComponentType;
    isLoading?: boolean;
}

export function StatsCard({ title, value, description, icon: Icon, isLoading }: StatsCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">
                    <Icon />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
                {!isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

    