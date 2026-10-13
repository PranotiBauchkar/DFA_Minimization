import React, { useState, useEffect, useMemo } from 'react';
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  MinimizationResult,
  PartitionGroup,
} from '../utils/dfaEngine';
import {
  DFAGraphCanvas,
  ActiveEdgeAnimation,
  StringTraceHighlight,
} from './DFAGraphCanvas';

interface CenterSimulationPanelProps {
  currentStep: number; // 1 to 8
  isPlaying: boolean;
  speedMultiplier: number;
  result: MinimizationResult;
  selectedState: string | null;
  highlightedStates: string[];
  selectedEdge: { from: string; to: string } | null;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onSelectState: (state: string | null) => void;
  onSelectEdge: (edge: { from: string; to: string } | null) => void;
  onHighlightStates: (states: string[]) => void;
}

interface StringTraceStep {
  stepIndex: number;
  symbol: string;
  origFrom: string;
  origTo: string;
  minFrom: string;
  minTo: string;
}

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: 'Remove Unreachable States',
    subtitle: 'Find all states reachable from the initial state via BFS traversal.',
  },
  2: {
    title: 'Initial Partition (P0)',
    subtitle: 'Separate reachable states into Non-Final and Final sets.',
  },
  3: {
    title: 'Transition Signatures',
    subtitle: 'Compare target group transitions δ(q, a) for states in the same group.',
  },
  4: {
    title: 'Partition Refinement',
    subtitle: 'Split groups when states transition to different equivalence classes.',
  },
  5: {
    title: 'Stable Partition',
    subtitle: 'Refinement stops when no further group splits occur.',
  },
  6: {
    title: 'Merge Equivalent States',
    subtitle: 'Combine equivalent states into single states for the minimal DFA.',
  },
  7: {
    title: 'Minimized DFA',
    subtitle: 'Synthesized minimal DFA with equivalent states merged.',
  },
  8: {
    title: 'Original vs Minimized Comparison',
    subtitle: 'Verify state reduction and test input strings across both DFAs.',
  },
};

