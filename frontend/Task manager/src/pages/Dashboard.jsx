import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { Filter, Inbox, Plus, BarChart, LayoutDashboard, Clock, CheckCircle } from 'lucide-react';

const Dashboard = ({ onLogout }) => {
  const context = useOutletContext();
  let task = [];
  let fetchTask = () => {};
  if (Array.isArray(context) && context.length >= 2) {
    [task, fetchTask] = context;
  }
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [sortBy, setSortBy] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filter tasks based on status
  const filteredTasks = useMemo(() => {
    return task.filter(t => {
      const isCompleted =
        t.completed === true ||
        t.completed === 1 ||
        (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes');
      if (filter === 'all') return true;
      if (filter === 'pending') return !isCompleted;
      if (filter === 'completed') return isCompleted;
      return true;
    });
  }, [task, filter]);

  // Sort filtered tasks
  const sortedTasks = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...filteredTasks].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priority': return (priorityOrder[b.priority?.toLowerCase()] || 0) - (priorityOrder[a.priority?.toLowerCase()] || 0);
        default: return 0;
      }
    });
  }, [filteredTasks, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = task.length;
    const completed = task.filter(t =>
      t.completed === true || t.completed === 1 ||
      (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')
    ).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [task]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
            <LayoutDashboard className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">Dashboard</h1>
        </div>
        <p className="text-gray-500 font-medium ml-1">Overview of all your tasks</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl shadow-sm border-2 border-purple-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <Inbox size={24} />
            </div>
            <BarChart size={20} className="text-purple-400" />
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">Total Tasks</p>
          <p className="text-4xl font-black text-gray-800">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border-2 border-amber-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white shadow-lg">
              <Clock size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">Pending</p>
          <p className="text-4xl font-black text-gray-800">{stats.pending}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl shadow-sm border-2 border-emerald-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white shadow-lg">
              <CheckCircle size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 font-medium mb-1">Completed</p>
          <p className="text-4xl font-black text-gray-800">{stats.completed}</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-purple-100 w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-amber-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-emerald-50'
            }`}
          >
            Completed
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Task Button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 active:scale-95 transition-all duration-300"
          >
            <Plus size={20} />
            <span>New Task</span>
          </button>

          {/* Sort */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm w-fit">
            <Filter className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sort</span>
            <select
              className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-600">No tasks found</h3>
            <p className="text-gray-400 text-sm">Create a new task to get started.</p>
          </div>
        ) : (
          sortedTasks.map(t => (
            <TaskItem
              key={t._id || t.id}
              task={t}
              fetchTask={fetchTask}
              onLogout={onLogout}
              showCompleteCheckbox={filter !== 'completed'}
              onEdit={() => {
                setSelectedTask(t);
                setShowModal(true);
              }}
            />
          ))
        )}
      </div>

      <TaskModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTask(null);
        }}
        taskToEdit={selectedTask}
        onSave={() => {
          fetchTask();
          setShowModal(false);
          setSelectedTask(null);
        }}
        onLogout={onLogout}
      />
    </div>
  );
};

export default Dashboard;
