import ProductExplorer from "@/components/ProductExplorer";

export default function MarketplacePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">
          Global <span className="gradient-text">Marketplace</span>
        </h1>
        <p className="text-muted-foreground text-lg font-medium max-w-2xl">
          Browse our entire catalog of verified products from wholesalers and manufacturers across the continent.
        </p>
      </div>
      
      <ProductExplorer />
    </div>
  );
}
