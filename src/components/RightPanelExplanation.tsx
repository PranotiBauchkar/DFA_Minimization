import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MinimizationResult } from '../utils/dfaEngine';

interface RightPanelExplanationProps {
  currentStep: number;
  result: MinimizationResult;
  highlightedGroupId: string | null;
  onSelectGroup: (groupId: string | null, members: string[]) => void;
}

const STEP_EXPLANATIONS: Record<
  number,
  {
    title: string;
    getDescription: (res: MinimizationResult) => string;
  }
> = {
  1: {
    title: 'Remove Unreachable States',
    getDescription: (res) => {
      const init = res.originalDFA.initialState;
      const unreach = res.unreachableStates;
      if (unreach.length > 0) {
        return `Starting from initial state ${init}, BFS traversal visits {${res.reachableStates.join(
          ', '
        )}}. State ${unreach.join(', ')} cannot be reached from ${init} and is removed.`;
      }
      return `Starting from initial state ${init}, all ${res.reachableStates.length} states are reachable. No states are removed.`;
    },
  },
  2: {
    title: 'Initial Partition (P0)',
    getDescription: (res) => {
      const nonFin = res.initialPartition.find((g) => !g.isFinal)?.members || [];
      const fin = res.initialPartition.find((g) => g.isFinal)?.members || [];
      return `Reachable states are split into Non-Final {${nonFin.join(
        ', '
      )}} and Final {${fin.join(', ')}} sets.`;
    },
  },
  3: {
    title: 'Transition Signatures',
    getDescription: (res) => {
      const eq = res.refinementHistory[0]?.equivalentPairs || [];
      return eq.length > 0
        ? `States in the same group that transition to identical target groups (${eq
            .map(([a, b]) => `${a} ≡ ${b}`)
            .join(', ')}) are equivalent.`
        : 'Each state in the current group transitions to different partition groups.';
    },
  },
  4: {
    title: 'Partition Refinement',
    getDescription: (res) =>
      `Groups with differing transition signatures are split across ${res.refinementHistory.length} refinement iteration(s).`,
  },
  5: {
    title: 'Stable Partition',
    getDescription: (res) =>
      `Partition stabilized into ${res.finalPartition.length} final equivalence groups.`,
  },
  6: {
    title: 'Merge Equivalent States',
    getDescription: (res) => {
      const merged = res.finalPartition.filter((g) => g.members.length > 1);
      return merged.length > 0
        ? merged
            .map((g) => `{${g.members.join(', ')}} merge into state ${g.id}.`)
            .join(' ')
        : 'All reachable states are already distinct.';
    },
  },
  7: {
    title: 'Minimized DFA',
    getDescription: (res) =>
      `Each equivalence group (${res.minimizedDFA.states.join(
        ', '
      )}) becomes one state in the minimized DFA.`,
  },
  8: {
    title: 'Comparison Summary',
    getDescription: (res) =>
      `Reduced from ${res.stats.originalStatesCount} states to ${res.stats.minimizedStatesCount} states (${res.stats.reductionPercentage}% reduction) while preserving the accepted language.`,
  },
};

