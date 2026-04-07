import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { 
  UserCircle, 
  Shield, 
  Lock, 
  Save, 
  LogOut, 
  ArrowLeft 
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api/user';

const Profile = ({ user, onLogout }) => {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const navigate = useNavigate();

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (data.success) {
          setProfile({ name: data.user.name, email: data.user.email });
        } else {
          toast.error(data.message);
        }
      })
      .catch(() => toast.error('Unable to load profile data'));
  }, []);

  // --- HANDLERS ---
  const saveProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await axios.put(
        `${API_URL}/profile`,
        { name: profile.name, email: profile.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success('Profile updated successfully');
        // If your App.jsx uses context, you'd trigger a refresh here
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profile update failed');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const { data } = await axios.put(
        `${API_URL}/password`,
        { currentPassword: password.current, newPassword: password.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success('Password changed successfully');
        setPassword({ current: '', new: '', confirm: '' });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password change failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 max-w-5xl mx-auto">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      {/* Navigation Header */}
      <button 
        className="group mb-8 flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition-all" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
          <UserCircle className="text-purple-500 w-8 h-8" /> 
          Account Settings
        </h2>
        <p className="text-gray-500 font-medium">Manage your personal information and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* Section: Personal Information */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
            <UserCircle className="text-purple-500 w-5 h-5" /> 
            Personal Details
          </h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Full Name</label>
              <input 
                type="text" 
                value={profile.name} 
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Address</label>
              <input 
                type="email" 
                value={profile.email} 
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required 
              />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2.5 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100">
              <Save className="w-4 h-4" /> 
              Update Profile
            </button>
          </form>
        </section>

        {/* Section: Security */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
            <Shield className="text-purple-500 w-5 h-5" /> 
            Security & Password
          </h3>
          <form onSubmit={changePassword} className="space-y-4">
            <input 
              type="password" 
              placeholder="Current Password"
              value={password.current}
              onChange={e => setPassword({ ...password, current: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
              required 
            />
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="password" 
                placeholder="New Password"
                value={password.new}
                onChange={e => setPassword({ ...password, new: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required 
              />
              <input 
                type="password" 
                placeholder="Confirm"
                value={password.confirm}
                onChange={e => setPassword({ ...password, confirm: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required 
              />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-2.5 rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-gray-100">
              <Lock className="w-4 h-4" /> 
              Change Password
            </button>
          </form>
        </section>

      </div>

      {/* Section: Danger Zone */}
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6">
        <h3 className="text-red-600 font-bold flex items-center gap-2 mb-4">
          <LogOut className="w-5 h-5" /> 
          Session Management
        </h3>
        <p className="text-xs text-red-500 mb-4 font-medium italic">
          Sign out of your account on this device. You will need to log in again to access your tasks.
        </p>
        <button 
          className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100"
          onClick={() => { onLogout(); navigate('/login'); }}
        >
          Logout of Task Flow
        </button>
      </div>
    </div>
  );
};

export default Profile;