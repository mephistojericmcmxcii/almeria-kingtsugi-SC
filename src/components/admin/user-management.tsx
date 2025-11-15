
"use client"

import { useState } from "react"
import { MoreHorizontal, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import type { User } from "@/lib/types"
import { collection } from "firebase/firestore"
import { Skeleton } from "../ui/skeleton"
import { AddAdminDialog } from "./add-admin-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth"


const getInitials = (name?: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0] ? names[0].substring(0, 2) : '';
};

export function UserManagement() {
  const { firestore, user: currentUser } = useFirebase();
  const { updateUserRole } = useAuth();
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState<{user: User, newRole: 'admin' | 'guest'} | null>(null);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersCollectionRef);

  const handleRoleChangeConfirm = async () => {
    if (!userToUpdate) return;
    await updateUserRole(userToUpdate.user.id, userToUpdate.newRole);
    setUserToUpdate(null);
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline">Users</CardTitle>
              <CardDescription>Manage your portal users and their roles.</CardDescription>
            </div>
            <Button onClick={() => setIsAddAdminDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                </>
              )}
              {users?.map((user) => (
                  <TableRow key={user.email}>
                      <TableCell>
                          <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.profileImageUrl} alt={user.displayName} />
                                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="font-medium">{user.displayName}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.id === currentUser?.uid}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Toggle menu</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {user.role === 'admin' ? (
                                    <DropdownMenuItem onSelect={() => setUserToUpdate({user, newRole: 'guest'})} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                        Revoke Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onSelect={() => setUserToUpdate({user, newRole: 'admin'})}>
                                        Grant Admin
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddAdminDialog isOpen={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen} />

      <AlertDialog open={!!userToUpdate} onOpenChange={(open) => !open && setUserToUpdate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will change the role for <span className="font-bold">{userToUpdate?.user.displayName}</span> to <span className="font-bold">{userToUpdate?.newRole}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRoleChangeConfirm}>
                    Confirm
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
