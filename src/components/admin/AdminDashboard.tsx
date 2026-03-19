import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MessageSquare, Shield, ChevronRight, Search, Activity } from 'lucide-react';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useAuth } from '../../providers/AuthProvider';
import { useAppState } from '../../App';
import { formatPreciseDate, truncateAddress, getAvatarColor, getInitials } from '../../lib/utils';
import { Star, StarOff, ShieldAlert, ShieldCheck as ShieldVerified, Save } from 'lucide-react';


export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'system'>('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const { mode } = useAppState();
  const allUsers = useAsyncQuery(
    mode === 'live' && user ? () => db.listAllUsers() : null,
    [mode, user?.userId]
  );
  const inbox = useAsyncQuery(
    mode === 'live' && user ? () => db.getAdminInbox() : null,
    [mode, user?.userId]
  );
  
  const priorityCode = useAsyncQuery(
    () => db.getSystemConfig({ key: "priorityCode" }),
    []
  );
  const isPriorityActive = useAsyncQuery(
    () => db.getSystemConfig({ key: "isPriorityCodeActive" }),
    []
  ) ?? true;


  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('Welcome to PayMe');
  const [broadcastMessage, setBroadcastMessage] = useState('We’re live! Your wallet is ready and you can start sending payments.');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  useEffect(() => {
    if (priorityCode) setNewCode(priorityCode as string);
  }, [priorityCode]);


  return (
    <motion.div
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: 'max(48px, env(safe-area-inset-top, 0px) + 16px) 20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#F97316" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Admin Console</h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: '0.5px' }}>PAYME PROTOCOL CORE</p>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface-2)', border: 'none', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'support', label: 'Support', icon: MessageSquare },
          { id: 'system', label: 'System', icon: Activity },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '16px 0',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === t.id ? '#F97316' : 'transparent'}`,
              color: activeTab === t.id ? 'var(--color-text)' : 'var(--color-text-3)',
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
              <input 
                placeholder="Search users by name, email or DID..."
                style={{ width: '100%', height: 48, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '0 16px 0 42px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
            {allUsers?.map((u: any) => (
              <div key={u._id} style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: getAvatarColor(u.username || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>
                  {getInitials(u.name || u.username || 'U')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name || u.username}</span>
                    {u.isAdmin && <span style={{ background: 'var(--color-orange-dim)', color: '#F97316', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{u.email || truncateAddress(u.walletAddress || '', 10)}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>${(u.balance || 0).toFixed(2)}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>L{u.verificationLevel || 0} Verif</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      onClick={() => db.toggleUserPriority({ userId: u.userId, field: 'isGated', value: !u.isGated })}
                      title={u.isGated ? "Un-gate User" : "Gate User"}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: u.isGated ? '#EF4444' : '#22C55E' }}
                    >
                      {u.isGated ? <ShieldAlert size={18} /> : <ShieldVerified size={18} />}
                    </button>
                    <button 
                      onClick={() => db.toggleUserPriority({ userId: u.userId, field: 'canRefer', value: !u.canRefer })}
                      title={u.canRefer ? "Revoke Referral Access" : "Grant Referral Access"}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: u.canRefer ? '#F97316' : 'var(--color-text-4)' }}
                    >
                      {u.canRefer ? <Star size={18} /> : <StarOff size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {activeTab === 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inbox?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>No active support threads</p>
              </div>
            )}
            {inbox?.map((thread: any) => (
              <div 
                key={thread.userId} 
                className="row-item"
                onClick={() => setSelectedUser(thread.userId)}
                style={{ background: 'var(--color-surface)', borderRadius: 18, border: '1px solid var(--color-border)', padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: thread.unreadCount > 0 ? '#F97316' : 'transparent' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{truncateAddress(thread.userId, 6)}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{formatPreciseDate(new Date(thread.timestamp).toISOString())}</span>
                  </div>
                  <p style={{ fontSize: 13, color: thread.unreadCount > 0 ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: thread.unreadCount > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                    {thread.lastMessage}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--color-text-3)" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 20, padding: 24, border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>System Health</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8 }}>CONVEX LATENCY</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#22C55E' }}>12ms</p>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8 }}>SOLANA DEVNET</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#22C55E' }}>HEALTHY</p>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8 }}>TOTAL USERS</p>
                  <p style={{ fontSize: 20, fontWeight: 800 }}>{allUsers?.length || 0}</p>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 14, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 8 }}>ACTIVE THREADS</p>
                  <p style={{ fontSize: 20, fontWeight: 800 }}>{inbox?.length || 0}</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: 24, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Priority Access Control</h3>
                <div 
                  className={`toggle ${isPriorityActive ? 'on' : ''}`} 
                  onClick={() => db.updateSystemConfig({ key: 'isPriorityCodeActive', value: !isPriorityActive })}
                >
                  <div className="toggle-thumb" />
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 16 }}>
                The global priority code allows anyone to bypass the invite gate immediately.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="GLOBAL PRIORITY CODE"
                  style={{ flex: 1, height: 48, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '0 16px', fontSize: 14, color: 'var(--color-text)', fontWeight: 700, letterSpacing: '1px' }}
                />
                <button 
                  disabled={saving || newCode === priorityCode}
                  onClick={async () => {
                    setSaving(true);
                    await db.updateSystemConfig({ key: 'priorityCode', value: newCode });
                    setSaving(false);
                  }}
                  className="btn-primary" 
                  style={{ width: 48, height: 48, borderRadius: 14, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Save size={18} />
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', borderRadius: 20, padding: 24, border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Broadcast Notification</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 16 }}>
                Send a system announcement to all users (welcome message, maintenance updates, etc.).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Title"
                  style={{ width: '100%', height: 44, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '0 14px', fontSize: 14, color: 'var(--color-text)' }}
                />
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Message"
                  rows={3}
                  style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--color-text)', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    disabled={broadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                    onClick={async () => {
                      setBroadcasting(true);
                      setBroadcastStatus(null);
                      try {
                        const result = await db.broadcastNotification({
                          title: broadcastTitle.trim(),
                          content: broadcastMessage.trim(),
                          type: 'system',
                        });
                        setBroadcastStatus(`Sent to ${result.sent}/${result.total} users.`);
                      } catch (err: any) {
                        setBroadcastStatus(err?.message || 'Broadcast failed.');
                      } finally {
                        setBroadcasting(false);
                      }
                    }}
                    className="btn-primary"
                    style={{ height: 44, borderRadius: 12, padding: '0 18px', fontSize: 14, fontWeight: 700 }}
                  >
                    {broadcasting ? 'Sending...' : 'Send To All'}
                  </button>
                  {broadcastStatus && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{broadcastStatus}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {selectedUser && (
           <AdminChatView userId={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AdminChatView({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { user } = useAuth();
  const messages = useAsyncQuery(
    () => db.getMessagesForUser({ userId }),
    [userId]
  );
  const [content, setContent] = useState('');

  useEffect(() => {
    if (user) db.markSupportAsRead({ userId });
  }, [userId, user, messages]);

  const handleSend = async () => {
    if (!content.trim() || !user) return;
    await db.sendSupportMessage({
      userId,
      role: 'admin',
      content: content.trim()
    });
    setContent('');
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
      style={{ position: 'absolute', inset: 0, zIndex: 110, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: 'max(48px, env(safe-area-inset-top, 0px) + 16px) 20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
          <X size={24} />
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Chat with {truncateAddress(userId, 8)}</h3>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages?.map((m: any) => (
          <div key={m._id} style={{ alignSelf: m.role === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ 
              background: m.role === 'admin' ? '#F97316' : 'var(--color-surface-2)', 
              color: m.role === 'admin' ? 'white' : 'var(--color-text)',
              padding: '10px 14px', borderRadius: 16, fontSize: 14 
            }}>
              {m.content}
            </div>
            <p style={{ fontSize: 9, color: 'var(--color-text-3)', marginTop: 4, textAlign: m.role === 'admin' ? 'right' : 'left' }}>
              {formatPreciseDate(new Date(m.timestamp).toISOString())}
            </p>
          </div>
        ))}
      </div>

      <div style={{ padding: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
        <input 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type a reply..."
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, height: 48, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '0 16px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
        />
        <button onClick={handleSend} className="btn-primary" style={{ height: 48, padding: '0 20px', borderRadius: 14 }}>Send</button>
      </div>
    </motion.div>
  );
}
