import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { UserPlus, ArrowRight } from 'lucide-react';
import {FIELDS} from '../assets/dummy';

const API_URL = 'http://localhost:4000/api/user';

const SignUp = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/register`, formData);
      
      if (data.success) {
        toast.success('Registration successful! Redirecting to login...');
        setFormData({ name: '', email: '', password: '' });
        
        // Short delay to let the toast be seen before navigating
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'An error occurred. Please try again later.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="max-w-md w-full bg-white shadow-xl border border-purple-100 rounded-2xl p-8 mx-auto mt-20 transition-all">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center mb-5 shadow-2xl shadow-purple-500/30">
          <UserPlus className="w-12 h-12 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2">Create Account</h2>
        <p className="text-gray-500 text-base font-medium">Start managing your tasks with Task Flow</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Dynamic Fields */}
        {FIELDS.map(({ name, type, placeholder, icon: Icon }) => (
          <div key={name} className="space-y-2">
            <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all hover:border-purple-300">
              <div className="text-purple-600 w-6 h-6 mr-4 flex-shrink-0">
                <Icon size={24} strokeWidth={2} />
              </div>
              <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={formData[name]}
                onChange={handleChange}
                required
                className="w-full bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 active:scale-[0.98] transition-all duration-300 text-lg ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </span>
          ) : (
            <>
              Create Account
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm font-medium">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-purple-600 hover:text-purple-800 font-bold underline decoration-2 underline-offset-4 transition-colors"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;