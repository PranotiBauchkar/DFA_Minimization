import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DFADefinition,
  ValidationResult,
  parseProblemStatement,
} from '../utils/dfaEngine';

interface LeftPanelDefineDFAProps {
  dfaInput: DFADefinition;
  validationStatus: 'waiting' | 'valid' | 'invalid';
  validationResult: ValidationResult;
  problemText: string;
  externalSyncCounter: number; // Increments only when Load Example / Reset is clicked
  onProblemTextChange: (text: string) => void;
  onUpdateDFA: (newDfa: DFADefinition) => void;
  onGenerateDFA: (dfaToApply?: DFADefinition) => void;
  onValidateDFA: () => void;
}

const SAMPLE_PROMPTS = [
  'Construct a DFA over {0,1} that accepts strings ending with 01 and minimize it.',
  'Construct a DFA over {0,1} that accepts strings ending with 101 and minimize it.',
  'Construct a DFA over {a,b} that accepts strings starting with ab and minimize it.',
  'Construct a DFA over {0,1} that accepts strings containing 00 and minimize it.',
  'Construct a DFA over {0,1} that accepts strings of even length and minimize it.',
];

export const LeftPanelDefineDFA: React.FC<LeftPanelDefineDFAProps> = ({
  dfaInput,
  validationStatus,
  validationResult,
  problemText,
  externalSyncCounter,
  onProblemTextChange,
  onUpdateDFA,
  onGenerateDFA,
  onValidateDFA,
}) => {
  const [activeTab, setActiveTab] = useState<'input' | 'problem'>('input');
  const [statesText, setStatesText] = useState(dfaInput.states.join(','));
  const [alphabetText, setAlphabetText] = useState(dfaInput.alphabet.join(','));
  const [finalStatesText, setFinalStatesText] = useState(
    dfaInput.finalStates.join(',')
  );

  // Track which input is currently focused so we never overwrite what the user is actively typing
  const focusedFieldRef = useRef<'states' | 'alphabet' | 'finals' | null>(null);

  const [problemFeedback, setProblemFeedback] = useState<{
    type: 'info' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  // Sync text inputs ONLY when an external action (Load Example, Reset, or Problem Statement Parse) occurs
  React.useEffect(() => {
    setStatesText(dfaInput.states.join(','));
    setAlphabetText(dfaInput.alphabet.join(','));
    setFinalStatesText(dfaInput.finalStates.join(','));
  }, [externalSyncCounter]);

  const applyStatesFromString = (raw: string) => {
    setStatesText(raw);
    const parsedStates = Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    if (parsedStates.length === 0) return;

    const newTransitions: Record<string, Record<string, string>> = {};
    for (const st of parsedStates) {
      newTransitions[st] = {};
      for (const sym of dfaInput.alphabet) {
        const existingTarget = dfaInput.transitions[st]?.[sym];
        newTransitions[st][sym] =
          existingTarget && parsedStates.includes(existingTarget)
            ? existingTarget
            : parsedStates[0];
      }
    }

    const newInitial = parsedStates.includes(dfaInput.initialState)
      ? dfaInput.initialState
      : parsedStates[0];

    const validFinals = dfaInput.finalStates.filter((f) =>
      parsedStates.includes(f)
    );
    const newFinals =
      validFinals.length > 0
        ? validFinals
        : [parsedStates[parsedStates.length - 1]];

    if (focusedFieldRef.current !== 'finals') {
      setFinalStatesText(newFinals.join(','));
    }

    onUpdateDFA({
      ...dfaInput,
      states: parsedStates,
      initialState: newInitial,
      finalStates: newFinals,
      transitions: newTransitions,
    });
  };

  const applyAlphabetFromString = (raw: string) => {
    setAlphabetText(raw);
    const parsedAlphabet = Array.from(
      new Set(
        raw
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      )
    );
    if (parsedAlphabet.length === 0) return;

    const newTransitions: Record<string, Record<string, string>> = {};
    for (const st of dfaInput.states) {
      newTransitions[st] = {};
      for (const sym of parsedAlphabet) {
        newTransitions[st][sym] =
          dfaInput.transitions[st]?.[sym] || dfaInput.states[0] || '';
      }
    }

    onUpdateDFA({
      ...dfaInput,
      alphabet: parsedAlphabet,
      transitions: newTransitions,
    });
  };

  const applyFinalStatesFromString = (raw: string) => {
    setFinalStatesText(raw);
    const parsedFinals = Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    onUpdateDFA({
      ...dfaInput,
      finalStates: parsedFinals,
    });
  };

  // Toggle whether a state is a final state by clicking its chip
  const handleToggleFinalStateChip = (st: string) => {
    const isCurrentlyFinal = dfaInput.finalStates.includes(st);
    let nextFinals: string[];
    if (isCurrentlyFinal) {
      if (dfaInput.finalStates.length <= 1) return; // keep at least 1 final state
      nextFinals = dfaInput.finalStates.filter((f) => f !== st);
    } else {
      nextFinals = [...dfaInput.finalStates, st];
    }
    setFinalStatesText(nextFinals.join(','));
    onUpdateDFA({
      ...dfaInput,
      finalStates: nextFinals,
    });
  };

  // Quick Add State button (+ Add State)
  const handleQuickAddState = () => {
    let idx = dfaInput.states.length;
    let candidate = `q${idx}`;
    while (dfaInput.states.includes(candidate)) {
      idx++;
      candidate = `q${idx}`;
    }
    const nextStates = [...dfaInput.states, candidate];
    const nextRaw = nextStates.join(',');
    setStatesText(nextRaw);
    applyStatesFromString(nextRaw);
  };

  // Quick Remove last state button
  const handleQuickRemoveLastState = () => {
    if (dfaInput.states.length <= 2) return;
    const nextStates = dfaInput.states.slice(0, -1);
    const nextRaw = nextStates.join(',');
    setStatesText(nextRaw);
    applyStatesFromString(nextRaw);
  };

  const handleTransitionCellChange = (
    state: string,
    symbol: string,
    target: string
  ) => {
    const updatedTransitions = {
      ...dfaInput.transitions,
      [state]: {
        ...(dfaInput.transitions[state] || {}),
        [symbol]: target,
      },
    };
    onUpdateDFA({
      ...dfaInput,
      transitions: updatedTransitions,
    });
  };

  const handleParseAndGenerateFromProblem = () => {
    const res = parseProblemStatement(problemText);
    if (!res.success || !res.dfa) {
      setProblemFeedback({
        type: 'error',
        text: res.errorMessage || 'More DFA information is required.',
      });
    } else {
      setProblemFeedback({
        type: 'info',
        text: res.explanation || 'DFA constructed from problem statement.',
      });
      setStatesText(res.dfa.states.join(','));
      setAlphabetText(res.dfa.alphabet.join(','));
      setFinalStatesText(res.dfa.finalStates.join(','));
      onUpdateDFA(res.dfa);
      onGenerateDFA(res.dfa);
    }
  };

  return (
    <aside className="w-full bg-[#0B1428] rounded-xl border border-slate-800 p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="border-b border-slate-800 pb-2.5">
        <h2 className="text-sm font-bold text-white">Define DFA</h2>
        <p className="text-[11px] text-slate-400">
          States, alphabet, transitions & problem input
        </p>
      </div>

      {/* Two Tabs: DFA Input | Problem Statement */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[#050B18] rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('input')}
          className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
            activeTab === 'input'
              ? 'bg-[#7C3AED] text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          DFA Input
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('problem')}
          className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
            activeTab === 'problem'
              ? 'bg-[#7C3AED] text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Problem Statement
        </button>
      </div>

      {/* TAB 1: DFA INPUT */}
      {activeTab === 'input' ? (
        <div className="flex flex-col gap-2.5">
          {/* States Input + Quick + / - State Controls */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-[#94A3B8]">
                States (comma separated)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleQuickAddState}
                  title="Add a new state"
                  className="px-1.5 py-0.5 rounded bg-[#7C3AED]/25 hover:bg-[#7C3AED]/40 border border-[#8B5CF6]/50 text-[10px] font-mono text-[#C4B5FD] flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>State</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickRemoveLastState}
                  disabled={dfaInput.states.length <= 2}
                  title="Remove last state"
                  className="px-1.5 py-0.5 rounded bg-[#2D0A16]/60 hover:bg-[#2D0A16] disabled:opacity-40 border border-[#F43F5E]/40 text-[10px] font-mono text-[#FDA4AF] flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
            <input
              type="text"
              value={statesText}
              onFocus={() => {
                focusedFieldRef.current = 'states';
              }}
              onBlur={() => {
                focusedFieldRef.current = null;
                setStatesText(dfaInput.states.join(','));
              }}
              onChange={(e) => applyStatesFromString(e.target.value)}
              placeholder="q0,q1,q2,q3,q4"
              className="w-full px-3 py-1.5 rounded-lg bg-[#050B18] border border-[#6366F1]/35 text-xs font-mono text-white focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
            />
          </div>

          {/* Alphabet & Initial State in 2 columns */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                Alphabet
              </label>
              <input
                type="text"
                value={alphabetText}
                onFocus={() => {
                  focusedFieldRef.current = 'alphabet';
                }}
                onBlur={() => {
                  focusedFieldRef.current = null;
                  setAlphabetText(dfaInput.alphabet.join(','));
                }}
                onChange={(e) => applyAlphabetFromString(e.target.value)}
                placeholder="0,1"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050B18] border border-[#6366F1]/35 text-xs font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                Initial State
              </label>
              <select
                value={dfaInput.initialState}
                onChange={(e) =>
                  onUpdateDFA({ ...dfaInput, initialState: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#050B18] border border-[#6366F1]/35 text-xs font-mono text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
              >
                {dfaInput.states.map((st) => (
                  <option
                    key={st}
                    value={st}
                    className="bg-[#0B1428] text-white"
                  >
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Final States Input + Interactive Toggle Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-[#94A3B8]">
                Final States
              </label>
              <span className="text-[10px] text-[#22C55E]">
                Click chip or type
              </span>
            </div>
            <input
              type="text"
              value={finalStatesText}
              onFocus={() => {
                focusedFieldRef.current = 'finals';
              }}
              onBlur={() => {
                focusedFieldRef.current = null;
                setFinalStatesText(dfaInput.finalStates.join(','));
              }}
              onChange={(e) => applyFinalStatesFromString(e.target.value)}
              placeholder="q3"
              className="w-full px-3 py-1.5 rounded-lg bg-[#050B18] border border-[#6366F1]/35 text-xs font-mono text-white focus:outline-none focus:border-[#22C55E]"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {dfaInput.states.map((st) => {
                const isFin = dfaInput.finalStates.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleToggleFinalStateChip(st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                      isFin
                        ? 'bg-[#052E16] border-[#22C55E] text-[#4ADE80]'
                        : 'bg-[#050B18] border-[#6366F1]/30 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {isFin ? `✓ ((${st}))` : st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Transition Table Input (Select or Type) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-[#94A3B8]">
                Transition Table (δ)
              </label>
              <span className="text-[10px] font-mono text-[#8B5CF6]">
                Select target state
              </span>
            </div>
            <div className="rounded-xl border border-[#6366F1]/35 overflow-hidden bg-[#050B18]">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[#0F1930] border-b border-[#6366F1]/30 text-[11px] font-mono text-[#94A3B8]">
                    <th className="py-1.5 px-2 text-left font-semibold">
                      State
                    </th>
                    {dfaInput.alphabet.map((sym) => (
                      <th
                        key={sym}
                        className="py-1.5 px-2 font-semibold text-[#06B6D4]"
                      >
                        {sym}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6366F1]/20 text-xs font-mono">
                  {dfaInput.states.map((st) => {
                    const isInit = dfaInput.initialState === st;
                    const isFin = dfaInput.finalStates.includes(st);
                    return (
                      <tr
                        key={st}
                        className="hover:bg-[#0F1930]/80 transition-colors"
                      >
                        <td className="py-1 px-2 text-left font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {isInit && (
                              <span
                                className="text-[#22C55E] text-[10px]"
                                title="Initial State"
                              >
                                →
                              </span>
                            )}
                            {isFin ? `((${st}))` : st}
                          </span>
                        </td>
                        {dfaInput.alphabet.map((sym) => {
                          const currentVal =
                            dfaInput.transitions[st]?.[sym] ?? '';
                          return (
                            <td key={sym} className="p-1">
                              <select
                                value={currentVal}
                                onChange={(e) =>
                                  handleTransitionCellChange(
                                    st,
                                    sym,
                                    e.target.value
                                  )
                                }
                                className="w-full text-center py-1 px-1 rounded bg-[#0B1428] border border-[#7C3AED]/35 text-xs font-mono text-white hover:border-[#8B5CF6] hover:shadow-[0_0_8px_rgba(139,92,246,0.35)] focus:outline-none focus:border-[#06B6D4] transition-all cursor-pointer"
                              >
                                {!dfaInput.states.includes(currentVal) && (
                                  <option value={currentVal}>
                                    {currentVal || '—'}
                                  </option>
                                )}
                                {dfaInput.states.map((targetOpt) => (
                                  <option
                                    key={targetOpt}
                                    value={targetOpt}
                                    className="bg-[#0B1428] text-white"
                                  >
                                    {targetOpt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons: Generate DFA & Validate DFA */}
          <div className="flex flex-col gap-2 pt-0.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onGenerateDFA()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#4F46E5] text-white font-semibold text-xs flex items-center justify-center gap-2 glow-purple cursor-pointer transition-all whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Generate DFA</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onValidateDFA}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white font-semibold text-xs flex items-center justify-center gap-2 glow-green cursor-pointer transition-all whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>Validate DFA</span>
            </motion.button>
          </div>
        </div>
      ) : (
        /* TAB 2: DEDICATED PROBLEM STATEMENT BUILDER */
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1.5">
              Enter Problem Statement or Transition Rules
            </label>
            <textarea
              rows={5}
              value={problemText}
              onChange={(e) => {
                onProblemTextChange(e.target.value);
                if (problemFeedback.type) {
                  setProblemFeedback({ type: null, text: '' });
                }
              }}
              placeholder="e.g. Construct a DFA over {0,1} that accepts strings ending with 01 and minimize it."
              className="w-full p-3 rounded-xl bg-[#050B18] border border-[#8B5CF6]/50 text-xs text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] leading-relaxed"
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleParseAndGenerateFromProblem}
            className="w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Construct & Minimize from Statement</span>
          </motion.button>

          {/* Quick-Try Sample Problem Statements */}
          <div>
            <div className="text-[11px] font-medium text-[#94A3B8] mb-1.5">
              Click a sample problem statement to load:
            </div>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_PROMPTS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onProblemTextChange(sample);
                    const res = parseProblemStatement(sample);
                    if (res.success && res.dfa) {
                      setProblemFeedback({
                        type: 'info',
                        text: res.explanation || 'Constructed DFA.',
                      });
                      setStatesText(res.dfa.states.join(','));
                      setAlphabetText(res.dfa.alphabet.join(','));
                      setFinalStatesText(res.dfa.finalStates.join(','));
                      onUpdateDFA(res.dfa);
                      onGenerateDFA(res.dfa);
                    }
                  }}
                  className="text-left p-2 rounded-lg bg-[#050B18] hover:bg-[#0F1930] border border-[#6366F1]/25 hover:border-[#8B5CF6]/60 text-[11px] text-[#CBD5E1] hover:text-white transition-all cursor-pointer leading-snug"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Result Card */}
      <div>
        <div className="text-[11px] font-medium text-[#94A3B8] mb-1">
          Validation Result
        </div>
        <AnimatePresence mode="wait">
          {validationStatus === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2.5 rounded-xl bg-[#050B18] border border-[#6366F1]/30 text-xs text-[#94A3B8] flex items-center justify-between"
            >
              <span>Changes ready — click Generate DFA</span>
            </motion.div>
          )}

          {validationStatus === 'valid' && (
            <motion.div
              key="valid"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-2.5 rounded-xl bg-[#052E16]/70 border border-[#22C55E]/70 glow-green"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ Valid DFA</span>
              </div>
              <p className="text-[11px] text-[#DCFCE7] mt-0.5 leading-snug">
                {validationResult.message}
              </p>
            </motion.div>
          )}

          {validationStatus === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-2.5 rounded-xl bg-[#2D0A16]/80 border border-[#F43F5E]/70 glow-red"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F43F5E]">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>✕ Invalid DFA</span>
              </div>
              <p className="text-[11px] text-[#FECDD3] mt-0.5 leading-snug">
                {validationResult.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Problem Statement Box (Always accessible at bottom when on DFA Input tab) */}
      {activeTab === 'input' && (
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Problem Statement
            </label>
            <button
              type="button"
              onClick={handleParseAndGenerateFromProblem}
              className="px-2 py-0.5 rounded bg-[#0F1930] hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-200 hover:text-white cursor-pointer transition-colors"
            >
              Construct DFA
            </button>
          </div>
          <textarea
            rows={2}
            value={problemText}
            onChange={(e) => {
              onProblemTextChange(e.target.value);
              if (problemFeedback.type) {
                setProblemFeedback({ type: null, text: '' });
              }
            }}
            placeholder="Construct a DFA over {0,1} that accepts strings ending with 01..."
            className="w-full p-2.5 rounded-xl bg-[#050B18] border border-[#6366F1]/35 text-xs text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#8B5CF6] resize-y leading-relaxed"
          />
        </div>
      )}

      {/* Problem Feedback Banner */}
      {problemFeedback.type && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-2.5 rounded-xl text-[11px] flex items-start gap-1.5 border ${
            problemFeedback.type === 'error'
              ? 'bg-[#2D0A16]/75 border-[#F43F5E]/60 text-[#FDA4AF]'
              : 'bg-[#052E16]/75 border-[#22C55E]/60 text-[#DCFCE7]'
          }`}
        >
          {problemFeedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F43F5E]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#22C55E]" />
          )}
          <span>{problemFeedback.text}</span>
        </motion.div>
      )}
    </aside>
  );
};
