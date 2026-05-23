import Link from "next/link";
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  LifeBuoy, 
  ArrowLeft,
  ChevronRight
} from "lucide-react";

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Area */}
      <div className="bg-primary pt-12 pb-24 px-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8 font-medium">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-black mb-6">How can we help you?</h1>
          
          <div className="relative max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/50" size={24} />
            <input 
              type="text" 
              placeholder="Search for articles, tutorials, or troubleshooting..."
              className="w-full pl-16 pr-6 py-5 bg-white rounded-full text-slate-800 focus:ring-4 focus:ring-white/30 outline-none text-lg shadow-xl shadow-black/10"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 space-y-12">
        
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-borderline hover:-translate-y-1 transition-transform cursor-pointer group">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2">Knowledge Base</h3>
              <p className="text-muted-foreground text-sm mb-4">Browse our comprehensive guides and documentation.</p>
              <span className="text-primary font-bold text-sm flex items-center gap-1 group-hover:underline">Read Articles <ChevronRight size={14} /></span>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-borderline hover:-translate-y-1 transition-transform cursor-pointer group">
              <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LifeBuoy size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2">Seller Support</h3>
              <p className="text-muted-foreground text-sm mb-4">Get help managing products, orders, and your store.</p>
              <span className="text-primary font-bold text-sm flex items-center gap-1 group-hover:underline">Get Seller Help <ChevronRight size={14} /></span>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-borderline hover:-translate-y-1 transition-transform cursor-pointer group">
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2">Contact Us</h3>
              <p className="text-muted-foreground text-sm mb-4">Reach out to our customer support team directly.</p>
              <span className="text-primary font-bold text-sm flex items-center gap-1 group-hover:underline">Open a Ticket <ChevronRight size={14} /></span>
           </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 border border-borderline">
           <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
           
           <div className="space-y-4">
              {[
                { q: "How do I list a new product as a Manufacturer?", a: "Navigate to your Dashboard, click on 'My Products' or 'List New Item', and fill out the product details including standard pricing and wholesale requirements." },
                { q: "When will I receive my payouts?", a: "Payouts are automatically processed to your connected bank account within 2-3 business days after an order is marked as Delivered and verified by the wholesaler." },
                { q: "Can I manage multiple staff members?", a: "Yes, verified business accounts can invite team members from the 'Team Management' dashboard and assign specific roles to them." }
              ].map((faq, i) => (
                 <div key={i} className="p-6 rounded-2xl border border-borderline bg-slate-50 dark:bg-slate-950/50 flex flex-col gap-2">
                    <h4 className="font-bold text-lg">{faq.q}</h4>
                    <p className="text-muted-foreground">{faq.a}</p>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
