import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { CheckCircle, Filter, ListChecks, Plus } from 'lucide-react';

const CompletePage = ({ onLogout }) => {
  const context = useOutletContext();
  let task = [];
  let fetchTask = () => {};
  if (Array.isArray(context) && context.length >= 2) {
    [task, fetchTask] = context;
  }
  const [sortBy, setSortBy] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const completedTasks = useMemo(() => {
    return task.filter(t => {
      if (t.completed === true || t.completed === 1) return true;
      if (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes') return true;
      return false;
    });
  }, [task]);

  const sortedCompletedTasks = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...completedTasks].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priority': return (priorityOrder[b.priority?.toLowerCase()] || 0) - (priorityOrder[a.priority?.toLowerCase()] || 0);
        default: return 0;
      }
    });
  }, [completedTasks, sortBy]);

  const handleTaskSave = () => {
    fetchTask();
    setShowModal(false);
    setSelectedTask(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen animate-in fade-in duration-500">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">Archive</h1>
        </div>
        <p className="text-gray-500 font-medium ml-1">Review your finished tasks and accomplishments.</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Left: Add Task button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 active:scale-95 transition-all duration-300"
          >
            <Plus size={20} />
            <span>New Task</span>
          </button>
        </div>

        {/* Right: Sort and count */}
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
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

          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            Total Completed: {completedTasks.length}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {sortedCompletedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <ListChecks className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-600">No completed tasks yet</h3>
            <p className="text-gray-400 text-sm">Finish your pending tasks to see them here.</p>
          </div>
        ) : (
          sortedCompletedTasks.map(t => (
            <TaskItem
              key={t._id || t.id}
              task={t}
              fetchTask={fetchTask}
              onLogout={onLogout}
              showCompleteCheckbox={false}
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

export default CompletePage;
