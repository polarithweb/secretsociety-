import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileText,
  User,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Check,
  Tag,
  AlertCircle
} from 'lucide-react';
import { TaskSubmission, TaskForm } from '../types';
import {
  getTaskSubmissions,
  subscribeToTaskSubmissions,
  getTaskForms,
  deleteTaskSubmission
} from '../lib/firebase';

export const AdminTaskSubmissionsViewer: React.FC = () => {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [taskForms, setTaskForms] = useState<TaskForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormFilter, setSelectedFormFilter] = useState('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});

  // Load and subscribe to task submissions
  useEffect(() => {
    getTaskSubmissions().then(setSubmissions).catch(console.warn);
    const unsubscribeSubs = subscribeToTaskSubmissions((subs) => {
      setSubmissions(subs);
    });
    getTaskForms().then(setTaskForms).catch(console.warn);

    return () => unsubscribeSubs();
  }, []);

  // Unique member aliases list
  const memberAliases = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      if (s.memberAlias) set.add(s.memberAlias);
    });
    return Array.from(set);
  }, [submissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (selectedFormFilter !== 'all' && sub.formId !== selectedFormFilter) {
        return false;
      }
      if (
        selectedMemberFilter !== 'all' &&
        sub.memberAlias.toLowerCase() !== selectedMemberFilter.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPurpose = sub.purpose.toLowerCase().includes(q);
        const matchesMember = sub.memberAlias.toLowerCase().includes(q);
        const matchesForm = sub.formTitle.toLowerCase().includes(q);
        const matchesUpdates = sub.infoUpdates?.some((u) =>
          u.content.toLowerCase().includes(q)
        );
        const matchesAnswers = Object.values(sub.answers || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        return (
          matchesPurpose ||
          matchesMember ||
          matchesForm ||
          matchesUpdates ||
          matchesAnswers
        );
      }
      return true;
    });
  }, [submissions, searchQuery, selectedFormFilter, selectedMemberFilter]);

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedSubmissions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Delete submission
  const handleDeleteSubmission = async (id: string, purpose: string) => {
    if (confirm(`Permanently delete filing for purpose "${purpose}"?`)) {
      try {
        await deleteTaskSubmission(id);
      } catch (err) {
        console.error('Failed to delete submission:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium">
              Task System (/#/info)
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-white">
              Member Task Filings & Continuous Intel Logs
            </h2>
          </div>
          <p className="font-editorial italic text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
            Review all operational task filings submitted by members. One member can file the same form multiple times for distinct purposes and append continuous information to allowed boxes anytime.
          </p>
        </div>

        <div className="font-mono text-xs text-white/70 px-3 py-1.5 rounded-lg border border-white/20 bg-black">
          Total Filings: <span className="font-bold text-white">{submissions.length}</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filings by purpose, member alias, or intel notes..."
            className="w-full font-body pl-9 pr-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {taskForms.length > 0 && (
          <select
            value={selectedFormFilter}
            onChange={(e) => setSelectedFormFilter(e.target.value)}
            className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase shrink-0"
          >
            <option value="all">All Task Forms</option>
            {taskForms.map((tf) => (
              <option key={tf.id} value={tf.id}>
                {tf.title}
              </option>
            ))}
          </select>
        )}

        {memberAliases.length > 0 && (
          <select
            value={selectedMemberFilter}
            onChange={(e) => setSelectedMemberFilter(e.target.value)}
            className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase shrink-0"
          >
            <option value="all">All Member Aliases</option>
            {memberAliases.map((alias) => (
              <option key={alias} value={alias}>
                {alias}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-white/40 mx-auto" />
          <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
            No Member Task Filings Found
          </h3>
          <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
            When members log in at <code className="font-mono text-white">/#/info</code> and record reports or append continuous intel to allowed boxes, they will be archived here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isExpanded = expandedSubmissions[sub.id] ?? true;
            const formDef = taskForms.find((f) => f.id === sub.formId);

            return (
              <div
                key={sub.id}
                className="bg-black border border-white/20 hover:border-white/40 rounded-xl overflow-hidden transition-colors"
              >
                {/* Header Bar */}
                <div
                  onClick={() => toggleExpand(sub.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/25 text-white font-medium bg-white/10">
                        {sub.formTitle}
                      </span>
                      <span className="font-mono text-[10px] text-white/40">•</span>
                      <span className="font-mono text-xs font-bold text-white flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-white/70" />
                        {sub.memberAlias}
                      </span>
                      <span className="font-mono text-[10px] text-white/40">•</span>
                      <span className="font-mono text-[11px] text-white/60 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        Filed: {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {sub.updatedAt && sub.updatedAt !== sub.createdAt && (
                        <span className="font-mono text-[10px] text-white/50">
                          (Updated: {new Date(sub.updatedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                      <span className="text-white/60 font-normal">Purpose:</span>{' '}
                      <span className="text-white underline decoration-white/30 decoration-1 underline-offset-4">
                        {sub.purpose}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {sub.infoUpdates && sub.infoUpdates.length > 0 && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-white/10 text-white font-medium">
                        {sub.infoUpdates.length} info update{sub.infoUpdates.length === 1 ? '' : 's'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubmission(sub.id, sub.purpose);
                      }}
                      className="p-1.5 rounded-lg border border-white/15 text-white/40 hover:text-white hover:border-white/40 transition-colors"
                      title="Delete filing record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 text-white/60 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-white/10 space-y-6">
                    {/* Initial Answers */}
                    <div className="space-y-3">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-white/60 font-semibold">
                        Initial Responses Recorded for this Purpose
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formDef ? (
                          formDef.questions.map((q) => (
                            <div
                              key={q.id}
                              className="p-3 rounded-lg border border-white/15 bg-black space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                                  {q.label}
                                </span>
                                {q.allowAddInfo && (
                                  <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded border border-white/30 text-white/80 bg-white/10">
                                    Continuous Box
                                  </span>
                                )}
                              </div>
                              <p className="font-body text-xs text-white/90 whitespace-pre-wrap">
                                {sub.answers[q.id] !== undefined && sub.answers[q.id] !== ''
                                  ? String(sub.answers[q.id])
                                  : '(No response entered)'}
                              </p>
                            </div>
                          ))
                        ) : (
                          Object.entries(sub.answers || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className="p-3 rounded-lg border border-white/15 bg-black space-y-1"
                            >
                              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                                {k}
                              </span>
                              <p className="font-body text-xs text-white/90">{String(v)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Continuous Updates in Allowed Boxes */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-white" />
                        Continuous Intelligence Updates in Allowed Boxes ({sub.infoUpdates?.length || 0})
                      </h4>

                      {sub.infoUpdates && sub.infoUpdates.length > 0 ? (
                        <div className="space-y-2.5">
                          {sub.infoUpdates.map((up) => (
                            <div
                              key={up.id}
                              className="p-3 rounded-xl border border-white/20 bg-white/[0.02] space-y-1.5"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px] text-white/60">
                                <div className="flex items-center gap-2">
                                  <span className="uppercase font-bold text-white px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                                    Box: {up.questionLabel}
                                  </span>
                                  <span>by {up.memberAlias}</span>
                                </div>
                                <span>{new Date(up.addedAt).toLocaleString()}</span>
                              </div>
                              <p className="font-body text-xs text-white/95 whitespace-pre-wrap leading-relaxed pl-1">
                                {up.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border border-white/10 text-center font-mono text-xs text-white/50">
                          No subsequent updates appended to allowed boxes yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