export const RightPanelExplanation: React.FC<RightPanelExplanationProps> = ({
  currentStep,
  result,
  highlightedGroupId,
  onSelectGroup,
}) => {
  const stepInfo = STEP_EXPLANATIONS[currentStep] || STEP_EXPLANATIONS[1];

  return (
    <aside className="w-full bg-[#0B1428] rounded-xl border border-slate-800 p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h2 className="text-sm font-bold text-white">Summary & Groups</h2>
        <span className="font-mono text-xs text-[#8B5CF6]">
          Step {currentStep} / 8
        </span>
      </div>

      {/* Step Explanation */}
      <div className="p-3 rounded-lg bg-[#070E1E] border border-slate-800">
        <div className="text-xs font-semibold text-white mb-1">
          {stepInfo.title}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {stepInfo.getDescription(result)}
        </p>
      </div>

      {/* Reachable & Unreachable States */}
      <div className="grid grid-cols-2 gap-2">
        <div
          onClick={() => onSelectGroup('REACHABLE', result.reachableStates)}
          className="p-2.5 rounded-lg bg-[#070E1E] border border-slate-800 hover:border-[#22C55E]/50 cursor-pointer"
        >
          <div className="text-[11px] font-medium text-[#22C55E] mb-0.5">
            Reachable ({result.reachableStates.length})
          </div>
          <div className="font-mono text-xs font-semibold text-white">
            {`{${result.reachableStates.join(',')}}`}
          </div>
        </div>

        <div
          onClick={() =>
            result.unreachableStates.length > 0 &&
            onSelectGroup('UNREACHABLE', result.unreachableStates)
          }
          className="p-2.5 rounded-lg bg-[#070E1E] border border-slate-800 hover:border-[#F43F5E]/50 cursor-pointer"
        >
          <div className="text-[11px] font-medium text-[#F43F5E] mb-0.5">
            Unreachable ({result.unreachableStates.length})
          </div>
          <div className="font-mono text-xs font-semibold text-white">
            {result.unreachableStates.length > 0
              ? `{${result.unreachableStates.join(',')}}`
              : 'None'}
          </div>
        </div>
      </div>

      {/* Equivalent State Groups */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">
            Final Equivalence Groups
          </span>
          <span className="text-[10px] text-slate-400">Click to highlight</span>
        </div>

        {result.equivalentGroupsWithRemoved.map((grp) => {
          const isSelected = highlightedGroupId === grp.id;
          return (
            <button
              key={grp.id}
              type="button"
              onClick={() =>
                onSelectGroup(isSelected ? null : grp.id, grp.members)
              }
              className={`w-full px-3 py-2 rounded-lg border flex items-center justify-between text-xs font-mono transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1E1B4B] border-[#8B5CF6]'
                  : 'bg-[#070E1E] border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-white">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: grp.color }}
                />
                <span>State {grp.id}</span>
                {grp.isFinal && (
                  <span className="text-[10px] text-[#22C55E] font-normal">
                    (Final)
                  </span>
                )}
              </span>
              <span
                className={
                  grp.isRemoved
                    ? 'text-[#FDA4AF] line-through'
                    : 'text-slate-300'
                }
              >
                {grp.isRemoved
                  ? `{${grp.members.join(',')} removed}`
                  : `{${grp.members.join(',')}}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Original vs Minimized Comparison */}
      <div className="p-3 rounded-lg bg-[#070E1E] border border-slate-800 flex flex-col gap-2">
        <div className="text-xs font-semibold text-slate-200">
          Original vs Minimized
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#0B1428] border border-slate-800">
            <div className="text-[10px] text-slate-400 mb-1">Original</div>
            <div className="flex justify-between">
              <span className="text-slate-400">States</span>
              <span className="text-white font-bold">
                {result.stats.originalStatesCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trans.</span>
              <span className="text-white font-bold">
                {result.stats.originalTransitionsCount}
              </span>
            </div>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <div className="p-2 rounded bg-[#0B1428] border border-slate-800">
            <div className="text-[10px] text-[#22C55E] mb-1">Minimized</div>
            <div className="flex justify-between">
              <span className="text-slate-400">States</span>
              <span className="text-[#22C55E] font-bold">
                {result.stats.minimizedStatesCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trans.</span>
              <span className="text-white font-bold">
                {result.stats.minimizedTransitionsCount}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800">
          <span className="text-slate-400">Reduction</span>
          <span className="font-mono font-bold text-[#22C55E]">
            {result.stats.reductionPercentage}% ({result.stats.originalStatesCount}{' '}
            → {result.stats.minimizedStatesCount} states)
          </span>
        </div>
      </div>
    </aside>
  );
};
