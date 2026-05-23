import ManufacturerProfile from "@/components/ManufacturerProfile";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manufacturer Profile | BuySell",
  description: "View detailed manufacturer capabilities, verify credentials, and connect directly to source products.",
};

// Next.js 13+ dynamic route prop interface
export default async function Page({ params }: { params: { id: string } }) {
  // Await params per Next.js recent breaking changes for async components
  const { id } = await params;
  
  return (
    <div className="w-full">
      <ManufacturerProfile id={id} />
    </div>
  );
}
