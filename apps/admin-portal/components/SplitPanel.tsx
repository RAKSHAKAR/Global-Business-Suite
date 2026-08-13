"use client";

import { useState } from "react";
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface SplitPanelProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function SplitPanel({ title, isOpen, onClose, children }: SplitPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 md:left-64 right-0 z-30 bg-white border-t border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col ${
        isMinimized ? "h-12" : "h-1/3 min-h-[300px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 cursor-default">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
          <div className="w-px h-4 bg-gray-300"></div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="Close panel"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4 bg-white text-sm">
          {children}
        </div>
      )}
    </div>
  );
}
