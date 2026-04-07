import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { Clock, Filter, Coffee, Plus } from 'lucide-react';

const PendingPage = ({ onLogout }) => {
  const context = useOutletContext();
  let task = [];
  let fetchTask = () => {};
  if (Array.isArray(context) && context.length >= 2) {
    [task, fetchTask] = context;
  }
  const [sortBy, setSortBy] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // --- LOGIC: FILTER PENDING ---
  const pendingTasks = useMemo(() => {
    return task.filter(t => {
      const isNotDone =
        !t.completed ||
        t.completed === 'no' ||
        t.completed === false ||
        t.completed === 0;
      return isNotDone;
    });
  }, [task]);

  // --- LOGIC: SORTING ---
  const sortedPendingTasks = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...pendingTasks].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priority': return (priorityOrder[b.priority?.toLowerCase()] || 0) - (priorityOrder[a.priority?.toLowerCase()] || 0);
        default: return 0;
      }
    });
  }, [pendingTasks, sortBy]);

  const handleTaskSave = () => {
    fetchTask();
    setShowModal(false);
    setSelectedTask(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header Section */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
            <Clock className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
            Pending Tasks
          </h1>
        </div>
        <p className="text-gray-500 font-medium ml-1">
          Items that require your immediate attention.
        </p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Left side: Add Task button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 active:scale-95 transition-all duration-300"
          >
            <Plus size={20} />
            <span>New Task</span>
          </button>
        </div>

        {/* Right side: Sort and count */}
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <Filter className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort</span>
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

          <div className="text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
            Remaining: {pendingTasks.length}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {sortedPendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 animate-bounce duration-[3000ms]">
              <Coffee className="w-10 h-10 text-purple-300" />
            </div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">All caught up!</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
              You've cleared your queue. Time to grab a coffee or relax.
            </p>
            <button
              onClick={() => fetchTask()}
              className="mt-8 px-8 py-3 bg-white border border-purple-100 text-purple-600 font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-purple-50 transition-all active:scale-95"
            >
              Check for Updates
            </button>
          </div>
        ) : (
          sortedPendingTasks.map(t => (
            <TaskItem
              key={t._id || t.id}
              task={t}
              fetchTask={fetchTask}
              onLogout={onLogout}
              showCompleteCheckbox={true}
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
        onSave={handleTaskSave}
        onLogout={onLogout}
      />
    </div>
  );
};

export default PendingPage;
