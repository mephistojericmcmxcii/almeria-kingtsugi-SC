"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function SystemSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">System Settings</CardTitle>
        <CardDescription>Configure global settings for the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="maintenance-mode" className="text-base">Maintenance Mode</Label>
            <p className="text-sm text-muted-foreground">
                Temporarily disable access to the portal for all users.
            </p>
          </div>
          <Switch id="maintenance-mode" />
        </div>

        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="new-registrations" className="text-base">Enable New Registrations</Label>
            <p className="text-sm text-muted-foreground">
                Allow new users to sign up for guest accounts.
            </p>
          </div>
          <Switch id="new-registrations" defaultChecked />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="api-key">Third-Party API Key</Label>
            <Input id="api-key" placeholder="Enter your API key" />
            <p className="text-sm text-muted-foreground">
                API key for external service integrations.
            </p>
        </div>

      </CardContent>
      <CardFooter>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}
