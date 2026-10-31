import React, { useState } from 'react';
import { BookOpen, Plus, Send, Tag, Clock } from 'lucide-react';
import { JournalEntry } from '../../types/market';

interface JournalPanelProps {
  entries: JournalEntry[];
  onAddEntry: (entry: { title: string; content: string; entry_type: string }) => void;
  currentReplayTime?: number;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  entries,
  onAddEntry,
  currentReplayTime,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState('trade_note');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddEntry({
      title: title || 'Observation & Setup Note',
      content,
      entry_type: entryType,
    });
    setTitle('');
    setContent('');
  };

  return (
    <div className="flex flex-col h-full bg-[#131722] text-[#d1d4dc] text-xs select-none">
      <div className="p-2 border-b border-[#2a2e39] flex items-center justify-between bg-[#1e222d]">
        <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-neutral-300">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Research Journal & Analysis</span>
        </div>
        <span className="text-[10px] text-neutral-400 font-mono">{entries.length} Entries</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* New Entry Form */}
        <form onSubmit={handleSubmit} className="w-80 p-3 border-r border-[#2a2e39] flex flex-col gap-2.5">
          <input
            type="text"
            placeholder="Setup Title (e.g. London Liquidity Sweep)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-xs"
          />

          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs"
          >
            <option value="trade_note">Trade Note</option>
            <option value="market_structure">Market Structure Shift</option>
            <option value="mistake_review">Post-Trade Review</option>
            <option value="rule_check">Rule Compliance</option>
          </select>

          <textarea
            placeholder="Document your setup reasoning, confirmation factors, HTF bias, and emotional state..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full flex-1 bg-[#1e222d] border border-[#2a2e39] rounded p-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-xs resize-none"
          />

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>Save to Journal</span>
          </button>
        </form>

        {/* Existing Journal Entries List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              No journal entries recorded for this workspace yet.
            </div>
          ) : (
            entries.map((item) => (
              <div key={item.id} className="bg-[#1e222d] border border-[#2a2e39] rounded p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900 uppercase">
                    {item.entry_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {item.content}
                </p>
                <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                  {item.created_at}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
