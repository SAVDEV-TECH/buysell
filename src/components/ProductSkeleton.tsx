"use client";

import { motion } from "framer-motion";

const ProductSkeleton = () => {
  return (
    <div className="solid-card overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] bg-muted/40 relative overflow-hidden" />

      {/* Content Skeleton */}
      <div className="p-2.5 sm:p-3 md:p-4 flex-1 flex flex-col space-y-2 sm:space-y-3 md:space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-2.5 sm:h-3 w-12 sm:w-16 bg-muted rounded" />
          <div className="h-2.5 sm:h-3 w-6 sm:w-8 bg-muted rounded" />
        </div>

        <div className="h-3 sm:h-4 w-10 sm:w-12 bg-muted/50 rounded" />
        
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-4 sm:h-5 md:h-6 w-full bg-muted rounded" />
          <div className="h-3 sm:h-4 w-3/4 bg-muted/50 rounded" />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:pt-4">
          <div className="flex justify-between items-center sm:flex-col sm:items-start sm:gap-1">
            <div className="h-2.5 sm:h-3 w-8 bg-muted rounded" />
            <div className="h-5 sm:h-6 md:h-8 w-16 sm:w-24 bg-muted rounded" />
          </div>
          <div className="flex gap-1">
            <div className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 bg-muted rounded-lg" />
            <div className="h-8 sm:h-10 md:h-12 flex-1 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
