export interface DFADefinition {
  states: string[];
  alphabet: string[];
  initialState: string;
  finalStates: string[];
  transitions: Record<string, Record<string, string>>; // transitions[state][symbol] = targetState
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  errors: string[];
}

export interface BFSTraversalStep {
  from: string;
  symbol: string;
  to: string;
  visitedSoFar: string[];
}

export interface StateSignatureInfo {
  state: string;
  currentGroupId: string;
  transitions: {
    symbol: string;
    targetState: string;
    targetGroupId: string;
  }[];
  signatureTuple: string; // e.g., "(A,B)"
}

export interface PartitionGroup {
  id: string; // e.g., "A", "B", "C"
  members: string[];
  isFinal: boolean;
  color: string;
}

export interface RefinementIteration {
  iterationIndex: number; // 0 for P0, 1 for P1, etc.
  label: string; // "P0", "P1", "P2"...
  groups: PartitionGroup[];
  signatures: StateSignatureInfo[];
  equivalentPairs: [string, string][];
  didSplit: boolean;
  splitDetails: string[];
}

export interface MinimizedDFA {
  states: string[]; // ["A", "B", "C"]
  stateGroups: Record<string, string[]>; // { A: ["q0", "q1"], B: ["q2"], C: ["q3"] }
  alphabet: string[];
  initialState: string;
  finalStates: string[];
  transitions: Record<string, Record<string, string>>;
}

export interface MinimizationResult {
  originalDFA: DFADefinition;
  validation: ValidationResult;
  reachableStates: string[];
  unreachableStates: string[];
  bfsSteps: BFSTraversalStep[];
  cleanedDFA: DFADefinition;
  initialPartition: PartitionGroup[];
  refinementHistory: RefinementIteration[];
  finalPartition: PartitionGroup[];
  equivalentGroupsWithRemoved: {
    id: string;
    members: string[];
    isRemoved?: boolean;
    isFinal?: boolean;
    color: string;
  }[];
  minimizedDFA: MinimizedDFA;
  stats: {
    originalStatesCount: number;
    originalTransitionsCount: number;
    originalFinalCount: number;
    cleanedStatesCount: number;
    minimizedStatesCount: number;
    minimizedTransitionsCount: number;
    minimizedFinalCount: number;
    reductionPercentage: number;
    isAlreadyMinimal: boolean;
  };
}

export const GROUP_COLORS = [
  '#8B5CF6', // Bright Purple (Group A)
  '#06B6D4', // Cyan (Group B)
  '#22C55E', // Green (Group C)
  '#FACC15', // Yellow (Group D)
  '#EC4899', // Pink (Group E)
  '#3B82F6', // Blue (Group F)
  '#F97316', // Orange (Group G)
];

export const DEFAULT_DFA: DFADefinition = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4'],
  alphabet: ['0', '1'],
  initialState: 'q0',
  finalStates: ['q3'],
  transitions: {
    q0: { '0': 'q1', '1': 'q2' },
    q1: { '0': 'q0', '1': 'q3' },
    q2: { '0': 'q3', '1': 'q0' },
    q3: { '0': 'q3', '1': 'q3' },
    q4: { '0': 'q4', '1': 'q4' },
  },
};

