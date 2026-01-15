"use client";

import { useSession } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name || "User"}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s happening with your scraping projects today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Total API Calls
            </span>
            <span className="text-3xl font-bold">12,345</span>
            <span className="text-xs text-muted-foreground">
              +20.1% from last month
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Active Projects
            </span>
            <span className="text-3xl font-bold">8</span>
            <span className="text-xs text-muted-foreground">
              +2 new this week
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Success Rate
            </span>
            <span className="text-3xl font-bold">98.5%</span>
            <span className="text-xs text-muted-foreground">
              +1.2% from last month
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">Movie scraper completed</p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
            <span className="text-sm text-green-600">Success</span>
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">API key generated</p>
              <p className="text-sm text-muted-foreground">5 hours ago</p>
            </div>
            <span className="text-sm text-blue-600">Info</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New project created</p>
              <p className="text-sm text-muted-foreground">1 day ago</p>
            </div>
            <span className="text-sm text-green-600">Success</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
