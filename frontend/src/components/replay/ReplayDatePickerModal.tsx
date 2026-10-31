import React, { useState } from 'react';
import { Calendar, Clock, X, ChevronRight } from 'lucide-react';

interface ReplayDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (targetTimestamp: number) => void;
  firstAvailableDate?: string;
}

export const ReplayDatePickerModal: React.FC<ReplayDatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  firstAvailableDate = '2024-01-01',
}) => {
  const [selectedDate, setSelectedDate] = useState('2024-06-01');
  const [selectedTime, setSelectedTime] = useState('09:30');

  if (!isOpen) return null;

  const handleConfirm = () => {
    try {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      const ts = Math.floor(new Date(dateTimeString).getTime() / 1000);
      if (!isNaN(ts)) {
        onSelectDate(ts);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFirstDay = () => {
    try {
      const ts = Math.floor(new Date(`${firstAvailableDate}T00:00:00`).getTime() / 1000);
      if (!isNaN(ts)) {
        onSelectDate(ts);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-84 bg-[#181b24] border border-[#2a2e39] rounded-xl shadow-2xl p-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">Select Replay Date</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2e39]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Date</label>
            <div className="flex items-center gap-2 bg-[#131722] border border-[#2a2e39] rounded px-3 py-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs text-white outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">Time</label>
            <div className="flex items-center gap-2 bg-[#131722] border border-[#2a2e39] rounded px-3 py-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-transparent border-none text-xs text-white outline-none w-full"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleFirstDay}
            className="w-full py-2 px-3 text-xs text-gray-300 hover:text-white bg-[#1e222d] hover:bg-[#2a2e39] rounded-lg border border-[#2a2e39] transition text-left flex items-center justify-between"
          >
            <span>Jump to first available candle</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-[#2a2e39]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-bold text-black bg-white hover:bg-gray-200 rounded-lg shadow transition"
          >
            Select Date
          </button>
        </div>
      </div>
    </div>
  );
};
