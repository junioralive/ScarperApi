"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Key, Plus, Trash2, Eye, EyeOff, Copy, User } from 'lucide-react';
import { ApiKey } from '@/lib/db/schema';

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [userRequestsUsed, setUserRequestsUsed] = useState(0);
  const [userRequestsLimit, setUserRequestsLimit] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/api-keys?userId=${user.uid}`);
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.apiKeys || []);
        // Use user data with proper fallbacks to avoid NaN
        setUserRequestsUsed(Number(data.user?.requestsUsed) || 0);
        setUserRequestsLimit(Number(data.user?.requestsLimit) || 1000);
      } else {
        setError(data.error || 'Failed to fetch API keys');
      }
    } catch (error) {
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) return;

    try {
      setCreating(true);
      setError('');

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          keyName: newKeyName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setApiKeys([...apiKeys, data.apiKey]);
        setNewKeyName('');
        setIsDialogOpen(false);
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (error) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/api-keys?userId=${user.uid}&keyId=${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
      } else {
        setError(data.error || 'Failed to delete API key');
      }
    } catch (error) {
      setError('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatKeyValue = (keyValue: string, keyId: string) => {
    if (visibleKeys.has(keyId)) {
      return keyValue;
    }
    return `${keyValue.slice(0, 8)}${'*'.repeat(32)}${keyValue.slice(-8)}`;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b">
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        {/* User Request Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Request Usage
            </CardTitle>
            <CardDescription>
              Total requests used across all your API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Usage</span>
                <span className="text-sm text-muted-foreground">
                  {userRequestsUsed.toLocaleString()} / {userRequestsLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((userRequestsUsed / userRequestsLimit) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((userRequestsUsed / userRequestsLimit) * 100) || 0}% used
                {userRequestsUsed >= userRequestsLimit && (
                  <span className="text-destructive ml-2">• Limit reached</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground">
              Manage your API keys for accessing our services
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={userRequestsUsed >= userRequestsLimit}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Give your API key a name to help you identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="My API Key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createApiKey}
                  disabled={creating || !newKeyName.trim()}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Your API Keys
            </CardTitle>
            <CardDescription>
              All API keys share your total request limit of {userRequestsLimit.toLocaleString()} requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading API keys...</span>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                  <Key className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  You haven't created any API keys yet. Create one to get started with our API services.
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  size="lg"
                  disabled={userRequestsUsed >= userRequestsLimit}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Key
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-6">Name</TableHead>
                      <TableHead className="h-12">Key</TableHead>
                      <TableHead className="h-12">Status</TableHead>
                      <TableHead className="h-12">Created</TableHead>
                      <TableHead className="h-12 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium px-6 py-4">{apiKey.keyName}</TableCell>
                        <TableCell className="font-mono text-sm py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {formatKeyValue(apiKey.keyValue, apiKey.id)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              className="h-8 w-8 p-0"
                            >
                              {visibleKeys.has(apiKey.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey.keyValue)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant={apiKey.isActive ? "default" : "secondary"} className="font-medium">
                            {apiKey.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">
                          {new Date(apiKey.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
