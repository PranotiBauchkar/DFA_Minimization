/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import {
  DEFAULT_DFA,
  PRESET_EXAMPLES,
  DFADefinition,
  validateDFA,
  runDFAMinimization,
} from './utils/dfaEngine';
import { LeftPanelDefineDFA } from './components/LeftPanelDefineDFA';
import { CenterSimulationPanel } from './components/CenterSimulationPanel';
import { RightPanelExplanation } from './components/RightPanelExplanation';
import { BottomTimeline } from './components/BottomTimeline';

export default function App() {
  const [dfaInput, setDfaInput] = useState<DFADefinition>(DEFAULT_DFA);
  const [activeDFA, setActiveDFA] = useState<DFADefinition>(DEFAULT_DFA);

  const [validationStatus, setValidationStatus] = useState<
    'waiting' | 'valid' | 'invalid'
  >('valid');

  const [problemText, setProblemText] = useState<string>(
    'Construct a DFA over {0,1} that accepts\nstrings ending with 01 and minimize it.'
  );

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [highlightedStates, setHighlightedStates] = useState<string[]>([]);
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const [exampleIndex, setExampleIndex] = useState<number>(0);
  const [showPresetDropdown, setShowPresetDropdown] = useState<boolean>(false);
  const [externalSyncCounter, setExternalSyncCounter] = useState<number>(0);

  const currentValidation = useMemo(() => validateDFA(dfaInput), [dfaInput]);

  const minimizationResult = useMemo(
    () => runDFAMinimization(activeDFA),
    [activeDFA]
  );

  const handleUpdateDFAInput = (updated: DFADefinition) => {
    setDfaInput(updated);
    const res = validateDFA(updated);
    if (res.valid) {
      setValidationStatus('valid');
      setActiveDFA(updated);
    } else {
      setValidationStatus('waiting');
    }
  };

  const handleValidateDFA = () => {
    const res = validateDFA(dfaInput);
    if (res.valid) {
      setValidationStatus('valid');
      setActiveDFA(dfaInput);
    } else {
      setValidationStatus('invalid');
      setIsPlaying(false);
    }
  };

  const handleGenerateDFA = (dfaOverride?: DFADefinition) => {
    const targetDfa = dfaOverride || dfaInput;
    const res = validateDFA(targetDfa);
    if (res.valid) {
      setValidationStatus('valid');
      setActiveDFA(targetDfa);
      setCurrentStep(1);
      setIsPlaying(false);
      setSelectedState(null);
      setHighlightedStates([]);
      setHighlightedGroupId(null);
      setSelectedEdge(null);
    } else {
      setValidationStatus('invalid');
      setIsPlaying(false);
    }
  };

  const handleLoadExample = (idx?: number) => {
    const nextIdx =
      typeof idx === 'number' ? idx : (exampleIndex + 1) % PRESET_EXAMPLES.length;
    const preset = PRESET_EXAMPLES[nextIdx];
    setExampleIndex(nextIdx);
    setDfaInput(preset.dfa);
    setActiveDFA(preset.dfa);
    setProblemText(preset.problemText);
    setExternalSyncCounter((c) => c + 1);
    setValidationStatus('valid');
    setCurrentStep(1);
    setIsPlaying(false);
    setSelectedState(null);
    setHighlightedStates([]);
    setHighlightedGroupId(null);
    setSelectedEdge(null);
    setShowPresetDropdown(false);
  };

  const handleResetToDefault = () => {
    setExampleIndex(0);
    setDfaInput(DEFAULT_DFA);
    setActiveDFA(DEFAULT_DFA);
    setProblemText(
      'Construct a DFA over {0,1} that accepts\nstrings ending with 01 and minimize it.'
    );
    setExternalSyncCounter((c) => c + 1);
    setValidationStatus('valid');
    setCurrentStep(1);
    setIsPlaying(false);
    setSelectedState(null);
    setHighlightedStates([]);
    setHighlightedGroupId(null);
    setSelectedEdge(null);
  };

  const handleTogglePlay = () => {
    const res = validateDFA(dfaInput);
    if (!res.valid) {
      setValidationStatus('invalid');
      setIsPlaying(false);
      return;
    }
    setValidationStatus('valid');
    setActiveDFA(dfaInput);
    if (!isPlaying && currentStep === 8) {
      setCurrentStep(1);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSelectGroup = (groupId: string | null, members: string[]) => {
    if (!groupId || highlightedGroupId === groupId) {
      setHighlightedGroupId(null);
      setHighlightedStates([]);
    } else {
      setHighlightedGroupId(groupId);
      setHighlightedStates(members);
    }
  };

  const navItems = [
    { label: 'Build', step: 1 },
    { label: 'Analyze', step: 3 },
    { label: 'Minimize', step: 6 },
    { label: 'Visualize', step: 7 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#050B18] text-[#F8FAFC]">
      {/* TOP HEADER */}
      <header className="h-14 px-6 bg-[#0B1428] border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight text-white">
            DFA Minimization Simulator
          </h1>
        </div>

        {/* Zone 2: Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          {navItems.map((item) => {
            const isActive =
              (item.label === 'Build' && currentStep <= 2) ||
              (item.label === 'Analyze' && (currentStep === 3 || currentStep === 4)) ||
              (item.label === 'Minimize' && (currentStep === 5 || currentStep === 6)) ||
              (item.label === 'Visualize' && currentStep >= 7);

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(item.step);
                }}
                className={`py-1 transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'text-white border-[#8B5CF6]'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Right Actions */}
        <div className="flex items-center gap-2 relative">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => handleLoadExample()}
              className="px-3 py-1.5 rounded-l-lg bg-[#0F1930] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Load Example</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPresetDropdown((prev) => !prev)}
              aria-label="Select Example"
              className="px-1.5 py-1.5 rounded-r-lg bg-[#0F1930] hover:bg-slate-800 border-y border-r border-slate-700 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showPresetDropdown && (
              <div className="absolute right-0 top-9 w-72 rounded-xl bg-[#0B1428] border border-slate-700 p-1.5 z-50 shadow-xl">
                {PRESET_EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => handleLoadExample(i)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      exampleIndex === i
                        ? 'bg-[#7C3AED]/20 text-white font-semibold'
                        : 'text-slate-300 hover:bg-[#0F1930] hover:text-white'
                    }`}
                  >
                    <div className="truncate">{ex.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {ex.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 rounded-lg bg-[#0F1930] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[21%_57%_22%] gap-4 items-start">
        <div className="w-full min-w-0">
          <LeftPanelDefineDFA
            dfaInput={dfaInput}
            validationStatus={validationStatus}
            validationResult={currentValidation}
            problemText={problemText}
            externalSyncCounter={externalSyncCounter}
            onProblemTextChange={setProblemText}
            onUpdateDFA={handleUpdateDFAInput}
            onGenerateDFA={handleGenerateDFA}
            onValidateDFA={handleValidateDFA}
          />
        </div>

        <div className="w-full min-w-0">
          <CenterSimulationPanel
            currentStep={currentStep}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            result={minimizationResult}
            selectedState={selectedState}
            highlightedStates={highlightedStates}
            selectedEdge={selectedEdge}
            onStepChange={(s) => setCurrentStep(s)}
            onTogglePlay={handleTogglePlay}
            onRestart={() => {
              setIsPlaying(false);
              setCurrentStep(1);
            }}
            onSpeedChange={setSpeedMultiplier}
            onSelectState={setSelectedState}
            onSelectEdge={setSelectedEdge}
            onHighlightStates={setHighlightedStates}
          />
        </div>

        <div className="w-full min-w-0 lg:pr-2">
          <RightPanelExplanation
            currentStep={currentStep}
            result={minimizationResult}
            highlightedGroupId={highlightedGroupId}
            onSelectGroup={handleSelectGroup}
          />
        </div>
      </div>

      {/* BOTTOM TIMELINE */}
      <BottomTimeline
        currentStep={currentStep}
        onSelectStep={(step) => {
          setIsPlaying(false);
          setCurrentStep(step);
        }}
      />
    </div>
  );
}

