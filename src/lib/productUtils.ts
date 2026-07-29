export function getProductImageUrl(product: any): string {
  if (!product) return "";

  // 1. Check image_urls array
  if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    const first = product.image_urls[0];
    if (typeof first === "string" && first.trim()) return first.trim();
  }

  // 2. Check image_urls as string
  if (typeof product.image_urls === "string" && product.image_urls.trim()) {
    const raw = product.image_urls.trim();
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
          return parsed[0].trim();
        }
      } catch {
        // Fallthrough
      }
    } else if (raw.startsWith("http")) {
      return raw;
    }
  }

  // 3. Check image_url single string
  if (typeof product.image_url === "string" && product.image_url.trim()) {
    return product.image_url.trim();
  }

  // 4. Check imageUrl camelCase
  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    return product.imageUrl.trim();
  }

  return "";
}

export function getAllProductImages(product: any): string[] {
  if (!product) return [];

  let list: string[] = [];

  if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    list = product.image_urls.filter((url: any) => typeof url === "string" && url.trim());
  } else if (typeof product.image_urls === "string" && product.image_urls.trim()) {
    const raw = product.image_urls.trim();
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed.filter((url: any) => typeof url === "string" && url.trim());
        }
      } catch {
        // Fallthrough
      }
    } else if (raw.startsWith("http")) {
      list = [raw];
    }
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    list = product.images.filter((url: any) => typeof url === "string" && url.trim());
  } else if (typeof product.image_url === "string" && product.image_url.trim()) {
    list = [product.image_url.trim()];
  } else if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    list = [product.imageUrl.trim()];
  }

  return list;
}
