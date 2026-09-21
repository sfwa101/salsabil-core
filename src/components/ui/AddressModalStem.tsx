'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus, Check } from 'lucide-react';

export interface AddressItem {
  id: string;
  title: string;
  area: string;
  details: string;
  phone: string;
  isDefault?: boolean;
}

export interface AddressModalStemProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddressTitle: string;
  onSelectAddress: (address: AddressItem) => void;
}

const LOCAL_STORAGE_KEY = 'sb_saved_addresses_v1';

const defaultAddresses: AddressItem[] = [
  {
    id: 'a1',
    title: 'المنزل - جمصة (الحالي)',
    area: 'جمصة',
    details: 'شارع ريف المدينة، مبنى 5، شقة 12',
    phone: '0501234567',
    isDefault: true
  },
  {
    id: 'a2',
    title: 'العمل',
    area: 'المنصورة',
    details: 'حي الجامعة، برج الأمل، الدور 3',
    phone: '0507654321'
  }
];

export const AddressModalStem: React.FC<AddressModalStemProps> = ({
  isOpen,
  onClose,
  currentAddressTitle,
  onSelectAddress
}) => {
  const [addresses, setAddresses] = useState<AddressItem[]>(defaultAddresses);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // New Address Form State
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading addresses', e);
    }
    setIsInitialized(true);
  }, []);

  // Save to LocalStorage whenever addresses change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(addresses));
    }
  }, [addresses, isInitialized]);

  if (!isOpen) return null;

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArea.trim() || !newDetails.trim() || !newPhone.trim()) return;

    const newAddress: AddressItem = {
      id: `a${Date.now()}`,
      title: newTitle,
      area: newArea,
      details: newDetails,
      phone: newPhone
    };

    const updated = [...addresses, newAddress];
    setAddresses(updated);
    onSelectAddress(newAddress);
    
    // Reset and close
    setNewTitle('');
    setNewArea('');
    setNewDetails('');
    setNewPhone('');
    setIsAddingNew(false);
    onClose();
  };

  const handleSelect = (addr: AddressItem) => {
    onSelectAddress(addr);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white sm:bg-white/95 sm:backdrop-blur-xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:border border-white/40 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {isAddingNew ? 'إضافة عنوان جديد' : 'عنوان التوصيل'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none pb-2">
          {isAddingNew ? (
            <form onSubmit={handleSaveNewAddress} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground px-1">اسم العنوان (مثال: المنزل، العمل)</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="المنزل"
                  className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground px-1">المنطقة / الحي</label>
                <input 
                  type="text" 
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="حي النزهة"
                  className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground px-1">تفاصيل الشارع والمبنى</label>
                <input 
                  type="text" 
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="شارع الأمير ماجد، مبنى رقم 12"
                  className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground px-1">رقم الجوال للتواصل</label>
                <input 
                  type="tel" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50 text-left"
                  dir="ltr"
                  required
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border/50 text-foreground font-bold text-sm hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  حفظ العنوان
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              {addresses.map((addr) => {
                const isActive = addr.title === currentAddressTitle;
                return (
                  <button 
                    key={addr.id}
                    onClick={() => handleSelect(addr)}
                    className={`w-full text-right p-3 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden group ${
                      isActive 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border/40 bg-muted/20 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{addr.title}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground font-bold">الافتراضي</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1">{addr.area} - {addr.details}</span>
                    </div>
                  </button>
                );
              })}

              <button 
                onClick={() => setIsAddingNew(true)}
                className="w-full mt-2 p-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-primary group"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">إضافة عنوان جديد</span>
              </button>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};
