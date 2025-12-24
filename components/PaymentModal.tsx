
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { db } from '../services/db';
import { SubscriptionPlan, User } from '../types';
import { payments } from '../services/payments';

interface PaymentModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_CHANNELS = [
  { id: 'QRIS_STATIC', name: 'QRIS Static (Manual Approve)', type: 'Digital' },
  { id: 'TRIPAY_QRIS', name: 'Tripay - QRIS', type: 'Gateway' },
  { id: 'TRIPAY_BCA', name: 'Tripay - BCA VA', type: 'Gateway' },
  { id: 'PAYDISINI_QRIS', name: 'Paydisini - QRIS', type: 'Gateway' }
];

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gatewayInfo, setGatewayInfo] = useState<{ provider?: 'TRIPAY' | 'PAYDISINI', reference?: string, checkout_url?: string } | null>(null);
  const gw = db.getGatewayConfig();
  const STATIC_QRIS_URL = gw.qris?.staticUrl || '';
  

  useEffect(() => {
    if (isOpen) {
      setPlans(db.getPlans());
      setStep(1);
      setSelectedMethod('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedPlan || !selectedMethod || !user) return;
    setLoading(true);
    
    try {
      if (selectedMethod === 'QRIS_STATIC') {
        db.createRequest({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          paymentMethod: selectedMethod,
          amount: selectedPlan.price
        });
        setGatewayInfo(null);
        setStep(4);
      } else if (selectedMethod.startsWith('TRIPAY')) {
        const methodCode = selectedMethod.replace('TRIPAY_', '');
        const merchant_ref = `INV-${Date.now()}-${user.id}`;
        const createRes = await payments.createTripayTransaction({
          method: methodCode,
          amount: selectedPlan.price,
          customer_name: user.name,
          customer_email: user.email,
          merchant_ref,
          item_name: selectedPlan.name,
          credentials: gw.tripay
        });
        if (createRes?.success) {
          const ref = createRes.data?.reference;
          const url = createRes.data?.checkout_url;
          setGatewayInfo({ provider: 'TRIPAY', reference: ref, checkout_url: url });
          db.createRequest({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            paymentMethod: selectedMethod,
            amount: selectedPlan.price,
            gatewayRef: ref
          });
          setStep(4);
          if (url) window.open(url, '_blank');
        } else {
          alert(createRes?.message || 'Gagal membuat transaksi Tripay');
        }
      } else if (selectedMethod.startsWith('PAYDISINI')) {
        const service = selectedMethod.replace('PAYDISINI_', '');
        const unique_code = `INV-${Date.now()}-${user.id}`;
        const createRes = await payments.createPaydisiniTransaction({
          unique_code,
          service,
          amount: selectedPlan.price,
          note: selectedPlan.name,
          return_url: window.location.origin,
          callback_url: window.location.origin,
          credentials: gw.paydisini
        });
        if (createRes?.status === true || createRes?.status === 'Success') {
          const ref = createRes?.data?.unique_code || unique_code;
          const url = createRes?.data?.payment_url || createRes?.data?.checkout_url;
          setGatewayInfo({ provider: 'PAYDISINI', reference: ref, checkout_url: url });
          db.createRequest({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            paymentMethod: selectedMethod,
            amount: selectedPlan.price,
            gatewayRef: ref
          });
          setStep(4);
          if (url) window.open(url, '_blank');
        } else {
          alert(createRes?.message || 'Gagal membuat transaksi Paydisini');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-white">Upgrade Premium</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <p className="text-slate-400 mb-6 font-medium">Pilih paket langganan kamu:</p>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {plans.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${selectedPlan?.id === p.id ? 'border-rose-500 bg-rose-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-800/40'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-white">{p.name}</span>
                      <span className="text-rose-500 font-black">Rp {p.price.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{p.duration}</p>
                  </button>
                ))}
              </div>
              <button 
                disabled={!selectedPlan}
                onClick={() => setStep(2)}
                className="w-full bg-rose-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black transition-all"
              >
                LANJUT KE PEMBAYARAN
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(1)} className="text-rose-500 font-bold text-xs flex items-center gap-1 mb-6">
                <Icons.ChevronRight className="w-4 h-4 rotate-180" /> GANTI PAKET
              </button>
              <p className="text-slate-400 mb-6 font-medium">Pilih metode pembayaran:</p>
              <div className="space-y-3 mb-8">
                {PAYMENT_CHANNELS.map(ch => (
                  <button 
                    key={ch.id}
                    onClick={() => setSelectedMethod(ch.id)}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedMethod === ch.id ? 'border-rose-500 bg-rose-500/5' : 'border-slate-800 bg-slate-800/40'}`}
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-xs text-slate-500">
                         {ch.id.slice(0,2)}
                       </div>
                       <span className="font-bold text-white text-sm">{ch.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${selectedMethod === ch.id ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`} />
                  </button>
                ))}
              </div>
              <button 
                disabled={!selectedMethod || loading}
                onClick={handleConfirm}
                className="w-full bg-rose-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'KONFIRMASI BAYAR'}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-6">
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">Status Pembayaran</div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{gatewayInfo?.provider || 'QRIS Static'}</span>
                </div>
                {gatewayInfo?.reference && <div className="text-slate-400 text-sm mt-2">Ref: {gatewayInfo.reference}</div>}
              </div>
              {selectedMethod === 'QRIS_STATIC' ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={STATIC_QRIS_URL} alt="QRIS Static" className="w-56 h-56 rounded-2xl border border-slate-700 bg-white p-3" />
                  {selectedPlan && <div className="font-black text-white">Rp {selectedPlan.price.toLocaleString()}</div>}
                  <div className="text-slate-400 text-xs text-center">Scan QR ini di aplikasi pembayaran kamu. Setelah bayar, admin akan verifikasi manual.</div>
                </div>
              ) : gatewayInfo?.checkout_url ? (
                <a href={gatewayInfo.checkout_url} target="_blank" rel="noreferrer" className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-center">Buka Halaman Pembayaran</a>
              ) : (
                <div className="text-slate-400 text-sm">Ikuti instruksi pembayaran yang ditampilkan.</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (selectedMethod === 'QRIS_STATIC') {
                      alert('Pembayaran QRIS static perlu verifikasi manual oleh admin.');
                      return;
                    }
                    if (!gatewayInfo?.reference) return;
                    const statusRes = gatewayInfo.provider === 'TRIPAY'
                      ? await payments.getTripayStatus(gatewayInfo.reference, { apiKey: gw.tripay?.apiKey, mode: gw.tripay?.mode })
                      : await payments.getPaydisiniStatus(gatewayInfo.reference, { apiKey: gw.paydisini?.apiKey });
                    const paid =
                      (gatewayInfo.provider === 'TRIPAY' && statusRes?.data?.status === 'PAID') ||
                      (gatewayInfo.provider === 'PAYDISINI' && (statusRes?.data?.status === 'Success' || statusRes?.status === 'Success'));
                    if (paid) {
                      const reqs = db.getRequests();
                      const req = reqs.find(r => r.gatewayRef === gatewayInfo.reference);
                      if (req) {
                        db.updateRequestStatus(req.id, 'APPROVED');
                        setStep(5);
                      } else {
                        alert('Transaksi ditemukan dibayar, namun request lokal tidak ditemukan.');
                      }
                    } else {
                      alert('Belum terkonfirmasi dibayar. Coba lagi beberapa saat.');
                    }
                  }}
                  className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold border border-slate-700"
                >
                  Cek Status Pembayaran
                </button>
                <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-white border border-slate-700">Ganti Metode</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Icons.Zap className="w-10 h-10 text-green-500 fill-current" />
               </div>
               <h3 className="text-2xl font-black text-white mb-2">Pembayaran Terkonfirmasi!</h3>
               <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                 Akun kamu telah di-upgrade otomatis sesuai paket yang dibayar.
               </p>
               <button 
                onClick={() => { onClose(); onSuccess(); }}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black border border-slate-700"
               >
                 TUTUP
               </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Icons.Zap className="w-10 h-10 text-green-500 fill-current" />
               </div>
               <h3 className="text-2xl font-black text-white mb-2">Permintaan Terkirim!</h3>
               <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                 Admin akan segera memverifikasi pembayaran kamu. Mohon tunggu maksimal 1x24 jam.
               </p>
               <button 
                onClick={() => { onClose(); onSuccess(); }}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black border border-slate-700"
               >
                 TUTUP
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
