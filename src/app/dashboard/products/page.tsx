"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { 
  Package, 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  createdAt: any;
  status?: string;
}

export default function MyProductsPage() {
  const { user, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMyProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const myProducts: Product[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(myProducts);
    } catch (error: unknown) {
      console.error("Error fetching my products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [user]);

  const handleDelete = async (productId: string, imageUrl?: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, "products", productId));
      
      // 2. Delete from Storage if image exists
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.error("Storage delete error (might be already gone):", storageErr);
        }
      }

      // 3. Update state
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  if (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">This section is reserved for Manufacturers and Wholesalers.</p>
        <Link href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Back to Overview</Link>
      </div>
    );
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Products</h1>
          <p className="text-muted-foreground">Manage your inventory and marketplace listings</p>
        </div>
        <Link 
          href="/dashboard/new-product" 
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} /> List New Item
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-borderline">
           <p className="text-sm text-muted-foreground mb-1">Total Listings</p>
           <h3 className="text-2xl font-bold">{products.length}</h3>
        </div>
        <div className="glass p-6 rounded-3xl border border-borderline">
           <p className="text-sm text-muted-foreground mb-1">Active Status</p>
           <h3 className="text-2xl font-bold text-green-500">Live</h3>
        </div>
        <div className="glass p-6 rounded-3xl border border-borderline">
           <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
           <h3 className="text-2xl font-bold text-orange-500">2</h3>
        </div>
      </div>

      {/* Search & Tool Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search your products..."
            className="w-full pl-12 pr-4 py-4 glass rounded-[2rem] border border-borderline focus:ring-2 focus:ring-primary/50 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="p-4 glass rounded-2xl border border-borderline hover:bg-muted/50 transition-all">
          <Filter size={20} />
        </button>
      </div>

      {/* Product List */}
      <div className="glass rounded-[2.5rem] border border-borderline overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
             <Loader2 size={48} className="text-primary animate-spin mb-4" />
             <p className="text-muted-foreground">Fetching your inventory...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-muted/30">
                  <th className="p-6 font-bold text-sm">Product</th>
                  <th className="p-6 font-bold text-sm">Category</th>
                  <th className="p-6 font-bold text-sm">Price</th>
                  <th className="p-6 font-bold text-sm">Status</th>
                  <th className="p-6 font-bold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredProducts.map((product) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="border-b border-borderline hover:bg-muted/20 transition-colors group"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-borderline flex items-center justify-center">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={20} className="text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground">ID: {product.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                         <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase truncate max-w-[100px]">
                           {product.category}
                         </span>
                      </td>
                      <td className="p-6 font-bold text-sm">
                        ₦{product.price.toLocaleString()}
                      </td>
                      <td className="p-6">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                           <span className="text-xs font-medium">Active</span>
                         </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => handleDelete(product.id, product.imageUrl)}
                             className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                             title="Delete Product"
                           >
                             <Trash2 size={18} />
                           </button>
                           <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="Edit Product">
                             <Edit size={18} />
                           </button>
                           <Link href={`/marketplace`} className="p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all" title="View in Marketplace">
                             <ExternalLink size={18} />
                           </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
               <Package size={40} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-8">You haven&apos;t listed any items for sale yet.</p>
            <Link href="/dashboard/new-product" className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all">
               List Your First Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
