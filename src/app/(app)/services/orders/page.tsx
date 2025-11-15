
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import type { Order, OrderStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, ShieldAlert } from 'lucide-react';

export default function AdminOrdersPage() {
  const { user, firestore, updateOrderStatus } = useAuth();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const ordersCollectionGroup = useMemoFirebase(
    () => (user?.role === 'admin' ? collectionGroup(firestore, 'orders') : null),
    [firestore, user?.role]
  );
  const { data: orders, isLoading } = useCollection<Order>(
    ordersCollectionGroup
  );

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort(
      (a, b) => b.orderDate.toMillis() - a.orderDate.toMillis()
    );
  }, [orders]);

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

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    setIsUpdating(order.id);
    await updateOrderStatus(order, newStatus);
    setIsUpdating(null);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-50">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500 text-blue-50">Confirmed</Badge>;
      case 'delivering':
        return <Badge className="bg-purple-500 text-purple-50">Delivering</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 text-green-50">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ShoppingCart className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Customer Orders
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            View and manage all orders placed by customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-10 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id}
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{order.userDisplayName}</div>
                        <div className="text-sm text-muted-foreground">{order.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      {format(order.orderDate.toDate(), 'MMM d, yyyy, h:mm a')}
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                        {order.status !== 'completed' && order.status !== 'cancelled' ? (
                        <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order, value as OrderStatus)}
                            disabled={isUpdating === order.id}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Change status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {order.status === 'pending' && <SelectItem value="confirmed">Confirm Order</SelectItem>}
                                {order.status === 'confirmed' && <SelectItem value="delivering">Mark as Delivering</SelectItem>}
                                {order.status === 'delivering' && <SelectItem value="completed">Mark as Completed</SelectItem>}
                                <SelectItem value="cancelled">Cancel Order</SelectItem>
                            </SelectContent>
                        </Select>
                        ) : (
                            <span className="text-sm text-muted-foreground">No actions</span>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