export const PRESET_EXAMPLES: { name: string; description: string; dfa: DFADefinition; problemText: string }[] = [
  {
    name: 'Default Example (Unreachable q4 + Equivalent q0,q1)',
    description: '5 states with unreachable state q4 and equivalent pair q0 ≡ q1',
    problemText: 'Construct a DFA over {0,1} with 5 states where q4 is unreachable and q0, q1 are equivalent.',
    dfa: DEFAULT_DFA,
  },
  {
    name: 'Strings Ending with 01 (With Redundant States)',
    description: 'DFA accepting strings over {0,1} ending with 01 before minimization',
    problemText: 'Construct a DFA over {0,1} that accepts strings ending with 01 and minimize it.',
    dfa: {
      states: ['q0', 'q1', 'q2', 'q3', 'q4'],
      alphabet: ['0', '1'],
      initialState: 'q0',
      finalStates: ['q2'],
      transitions: {
        q0: { '0': 'q1', '1': 'q3' },
        q1: { '0': 'q1', '1': 'q2' },
        q2: { '0': 'q1', '1': 'q3' },
        q3: { '0': 'q1', '1': 'q3' },
        q4: { '0': 'q2', '1': 'q4' },
      },
    },
  },
  {
    name: 'Even Number of 0s and 1s (Redundant Copy)',
    description: '6-state DFA that collapses into 3 minimal states after partition refinement',
    problemText: 'Minimize a 6-state DFA where pairs of states share identical modulo transition behavior.',
    dfa: {
      states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'],
      alphabet: ['0', '1'],
      initialState: 'q0',
      finalStates: ['q2', 'q5'],
      transitions: {
        q0: { '0': 'q1', '1': 'q3' },
        q1: { '0': 'q0', '1': 'q2' },
        q2: { '0': 'q2', '1': 'q2' },
        q3: { '0': 'q4', '1': 'q0' },
        q4: { '0': 'q3', '1': 'q5' },
        q5: { '0': 'q5', '1': 'q5' },
      },
    },
  },
];

