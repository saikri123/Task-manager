import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Zap, Circle, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';

const Layout = ({ user, onLogout }) => {
  const [task, setTask] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- DATA FETCHING ---
  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        onLogout();
        return;
      }

      const { data } = await axios.get(`${API_BASE_URL}/task/gp`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // FIX: Backend returns { success: true, tasks: [...] }
      // Use correct property 'tasks' instead of 'task'
      const tasks = Array.isArray(data?.tasks) ? data.tasks : data?.data?.tasks || [];
      setTask(tasks);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error('Fetch tasks error:', errMsg);
      setError(errMsg);
      if (err.response?.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const completed = task.filter(t => 
      t.completed === true || 
      t.completed === 1 || 
      (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')
    );
    const totalCount = task.length;
    const completedTasks = completed.length;
    const pendingCount = totalCount - completedTasks;
    const completionPercentage = totalCount ? Math.round((completedTasks / totalCount) * 100) : 0;

    return { totalCount, completedTasks, pendingCount, completionPercentage };
  }, [task]);

  // --- UI COMPONENTS ---
  const StatCard = ({ title, value, icon }) => (
    <div className="flex items-center gap-2 group transition-all">
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 group-hover:from-fuchsia-500/20 group-hover:to-purple-500/20">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
          {value}
        </p>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
      </div>
    </div>
  );

  // --- LOADING & ERROR STATES ---
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-red-100 text-red-600 p-4 rounded-lg border border-red-200 max-w-md text-center">
        <p className="font-medium mb-2">Error loading tasks</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={fetchTask} 
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="flex">
        <Sidebar user={user} task={task} onLogout={onLogout} />
        
        <main className="ml-0 xl:ml-64 md:ml-16 pt-16 p-3 md:p-4 transition-all duration-300 w-full grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Main Content (Dashboard/Pending/Complete) */}
          <div className="xl:col-span-2 space-y-3 sm:space-y-4">
            <Outlet context={[task, fetchTask]} />
          </div>

          {/* Quick Stats Sidebar */}
          <aside className="h-fit sticky top-20 bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2 text-gray-800">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" /> 
              Task Overview
            </h3>

            <div className="grid grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4 mb-4">
              <StatCard title="Total Tasks" value={stats.totalCount} icon={<Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />} />
              <StatCard title="Completed" value={stats.completedTasks} icon={<CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />} />
              <StatCard title="Pending" value={stats.pendingCount} icon={<Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fuchsia-500" />} />
              <StatCard title="Rate" value={`${stats.completionPercentage}%`} icon={<Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />} />
            </div>

            <hr className="my-3 sm:my-4 border-purple-200" />

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-gray-700 text-xs sm:text-sm font-medium gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Circle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-500" /> 
                  Task Progress
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {stats.completedTasks} / {stats.totalCount}
                </span>
              </div>
              
              <div className="relative pt-1">
                <div className="flex gap-2.5 items-center h-2 sm:h-3 bg-purple-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500" 
                    style={{ width: `${stats.completionPercentage}%` }} 
                  ></div>
                </div>
              </div>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
};

export default Layout;