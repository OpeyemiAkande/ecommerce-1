"use client";

import {useQuery} from "@tanstack/react-query";
import {
  IoBagHandleOutline,
  IoCashOutline,
  IoCubeOutline,
  IoPeopleOutline
} from "react-icons/io5";
import {Badge} from "@/components/admin/Badge";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {capitalizeText, orderStatusTone} from "@/lib/admin/utils";
import {formatDate, formatPrice} from "@/lib/format";

export default function DashboardPage() {
  const api = useAdminApi();

  const {data: stats, isLoading: statsLoading} = useQuery({
    queryKey: ["dashboardStats"],
    enabled: api.ready,
    queryFn: api.stats.dashboard
  });

  const {data: ordersData, isLoading: ordersLoading} = useQuery({
    queryKey: ["admin", "orders"],
    enabled: api.ready,
    queryFn: api.orders.list
  });

  const recentOrders = ordersData?.orders.slice(0, 5) ?? [];

  const cards = [
    {
      name: "Total Revenue",
      value: statsLoading ? "..." : formatPrice(stats?.totalRevenue ?? 0),
      icon: IoCashOutline
    },
    {
      name: "Total Orders",
      value: statsLoading ? "..." : (stats?.totalOrders ?? 0),
      icon: IoBagHandleOutline
    },
    {
      name: "Total Customers",
      value: statsLoading ? "..." : (stats?.totalCustomers ?? 0),
      icon: IoPeopleOutline
    },
    {
      name: "Total Products",
      value: statsLoading ? "..." : (stats?.totalProducts ?? 0),
      icon: IoCubeOutline
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({name, value, icon: Icon}) => (
          <div key={name} className="card flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-text-secondary">{name}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
            <Icon size={32} className="text-primary-text" />
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Recent Orders</h2>

        {ordersLoading ? (
          <Spinner />
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-text-secondary">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="font-medium">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <div className="font-medium">
                        {order.shippingAddress.fullName}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {order.orderItems.length} item(s)
                      </div>
                    </td>
                    <td>
                      {order.orderItems[0]?.name}
                      {order.orderItems.length > 1 &&
                        ` +${order.orderItems.length - 1} more`}
                    </td>
                    <td className="font-semibold">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td>
                      <Badge tone={orderStatusTone(order.status)}>
                        {capitalizeText(order.status)}
                      </Badge>
                    </td>
                    <td className="text-text-tertiary">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
