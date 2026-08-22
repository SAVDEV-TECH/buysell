import { Suspense } from "react";
import ProductExplorer from "@/components/ProductExplorer";
import BuySellLoader from "@/components/BuySellLoader";

export default function MarketplacePage() {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full min-w-0 max-w-full">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tighter">
            Global <span className="gradient-text">Marketplace</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg font-medium max-w-2xl">
            Browse our entire catalog of verified products from wholesalers and manufacturers across the continent.
          </p>
        </div>
        
        <Suspense fallback={<BuySellLoader message="Loading marketplace catalog..." fullScreen={false} />}>
          <ProductExplorer />
        </Suspense>
      </div>
    </div>
  );
}
