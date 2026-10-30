"use client";

/* eslint-disable @next/next/no-img-element */
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/components/admin/Badge";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {formatDate} from "@/lib/format";

export default function CustomersPage() {
  const api = useAdminApi();

  const {data, isLoading} = useQuery({
    queryKey: ["customers"],
    enabled: api.ready,
    queryFn: api.customers.list
  });

  const customers = data?.customers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="mt-1 text-text-secondary">
          {customers.length} {customers.length === 1 ? "customer" : "customers"}{" "}
          registered
        </p>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xl font-semibold">No customers yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Customers will appear here once they sign up.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Addresses</th>
                  <th>Wishlist</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={customer.imageUrl}
                          alt=""
                          className="size-10 rounded-full bg-surface-light"
                        />
                        <span className="font-semibold">{customer.name}</span>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>
                      <Badge tone="ghost">
                        {customer.addresses?.length ?? 0} address(es)
                      </Badge>
                    </td>
                    <td>
                      <Badge tone="ghost">
                        {customer.wishlist?.length ?? 0} item(s)
                      </Badge>
                    </td>
                    <td className="text-text-tertiary">
                      {formatDate(customer.createdAt)}
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