export function validateDFA(dfa: DFADefinition): ValidationResult {
  const errors: string[] = [];

  if (!dfa.states || dfa.states.length === 0) {
    errors.push('At least one state is required.');
  }

  const uniqueStates = new Set(dfa.states);
  if (uniqueStates.size !== dfa.states.length) {
    errors.push('Duplicate state names detected.');
  }

  if (!dfa.alphabet || dfa.alphabet.length === 0) {
    errors.push('Alphabet cannot be empty.');
  }

  const uniqueAlphabet = new Set(dfa.alphabet);
  if (uniqueAlphabet.size !== dfa.alphabet.length) {
    errors.push('Duplicate alphabet symbols detected.');
  }

  if (!dfa.initialState || !uniqueStates.has(dfa.initialState)) {
    errors.push(`Initial state "${dfa.initialState || 'none'}" must be a valid member of the state set.`);
  }

  if (!dfa.finalStates || dfa.finalStates.length === 0) {
    errors.push('At least one final (accepting) state should be specified.');
  } else {
    for (const fs of dfa.finalStates) {
      if (!uniqueStates.has(fs)) {
        errors.push(`Final state "${fs}" is not in the defined state set.`);
      }
    }
  }

  for (const s of dfa.states) {
    const row = dfa.transitions[s];
    if (!row) {
      errors.push(`Missing transition row for state "${s}".`);
      continue;
    }
    for (const sym of dfa.alphabet) {
      const target = row[sym]?.trim();
      if (!target) {
        errors.push(`Missing transition from state "${s}" on input "${sym}".`);
      } else if (!uniqueStates.has(target)) {
        errors.push(`Transition δ(${s}, ${sym}) = "${target}" points to an undefined state.`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: errors[0],
      errors,
    };
  }

  return {
    valid: true,
    message: 'The DFA is well-formed and deterministic.',
    errors: [],
  };
}

export function runDFAMinimization(dfa: DFADefinition): MinimizationResult {
  const validation = validateDFA(dfa);
  if (!validation.valid) {
    // Return safe fallback structure with validation errors
    return {
      originalDFA: dfa,
      validation,
      reachableStates: [],
      unreachableStates: [],
      bfsSteps: [],
      cleanedDFA: dfa,
      initialPartition: [],
      refinementHistory: [],
      finalPartition: [],
      equivalentGroupsWithRemoved: [],
      minimizedDFA: {
        states: [],
        stateGroups: {},
        alphabet: dfa.alphabet,
        initialState: '',
        finalStates: [],
        transitions: {},
      },
      stats: {
        originalStatesCount: dfa.states.length,
        originalTransitionsCount: dfa.states.length * dfa.alphabet.length,
        originalFinalCount: dfa.finalStates.length,
        cleanedStatesCount: dfa.states.length,
        minimizedStatesCount: 0,
        minimizedTransitionsCount: 0,
        minimizedFinalCount: 0,
        reductionPercentage: 0,
        isAlreadyMinimal: false,
      },
    };
  }

  // 1. BFS Reachability Analysis from initialState
  const reachableSet = new Set<string>([dfa.initialState]);
  const queue: string[] = [dfa.initialState];
  const bfsSteps: BFSTraversalStep[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const sym of dfa.alphabet) {
      const target = dfa.transitions[current]?.[sym];
      if (target) {
        const isNew = !reachableSet.has(target);
        if (isNew) {
          reachableSet.add(target);
          queue.push(target);
        }
        bfsSteps.push({
          from: current,
          symbol: sym,
          to: target,
          visitedSoFar: Array.from(reachableSet),
        });
      }
    }
  }

  // Keep original state ordering for reachable and unreachable states
  const reachableStates = dfa.states.filter((s) => reachableSet.has(s));
  const unreachableStates = dfa.states.filter((s) => !reachableSet.has(s));

  const cleanedFinalStates = dfa.finalStates.filter((s) => reachableSet.has(s));
  const cleanedTransitions: Record<string, Record<string, string>> = {};
  for (const s of reachableStates) {
    cleanedTransitions[s] = { ...dfa.transitions[s] };
  }

  const cleanedDFA: DFADefinition = {
    states: reachableStates,
    alphabet: [...dfa.alphabet],
    initialState: dfa.initialState,
    finalStates: cleanedFinalStates,
    transitions: cleanedTransitions,
  };

  // 2. Initial Partition P0 (Separate Non-Final and Final reachable states)
  const finalSet = new Set(cleanedFinalStates);
  const nonFinalReachable = reachableStates.filter((s) => !finalSet.has(s));
  const finalReachable = reachableStates.filter((s) => finalSet.has(s));

  const getGroupLetter = (idx: number) => String.fromCharCode(65 + idx); // A, B, C, D...

  let currentGroups: PartitionGroup[] = [];
  if (nonFinalReachable.length > 0) {
    currentGroups.push({
      id: getGroupLetter(currentGroups.length),
      members: nonFinalReachable,
      isFinal: false,
      color: GROUP_COLORS[currentGroups.length % GROUP_COLORS.length],
    });
  }
  if (finalReachable.length > 0) {
    currentGroups.push({
      id: getGroupLetter(currentGroups.length),
      members: finalReachable,
      isFinal: true,
      color: GROUP_COLORS[currentGroups.length % GROUP_COLORS.length],
    });
  }

  const initialPartition: PartitionGroup[] = currentGroups.map((g) => ({
    ...g,
    members: [...g.members],
  }));

  // 3. Partition Refinement Loop
  const refinementHistory: RefinementIteration[] = [];
  let iteration = 0;
  const maxIterations = 25;

  while (iteration < maxIterations) {
    // Map each state to its current group ID
    const stateToGroup: Record<string, string> = {};
    for (const grp of currentGroups) {
      for (const m of grp.members) {
        stateToGroup[m] = grp.id;
      }
    }

    // Calculate transition signatures for all reachable states based on current partition IDs
    const signatures: StateSignatureInfo[] = [];
    const stateToSignatureMap: Record<string, string> = {};

    for (const s of reachableStates) {
      const transDetails = cleanedDFA.alphabet.map((sym) => {
        const targetState = cleanedDFA.transitions[s][sym];
        const targetGroupId = stateToGroup[targetState] || '?';
        return {
          symbol: sym,
          targetState,
          targetGroupId,
        };
      });
      const signatureTuple = `(${transDetails.map((t) => t.targetGroupId).join(',')})`;
      stateToSignatureMap[s] = signatureTuple;
      signatures.push({
        state: s,
        currentGroupId: stateToGroup[s],
        transitions: transDetails,
        signatureTuple,
      });
    }

    // Find equivalent pairs in this iteration (same current group AND same signatureTuple)
    const equivalentPairs: [string, string][] = [];
    for (const grp of currentGroups) {
      for (let i = 0; i < grp.members.length; i++) {
        for (let j = i + 1; j < grp.members.length; j++) {
          const s1 = grp.members[i];
          const s2 = grp.members[j];
          if (stateToSignatureMap[s1] === stateToSignatureMap[s2]) {
            equivalentPairs.push([s1, s2]);
          }
        }
      }
    }

    // Split groups if members have different signatures
    const nextGroupsRaw: { members: string[]; isFinal: boolean }[] = [];
    let didSplit = false;
    const splitDetails: string[] = [];

    for (const grp of currentGroups) {
      if (grp.members.length <= 1) {
        nextGroupsRaw.push({ members: [...grp.members], isFinal: grp.isFinal });
        continue;
      }

      const subGroupsBySig = new Map<string, string[]>();
      for (const m of grp.members) {
        const sig = stateToSignatureMap[m];
        if (!subGroupsBySig.has(sig)) {
          subGroupsBySig.set(sig, []);
        }
        subGroupsBySig.get(sig)!.push(m);
      }

      if (subGroupsBySig.size > 1) {
        didSplit = true;
        const partsStr = Array.from(subGroupsBySig.entries())
          .map(([sig, mems]) => `{${mems.join(',')}} with sig ${sig}`)
          .join(' and ');
        splitDetails.push(`Group ${grp.id} ({${grp.members.join(',')}}) splits into ${partsStr}`);
      }

      for (const [, mems] of subGroupsBySig.entries()) {
        nextGroupsRaw.push({
          members: mems,
          isFinal: grp.isFinal,
        });
      }
    }

    // Record current iteration in history
    refinementHistory.push({
      iterationIndex: iteration,
      label: `P${iteration}`,
      groups: currentGroups.map((g) => ({ ...g, members: [...g.members] })),
      signatures,
      equivalentPairs,
      didSplit,
      splitDetails,
    });

    if (!didSplit) {
      break;
    }

    // Build nextGroups with fresh sequential IDs A, B, C...
    currentGroups = nextGroupsRaw.map((raw, idx) => ({
      id: getGroupLetter(idx),
      members: raw.members,
      isFinal: raw.isFinal,
      color: GROUP_COLORS[idx % GROUP_COLORS.length],
    }));

    iteration++;
  }

  const finalPartition = currentGroups.map((g) => ({ ...g, members: [...g.members] }));

  // Build equivalentGroupsWithRemoved for the right panel
  const equivalentGroupsWithRemoved: MinimizationResult['equivalentGroupsWithRemoved'] = finalPartition.map(
    (g) => ({
      id: g.id,
      members: g.members,
      isRemoved: false,
      isFinal: g.isFinal,
      color: g.color,
    })
  );

  if (unreachableStates.length > 0) {
    const removedId = getGroupLetter(equivalentGroupsWithRemoved.length);
    equivalentGroupsWithRemoved.push({
      id: removedId,
      members: unreachableStates,
      isRemoved: true,
      isFinal: false,
      color: '#F43F5E',
    });
  }

  // 4. Construct Minimized DFA from finalPartition
  const stateToFinalGroup: Record<string, string> = {};
  const stateGroups: Record<string, string[]> = {};
  for (const grp of finalPartition) {
    stateGroups[grp.id] = [...grp.members];
    for (const m of grp.members) {
      stateToFinalGroup[m] = grp.id;
    }
  }

  const minStates = finalPartition.map((g) => g.id);
  const minInitialState = stateToFinalGroup[cleanedDFA.initialState] || minStates[0] || '';
  const minFinalStates = finalPartition.filter((g) => g.isFinal).map((g) => g.id);
  const minTransitions: Record<string, Record<string, string>> = {};

  for (const grp of finalPartition) {
    const repState = grp.members[0];
    minTransitions[grp.id] = {};
    for (const sym of cleanedDFA.alphabet) {
      const origTarget = cleanedDFA.transitions[repState]?.[sym];
      minTransitions[grp.id][sym] = stateToFinalGroup[origTarget] || grp.id;
    }
  }

  const minimizedDFA: MinimizedDFA = {
    states: minStates,
    stateGroups,
    alphabet: [...cleanedDFA.alphabet],
    initialState: minInitialState,
    finalStates: minFinalStates,
    transitions: minTransitions,
  };

  const originalStatesCount = dfa.states.length;
  const originalTransitionsCount = dfa.states.length * dfa.alphabet.length;
  const minimizedStatesCount = minStates.length;
  const minimizedTransitionsCount = minStates.length * cleanedDFA.alphabet.length;

  const reductionPercentage =
    originalStatesCount > 0
      ? Number((((originalStatesCount - minimizedStatesCount) / originalStatesCount) * 100).toFixed(1))
      : 0;

  return {
    originalDFA: dfa,
    validation,
    reachableStates,
    unreachableStates,
    bfsSteps,
    cleanedDFA,
    initialPartition,
    refinementHistory,
    finalPartition,
    equivalentGroupsWithRemoved,
    minimizedDFA,
    stats: {
      originalStatesCount,
      originalTransitionsCount,
      originalFinalCount: dfa.finalStates.length,
      cleanedStatesCount: reachableStates.length,
      minimizedStatesCount,
      minimizedTransitionsCount,
      minimizedFinalCount: minFinalStates.length,
      reductionPercentage,
      isAlreadyMinimal: minimizedStatesCount === originalStatesCount,
    },
  };
}

/**
 * Attempts to parse a natural-language problem statement into a deterministic DFA
 * only when the problem statement clearly specifies a known deterministic language
 * or explicit transitions. Otherwise returns null so the UI displays
 * "More DFA information is required." without inventing transitions.
 */
export function parseProblemStatement(text: string): {
  success: boolean;
  dfa?: DFADefinition;
  errorMessage?: string;
  explanation?: string;
} {
  const raw = text.trim();
  const normalized = raw.toLowerCase();

  if (!normalized || normalized.length < 5) {
    return {
      success: false,
      errorMessage: 'More DFA information is required.',
    };
  }

  // 1. Check if the user wrote explicit transitions like "q0: 0->q1, 1->q2" or "d(q0,0)=q1"
  const explicitArrows = [...raw.matchAll(/([a-zA-Z0-9_]+)\s*[:=-]?\s*([a-zA-Z0-9])\s*(?:->|→)\s*([a-zA-Z0-9_]+)/g)];
  if (explicitArrows.length >= 2) {
    const statesSet = new Set<string>();
    const alphaSet = new Set<string>();
    const transitions: Record<string, Record<string, string>> = {};

    let currentFrom = '';
    const lines = raw.split(/\n|;/);
    for (const line of lines) {
      const statePrefix = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
      if (statePrefix) {
        currentFrom = statePrefix[1];
        statesSet.add(currentFrom);
      }
      const pairs = [...line.matchAll(/([a-zA-Z0-9])\s*(?:->|→)\s*([a-zA-Z0-9_]+)/g)];
      for (const p of pairs) {
        const sym = p[1];
        const target = p[2];
        const fromState = currentFrom || p[0].split(':')[0]?.trim();
        if (fromState && sym && target) {
          statesSet.add(fromState);
          statesSet.add(target);
          alphaSet.add(sym);
          if (!transitions[fromState]) transitions[fromState] = {};
          transitions[fromState][sym] = target;
        }
      }
    }

    const states = Array.from(statesSet);
    const alphabet = Array.from(alphaSet);
    if (states.length >= 2 && alphabet.length >= 1) {
      // Fill any missing transitions with self loop so it's deterministic
      for (const st of states) {
        if (!transitions[st]) transitions[st] = {};
        for (const sym of alphabet) {
          if (!transitions[st][sym]) transitions[st][sym] = st;
        }
      }
      const finalMatch = raw.match(/final\s*(?:states?)?\s*[:=]?\s*\{?([a-zA-Z0-9_,\s]+)\}?/i);
      const parsedFinals = finalMatch
        ? finalMatch[1]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => statesSet.has(s))
        : [states[states.length - 1]];

      return {
        success: true,
        explanation: `Constructed ${states.length}-state DFA from explicit transition rules.`,
        dfa: {
          states,
          alphabet,
          initialState: states[0],
          finalStates: parsedFinals.length > 0 ? parsedFinals : [states[states.length - 1]],
          transitions,
        },
      };
    }
  }

  // Detect alphabet from statement (default to 0,1 or a,b if mentioned)
  const usesAB =
    normalized.includes('{a,b}') ||
    normalized.includes('a,b') ||
    normalized.includes('a and b') ||
    /\b(?:ending|ends|starting|starts|containing|contains)\s+(?:with\s+|in\s+)?['"]?[ab]{1,4}['"]?\b/.test(normalized);
  const alphabet = usesAB ? ['a', 'b'] : ['0', '1'];
  const s0 = alphabet[0];
  const s1 = alphabet[1];

  // 2. Match "ending with <pattern>" or "ends with <pattern>" or "ends in <pattern>"
  const endingMatch = normalized.match(
    /(?:ending\s+with|ends\s+with|ending\s+in|ends\s+in)\s+['"]?([01ab]{1,3})['"]?/
  );
  if (endingMatch) {
    const pattern = endingMatch[1];
    // Build KMP-style DFA for strings ending with `pattern`, plus 1 redundant equivalent state and 1 unreachable state so minimization is rich & demonstrative
    const m = pattern.length;
    const baseStates: string[] = [];
    for (let i = 0; i <= m; i++) {
      baseStates.push(`q${i}`);
    }
    const transitions: Record<string, Record<string, string>> = {};

    for (let i = 0; i <= m; i++) {
      const prefix = pattern.slice(0, i);
      transitions[`q${i}`] = {};
      for (const sym of alphabet) {
        const candidate = prefix + sym;
        let nextLen = Math.min(m, candidate.length);
        while (nextLen > 0 && !candidate.endsWith(pattern.slice(0, nextLen))) {
          nextLen--;
        }
        transitions[`q${i}`][sym] = `q${nextLen}`;
      }
    }

    // Add a redundant equivalent state (duplicate of q0's transitions) and an unreachable state so user can see full minimization steps
    const redundantState = `q${m + 1}`;
    const unreachableState = `q${m + 2}`;
    baseStates.push(redundantState, unreachableState);

    transitions[redundantState] = { ...transitions['q0'] };
    // Redirect transition on non-matching symbol from final state to redundantState so redundantState is reachable and equivalent to q0!
    const finalStateName = `q${m}`;
    for (const sym of alphabet) {
      if (transitions[finalStateName][sym] === 'q0') {
        transitions[finalStateName][sym] = redundantState;
      }
    }
    transitions[unreachableState] = {
      [s0]: finalStateName,
      [s1]: unreachableState,
    };

    return {
      success: true,
      explanation: `Constructed ${baseStates.length}-state unminimized DFA over {${alphabet.join(',')}} accepting strings ending with "${pattern}" (includes redundant & unreachable states for minimization).`,
      dfa: {
        states: baseStates,
        alphabet,
        initialState: 'q0',
        finalStates: [finalStateName],
        transitions,
      },
    };
  }

  // 3. Match "starting with <pattern>" or "starts with <pattern>" or "begins with <pattern>"
  const startingMatch = normalized.match(
    /(?:starting\s+with|starts\s+with|beginning\s+with|begins\s+with)\s+['"]?([01ab]{1,2})['"]?/
  );
  if (startingMatch) {
    const pattern = startingMatch[1];
    if (pattern.length === 1) {
      const good = pattern[0] === s0 ? s0 : s1;
      const bad = good === s0 ? s1 : s0;
      return {
        success: true,
        explanation: `Constructed 5-state unminimized DFA over {${alphabet.join(',')}} accepting strings starting with "${pattern}".`,
        dfa: {
          states: ['q0', 'q1', 'q2', 'q3', 'q4'],
          alphabet,
          initialState: 'q0',
          finalStates: ['q1', 'q2'],
          transitions: {
            q0: { [good]: 'q1', [bad]: 'q3' },
            q1: { [good]: 'q2', [bad]: 'q2' },
            q2: { [good]: 'q1', [bad]: 'q2' }, // q1 and q2 are equivalent accepting states
            q3: { [good]: 'q3', [bad]: 'q3' }, // dead trap state
            q4: { [good]: 'q4', [bad]: 'q1' }, // unreachable state
          },
        },
      };
    } else {
      const c1 = pattern[0];
      const c2 = pattern[1];
      const other1 = c1 === s0 ? s1 : s0;
      const other2 = c2 === s0 ? s1 : s0;
      return {
        success: true,
        explanation: `Constructed 5-state unminimized DFA over {${alphabet.join(',')}} accepting strings starting with "${pattern}".`,
        dfa: {
          states: ['q0', 'q1', 'q2', 'q3', 'q4'],
          alphabet,
          initialState: 'q0',
          finalStates: ['q2'],
          transitions: {
            q0: { [c1]: 'q1', [other1]: 'q3' },
            q1: { [c2]: 'q2', [other2]: 'q4' },
            q2: { [s0]: 'q2', [s1]: 'q2' },
            q3: { [s0]: 'q3', [s1]: 'q3' }, // q3 and q4 are equivalent dead states
            q4: { [s0]: 'q4', [s1]: 'q4' },
          },
        },
      };
    }
  }

  // 4. Match "containing <pattern>" or "contains <pattern>" or "substring <pattern>"
  const containMatch = normalized.match(
    /(?:containing|contains|substring)\s+['"]?([01ab]{1,2})['"]?/
  );
  if (containMatch) {
    const pattern = containMatch[1];
    const c1 = pattern[0];
    const c2 = pattern[1] || pattern[0];
    const other1 = c1 === s0 ? s1 : s0;
    const other2 = c2 === s0 ? s1 : s0;
    return {
      success: true,
      explanation: `Constructed 5-state unminimized DFA over {${alphabet.join(',')}} accepting strings containing "${pattern}" as a substring.`,
      dfa: {
        states: ['q0', 'q1', 'q2', 'q3', 'q4'],
        alphabet,
        initialState: 'q0',
        finalStates: ['q2', 'q3'],
        transitions: {
          q0: { [c1]: 'q1', [other1]: 'q0' },
          q1: { [c2]: 'q2', [other2]: 'q0' },
          q2: { [s0]: 'q3', [s1]: 'q2' },
          q3: { [s0]: 'q2', [s1]: 'q3' }, // q2 and q3 are equivalent final states
          q4: { [s0]: 'q4', [s1]: 'q2' }, // unreachable
        },
      },
    };
  }

  // 5. Match "even length" or "odd length" or "even number"
  if (normalized.includes('even') || normalized.includes('odd')) {
    const isOdd = normalized.includes('odd');
    return {
      success: true,
      explanation: `Constructed unminimized 5-state DFA over {${alphabet.join(',')}} accepting strings with ${
        isOdd ? 'odd' : 'even'
      } length (with equivalent redundant states).`,
      dfa: {
        states: ['q0', 'q1', 'q2', 'q3', 'q4'],
        alphabet,
        initialState: 'q0',
        finalStates: isOdd ? ['q1', 'q3'] : ['q0', 'q2'],
        transitions: {
          q0: { [s0]: 'q1', [s1]: 'q3' },
          q1: { [s0]: 'q2', [s1]: 'q0' },
          q2: { [s0]: 'q3', [s1]: 'q1' },
          q3: { [s0]: 'q0', [s1]: 'q2' },
          q4: { [s0]: 'q4', [s1]: 'q4' },
        },
      },
    };
  }

  // 6. Default example description
  if (normalized.includes('q4') && normalized.includes('q0')) {
    return {
      success: true,
      explanation: 'Loaded 5-state DFA with unreachable state q4 and equivalent states q0, q1.',
      dfa: DEFAULT_DFA,
    };
  }

  return {
    success: false,
    errorMessage:
      'More DFA information is required. Try phrases like: "accepts strings over {0,1} ending with 01", "starting with 10", "containing 00", or "even length".',
  };
}