export const CenterSimulationPanel: React.FC<CenterSimulationPanelProps> = ({
  currentStep,
  isPlaying,
  speedMultiplier,
  result,
  selectedState,
  highlightedStates,
  selectedEdge,
  onStepChange,
  onTogglePlay,
  onRestart,
  onSpeedChange,
  onSelectState,
  onSelectEdge,
  onHighlightStates,
}) => {
  const [viewMode, setViewMode] = useState<
    'both' | 'original' | 'minimized' | 'table'
  >('both');
  const [subTick, setSubTick] = useState<number>(0);

  // String Simulation State — enabled by default so user immediately sees the Gold/Amber string path
  const [testString, setTestString] = useState<string>('01');
  const [isStringSimulating, setIsStringSimulating] = useState<boolean>(false);
  const [stringTraceIndex, setStringTraceIndex] = useState<number | null>(1);
  const [showStringHighlight, setShowStringHighlight] = useState<boolean>(true);

  useEffect(() => {
    setSubTick(0);
  }, [currentStep, result.originalDFA]);

  // Compute full step-by-step path of testString on BOTH Original DFA and Minimized DFA
  const stringSimulationData = useMemo(() => {
    const rawChars = testString.trim().split('');
    const validSymbols = rawChars.filter((ch) =>
      result.originalDFA.alphabet.includes(ch)
    );
    const invalidChars = rawChars.filter(
      (ch) => ch.trim() !== '' && !result.originalDFA.alphabet.includes(ch)
    );

    const steps: StringTraceStep[] = [];
    let origCurr = result.originalDFA.initialState;
    let minCurr = result.minimizedDFA.initialState;

    const origStatesSequence: string[] = [origCurr];
    const minStatesSequence: string[] = [minCurr];

    for (let i = 0; i < validSymbols.length; i++) {
      const sym = validSymbols[i];
      const origNext =
        result.originalDFA.transitions[origCurr]?.[sym] || origCurr;
      const minNext =
        result.minimizedDFA.transitions[minCurr]?.[sym] || minCurr;

      steps.push({
        stepIndex: i,
        symbol: sym,
        origFrom: origCurr,
        origTo: origNext,
        minFrom: minCurr,
        minTo: minNext,
      });

      origCurr = origNext;
      minCurr = minNext;
      origStatesSequence.push(origCurr);
      minStatesSequence.push(minCurr);
    }

    const origAccepted = result.originalDFA.finalStates.includes(origCurr);
    const minAccepted = result.minimizedDFA.finalStates.includes(minCurr);

    return {
      validSymbols,
      invalidChars,
      steps,
      origStatesSequence,
      minStatesSequence,
      origEnd: origCurr,
      minEnd: minCurr,
      origAccepted,
      minAccepted,
    };
  }, [testString, result]);

  // Keep stringTraceIndex within bounds when testString changes
  useEffect(() => {
    if (!showStringHighlight) return;
    if (stringSimulationData.steps.length === 0) {
      setStringTraceIndex(null);
    } else if (
      stringTraceIndex === null ||
      stringTraceIndex >= stringSimulationData.steps.length
    ) {
      setStringTraceIndex(stringSimulationData.steps.length - 1);
    }
  }, [stringSimulationData.steps.length, showStringHighlight]);

  // Auto-step timer when user clicks "Trace String" or types
  useEffect(() => {
    if (!isStringSimulating) return;
    const totalSteps = stringSimulationData.steps.length;
    if (totalSteps === 0) {
      setIsStringSimulating(false);
      setStringTraceIndex(null);
      return;
    }

    const intervalMs = Math.max(400, Math.round(850 / speedMultiplier));
    const timer = setInterval(() => {
      setStringTraceIndex((prev) => {
        if (prev === null) return 0;
        if (prev < totalSteps - 1) return prev + 1;
        setIsStringSimulating(false);
        return prev;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStringSimulating, stringSimulationData.steps.length, speedMultiplier]);

  const handleRunStringSimulation = () => {
    setShowStringHighlight(true);
    if (stringSimulationData.steps.length === 0) {
      setStringTraceIndex(null);
      setIsStringSimulating(false);
      return;
    }
    setStringTraceIndex(0);
    setIsStringSimulating(true);
  };

  const handleTestStringChange = (val: string) => {
    setTestString(val);
    setShowStringHighlight(true);
    setStringTraceIndex(0);
    setIsStringSimulating(true);
  };

  // Build StringTraceHighlight object for Original DFA Graph (Gold/Amber + Emerald)
  const originalStringTrace: StringTraceHighlight | null = useMemo(() => {
    if (!showStringHighlight) return null;
    const steps = stringSimulationData.steps;
    if (steps.length === 0) {
      return {
        visitedStates: [result.originalDFA.initialState],
        traversedEdges: [],
        currentState: result.originalDFA.initialState,
        activeEdge: null,
        isAccepted: stringSimulationData.origAccepted,
      };
    }

    const uptoIdx =
      stringTraceIndex !== null ? stringTraceIndex : steps.length - 1;
    const sliceSteps = steps.slice(0, uptoIdx + 1);
    const visited = [
      result.originalDFA.initialState,
      ...sliceSteps.map((s) => s.origTo),
    ];
    const traversedEdges = sliceSteps.map((s) => ({
      from: s.origFrom,
      to: s.origTo,
      symbol: s.symbol,
    }));
    const currentStepObj = steps[uptoIdx];

    return {
      visitedStates: Array.from(new Set(visited)),
      traversedEdges,
      currentState: currentStepObj
        ? currentStepObj.origTo
        : stringSimulationData.origEnd,
      activeEdge: currentStepObj
        ? {
            from: currentStepObj.origFrom,
            to: currentStepObj.origTo,
            symbol: currentStepObj.symbol,
          }
        : null,
      isAccepted: stringSimulationData.origAccepted,
    };
  }, [
    showStringHighlight,
    stringSimulationData,
    stringTraceIndex,
    result.originalDFA.initialState,
  ]);

  // Build StringTraceHighlight object for Minimized DFA Graph (Gold/Amber + Emerald)
  const minimizedStringTrace: StringTraceHighlight | null = useMemo(() => {
    if (!showStringHighlight) return null;
    const steps = stringSimulationData.steps;
    if (steps.length === 0) {
      return {
        visitedStates: [result.minimizedDFA.initialState],
        traversedEdges: [],
        currentState: result.minimizedDFA.initialState,
        activeEdge: null,
        isAccepted: stringSimulationData.minAccepted,
      };
    }

    const uptoIdx =
      stringTraceIndex !== null ? stringTraceIndex : steps.length - 1;
    const sliceSteps = steps.slice(0, uptoIdx + 1);
    const visited = [
      result.minimizedDFA.initialState,
      ...sliceSteps.map((s) => s.minTo),
    ];
    const traversedEdges = sliceSteps.map((s) => ({
      from: s.minFrom,
      to: s.minTo,
      symbol: s.symbol,
    }));
    const currentStepObj = steps[uptoIdx];

    return {
      visitedStates: Array.from(new Set(visited)),
      traversedEdges,
      currentState: currentStepObj
        ? currentStepObj.minTo
        : stringSimulationData.minEnd,
      activeEdge: currentStepObj
        ? {
            from: currentStepObj.minFrom,
            to: currentStepObj.minTo,
            symbol: currentStepObj.symbol,
          }
        : null,
      isAccepted: stringSimulationData.minAccepted,
    };
  }, [
    showStringHighlight,
    stringSimulationData,
    stringTraceIndex,
    result.minimizedDFA.initialState,
  ]);

  const maxSubTicksForStep = useMemo(() => {
    if (currentStep === 1) return result.bfsSteps.length + 2;
    if (currentStep === 3) return result.reachableStates.length + 1;
    if (currentStep === 4) return Math.max(2, result.refinementHistory.length);
    return 2;
  }, [currentStep, result]);

  useEffect(() => {
    const intervalMs = Math.max(350, Math.round(900 / speedMultiplier));
    const timer = setInterval(() => {
      setSubTick((prev) => (prev < maxSubTicksForStep ? prev + 1 : prev));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [currentStep, maxSubTicksForStep, speedMultiplier]);

  useEffect(() => {
    if (!isPlaying) return;
    if (subTick >= maxSubTicksForStep) {
      const delayMs = Math.max(450, Math.round(1000 / speedMultiplier));
      const timeout = setTimeout(() => {
        if (currentStep < 8) {
          onStepChange(currentStep + 1);
        } else {
          onTogglePlay();
        }
      }, delayMs);
      return () => clearTimeout(timeout);
    }
  }, [
    isPlaying,
    subTick,
    maxSubTicksForStep,
    currentStep,
    speedMultiplier,
    onStepChange,
    onTogglePlay,
  ]);

  const activeBfsEdge: ActiveEdgeAnimation | null = useMemo(() => {
    if (currentStep === 1 && subTick > 0 && subTick <= result.bfsSteps.length) {
      const step = result.bfsSteps[subTick - 1];
      return { from: step.from, to: step.to, symbol: step.symbol };
    }
    return null;
  }, [currentStep, subTick, result]);

  const activePartitionGroups: PartitionGroup[] = useMemo(() => {
    if (currentStep <= 1) return [];
    if (currentStep === 2 || currentStep === 3) return result.initialPartition;
    return result.finalPartition;
  }, [currentStep, result]);

  const meta = STEP_META[currentStep] || STEP_META[1];

  return (
    <main className="w-full bg-[#0B1428] rounded-xl border border-slate-800 p-4 flex flex-col gap-3.5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-[#8B5CF6]">
              Step {currentStep} of 8
            </span>
            <span className="text-slate-600">·</span>
            <h2 className="text-base font-bold text-white">{meta.title}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep <= 1}
            className="px-2.5 py-1.5 rounded-lg bg-[#0F1930] hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(8, currentStep + 1))}
            disabled={currentStep >= 8}
            className="px-2.5 py-1.5 rounded-lg bg-[#0F1930] hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTick(0);
              onRestart();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0F1930] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-800 text-[11px] text-slate-400">
            <span>Speed</span>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.25}
              value={speedMultiplier}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              aria-label="Simulation Speed"
              className="w-16 accent-[#8B5CF6] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* View Mode Selector + String Input Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#050B18] rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'both'
                ? 'bg-[#7C3AED] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Original & Minimized DFA
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'original'
                ? 'bg-[#7C3AED] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Original DFA ({result.stats.originalStatesCount} states)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('minimized')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'minimized'
                ? 'bg-[#7C3AED] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Minimized DFA ({result.stats.minimizedStatesCount} states)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#7C3AED] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Transition Tables
          </button>
        </div>

        {/* Distinct Dark Blue String Input & Trace Controls */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#172554]/60 border border-[#3B82F6]/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
          <label className="text-xs font-semibold text-[#DBEAFE]">
            Test String:
          </label>
          <input
            type="text"
            value={testString}
            onChange={(e) => handleTestStringChange(e.target.value)}
            placeholder={`e.g. ${result.originalDFA.alphabet.join('')}`}
            className="w-28 px-2.5 py-1 rounded bg-[#050B18] border border-[#3B82F6]/60 font-mono text-xs text-[#DBEAFE] font-bold focus:outline-none focus:border-[#60A5FA]"
          />
          <button
            type="button"
            onClick={handleRunStringSimulation}
            className="px-2.5 py-1 rounded bg-[#1E3A8A] hover:bg-[#1D4ED8] border border-[#3B82F6] text-white font-mono text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Animate Path</span>
          </button>
          <button
            type="button"
            onClick={() => setShowStringHighlight((prev) => !prev)}
            className="px-2 py-1 rounded bg-[#0B1428] border border-slate-700 text-[11px] font-mono text-slate-300 hover:text-white cursor-pointer"
          >
            {showStringHighlight ? 'Hide Path' : 'Show Path'}
          </button>
        </div>
      </div>

      {/* LIVE STRING ACCEPTANCE & MINIMIZATION PATH TRACE PANEL (Dark Blue & Emerald Theme) */}
      {showStringHighlight && (
        <div
          className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
            stringSimulationData.minAccepted
              ? 'bg-[#172554]/35 border-[#3B82F6]/50'
              : 'bg-[#310B19]/35 border-[#F43F5E]/50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-[#DBEAFE] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span>
                  String Path Visualization: "
                  {stringSimulationData.validSymbols.join('') || 'ε'}"
                </span>
              </span>

              {/* Visual Color Key */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A] border border-[#3B82F6]" />
                  <span>String Path (Dark Blue)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>Accepted Final State (Green)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  <span>Normal DFA State (Purple)</span>
                </span>
              </div>
            </div>

            <div>
              {stringSimulationData.minAccepted ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#064E3B] border border-[#10B981] text-xs font-mono font-bold text-[#A7F3D0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>ACCEPTED BY ORIGINAL & MINIMIZED DFA</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#310B19] border border-[#F43F5E] text-xs font-mono font-bold text-[#FECDD3]">
                  <XCircle className="w-3.5 h-3.5 text-[#F43F5E]" />
                  <span>REJECTED BY ORIGINAL & MINIMIZED DFA</span>
                </span>
              )}
            </div>
          </div>

          {/* Step-by-Step State Path Comparison: Original DFA Path vs Minimized DFA Path */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {/* Original DFA String Path */}
            <div className="p-2.5 rounded-lg bg-[#050B18]/90 border border-[#3B82F6]/40 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#DBEAFE]">
                  Original DFA String Path
                </span>
                <span className="font-mono text-slate-300">
                  Final State Reached:{' '}
                  <strong
                    className={
                      stringSimulationData.origAccepted
                        ? 'text-[#10B981]'
                        : 'text-[#F43F5E]'
                    }
                  >
                    {stringSimulationData.origEnd} (
                    {stringSimulationData.origAccepted ? 'Accepted' : 'Rejected'}
                    )
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                <span
                  onClick={() =>
                    onSelectState(stringSimulationData.origStatesSequence[0])
                  }
                  className="px-2 py-0.5 rounded bg-[#172554] border border-[#3B82F6] text-[#DBEAFE] font-bold cursor-pointer"
                >
                  {stringSimulationData.origStatesSequence[0]}
                </span>
                {stringSimulationData.steps.map((step, idx) => {
                  const isActiveStep = stringTraceIndex === idx;
                  const isLast = idx === stringSimulationData.steps.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStringSimulating(false);
                          setStringTraceIndex(idx);
                        }}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          isActiveStep
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-[#60A5FA] hover:bg-[#172554]'
                        }`}
                      >
                        <span>--{step.symbol}→</span>
                      </button>
                      <span
                        onClick={() => {
                          setIsStringSimulating(false);
                          setStringTraceIndex(idx);
                          onSelectState(step.origTo);
                        }}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer border ${
                          isLast && stringSimulationData.origAccepted
                            ? 'bg-[#064E3B] border-[#10B981] text-[#A7F3D0]'
                            : isActiveStep
                            ? 'bg-[#1E3A8A] border-[#60A5FA] text-white'
                            : 'bg-[#172554] border-[#3B82F6]/70 text-[#DBEAFE]'
                        }`}
                      >
                        {step.origTo}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Minimized DFA String Path */}
            <div className="p-2.5 rounded-lg bg-[#050B18]/90 border border-[#3B82F6]/40 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#DBEAFE]">
                  Minimized DFA String Path (Merged States)
                </span>
                <span className="font-mono text-slate-300">
                  Final State Reached:{' '}
                  <strong
                    className={
                      stringSimulationData.minAccepted
                        ? 'text-[#10B981]'
                        : 'text-[#F43F5E]'
                    }
                  >
                    {stringSimulationData.minEnd}{' '}
                    {`{${
                      result.minimizedDFA.stateGroups[
                        stringSimulationData.minEnd
                      ]?.join(',') || ''
                    }}`}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                <span
                  onClick={() =>
                    onHighlightStates(
                      result.minimizedDFA.stateGroups[
                        stringSimulationData.minStatesSequence[0]
                      ] || []
                    )
                  }
                  className="px-2 py-0.5 rounded bg-[#172554] border border-[#3B82F6] text-[#DBEAFE] font-bold cursor-pointer"
                >
                  {stringSimulationData.minStatesSequence[0]}
                  <span className="text-[10px] opacity-80 ml-1">
                    {`{${
                      result.minimizedDFA.stateGroups[
                        stringSimulationData.minStatesSequence[0]
                      ]?.join(',') || ''
                    }}`}
                  </span>
                </span>
                {stringSimulationData.steps.map((step, idx) => {
                  const isActiveStep = stringTraceIndex === idx;
                  const isLast = idx === stringSimulationData.steps.length - 1;
                  const members =
                    result.minimizedDFA.stateGroups[step.minTo] || [];
                  return (
                    <React.Fragment key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStringSimulating(false);
                          setStringTraceIndex(idx);
                        }}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          isActiveStep
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-[#60A5FA] hover:bg-[#172554]'
                        }`}
                      >
                        <span>--{step.symbol}→</span>
                      </button>
                      <span
                        onClick={() => {
                          setIsStringSimulating(false);
                          setStringTraceIndex(idx);
                          onHighlightStates(members);
                        }}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer border ${
                          isLast && stringSimulationData.minAccepted
                            ? 'bg-[#064E3B] border-[#10B981] text-[#A7F3D0]'
                            : isActiveStep
                            ? 'bg-[#1E3A8A] border-[#60A5FA] text-white'
                            : 'bg-[#172554] border-[#3B82F6]/70 text-[#DBEAFE]'
                        }`}
                      >
                        {step.minTo}
                        <span className="text-[10px] opacity-80 ml-1">
                          {`{${members.join(',')}}`}
                        </span>
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRAPH DISPLAY AREA (Shows Gold/Amber String Trace on both Original & Minimized DFA) */}
      {viewMode === 'both' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <DFAGraphCanvas
            title="Original DFA"
            subtitle={`(${result.stats.originalStatesCount} states)`}
            dfa={result.originalDFA}
            isMinimizedGraph={false}
            unreachableStates={result.unreachableStates}
            removedStates={currentStep > 1 ? result.unreachableStates : []}
            activeState={selectedState}
            selectedState={selectedState}
            highlightedStates={highlightedStates}
            activeEdge={activeBfsEdge}
            selectedEdge={selectedEdge}
            stringTrace={originalStringTrace}
            partitionGroups={activePartitionGroups}
            speedMultiplier={speedMultiplier}
            compact={true}
            onSelectState={onSelectState}
            onSelectEdge={onSelectEdge}
          />

          <DFAGraphCanvas
            title="Minimized DFA"
            subtitle={`(${result.stats.minimizedStatesCount} states · ${result.stats.reductionPercentage}% reduction)`}
            dfa={result.minimizedDFA}
            isMinimizedGraph={true}
            partitionGroups={result.finalPartition}
            activeState={selectedState}
            selectedState={selectedState}
            highlightedStates={highlightedStates}
            stringTrace={minimizedStringTrace}
            speedMultiplier={speedMultiplier}
            compact={true}
            onSelectState={onSelectState}
            onSelectEdge={onSelectEdge}
          />
        </div>
      )}

      {viewMode === 'original' && (
        <DFAGraphCanvas
          title="Original DFA"
          subtitle={`(${result.stats.originalStatesCount} states)`}
          dfa={result.originalDFA}
          isMinimizedGraph={false}
          unreachableStates={result.unreachableStates}
          removedStates={currentStep > 1 ? result.unreachableStates : []}
          activeState={selectedState}
          selectedState={selectedState}
          highlightedStates={highlightedStates}
          activeEdge={activeBfsEdge}
          selectedEdge={selectedEdge}
          stringTrace={originalStringTrace}
          partitionGroups={activePartitionGroups}
          speedMultiplier={speedMultiplier}
          onSelectState={onSelectState}
          onSelectEdge={onSelectEdge}
        />
      )}

      {viewMode === 'minimized' && (
        <DFAGraphCanvas
          title="Minimized DFA"
          subtitle={`(${result.stats.minimizedStatesCount} states · ${result.stats.reductionPercentage}% reduction)`}
          dfa={result.minimizedDFA}
          isMinimizedGraph={true}
          partitionGroups={result.finalPartition}
          activeState={selectedState}
          selectedState={selectedState}
          highlightedStates={highlightedStates}
          stringTrace={minimizedStringTrace}
          speedMultiplier={speedMultiplier}
          onSelectState={onSelectState}
          onSelectEdge={onSelectEdge}
        />
      )}

      {/* SIDE-BY-SIDE TRANSITION TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Original DFA Transition Table */}
        <div className="p-3 rounded-xl bg-[#070E1E] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">
              Original Transition Table
            </span>
            {result.unreachableStates.length > 0 && (
              <span className="text-[11px] font-mono text-[#F43F5E]">
                Unreachable: {result.unreachableStates.join(', ')}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-xs font-mono text-center">
              <thead className="bg-[#0F1930] text-slate-400">
                <tr>
                  <th className="py-1.5 px-2.5 text-left">State</th>
                  {result.originalDFA.alphabet.map((sym) => (
                    <th key={sym} className="py-1.5 px-2.5 text-[#06B6D4]">
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {result.originalDFA.states.map((st) => {
                  const isUnreach = result.unreachableStates.includes(st);
                  const isStringVisited =
                    originalStringTrace?.visitedStates.includes(st) ?? false;
                  const isStringEnd = originalStringTrace?.currentState === st;
                  return (
                    <tr
                      key={st}
                      onClick={() => onSelectState(st)}
                      className={`cursor-pointer ${
                        isUnreach
                          ? 'bg-[#2D0A16]/40 text-[#FDA4AF] line-through'
                          : isStringEnd
                          ? 'bg-[#1E3A8A]/85 text-[#DBEAFE]'
                          : isStringVisited
                          ? 'bg-[#172554]/65 text-[#DBEAFE]'
                          : 'bg-[#0B1428] hover:bg-[#0F1930]'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-left font-bold">
                        {result.originalDFA.initialState === st ? '→ ' : ''}
                        {result.originalDFA.finalStates.includes(st)
                          ? `((${st}))`
                          : st}
                      </td>
                      {result.originalDFA.alphabet.map((sym) => (
                        <td key={sym} className="py-1.5 px-2.5">
                          {result.originalDFA.transitions[st]?.[sym]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Minimized DFA Transition Table */}
        <div className="p-3 rounded-xl bg-[#070E1E] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#22C55E]">
              Minimized Transition Table
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {result.minimizedDFA.states.length} minimal states
            </span>
          </div>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-xs font-mono text-center">
              <thead className="bg-[#0F1930] text-slate-400">
                <tr>
                  <th className="py-1.5 px-2.5 text-left">State</th>
                  <th className="py-1.5 px-2.5 text-left">Merged From</th>
                  {result.minimizedDFA.alphabet.map((sym) => (
                    <th key={sym} className="py-1.5 px-2.5 text-[#06B6D4]">
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {result.minimizedDFA.states.map((st) => {
                  const members = result.minimizedDFA.stateGroups[st] || [];
                  const isStringVisited =
                    minimizedStringTrace?.visitedStates.includes(st) ?? false;
                  const isStringEnd = minimizedStringTrace?.currentState === st;
                  return (
                    <tr
                      key={st}
                      onClick={() => onHighlightStates(members)}
                      className={`cursor-pointer ${
                        isStringEnd
                          ? 'bg-[#1E3A8A]/85 text-[#DBEAFE]'
                          : isStringVisited
                          ? 'bg-[#172554]/65 text-[#DBEAFE]'
                          : 'bg-[#0B1428] hover:bg-[#0F1930]'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 text-left font-bold">
                        {result.minimizedDFA.initialState === st ? '→ ' : ''}
                        {result.minimizedDFA.finalStates.includes(st)
                          ? `((${st}))`
                          : st}
                      </td>
                      <td className="py-1.5 px-2.5 text-left text-slate-300">
                        {`{${members.join(',')}}`}
                      </td>
                      {result.minimizedDFA.alphabet.map((sym) => (
                        <td
                          key={sym}
                          className="py-1.5 px-2.5 text-[#22C55E] font-bold"
                        >
                          {result.minimizedDFA.transitions[st]?.[sym]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Partition Refinement Steps */}
      <div className="p-3 rounded-xl bg-[#070E1E] border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">
            Partition Refinement Steps (
            {result.refinementHistory.map((r) => r.label).join(' → ')})
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Click a group to highlight states
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {result.refinementHistory.map((iter) => (
            <div
              key={iter.label}
              className="px-2.5 py-1.5 rounded-lg bg-[#0B1428] border border-slate-800 flex items-center gap-2 text-xs font-mono"
            >
              <span className="font-bold text-[#8B5CF6]">{iter.label}:</span>
              <div className="flex flex-wrap gap-1.5">
                {iter.groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onHighlightStates(g.members)}
                    className="px-1.5 py-0.5 rounded bg-[#0F1930] hover:bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    {g.id}={ `{${g.members.join(',')}}` }
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
