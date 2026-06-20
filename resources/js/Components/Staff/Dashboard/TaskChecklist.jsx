import React from 'react';
import { Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskChecklist({
    tasks,
    newTaskText,
    setNewTaskText,
    onAddTask,
    onToggleTask,
    onDeleteTask,
}) {
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <form onSubmit={onAddTask} className="flex gap-2">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Add a new checklist task..."
                    className="flex-1 rounded-xl border-stone-200 bg-stone-50/30 text-xs shadow-none placeholder:text-stone-400 focus:border-clay-500 focus:ring-clay-500/20 py-2.5 px-4 min-h-[44px]"
                />
                <button
                    type="submit"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-850 active:scale-95 transition-all duration-300"
                    title="Add task"
                >
                    <Plus size={16} strokeWidth={2.5} />
                </button>
            </form>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                    {tasks.length > 0 ? (
                        tasks.map((task) => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300 ${
                                    task.completed
                                        ? 'bg-stone-50/50 border-stone-100'
                                        : 'bg-white border-stone-200/60 shadow-sm hover:border-stone-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onToggleTask(task.id)}
                                    className="flex items-start gap-3 text-left flex-1 active:opacity-80 transition-opacity"
                                >
                                    <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                                        task.completed
                                            ? 'bg-clay-600 border-clay-600 text-white animate-in zoom-in-75 duration-200'
                                            : 'border-stone-300 bg-white hover:border-clay-500'
                                    }`}>
                                        {task.completed && <Check size={11} strokeWidth={3} />}
                                    </div>
                                    <span className={`text-xs font-semibold leading-relaxed transition-all duration-300 ${
                                        task.completed ? 'text-stone-400 line-through' : 'text-stone-750'
                                    }`}>
                                        {task.text}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteTask(task.id)}
                                    className="text-stone-400 hover:text-red-500 hover:bg-red-50/50 p-2.5 rounded-xl active:scale-90 transition-all duration-200"
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
                            className="py-8 text-center bg-stone-50/50 rounded-2xl border border-dashed border-stone-200"
                        >
                            <Sparkles className="mx-auto text-stone-300 mb-2" size={24} />
                            <p className="text-xs font-bold text-stone-500">All tasks completed!</p>
                            <p className="text-[10px] text-stone-400 mt-1">Add tasks above to organize your day.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
