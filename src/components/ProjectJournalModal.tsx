/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Save,
  Search,
  Compass,
  Lightbulb,
  Hammer,
  Award,
  ChevronRight
} from 'lucide-react';
import { StudentProfile } from '../utils/designQuestRules';
import { SAMPLE_PROJECT_TOPICS } from '../data/levelsData';

interface ProjectJournalModalProps {
  onClose: () => void;
  studentProfile: StudentProfile;
  onUpdateProfile: (updated: Partial<StudentProfile>) => void;
}

export const ProjectJournalModal: React.FC<ProjectJournalModalProps> = ({
  onClose,
  studentProfile,
  onUpdateProfile
}) => {
  const [activeTab, setActiveTab] = useState<'ask' | 'research' | 'brainstorm' | 'prototype' | 'present'>('ask');
  const [selectedTopic, setSelectedTopic] = useState(studentProfile.projectTopic || SAMPLE_PROJECT_TOPICS[0].title);
  const [summary, setSummary] = useState(studentProfile.projectSummary || {
    problemStatement: '',
    researchSummary: '',
    brainstormTopIdeas: '',
    prototypeTestNotes: '',
    finalPitchStatement: ''
  });
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    onUpdateProfile({
      projectTopic: selectedTopic,
      projectSummary: summary
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleSelectPreset = (title: string) => {
    setSelectedTopic(title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border-4 border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl">
                Student Design Journal & Blueprint
              </h2>
              <p className="text-xs text-indigo-200">
                Apply the 5 design stages to your real engineering project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close design journal"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Project Topic Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="topic-selector" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Active Engineering Challenge:
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Choose a pre-set or write your own
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {SAMPLE_PROJECT_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleSelectPreset(topic.title)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedTopic === topic.title
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {topic.title}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <input
                id="topic-selector"
                type="text"
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                placeholder="Or type custom classroom challenge title..."
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 5 Stage Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('ask')}
              className={`px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'ask'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1. Ask</span>
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'research'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2. Research</span>
            </button>
            <button
              onClick={() => setActiveTab('brainstorm')}
              className={`px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'brainstorm'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>3. Brainstorm</span>
            </button>
            <button
              onClick={() => setActiveTab('prototype')}
              className={`px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'prototype'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>4. Prototype</span>
            </button>
            <button
              onClick={() => setActiveTab('present')}
              className={`px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'present'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>5. Present</span>
            </button>
          </div>

          {/* Active Tab Form Content */}
          <div className="space-y-4">
            {activeTab === 'ask' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  <strong>Stage 1 Focus:</strong> Write your "How Might We" question. Define who is affected, what their real need is, and at least 2 key constraints (cost, size, weight, time).
                </div>
                <textarea
                  rows={5}
                  value={summary.problemStatement || ''}
                  onChange={e => setSummary(prev => ({ ...prev, problemStatement: e.target.value }))}
                  placeholder="e.g. How might we design a lightweight cafeteria recycling sorter so that 6th graders can sort trays in under 20 seconds, using under $15 of materials?"
                  className="w-full text-xs bg-white border border-slate-300 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'research' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <strong>Stage 2 Focus:</strong> List verified facts, prior solutions that failed (and why), and any biomimicry inspiration from nature.
                </div>
                <textarea
                  rows={5}
                  value={summary.researchSummary || ''}
                  onChange={e => setSummary(prev => ({ ...prev, researchSummary: e.target.value }))}
                  placeholder="e.g. 1) Fact: 74% of contamination happens in drink cups. 2) Nature inspiration: Pitcher plants have slippery rims that guide liquids automatically into the center reservoir..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'brainstorm' && (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900">
                  <strong>Stage 3 Focus:</strong> Record 3 creative ideas generated during ideation, then describe your plan and how you would redesign it based on constraints.
                </div>
                <textarea
                  rows={5}
                  value={summary.brainstormTopIdeas || ''}
                  onChange={e => setSummary(prev => ({ ...prev, brainstormTopIdeas: e.target.value }))}
                  placeholder="e.g. Idea 1: Fold-flat corrugated sleeve. Idea 2: Rigid corner bumper shell. Plan & Redesign: Plan to construct the base using recycled cardboard, and redesign the locking tab so books in a backpack cannot accidentally pop it open."
                  className="w-full text-xs bg-white border border-slate-300 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'prototype' && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                  <strong>Stage 4 Focus:</strong> Low-fidelity materials used (cardboard, tape, string), test hypothesis, what broke during trial runs, and what you changed for Prototype v2.0.
                </div>
                <textarea
                  rows={5}
                  value={summary.prototypeTestNotes || ''}
                  onChange={e => setSummary(prev => ({ ...prev, prototypeTestNotes: e.target.value }))}
                  placeholder="e.g. Built v1 using cereal boxes and glue sticks. Trial 1: Milk cartons got stuck at 45° angle. Iteration: Increased slide incline to 60° and coated with wax paper for reduced friction."
                  className="w-full text-xs bg-white border border-slate-300 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'present' && (
              <div className="space-y-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900">
                  <strong>Stage 5 Focus:</strong> Your 30-second elevator pitch hook, evidence statement, and reflection on tradeoffs.
                </div>
                <textarea
                  rows={5}
                  value={summary.finalPitchStatement || ''}
                  onChange={e => setSummary(prev => ({ ...prev, finalPitchStatement: e.target.value }))}
                  placeholder="e.g. Hook: 'Every lunch period, 200 plastic bottles end up in landfills because sorting takes too long.' Solution: Our low-cost gravity sorter cuts sorting time to 5 seconds..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {savedToast && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Journal saved to your profile!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="game-btn px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-display font-semibold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Journal Entry</span>
            </button>
            <button
              onClick={onClose}
              className="game-btn px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-display font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
