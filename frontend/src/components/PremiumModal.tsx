'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, MessageCircle, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchPurchaseInfo, activatePremiumKey, PurchaseInfo } from '@/lib/api';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export default function PremiumModal({ open, onClose, onActivated }: PremiumModalProps) {
  const [info, setInfo] = useState<PurchaseInfo | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPurchaseInfo()
        .then(setInfo)
        .catch(() => setError('Não foi possível carregar as informações de compra.'));
    } else {
      // reset ao fechar
      setError(null);
      setSuccess(null);
      setCode('');
    }
  }, [open]);

  async function handleActivate() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await activatePremiumKey(code.trim());
      setSuccess(result.message);
      onActivated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-base-700 bg-base-900 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="text-brand-400" size={22} />
                <h2 className="text-lg font-semibold">Ativar Premium</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Preço + contato para adquirir a key */}
            <div className="rounded-xl bg-base-850 border border-base-700 p-4 mb-4">
              <p className="text-sm text-gray-300">
                Para adquirir uma key, chame{' '}
                <span className="font-semibold text-white">+{info?.whatsappNumber || '5511942945429'}</span>
                {' — '}
                <span className="font-semibold text-brand-400">{info?.priceLabel || 'R$15/mês'}</span>
              </p>

              <a
                href={info?.whatsappLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] transition py-2.5 font-medium text-black"
              >
                <MessageCircle size={18} />
                Falar no WhatsApp para adquirir
              </a>
            </div>

            {/* Ativação da key */}
            <div className="mb-2">
              <label className="text-sm text-gray-400 mb-1.5 flex items-center gap-1.5">
                <KeyRound size={14} /> Já tenho uma key
              </label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="THIA-XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 rounded-lg bg-base-850 border border-base-700 px-3 py-2 text-sm outline-none focus:border-brand-500 transition"
                />
                <button
                  onClick={handleActivate}
                  disabled={loading || !code.trim()}
                  className="rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium transition flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Ativar'}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            {success && (
              <p className="text-sm text-green-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> {success}
              </p>
            )}

            <p className="text-xs text-gray-500 mt-4">
              Cada key é de uso único e vale por 30 dias. Após esse período, sua conta volta
              automaticamente para o plano FREE e uma nova key será necessária.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
