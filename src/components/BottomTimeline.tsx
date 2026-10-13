import React from 'react';
import { Check } from 'lucide-react';

interface BottomTimelineProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export const TIMELINE_STEPS = [
  { id: 1, label: 'Reachability' },
  { id: 2, label: 'Initial Partition' },
  { id: 3, label: 'Signatures' },
  { id: 4, label: 'Refinement' },
  { id: 5, label: 'Stable Partition' },
  { id: 6, label: 'Merge States' },
  { id: 7, label: 'Minimized DFA' },
  { id: 8, label: 'Comparison' },
];

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <footer className="w-full bg-[#0B1428] border-t border-slate-800 px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onSelectStep(step.id)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#0F1930] transition-colors cursor-pointer shrink-0"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold border ${
                    isCurrent
                      ? 'bg-[#7C3AED] border-[#8B5CF6] text-white'
                      : isCompleted
                      ? 'bg-[#052E16] border-[#22C55E] text-[#22C55E]'
                      : 'bg-[#070E1E] border-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                </span>
                <span
                  className={`text-xs whitespace-nowrap ${
                    isCurrent
                      ? 'text-white font-semibold'
                      : isCompleted
                      ? 'text-slate-300'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 min-w-[16px] ${
                    step.id < currentStep ? 'bg-[#22C55E]/50' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </footer>
  );
};
