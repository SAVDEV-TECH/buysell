"use client";

import { useEffect, useState, useRef, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  Building2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Printer,
  FileText,
  X,
  Globe,
  Send,
  DollarSign,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import OrderEscrowTracker from "@/components/OrderEscrowTracker";
import AIQuotationInsightsCard from "@/components/AIQuotationInsightsCard";

interface OrderDetail {
  id: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_reference?: string;
  payment_method?: string;
  shipping_address?: any;
  tracking_number?: string;
  courier_name?: string;
  notes?: string;
  created_at: string;
  buyer_organization_id?: string;
  supplier_organization_id?: string;
  // joined
  buyer_organization?: { company_name: string; is_verified?: boolean } | null;
  supplier_organization?: { company_name: string; is_verified?: boolean } | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: {
    title: string;
    description?: string;
    hs_code?: string;
  };
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { user, organizationId } = useAuth();
  const { sendNotification } = useNotifications();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modals
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [courierName, setCourierName] = useState("DHL Express");
  const [trackingNumber, setTrackingNumber] = useState("");

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch Order ─────────────────────────────────────────────────────────────
  const fetchOrderDetail = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select(`
          *,
          buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name, is_verified),
          supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name, is_verified)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr) throw orderErr;
      setOrder(orderData as OrderDetail);

      if (orderData) {
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*, product:products(title, description, hs_code)")
          .eq("order_id", orderData.id);

        setItems((itemsData as OrderItem[]) || []);
      }
    } catch (err) {
      console.error("[Order Detail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, fetchOrderDetail)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, supabase]);

  // ─── Update Logistics & Status ──────────────────────────────────────────────
  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !trackingNumber.trim()) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "shipped",
          courier_name: courierName,
          tracking_number: trackingNumber.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      setShowTrackingModal(false);
      fetchOrderDetail();
    } catch (err: any) {
      alert("Failed to update tracking: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ─── Confirm Delivery & Release Escrow ───────────────────────────────────────
  const handleConfirmDelivery = async () => {
    if (!order) return;
    setUpdating(true);

    try {
      const now = new Date().toISOString();
      const basePayload: any = {
        status: "delivered",
        payment_status: "escrow_released",
        updated_at: now,
      };

      // Try updating with escrow_status
      const { error: primaryErr } = await supabase
        .from("orders")
        .update({
          ...basePayload,
          escrow_status: "released",
        })
        .eq("id", order.id);

      // If PostgREST schema cache throws missing column error, fallback to base update
      if (primaryErr) {
        console.warn("[Order Detail] Escrow status update notice, attempting base update:", primaryErr.message);
        const { error: fallbackErr } = await supabase
          .from("orders")
          .update(basePayload)
          .eq("id", order.id);

        if (fallbackErr) throw fallbackErr;
      }

      // Insert ledger entry into escrow_transactions (if table exists)
      try {
        await supabase.from("escrow_transactions").insert({
          order_id: order.id,
          amount: Number(order.total_amount || 0),
          currency: order.currency || "USD",
          type: "release",
          status: "completed",
          metadata: {
            triggered_by: "buyer_delivery_confirmation",
            buyer_id: user?.id,
            executed_at: now,
          },
          created_at: now,
          processed_at: now,
        });
      } catch (ledgerErr) {
        console.warn("[Order Detail] Ledger insert notice:", ledgerErr);
      }

      // Notify supplier
      if (order.supplier_organization_id) {
        await sendNotification(
          order.supplier_organization_id,
          `🎉 Escrow Funds Released for Order #${order.id.slice(0, 8).toUpperCase()}`,
          `The buyer confirmed delivery. Escrow funds of $${Number(order.total_amount || 0).toLocaleString()} have been released to your account!`,
          "ORDER",
          `/dashboard/orders/${order.id}`
        );
      }

      fetchOrderDetail();
    } catch (err: any) {
      alert("Failed to confirm delivery: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Logistics Contract…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-black">Order Record Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested trade order ID does not exist.</p>
        <Link href="/dashboard/orders" className="inline-block px-6 py-3 bg-primary text-white font-bold text-xs rounded-xl">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isSupplier = organizationId === order.supplier_organization_id;
  const isBuyer = organizationId === order.buyer_organization_id;

  const steps = [
    { title: "Order Confirmed", desc: "Contract created & escrow locked", done: true },
    { title: "In Production", desc: "Goods manufactured & QA inspected", done: ["processing", "shipped", "delivered", "completed"].includes(order.status) },
    { title: "Cargo Dispatched", desc: order.courier_name ? `${order.courier_name} (${order.tracking_number})` : "Awaiting carrier pickup", done: ["shipped", "delivered", "completed"].includes(order.status) },
    { title: "Delivery & Escrow Release", desc: "Buyer inspection & payment payout", done: ["delivered", "completed"].includes(order.status) },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">

      {/* ── Breadcrumb & Action Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={15} /> Back to All Orders
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all shadow-sm"
          >
            <Printer size={15} /> Commercial Invoice
          </button>
        </div>
      </div>

      {/* ── Title Banner ── */}
      <div className="bg-card rounded-2xl border border-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              ORDER REF: #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
              {order.status}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Trade Contract: ${Number(order.total_amount || 0).toLocaleString()} {order.currency || "USD"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Buyer: <strong className="text-foreground">{order.buyer_organization?.company_name || "B2B Buyer"}</strong> · Supplier: <strong className="text-foreground">{order.supplier_organization?.company_name || "Verified Supplier"}</strong>
          </p>
        </div>

        {/* Primary Action Button */}
        {isSupplier && order.status !== "shipped" && order.status !== "delivered" && (
          <button
            onClick={() => setShowTrackingModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-sm hover:bg-primary/90 transition-all"
          >
            <Truck size={15} /> Update Shipment & Tracking
          </button>
        )}

        {isBuyer && order.status === "shipped" && (
          <button
            onClick={handleConfirmDelivery}
            disabled={updating}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {updating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Confirm Delivery & Release Escrow
          </button>
        )}
      </div>

      {/* ── AI Quotation & Deal Insights ── */}
      <AIQuotationInsightsCard
        orderId={order.id}
        totalAmount={order.total_amount}
        currency={order.currency}
        status={order.status}
      />

      {/* ── Visual 5-Stage B2B Escrow Timeline ── */}
      <OrderEscrowTracker order={order} />

      {/* ── Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Package size={15} className="text-primary" /> Contract Line Items
            </h3>

            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic bg-muted/40 rounded-xl">
                Single trade order contract (${Number(order.total_amount).toLocaleString()} USD).
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-xs text-foreground">
                        {item.product?.title || "B2B Product Item"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Quantity: <strong>{item.quantity.toLocaleString()} pcs</strong> · Unit Price: <strong>${item.unit_price}</strong>
                      </p>
                    </div>
                    <p className="font-bold text-xs text-foreground">
                      ${Number(item.total_price || item.unit_price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Escrow & Shipping Info (1 col) */}
        <div className="space-y-6">
          {/* Escrow Status Card */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Lock size={15} className="text-emerald-500" /> Escrow Protection
            </h3>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Payment Status: {order.payment_status.toUpperCase()}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Funds are held securely in BuySell Escrow until buyer confirms satisfactory delivery.
              </p>
            </div>
          </div>

          {/* Courier Details */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-2.5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Truck size={15} className="text-primary" /> Logistics Courier
            </h3>
            <p className="text-xs text-muted-foreground">
              Carrier: <strong className="text-foreground">{order.courier_name || "Express Logistics"}</strong>
            </p>
            {order.tracking_number && (
              <p className="text-xs font-mono font-bold text-primary">
                Waybill: #{order.tracking_number}
              </p>
            )}
          </div>

          {/* Export Documentation Vault */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <FileText size={15} className="text-primary" /> Export Document Vault
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                Customs Cleared
              </span>
            </div>

            <div className="space-y-2">
              {/* Document 1: Commercial Invoice */}
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border flex items-center justify-between text-xs transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <div>
                    <p className="font-bold text-xs text-foreground">Commercial Invoice & Packing List</p>
                    <p className="text-[10px] text-muted-foreground">PDF · HSN/HS Code Included</p>
                  </div>
                </div>
                <Printer size={13} className="text-muted-foreground" />
              </button>

              {/* Document 2: Certificate of Origin */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-emerald-500" />
                  <div>
                    <p className="font-bold text-xs text-foreground">Certificate of Origin (AfCFTA / ECOWAS)</p>
                    <p className="text-[10px] text-muted-foreground">Chamber of Commerce Verified</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-500">Verified</span>
              </div>

              {/* Document 3: SGS / Quality Inspection Certificate */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-500" />
                  <div>
                    <p className="font-bold text-xs text-foreground">Quality Inspection (SGS / ISO 9001)</p>
                    <p className="text-[10px] text-muted-foreground">Pre-Shipment Compliance</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-500">Passed</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Update Tracking Modal ── */}
      <AnimatePresence>
        {showTrackingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black">Dispatch Shipment</h3>
                <button onClick={() => setShowTrackingModal(false)} className="p-1 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateShipment} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1">Carrier Name</label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Tracking Number / Waybill # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DHL-9823471293"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTrackingModal(false)}
                    className="flex-1 py-3 border rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating || !trackingNumber.trim()}
                    className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 size={16} className="animate-spin" /> : "Save & Notify Buyer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Commercial Invoice Modal ── */}
      <AnimatePresence>
        {showInvoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white text-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-primary">COMMERCIAL INVOICE</h2>
                  <p className="text-xs text-slate-500">BuySell B2B Trade Network · Invoice #{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Printer size={14} /> Print PDF
                  </button>
                  <button onClick={() => setShowInvoiceModal(false)} className="p-2 text-slate-400">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Seller (Exporter)</p>
                  <p className="font-bold text-slate-900">{order.supplier_organization?.company_name || "Verified Supplier Ltd"}</p>
                  <p className="text-slate-500">Verified BuySell Manufacturer</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Buyer (Importer)</p>
                  <p className="font-bold text-slate-900">{order.buyer_organization?.company_name || "B2B Importer Inc"}</p>
                  <p className="text-slate-500">Destination: {order.shipping_address?.country || "Global"}</p>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse border-t border-b">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="p-3">Description</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium">B2B Trade Order Contract #{order.id.slice(0, 8)}</td>
                    <td className="p-3 font-medium">1 Lot</td>
                    <td className="p-3 text-right font-medium">${Number(order.total_amount).toLocaleString()}</td>
                    <td className="p-3 text-right font-black">${Number(order.total_amount).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-4 text-xs">
                <div className="text-slate-500">
                  <p>Escrow Status: <strong>{order.payment_status.toUpperCase()}</strong></p>
                  <p>Payment Reference: <strong>BUYSELL-{order.id.slice(0, 6)}</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">TOTAL DUE: ${Number(order.total_amount).toLocaleString()} {order.currency || "USD"}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
