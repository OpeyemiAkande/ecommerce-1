"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {ORDER_STATUSES, type OrderStatus} from "@/lib/admin/types";
import {capitalizeText, getErrorMessage} from "@/lib/admin/utils";
import {formatDate, formatPrice} from "@/lib/format";

export default function OrdersPage() {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const {data, isLoading} = useQuery({
    queryKey: ["admin", "orders"],
    enabled: api.ready,
    queryFn: api.orders.list
  });

  const updateStatus = useMutation({
    mutationFn: api.orders.updateStatus,
    onSuccess: (_, {status}) => {
      queryClient.invalidateQueries({queryKey: ["admin", "orders"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`Order marked as ${status}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update order status"));
    }
  });

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Orders</h2>
        <p className="mt-1 text-text-secondary">Manage customer orders</p>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xl font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Orders will appear here once customers make a purchase.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const quantity = order.orderItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  const updating =
                    updateStatus.isPending &&
                    updateStatus.variables?.orderId === order._id;

                  return (
                    <tr key={order._id}>
                      <td className="font-medium">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <div className="font-medium">
                          {order.shippingAddress.fullName}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.state}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{quantity} items</div>
                        <div className="text-xs text-text-tertiary">
                          {order.orderItems[0]?.name}
                          {order.orderItems.length > 1 &&
                            ` +${order.orderItems.length - 1} more`}
                        </div>
                      </td>
                      <td className="font-semibold">
                        {formatPrice(order.totalPrice)}
                      </td>
                      <td>
                        <select
                          aria-label={`Status for order ${order._id.slice(-8)}`}
                          className="select select-sm"
                          value={order.status}
                          disabled={updating}
                          onChange={(e) =>
                            updateStatus.mutate({
                              orderId: order._id,
                              status: e.target.value as OrderStatus
                            })
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {capitalizeText(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-text-tertiary">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
