import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDimensions(length: number, breadth: number, height: number): string {
  return `${length}×${breadth}×${height} cm`;
}

export function formatPhoneNumber(phone: string): string {
  // Format +91XXXXXXXXXX to +91 XXXXX XXXXX
  if (phone.startsWith('+91') && phone.length === 13) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}
