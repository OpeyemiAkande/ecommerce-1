import type {IconType} from "react-icons";
import {
  IoCubeOutline,
  IoHomeOutline,
  IoPeopleOutline,
  IoReceiptOutline
} from "react-icons/io5";

export const ADMIN_NAV: {name: string; href: string; icon: IconType}[] = [
  {name: "Dashboard", href: "/admin/dashboard", icon: IoHomeOutline},
  {name: "Products", href: "/admin/products", icon: IoCubeOutline},
  {name: "Orders", href: "/admin/orders", icon: IoReceiptOutline},
  {name: "Customers", href: "/admin/customers", icon: IoPeopleOutline}
];
