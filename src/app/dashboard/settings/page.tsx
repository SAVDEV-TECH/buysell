"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Briefcase, 
  Save, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings as SettingsIcon,
  Image as ImageIcon,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
  const { user, role, isVerified } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [storeBio, setStoreBio] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [industry, setIndustry] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    if (user) {
      unsubscribe = onSnapshot(
        doc(db, "users", user.uid), 
        (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setName(data.name || user.displayName || "");
            setEmail(data.email || user.email || "");
            setPhone(data.phone || "");
            setAddress(data.address || "");
            setBusinessName(data.businessName || "");
            setAvatarUrl(data.avatarUrl || "");
            setStoreBio(data.storeBio || "");
            setYearEstablished(data.yearEstablished || "");
            setEmployeeCount(data.employeeCount || "");
            setIndustry(data.industry || "");
            setIsPublic(data.isPublic || false);
          }
          setLoading(false);
        }, 
        (err) => {
          console.error("Error fetching user data:", err);
          setError("Failed to load settings. Please check your permissions.");
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "cloud_name";
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";
        
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("upload_preset", preset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
           const errorData = await res.json();
           throw new Error(`Cloudinary Error: ${errorData.error?.message || "Failed to upload"}`);
        }

        const data = await res.json();
        finalAvatarUrl = data.secure_url;
      }

      await updateDoc(doc(db, "users", user.uid), {
        name,
        phone,
        address,
        businessName,
        avatarUrl: finalAvatarUrl,
        storeBio,
        yearEstablished,
        employeeCount,
        industry,
        isPublic,
        updatedAt: new Date(),
      });
      
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("Error updating settings:", err);
      setError("Failed to save settings. Please ensure you have permission.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and business details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Profile Summary Card */}
         <div className="lg:col-span-1">
            <div className="glass rounded-[2rem] p-8 text-center border border-borderline">
               <div className="group relative w-24 h-24 mx-auto mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20 overflow-hidden ring-4 ring-white dark:ring-slate-800">
                    {avatarPreview || avatarUrl ? (
                      <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0) || user?.email?.charAt(0) || <User size={40} />
                    )}
                  </div>
               </div>
               <h2 className="text-xl font-bold mb-1">{name || "User"}</h2>
               <div className="inline-flex flex-col items-center gap-2 mb-6 w-full">
                  <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-primary/20">
                    {role} Profile
                  </div>
                  {isVerified ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-tighter">
                       <CheckCircle size={12} /> Account Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-500 font-black text-[9px] uppercase tracking-tighter">
                       <AlertCircle size={12} /> Pending Verification
                    </div>
                  )}
               </div>
               
               <div className="space-y-4 text-left pt-6 border-t border-borderline">
                 <div className="flex items-start gap-3">
                   <Mail size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                   <div>
                     <p className="text-xs text-muted-foreground font-bold">CONTACT EMAIL</p>
                     <p className="text-sm truncate">{email || "Not provided"}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Phone size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                   <div>
                     <p className="text-xs text-muted-foreground font-bold">PHONE NUMBER</p>
                     <p className="text-sm">{phone || "Not provided"}</p>
                   </div>
                 </div>
               </div>

                {storeBio && (
                  <div className="mt-8 pt-6 border-t border-borderline text-left">
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 italic">About the Store</p>
                     <p className="text-xs italic text-muted-foreground leading-relaxed">"{storeBio}"</p>
                  </div>
                )}
            </div>
         </div>

         {/* Settings Form */}
         <div className="lg:col-span-2">
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSave} 
              className="glass rounded-[2.5rem] p-8 border border-borderline space-y-6"
            >
               <h3 className="text-xl font-bold mb-6">Edit Information</h3>

               <AnimatePresence>
                 {success && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: "auto" }}
                     exit={{ opacity: 0, height: 0 }}
                     className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-3 text-sm font-medium overflow-hidden"
                   >
                     <CheckCircle size={18} /> Settings saved successfully!
                   </motion.div>
                 )}
                 
                 {error && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: "auto" }}
                     exit={{ opacity: 0, height: 0 }}
                     className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm font-medium overflow-hidden"
                   >
                     <AlertCircle size={18} /> {error}
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-sm font-medium ml-1">Full Name</label>
                   <div className="relative">
                     <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       placeholder="Your full name"
                       className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium ml-1">Email Address</label>
                   <div className="relative opacity-60 cursor-not-allowed">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                     <input 
                       type="email" 
                       value={email}
                       disabled
                       className="w-full pl-12 pr-4 py-3 bg-transparent border border-borderline rounded-2xl outline-none cursor-not-allowed"
                     />
                   </div>
                   <p className="text-[10px] text-muted-foreground ml-1">Email cannot be changed directly.</p>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium ml-1">Phone Number</label>
                   <div className="relative">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                     <input 
                       type="tel" 
                       value={phone}
                       onChange={(e) => setPhone(e.target.value)}
                       placeholder="+234..."
                       className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                     />
                   </div>
                 </div>

                 {(role === "MANUFACTURER" || role === "WHOLESALER" || role === "ADMIN") && (
                   <div className="space-y-2">
                     <label className="text-sm font-medium ml-1">Business Name</label>
                     <div className="relative">
                       <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                       <input 
                         type="text" 
                         value={businessName}
                         onChange={(e) => setBusinessName(e.target.value)}
                         placeholder="Your company name"
                         className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                       />
                     </div>
                   </div>
                 )}
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium ml-1">Business Address</label>
                 <div className="relative">
                   <MapPin className="absolute left-4 top-4 text-muted-foreground" size={18} />
                   <textarea 
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     rows={3}
                     placeholder="Full address for shipping or store location"
                     className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium ml-1">Profile Avatar</label>
                 <div className="flex items-center gap-4">
                    {avatarPreview && (
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-borderline">
                         <img src={avatarPreview} className="w-full h-full object-cover" />
                         <button 
                           type="button" 
                           onClick={() => { setAvatarPreview(""); setAvatarFile(null); }}
                           className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md scale-75 opacity-70 hover:opacity-100"
                         >
                            <X size={14} />
                         </button>
                      </div>
                    )}
                    <label className="flex-1 px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl cursor-pointer hover:border-primary/50 transition-all flex items-center gap-3 w-full">
                       <ImageIcon className="text-muted-foreground" size={20} />
                       <span className="text-muted-foreground font-medium flex-1 truncate">
                         {avatarFile ? avatarFile.name : "Select new image..."}
                       </span>
                       <input 
                         type="file" 
                         className="hidden" 
                         accept="image/*" 
                         onChange={handleImageChange} 
                       />
                    </label>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium ml-1">Store / Business Bio</label>
                 <textarea 
                   value={storeBio}
                   onChange={(e) => setStoreBio(e.target.value)}
                   rows={4}
                   placeholder="Describe your business and what you do best..."
                   className="w-full px-6 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                 />
                 <p className="text-[10px] text-muted-foreground ml-1">This bio will be visible to your customers and partners.</p>
               </div>

                {role === "MANUFACTURER" && (
                  <div className="pt-8 border-t border-borderline space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Company Page Protocol</h3>
                      <p className="text-sm text-muted-foreground mb-6">Customize how your business appears in the Manufacturer Directory.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Year Established</label>
                        <input 
                          type="number" 
                          value={yearEstablished}
                          onChange={(e) => setYearEstablished(e.target.value)}
                          placeholder="e.g. 2010"
                          className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Employee Count</label>
                        <select 
                          value={employeeCount}
                          onChange={(e) => setEmployeeCount(e.target.value)}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        >
                          <option value="">Select range...</option>
                          <option value="1-10">1 - 10</option>
                          <option value="11-50">11 - 50</option>
                          <option value="51-200">51 - 200</option>
                          <option value="201-500">201 - 500</option>
                          <option value="500+">500+</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium ml-1">Primary Industry</label>
                        <select 
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        >
                          <option value="">Select industry...</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Fashion">Fashion</option>
                          <option value="Agriculture">Agriculture</option>
                          <option value="Construction">Construction</option>
                          <option value="Chemicals">Chemicals</option>
                          <option value="Food & Beverage">Food & Beverage</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-8">
                        <button
                          type="button"
                          onClick={() => setIsPublic(!isPublic)}
                          className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                        </button>
                        <div>
                          <p className="text-sm font-bold">List on Company Directory</p>
                          <p className="text-[10px] text-muted-foreground">Make your company profile visible to wholesalers.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

               <div className="pt-4 border-t border-borderline">
                 <button 
                   type="submit" 
                   disabled={saving}
                   className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 ml-auto"
                 >
                   {saving ? (
                     <><Loader2 size={18} className="animate-spin" /> Saving...</>
                   ) : (
                     <><Save size={18} /> Save Changes</>
                   )}
                 </button>
               </div>
            </motion.form>
         </div>
      </div>
    </div>
  );
}
