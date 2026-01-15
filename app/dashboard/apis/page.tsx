"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DatabaseIcon, KeyIcon, ActivityIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type ApiKey = {
  id: string;
  key: string;
  name: string;
  requestQuota: number;
  requestCount: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function APIsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      } else {
        toast.error("Failed to fetch API keys");
      }
    } catch (error) {
      toast.error("Error loading API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.key);
        // Store the full key in localStorage for API calls
        localStorage.setItem("user_api_key", data.key);
        toast.success("API key created successfully!");
        setNewKeyName("");
        fetchApiKeys();
      } else {
        toast.error("Failed to create API key");
      }
    } catch (error) {
      toast.error("Error creating API key");
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/keys?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from localStorage
        localStorage.removeItem("user_api_key");
        toast.success("API key deleted successfully");
        fetchApiKeys();
      } else {
        toast.error("Failed to delete API key");
      }
    } catch (error) {
      toast.error("Error deleting API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return Math.round((used / quota) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Key</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API key and monitor usage. You can create one API key with a quota of 500 requests.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={apiKeys.length > 0}>
              <KeyIcon className="mr-2 size-4" />
              {apiKeys.length > 0 ? "Key Already Created" : "Generate API Key"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give your API key a descriptive name. You&apos;ll receive 500 requests quota. You can only create one API key per account.
              </DialogDescription>
            </DialogHeader>
            {createdKey ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">Your new API key:</p>
                  <code className="text-xs break-all">{createdKey}</code>
                </div>
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    ⚠️ Make sure to copy your API key now. You won&apos;t be able to see it again!
                  </p>
                </div>
                <Button
                  onClick={() => copyToClipboard(createdKey)}
                  className="w-full"
                  variant="outline"
                >
                  <CopyIcon className="mr-2 size-4" />
                  Copy to Clipboard
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">API Key Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production API, Development Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createApiKey()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setNewKeyName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createApiKey}>Create API Key</Button>
                </DialogFooter>
              </>
            )}
            {createdKey && (
              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setCreatedKey(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto">
              <KeyIcon className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No API key yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your API key to start using the scraper API. You can only create one key.
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <KeyIcon className="mr-2 size-4" />
              Create Your API Key
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => {
            const usagePercentage = getUsagePercentage(
              key.requestCount,
              key.requestQuota
            );
            return (
              <Card key={key.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <DatabaseIcon className="size-6 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{key.name}</h3>
                        {key.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {formatDate(key.createdAt)}
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Usage</span>
                          <span className="font-medium">
                            {key.requestCount} / {key.requestQuota} requests
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usagePercentage >= 90
                                ? "bg-red-500"
                                : usagePercentage >= 70
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${usagePercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2Icon className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this API key? This action cannot be undone and any applications using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteApiKey(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ActivityIcon className="size-4" />
                    <span>Last used: {formatDate(key.lastUsedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-3 py-1.5 rounded">
                      {key.key}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(key.key)}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
