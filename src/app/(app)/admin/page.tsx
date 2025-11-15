"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/user-management";
import { SystemSettings } from "@/components/admin/system-settings";
import { ShieldAlert } from "lucide-react";

export default function AdminPage() {
    const { user } = useAuth();

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                 <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-3xl font-bold font-headline text-destructive">Access Denied</h1>
                <p className="text-muted-foreground mt-2">
                    You do not have permission to view this page.
                </p>
            </div>
        )
    }

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Panel</h1>
        <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="space-y-4">
                <UserManagement />
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
                <SystemSettings />
            </TabsContent>
        </Tabs>
    </div>
  );
}
