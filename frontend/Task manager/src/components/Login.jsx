import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { LogIn } from "lucide-react";
import { FIELDS } from "../assets/dummy";
import "react-toastify/dist/ReactToastify.css";

const API_URL = "http://localhost:4000/api/user";

// FIX: FIELDS includes name/email/password (for SignUp), but Login only needs email + password.
// Rendering the "name" field against a formData that has no "name" key causes a broken input.
const LOGIN_FIELDS = FIELDS.filter((f) => f.name !== "name");

const Login = ({ onSubmit, onSwitchMode }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchMode = () => {
    toast.dismiss();
    if (onSwitchMode) onSwitchMode();
    navigate("/signup");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rememberMe) {
      toast.error("You must enable Remember Me to login");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/login`, formData);

      if (!data.token) throw new Error(data.message || "Login failed");

      // Persist user session
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id || data.user._id);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      toast.success("Login successful! Redirecting...");

      if (onSubmit) onSubmit(data.user);

      setTimeout(() => navigate("/"), 1000);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Login failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="max-w-md w-full bg-white shadow-xl border border-purple-100 rounded-2xl p-8 mx-auto mt-20 transition-all">
      <ToastContainer position="top-center" autoClose={2000} hideProgressBar />

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center mb-5 shadow-2xl shadow-purple-500/30">
          <LogIn className="w-12 h-12 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2">Welcome Back</h2>
        <p className="text-gray-500 text-base font-medium">Sign in to access your tasks</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* FIX: Use LOGIN_FIELDS (email + password only) instead of full FIELDS */}
        {LOGIN_FIELDS.map(({ name, placeholder, icon: Icon }) => (
          <div key={name} className="space-y-2">
            <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all hover:border-purple-300">
              <div className="text-purple-600 w-6 h-6 mr-4 flex-shrink-0">
                <Icon size={24} strokeWidth={2} />
              </div>
              <input
                type={
                  name === "password" && !showPassword ? "password" : "text"
                }
                name={name}
                placeholder={placeholder}
                value={formData[name]}
                onChange={handleChange}
                required
                className="w-full bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              {name === "password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm font-bold text-purple-600 hover:text-purple-800 transition px-2"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Remember Me Toggle */}
        <div className="flex items-center px-1">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
          />
          <label
            htmlFor="rememberMe"
            className="ml-2 text-gray-600 text-sm select-none cursor-pointer hover:text-gray-800"
          >
            Remember Me
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 active:scale-[0.98] transition-all duration-300 text-lg ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : (
            <>
              Login
              <LogIn className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-gray-500 text-sm mt-8">
        Don't have an account?{" "}
        <button
          onClick={handleSwitchMode}
          className="text-purple-600 hover:text-purple-800 font-bold underline decoration-2 underline-offset-4 cursor-pointer transition-colors"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default Login;