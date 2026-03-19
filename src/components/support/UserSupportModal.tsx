import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, MessageSquare, Headphones } from 'lucide-react';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useAuth } from '../../providers/AuthProvider';
import { useAppState } from '../../App';

export default function UserSupportModal({ onClose }: { onClose: () => void }) {
  const [_errorStatus, setErrorStatus] = useState<string | null>(null);

  try {
    return <SupportContent onClose={onClose} onError={setErrorStatus} />;
  } catch (err) {
    return <SupportError onClose={onClose} />;
  }
}

function SupportContent({ onClose, onError: _onError }: { onClose: () => void, onError: (s: string) => void }) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { mode } = useAppState();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = mode === 'live' && isAuthenticated && user ? user?.userId : 'demo_user_support';
  
  const messages = useAsyncQuery(
    () => db.getMessagesForUser({ userId, externalUserId: user?.userId }),
    [userId, user?.userId]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      await db.sendSupportMessage({
        userId: userId || 'anonymous',
        role: 'user',
        content: content.trim(),
        externalUserId: user?.userId,
      });
      setContent('');
    } catch (e) {
      console.error(e);
      alert('Failed to send message. Please check your connection.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--color-overlay)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, height: '80vh',
          background: 'var(--color-surface)',
          borderRadius: '28px 28px 0 0',
          border: '1px solid var(--color-border-strong)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="modal-handle" />
        <div style={{ padding: '8px 24px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Headphones size={18} color="#F97316" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>PayMe Support</h3>
              <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>Online • Typically replies in 5m</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}>
            <X size={24} />
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!messages && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="spin" style={{ width: 24, height: 24, border: '2px solid var(--color-orange)', borderTopColor: 'transparent', borderRadius: '50%' }} />
            </div>
          )}
          {messages?.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, textAlign: 'center', padding: 40 }}>
              <MessageSquare size={48} style={{ marginBottom: 16 }} />
              <p style={{ fontWeight: 600 }}>How can we help you today?</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Our support team is ready to assist you.</p>
            </div>
          )}
          {messages?.map((m: any) => (
            <div key={m._id || m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ 
                background: m.role === 'user' ? '#F97316' : 'var(--color-surface-2)', 
                color: m.role === 'user' ? 'white' : 'var(--color-text)',
                padding: '12px 16px', borderRadius: '14px', fontSize: 14 
              }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
          <input 
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ flex: 1, height: 50, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '0 16px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
          />
          <button onClick={handleSend} style={{ width: 50, height: 50, borderRadius: 16, background: '#F97316', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <Send size={20} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SupportError({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--color-surface)', padding: 32, borderRadius: 24, textAlign: 'center', maxWidth: 400 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Connection Issue</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 24 }}>We're having trouble connecting to the support system. Please try again later or email us directly.</p>
        <button className="btn-primary" onClick={onClose} style={{ width: '100%', height: 48, borderRadius: 12 }}>Close</button>
      </div>
    </div>
  );
}
