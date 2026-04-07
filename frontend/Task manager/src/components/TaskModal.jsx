import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, Calendar, AlertCircle, FileText, Flag, Star } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';

const TaskModal = ({ isOpen, onClose, taskToEdit, onSave, onLogout }) => {
  const defaultTask = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    completed: 'no',
  };

  const [taskData, setTaskData] = useState(defaultTask);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- SYNC DATA ON OPEN ---
  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      const isDone =
        taskToEdit.completed === true ||
        taskToEdit.completed === 1 ||
        (typeof taskToEdit.completed === 'string' && taskToEdit.completed.toLowerCase() === 'yes');

      setTaskData({
        ...taskToEdit,
        completed: isDone ? 'yes' : 'no',
        dueDate: taskToEdit.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0]
      });
    } else {
      setTaskData({ ...defaultTask, dueDate: new Date().toISOString().split('T')[0] });
      setError(null);
    }
  }, [isOpen, taskToEdit]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!taskData.title.trim()) {
      setError('Task title is required');
      return;
    }
    if (new Date(taskData.dueDate) < new Date(new Date().setHours(0,0,0,0))) {
      setError('Due date cannot be in the past.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEdit = Boolean(taskData._id);
      const url = isEdit ? `${API_BASE_URL}/task/gp/${taskData._id}` : `${API_BASE_URL}/task/gp`;
      const method = isEdit ? 'put' : 'post';

      const response = await axios[method](url, taskData, { headers: getAuthHeaders() });

      if (response.data.success) {
        onSave();
        onClose();
      } else {
        setError(response.data.message || 'Failed to save task');
      }
    } catch (err) {
      if (err.response?.status === 401) onLogout();
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border-2 border-purple-100 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg">
              <Star size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                {taskToEdit ? 'Edit Task' : 'New Task'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {taskToEdit ? 'Update your task details' : 'Create a new task to get started'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all hover:rotate-90 duration-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-red-700 bg-red-50 p-4 rounded-xl border border-red-200">
            <AlertCircle size={20} className="text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} />
              Task Title
            </label>
            <input
              type="text"
              name="title"
              value={taskData.title}
              onChange={handleChange}
              required
              placeholder="What needs to be done?"
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-sm hover:border-purple-300"
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider">Description</label>
            <textarea
              name="description"
              rows={3}
              value={taskData.description}
              onChange={handleChange}
              placeholder="Add details, notes, or context..."
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none shadow-sm hover:border-purple-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                <Flag size={14} />
                Priority
              </label>
              <select
                name="priority"
                value={taskData.priority}
                onChange={handleChange}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base font-semibold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all cursor-pointer shadow-sm hover:border-purple-300"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🔴 High Priority</option>
              </select>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} />
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dueDate"
                  min={new Date().toISOString().split('T')[0]}
                  value={taskData.dueDate}
                  onChange={handleChange}
                  required
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base font-semibold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-sm hover:border-purple-300"
                />
              </div>
            </div>
          </div>

          {/* Status Radio Group */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider">Current Status</label>
            <div className="grid grid-cols-2 gap-4">
              {['no', 'yes'].map(val => (
                <label
                  key={val}
                  className={`relative flex items-center justify-center px-4 py-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                    taskData.completed === val
                      ? val === 'yes'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-500 text-white shadow-lg shadow-emerald-200'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="completed"
                    value={val}
                    checked={taskData.completed === val}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <span className="flex items-center gap-2">
                    {val === 'yes' ? '✓ Completed' : '○ In Progress'}
                  </span>
                </label>
              ))}
            </div>
          </div>

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
                Processing...
              </span>
            ) : (
              <>
                <Star size={20} />
                {taskToEdit ? 'Update Task' : 'Create Task'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
