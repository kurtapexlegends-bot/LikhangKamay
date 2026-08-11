import React from 'react';
import { Plus, Trash2, Check, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskChecklist({
    tasks,
    newTaskText,
    setNewTaskText,
    onAddTask,
    onToggleTask,
    onDeleteTask,
}) {
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.completed).length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Task Progress Header */}
            {totalCount > 0 && (
                <div className="p-4 rounded-2xl border border-stone-200/70 bg-stone-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className={progressPercent === 100 ? 'text-emerald-600' : 'text-clay-600'} />
                            <span className="text-xs font-extrabold text-stone-900">Shift Task Progress</span>
                        </div>
                        <span className="text-xs font-mono font-extrabold text-stone-700">
                            {completedCount} / {totalCount} ({progressPercent}%)
                        </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200/80 overflow-hidden p-0.5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                                progressPercent === 100
                                    ? 'bg-emerald-500'
                                    : 'bg-clay-600'
                            }`}
                        />
                    </div>
                </div>
            )}

            {/* Task Add Form */}
            <form onSubmit={onAddTask} className="flex gap-2">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new checklist task for your shift..."
                    className="flex-1 rounded-2xl border-stone-200 bg-stone-50/40 text-xs shadow-2xs placeholder:text-stone-400 focus:border-clay-500 focus:ring-clay-500/20 py-2.5 px-4 min-h-[44px]"
                />
                <button
                    type="submit"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-white hover:bg-stone-800 active:scale-95 transition-all duration-200 shadow-2xs"
                    title="Add task"
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>
            </form>

            {/* Task Items List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200 ${
                                    task.completed
                                        ? 'bg-stone-50/60 border-stone-100/90'
                                        : 'bg-white border-stone-200/80 shadow-2xs hover:border-stone-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onToggleTask(task.id)}
                                    className="flex items-start gap-3 text-left flex-1 active:opacity-85 transition-opacity"
                                >
                                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                                        task.completed
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                            : 'border-stone-300 bg-white hover:border-clay-500'
                                    }`}>
                                        {task.completed && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    <span className={`text-xs font-semibold leading-relaxed transition-all duration-200 ${
                                        task.completed ? 'text-stone-400 line-through' : 'text-stone-800'
                                    }`}>
                                        {task.text}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteTask(task.id)}
                                    className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl active:scale-90 transition-all duration-200"
                                    title="Delete task"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-10 text-center bg-stone-50/40 rounded-2xl border border-dashed border-stone-200/80"
                        >
                            <Sparkles className="mx-auto text-clay-400 mb-2" size={24} />
                            <p className="text-xs font-bold text-stone-700">All checklist tasks completed!</p>
                            <p className="text-[11px] text-stone-400 mt-1">Add tasks above to organize your active shift.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
