"use client";

import { motion } from "framer-motion";

const ProductSkeleton = () => {
  return (
    <div className="glass rounded-3xl overflow-hidden border border-borderline/50 shadow-sm flex flex-col h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-[4/3] bg-muted/40 relative overflow-hidden" />

      {/* Content Skeleton */}
      <div className="p-4 md:p-6 flex-1 flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-8 bg-muted rounded" />
        </div>

        <div className="h-4 w-12 bg-muted/50 rounded" />
        
        <div className="space-y-2">
          <div className="h-6 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted/50 rounded" />
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="space-y-2">
            <div className="h-3 w-8 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-12 w-12 bg-muted rounded-2xl" />
            <div className="h-12 w-32 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
