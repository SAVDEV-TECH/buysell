import ManufacturerExplorer from "@/components/ManufacturerExplorer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manufacturers Directory | BuySell",
  description: "Discover and connect with verified manufacturers, wholesalers, and bulk suppliers.",
};

export default function ManufacturersPage() {
  return (
    <div className="w-full">
      <ManufacturerExplorer />
    </div>
  );
}
