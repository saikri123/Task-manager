import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MoreVertical,
  CheckCircle,
  Circle,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Flag
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';

const TaskItem = ({
  task,
  fetchTask,
  onLogout,
  onEdit,
  showCompleteCheckbox = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const menuRef = useRef(null);

  // --- SYNC COMPLETION STATE ---
  useEffect(() => {
    const completedStatus =
      task.completed === true ||
      task.completed === 1 ||
      (typeof task.completed === 'string' &&
        task.completed.toLowerCase() === 'yes');
    setIsCompleted(completedStatus);
  }, [task.completed]);

  // --- CLOSE MENU ON CLICK OUTSIDE ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HELPERS ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // --- API ACTIONS ---
  const handleCompleteToggle = async () => {
    try {
      const newStatus = isCompleted ? "no" : "yes";
      await axios.put(
        `${API_BASE_URL}/task/gp/${task._id}`,
        { completed: newStatus },
        getAuthHeaders(),
      );
      setIsCompleted(!isCompleted);
      fetchTask();
    } catch (error) {
      if (error.response?.status === 401) onLogout();
      console.error("Toggle failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/task/gp/${task._id}`,
        getAuthHeaders(),
      );
      fetchTask();
    } catch (error) {
      if (error.response?.status === 401) onLogout();
      console.error("Delete failed:", error);
    }
  };

  // --- HELPERS ---
  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'high') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' };
    if (p === 'medium') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-500' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const priorityColors = getPriorityColor(task.priority);
  const isOverdue = !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      className={`group flex justify-between items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${
        isCompleted
          ? "bg-emerald-50/50 border-emerald-200 opacity-85"
          : "bg-white border-gray-100 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100"
      }`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Completion Checkbox */}
        {showCompleteCheckbox && (
          <button
            onClick={handleCompleteToggle}
            className={`mt-1 flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-500 text-white shadow-md"
                : "border-gray-300 text-transparent hover:border-purple-500 hover:bg-purple-50"
            }`}
          >
            <CheckCircle
              size={18}
              strokeWidth={3}
              className={isCompleted ? "block" : "group-hover:text-purple-400"}
            />
          </button>
        )}

        {/* Task Details */}
        <div className="flex flex-col min-w-0">
          <h4
            className={`font-bold text-base md:text-lg truncate transition-all mb-2 ${
              isCompleted ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {task.title || 'Untitled Task'}
          </h4>

          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {task.description || "No description provided."}
          </p>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`}>
              <Flag size={12} className={priorityColors.icon} />
              {task.priority ? task.priority.toUpperCase() : 'MEDIUM'}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-purple-500'} />
              Due: {formatDate(task.dueDate)}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 border border-gray-200">
              <Clock size={12} />
              Created: {formatDate(task.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Options Menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all hover:rotate-90 duration-300"
        >
          <MoreVertical size={20} />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-44 bg-white border-2 border-purple-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <Edit3 size={16} className="text-purple-500" />
              Edit Task
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                handleDelete();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
            >
              <Trash2 size={16} />
              Delete Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskItem;
