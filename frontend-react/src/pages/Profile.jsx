import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { profileApi } from '../api/banking';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const showToast = useToastContext();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [activeTab, setActiveTab] = useState('info');

    const [form, setForm] = useState({ name: '', phone: '', dateOfBirth: '', street: '', city: '', state: '', pincode: '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const loadProfile = useCallback(async () => {
        try {
            const data = await profileApi.get();
            setProfile(data.user);
            setForm({
                name: data.user.name || '',
                phone: data.user.phone || '',
                dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.split('T')[0] : '',
                street: data.user.address?.street || '',
                city: data.user.address?.city || '',
                state: data.user.address?.state || '',
                pincode: data.user.address?.pincode || ''
            });
        } catch (err) {
            showToast('Failed to load profile: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await profileApi.update({
                name: form.name,
                phone: form.phone,
                dateOfBirth: form.dateOfBirth || undefined,
                address: { street: form.street, city: form.city, state: form.state, pincode: form.pincode }
            });
            updateUser(data.user);
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            return showToast('New passwords do not match', 'error');
        }
        setChangingPw(true);
        try {
            await profileApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            showToast('Password changed successfully!', 'success');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setChangingPw(false);
        }
    };

    const kycColors = { VERIFIED: 'var(--green)', PENDING: 'var(--gold)', REJECTED: 'var(--red)' };
    const kycIcons  = { VERIFIED: 'ri-shield-check-fill', PENDING: 'ri-time-fill', REJECTED: 'ri-close-circle-fill' };

    if (loading) return (
        <Layout title="Profile" subtitle="Manage your personal information">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
        </Layout>
    );

    return (
        <Layout title="Profile" subtitle="Manage your personal information and security">
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                {/* Profile Header */}
                <div className="glass-card profile-header" style={{ marginBottom: '24px' }}>
                    <div className="profile-avatar">{profile?.name?.[0]?.toUpperCase() || '?'}</div>
                    <div className="profile-info">
                        <div className="profile-name">{profile?.name}</div>
                        <div className="profile-email">{profile?.email}</div>
                        <div className={`profile-kyc kyc-${profile?.kycStatus}`}>
                            <i className={kycIcons[profile?.kycStatus]} />
                            KYC: {profile?.kycStatus}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Member since</div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        {profile?.lastLogin && (
                            <>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '4px' }}>Last login</div>
                                <div style={{ fontSize: '12px' }}>{new Date(profile.lastLogin).toLocaleString('en-IN')}</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', padding: '6px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    {[{ id: 'info', label: 'Personal Info', icon: 'ri-user-fill' }, { id: 'security', label: 'Security', icon: 'ri-shield-fill' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`btn${activeTab === tab.id ? ' btn-primary' : ' btn-ghost'}`}
                            style={{ flex: 1 }}>
                            <i className={tab.icon} />{tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'info' && (
                    <div className="glass-card" style={{ padding: '28px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px' }}>Personal Information</h3>
                        <form onSubmit={handleSave} className="page-form">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="input-wrapper">
                                    <i className="input-icon ri-user-line" />
                                    <input className="form-input input-with-icon" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" value={profile?.email} disabled style={{ opacity: 0.5 }} />
                                <span className="form-hint">Email cannot be changed</span>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <div className="input-wrapper">
                                        <i className="input-icon ri-phone-line" />
                                        <input className="form-input input-with-icon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input type="date" className="form-input" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                                </div>
                            </div>
                            <div className="divider" />
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Address</h4>
                            <div className="form-group">
                                <label className="form-label">Street</label>
                                <input className="form-input" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="House no., Street name" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    <input className="form-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pincode</label>
                                <input className="form-input" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="6-digit pincode" maxLength={6} style={{ maxWidth: '160px' }} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full" disabled={saving} id="save-profile-btn">
                                {saving ? <><Spinner /> Saving…</> : <><i className="ri-save-line" /> Save Changes</>}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="glass-card" style={{ padding: '28px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px' }}>Change Password</h3>
                        <form onSubmit={handleChangePassword} className="page-form">
                            <div className="form-group">
                                <label className="form-label">Current Password</label>
                                <div className="input-wrapper">
                                    <i className="input-icon ri-lock-line" />
                                    <input type="password" className="form-input input-with-icon" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <div className="input-wrapper">
                                    <i className="input-icon ri-lock-password-line" />
                                    <input type="password" className="form-input input-with-icon" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} />
                                </div>
                                <span className="form-hint">Minimum 6 characters</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <div className="input-wrapper">
                                    <i className="input-icon ri-lock-password-line" />
                                    <input type="password" className="form-input input-with-icon" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-full" disabled={changingPw} id="change-password-btn">
                                {changingPw ? <><Spinner /> Changing…</> : <><i className="ri-key-fill" /> Change Password</>}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </Layout>
    );
}
