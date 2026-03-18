"use client";

import * as React from "react";
import { Plus, RefreshCw, Shield, Building2, UserCheck, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { extractError } from "@/lib/error-utils";

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  full_name: string | null;
  company_name: string | null;
  sheet_id: string | null;
  sheet_range: string | null;
};

type CreateRole = "client" | "accountant";

function roleIcon(role: string) {
  if (role === "admin") return Shield;
  if (role === "accountant") return UserCheck;
  return Building2;
}

function displayName(u: ProfileRow) {
  return u.company_name || u.full_name || u.email;
}

export function AdminUsers({ initialUsers }: { initialUsers: ProfileRow[] }) {
  const [users, setUsers] = React.useState<ProfileRow[]>(initialUsers);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => setQuery(queryInput), 300);
    return () => clearTimeout(handler);
  }, [queryInput]);

  const [createRole, setCreateRole] = React.useState<CreateRole>("client");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createFullName, setCreateFullName] = React.useState("");
  const [createCompanyName, setCreateCompanyName] = React.useState("");
  const [createSheetId, setCreateSheetId] = React.useState("");

  const [sheetEdits, setSheetEdits] = React.useState<Record<string, { sheet_id: string; sheet_range: string }>>({});

  const refresh = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json: unknown = await res.json();
      if (!res.ok) throw new Error(extractError(json, "Failed"));
      setUsers((json as { users: ProfileRow[] }).users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setBusy(false);
    }
  }, []);

  const createUser = async () => {
    setBusy(true);
    setError(null);
    try {
      const body =
        createRole === "accountant"
          ? { role: "accountant", email: createEmail, password: createPassword, fullName: createFullName }
          : { role: "client", email: createEmail, password: createPassword, companyName: createCompanyName, sheetId: createSheetId || undefined };

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error(extractError(json, "Create failed"));

      setCreateEmail("");
      setCreatePassword("");
      setCreateFullName("");
      setCreateCompanyName("");
      setCreateSheetId("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const patchUser = async (id: string, payload: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error(extractError(json, "Update failed"));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json: unknown = await res.json();
      if (!res.ok) throw new Error(extractError(json, "Delete failed"));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = displayName(u).toLowerCase();
      return u.email.toLowerCase().includes(q) || name.includes(q) || u.role.toLowerCase().includes(q);
    });
  }, [users, query]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-medium">Error</div>
          <div className="text-muted-foreground">{error}</div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Create user</CardTitle>
          <CardDescription>Clients are read-only; accountants can manage client sheets; admin manages everything.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant={createRole === "client" ? "default" : "outline"} size="sm" onClick={() => setCreateRole("client")}>
              Client
            </Button>
            <Button type="button" variant={createRole === "accountant" ? "default" : "outline"} size="sm" onClick={() => setCreateRole("accountant")}>
              Accountant
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-6">
            <Input className="sm:col-span-2" placeholder="Email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
            <Input className="sm:col-span-2" placeholder="Password (min 10 chars)" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
            {createRole === "accountant" ? (
              <Input className="sm:col-span-2" placeholder="Full name" value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} />
            ) : (
              <>
                <Input className="sm:col-span-1" placeholder="Company" value={createCompanyName} onChange={(e) => setCreateCompanyName(e.target.value)} />
                <Input className="sm:col-span-1" placeholder="Sheet ID (optional)" value={createSheetId} onChange={(e) => setCreateSheetId(e.target.value)} />
              </>
            )}
            <div className="sm:col-span-6 flex gap-2">
              <Button type="button" onClick={createUser} disabled={busy || !createEmail || !createPassword}>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
              <Button type="button" variant="outline" onClick={refresh} disabled={busy}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Input className="w-full sm:w-80" placeholder="Search…" value={queryInput} onChange={(e) => setQueryInput(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>User directory</CardTitle>
          <CardDescription>Activate/disable, change role, and configure Sheets for clients.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 sm:hidden mb-4">
            {filtered.map((u) => {
              const Icon = roleIcon(u.role);
              const edit = sheetEdits[u.id] ?? {
                sheet_id: u.sheet_id ?? "",
                sheet_range: u.sheet_range ?? "expenses!B3:F1000",
              };
              const sheetDirty = (edit.sheet_id ?? "") !== (u.sheet_id ?? "") || (edit.sheet_range ?? "") !== (u.sheet_range ?? "");

              return (
                <div key={u.id} className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-4 transition-base hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary ring-1 ring-primary/15 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-base">{displayName(u)}</div>
                      <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      {u.role === "admin" ? (
                        <span className="text-sm font-medium">admin</span>
                      ) : (
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                          value={u.role}
                          onChange={(e) => patchUser(u.id, { action: "updateRole", role: e.target.value })}
                          disabled={busy}
                        >
                          <option value="client">client</option>
                          <option value="accountant">accountant</option>
                        </select>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={u.active ? "outline" : "default"}
                      onClick={() => patchUser(u.id, { action: "setStatus", active: !u.active })}
                      disabled={busy || u.role === "admin"}
                    >
                      {u.active ? "Active" : "Disabled"}
                    </Button>
                  </div>

                  {u.role === "client" ? (
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Sheet Configuration:</div>
                      <Input
                        placeholder="Sheet ID"
                        value={edit.sheet_id}
                        onChange={(e) =>
                          setSheetEdits((m) => ({ ...m, [u.id]: { ...edit, sheet_id: e.target.value } }))
                        }
                      />
                      <Input
                        placeholder="expenses!B3:F1000"
                        value={edit.sheet_range}
                        onChange={(e) =>
                          setSheetEdits((m) => ({ ...m, [u.id]: { ...edit, sheet_range: e.target.value } }))
                        }
                      />
                      <Button
                        type="button"
                        className="mt-1"
                        size="sm"
                        variant="default"
                        onClick={() => patchUser(u.id, { action: "updateSheet", sheetId: edit.sheet_id, sheetRange: edit.sheet_range })}
                        disabled={busy || !sheetDirty || !edit.sheet_id.trim()}
                      >
                        <Save className="mr-2 h-4 w-4" /> Save Config
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex justify-end pt-2 border-t mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this user? Their account will be permanently removed.")) {
                          deleteUser(u.id);
                        }
                      }}
                      disabled={busy || u.role === "admin"}
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete User
                    </Button>
                  </div>
                </div>
              );
            })}
            {!filtered.length ? (
              <div className="py-10 text-center text-sm md:text-base text-muted-foreground border rounded-lg">
                No users found.
              </div>
            ) : null}
          </div>

          <div className="hidden sm:block overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Sheet</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const Icon = roleIcon(u.role);
                const edit = sheetEdits[u.id] ?? {
                  sheet_id: u.sheet_id ?? "",
                  sheet_range: u.sheet_range ?? "expenses!B3:F1000",
                };
                const sheetDirty = (edit.sheet_id ?? "") !== (u.sheet_id ?? "") || (edit.sheet_range ?? "") !== (u.sheet_range ?? "");

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 text-sm md:text-base">
                          <div className="font-medium truncate">{displayName(u)}</div>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      {u.role === "admin" ? (
                        <span className="text-sm md:text-base font-medium">admin</span>
                      ) : (
                        <select
                          className="h-9 rounded-md border bg-background px-2 text-sm md:text-base"
                          value={u.role}
                          onChange={(e) => patchUser(u.id, { action: "updateRole", role: e.target.value })}
                          disabled={busy}
                        >
                          <option value="client">client</option>
                          <option value="accountant">accountant</option>
                        </select>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant={u.active ? "outline" : "default"}
                        onClick={() => patchUser(u.id, { action: "setStatus", active: !u.active })}
                        disabled={busy || u.role === "admin"}
                      >
                        {u.active ? "Active" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell min-w-[180px] sm:min-w-[340px]">
                      {u.role === "client" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Sheet ID"
                            value={edit.sheet_id}
                            onChange={(e) =>
                              setSheetEdits((m) => ({ ...m, [u.id]: { ...edit, sheet_id: e.target.value } }))
                            }
                          />
                          <Input
                            placeholder="expenses!B3:F1000"
                            value={edit.sheet_range}
                            onChange={(e) =>
                              setSheetEdits((m) => ({ ...m, [u.id]: { ...edit, sheet_range: e.target.value } }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        {u.role === "client" ? (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() => patchUser(u.id, { action: "updateSheet", sheetId: edit.sheet_id, sheetRange: edit.sheet_range })}
                            disabled={busy || !sheetDirty || !edit.sheet_id.trim()}
                            title="Save sheet config"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this user? Their account will be permanently removed.")) {
                              deleteUser(u.id);
                            }
                          }}
                          disabled={busy || u.role === "admin"}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

