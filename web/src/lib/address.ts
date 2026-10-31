import type {Address, ShippingAddress} from "./types";

export function toShippingAddress(address: Address): ShippingAddress {
  return {
    fullName: address.fullName,
    streetAddress: address.streetAddress,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    phoneNumber: address.phoneNumber
  };
}

export function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}
