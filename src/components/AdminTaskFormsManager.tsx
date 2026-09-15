import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  FileText,
  Tag,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { TaskForm, TaskQuestion, TaskFieldType } from '../types';
import {
  getTaskForms,
  subscribeToTaskForms,
  saveTaskForm,
  deleteTaskForm
} from '../lib/firebase';

export const AdminTaskFormsManager: React.FC = () => {
  const [taskForms, setTaskForms] = useState<TaskForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form being edited
  const [currentForm, setCurrentForm] = useState<TaskForm>({
    id: '',
    title: '',
    description: '',
    category: 'Intelligence',
    isActive: true,
    createdAt: new Date().toISOString(),
    questions: []
  });

  // Load and subscribe to task forms
  useEffect(() => {
    getTaskForms().then(setTaskForms).catch(console.warn);
    const unsubscribe = subscribeToTaskForms((forms) => {
      setTaskForms(forms);
    });
    return () => unsubscribe();
  }, []);

  // Filter forms
  const filteredForms = taskForms.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.category && f.category.toLowerCase().includes(q))
    );
  });

  // Open modal to create a new task form
  const handleCreateNewForm = () => {
    setCurrentForm({
      id: `task_form_${Date.now()}`,
      title: '',
      description: '',
      category: 'Operations',
      isActive: true,
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: `q_${Date.now()}_1`,
          label: 'Primary Directive / Report Summary',
          description: 'Provide an overview of this operational task.',
          type: 'textarea',
          required: true,
          allowAddInfo: false
        },
        {
          id: `q_${Date.now()}_2`,
          label: 'Continuous Intel Updates (Allowed Box)',
          description: 'Authorized box: Members can append new information to this field anytime.',
          type: 'textarea',
          required: false,
          allowAddInfo: true
        }
      ]
    });
    setErrorMessage(null);
    setIsEditingForm(true);
  };

  // Open modal to edit an existing task form
  const handleEditForm = (form: TaskForm) => {
    setCurrentForm(JSON.parse(JSON.stringify(form)));
    setErrorMessage(null);
    setIsEditingForm(true);
  };

  // Delete a task form
  const handleDeleteForm = async (id: string, title: string) => {
    if (confirm(`Permanently delete task form "${title}"?`)) {
      try {
        await deleteTaskForm(id);
      } catch (err) {
        console.error('Failed to delete task form:', err);
      }
    }
  };

  // Add question to current form
  const handleAddQuestion = () => {
    const newQuestion: TaskQuestion = {
      id: `q_${Date.now()}_${currentForm.questions.length + 1}`,
      label: 'New Question / Field',
      description: '',
      type: 'text',
      required: false,
      allowAddInfo: false
    };

    setCurrentForm({
      ...currentForm,
      questions: [...currentForm.questions, newQuestion]
    });
  };

  // Update a question in current form
  const handleUpdateQuestion = (index: number, updates: Partial<TaskQuestion>) => {
    const nextQuestions = [...currentForm.questions];
    nextQuestions[index] = { ...nextQuestions[index], ...updates };
    setCurrentForm({
      ...currentForm,
      questions: nextQuestions
    });
  };

  // Remove a question
  const handleRemoveQuestion = (index: number) => {
    const nextQuestions = currentForm.questions.filter((_, i) => i !== index);
    setCurrentForm({
      ...currentForm,
      questions: nextQuestions
    });
  };

  // Move question order
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= currentForm.questions.length) return;

    const nextQuestions = [...currentForm.questions];
    const temp = nextQuestions[index];
    nextQuestions[index] = nextQuestions[nextIndex];
    nextQuestions[nextIndex] = temp;

    setCurrentForm({
      ...currentForm,
      questions: nextQuestions
    });
  };

  // Save the task form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentForm.title.trim()) {
      setErrorMessage('Form title is required.');
      return;
    }

    if (currentForm.questions.length === 0) {
      setErrorMessage('Please add at least one question or field box to the task form.');
      return;
    }

    for (let i = 0; i < currentForm.questions.length; i++) {
      if (!currentForm.questions[i].label.trim()) {
        setErrorMessage(`Question #${i + 1} requires a label.`);
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveTaskForm(currentForm);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditingForm(false);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save task form.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium">
              Task System (/#/info)
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-white">
              Member Task Forms
            </h2>
          </div>
          <p className="font-editorial italic text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
            Configure distinct task forms for the <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded">/#/info</code> task portal. Members can fill these forms multiple times for different purposes and continuously add new information to allowed boxes.
          </p>
        </div>

        <button
          id="btnCreateTaskForm"
          type="button"
          onClick={handleCreateNewForm}
          className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 text-black" />
          Create New Task Form
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search task forms by title, category, or description..."
          className="w-full font-body pl-9 pr-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
        />
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-white/40 mx-auto" />
          <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
            No Task Forms Configured
          </h3>
          <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
            Create your first member task form. You can designate any question box as "Allowed to add new information anytime".
          </p>
          <button
            type="button"
            onClick={handleCreateNewForm}
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            Create Task Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const allowedBoxes = form.questions.filter((q) => q.allowAddInfo);

            return (
              <div
                key={form.id}
                className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-white/60" />
                      {form.category || 'General'}
                    </span>
                    <span className="font-mono text-[10px] text-white/50">
                      {form.questions.length} question{form.questions.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                    {form.title}
                  </h3>

                  {form.description && (
                    <p className="font-editorial italic text-xs text-white/75 leading-relaxed">
                      {form.description}
                    </p>
                  )}

                  {/* Highlights */}
                  <div className="pt-1">
                    {allowedBoxes.length > 0 ? (
                      <div className="p-2.5 rounded-lg border border-white/20 bg-white/[0.02] space-y-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-white" />
                          {allowedBoxes.length} Allowed Box{allowedBoxes.length === 1 ? '' : 'es'} (Continuous Info):
                        </span>
                        <ul className="list-disc list-inside font-body text-xs text-white/80 space-y-0.5 pl-1">
                          {allowedBoxes.map((b) => (
                            <li key={b.id} className="truncate">
                              {b.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-white/40">
                        No continuous info boxes configured
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteForm(form.id, form.title)}
                    className="p-2 rounded-lg border border-white/15 text-white/40 hover:text-white hover:border-white/40 transition-colors"
                    title="Delete form"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditForm(form)}
                    className="px-3.5 py-1.5 rounded-lg border border-white/25 hover:border-white text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Configure Form
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          FORM CONFIGURATION MODAL
          ===================================================================== */}
      {isEditingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-black border border-white/30 rounded-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/15">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/60 mb-1 inline-block">
                  Task System Form Editor
                </span>
                <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  {currentForm.title || 'Untitled Task Form'}
                </h2>
                <p className="font-editorial italic text-xs text-white/70 mt-1">
                  Configure form directives, field types, and enable continuous info boxes for members.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingForm(false)}
                className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-lg border border-white/40 bg-white/5 text-white text-xs font-body flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 rounded-lg border border-white bg-white/10 text-white text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-white" />
                <span>Task form saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-6">
              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Form Title <span className="text-white/60">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentForm.title}
                    onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                    placeholder="e.g. Intelligence & Surveillance Debrief"
                    className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Category
                  </label>
                  <input
                    type="text"
                    value={currentForm.category || ''}
                    onChange={(e) => setCurrentForm({ ...currentForm, category: e.target.value })}
                    placeholder="e.g. Intelligence"
                    className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Description & Instructions for Members
                  </label>
                  <textarea
                    rows={2}
                    value={currentForm.description}
                    onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                    placeholder="Provide guidance on when and how members should file this task report..."
                    className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Questions / Field Boxes */}
              <div className="space-y-4 pt-2 border-t border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                      Form Directives & Question Boxes ({currentForm.questions.length})
                    </h3>
                    <p className="font-editorial italic text-xs text-white/60">
                      Configure the questions and check "Allow member to add new info anytime" on boxes that receive continuous intelligence.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 rounded-lg border border-white/30 hover:border-white text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question / Box
                  </button>
                </div>

                <div className="space-y-4">
                  {currentForm.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-white/20 bg-white/[0.02] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          Box #{idx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            className="p-1 text-white/50 hover:text-white disabled:opacity-25"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === currentForm.questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            className="p-1 text-white/50 hover:text-white disabled:opacity-25"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 text-white/40 hover:text-white ml-2"
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70">
                            Question Label <span className="text-white/60">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={q.label}
                            onChange={(e) => handleUpdateQuestion(idx, { label: e.target.value })}
                            placeholder="e.g. Continuous Field Updates"
                            className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70">
                            Field Type
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, {
                                type: e.target.value as TaskFieldType
                              })
                            }
                            className="w-full font-mono px-2.5 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text / Textarea</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="scale">Rating Scale (1-10)</option>
                            <option value="photo">Photo / Evidence Upload</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70">
                            Field Description / Prompt
                          </label>
                          <input
                            type="text"
                            value={q.description || ''}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, { description: e.target.value })
                            }
                            placeholder="Optional instructions for member filling this field..."
                            className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                          />
                        </div>
                      </div>

                      {/* Options editor for multiple choice */}
                      {q.type === 'multiple_choice' && (
                        <div className="p-3 rounded-lg border border-white/15 bg-black space-y-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                            Choice Options (comma-separated):
                          </span>
                          <input
                            type="text"
                            value={(q.options || []).join(', ')}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, {
                                options: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              })
                            }
                            placeholder="Option A, Option B, Option C"
                            className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                          />
                        </div>
                      )}

                      {/* Key Toggles: Required & Allow Add Info Anytime */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, { required: e.target.checked })
                            }
                            className="accent-white"
                          />
                          <span className="font-mono text-xs text-white/80">
                            Required on initial filing
                          </span>
                        </label>

                        {/* HIGHLIGHTED USER REQUIREMENT: Allow member to add new info anytime */}
                        <label className="flex items-center gap-2 p-2 rounded-lg border border-white/30 bg-white/10 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.allowAddInfo}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, { allowAddInfo: e.target.checked })
                            }
                            className="accent-white"
                          />
                          <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-white" />
                            Allow member to add new information anytime in this box
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingForm(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Saving Form...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-black" />
                      Save Task Form
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
