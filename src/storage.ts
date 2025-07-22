import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { NodeSelection, Procedure, ProgramStats } from "../shared/eval";
import { parseExtra, stringifyExtra } from "../shared/util";
import { stages } from "./story";

export type PuzzleSolveData = {
	token: string;
	id: number;
	username: string | null;
	stats: ProgramStats;
};

export type ProcHistory = { time: number }[];

export type LocalStorage = Partial<{
	storyState: Record<string, unknown>;
	storyParagraph: Record<string, number>;
	solvedPuzzles: Set<string>;
	readStory: Set<string>;

	userProcs: number[];
	maxProc: number;
	puzzleProcs: Map<string, number | Procedure>;

	// prevent editing in multiple tabs
	// updates with last timestamp
	// cleared with onbeforeunload
	currentlyEditing: number;

	stepsPerS: number;
	// timestamp of when stage last counted
	lastStageCount: Map<string, number>;
	puzzleSolve: Map<string, PuzzleSolveData>;
	username: string;

	seenReference: boolean;
	referencePage: string;
	numNodesCreated: number;

	clipboard: NodeSelection;
	seenMessages: Map<string, number>; // time message received
}> & { toJSON(): unknown };

const localStorageKeys: (Exclude<keyof LocalStorage, "toJSON">)[] = [
	"storyState",
	"puzzleProcs",
	"readStory",
	"solvedPuzzles",
	"stepsPerS",
	"userProcs",
	"storyParagraph",
	"lastStageCount",
	"puzzleSolve",
	"username",
	"currentlyEditing",
	"numNodesCreated",
	"clipboard",
	"maxProc",
	"seenMessages",
	"seenReference",
];

export const LocalStorage = {
	toJSON() {
		return Object.fromEntries(localStorageKeys.map(k => [k, parseExtra(localStorage.getItem(k))]));
	},
} as unknown as LocalStorage;

for (const k of localStorageKeys) {
	Object.defineProperty(LocalStorage, k, {
		get() {
			const vStr = localStorage.getItem(k);
			return vStr != null ? parseExtra(vStr) : undefined;
		},
		set(newV) {
			if (newV == undefined) localStorage.removeItem(k);
			else localStorage.setItem(k, stringifyExtra(newV));
			return newV as unknown;
		},
	});
}

type Save = { localStorage: LocalStorage; procs: [number, Procedure][] };

export function importSave(importData: string) {
	const save = parseExtra(importData) as Save;
	for (const k in save.localStorage) {
		// casting hell
		(LocalStorage[k as keyof LocalStorage] as unknown) = save
			.localStorage[k as keyof LocalStorage] as unknown;
	}

	new ProcStorage().setProcs(save.procs);
}

export function exportSave(): string {
	return stringifyExtra(
		{ localStorage: LocalStorage, procs: new ProcStorage().getAllProcs() } satisfies Save,
	);
}

// very unreact like, but fuck im not rerendering thru here, uh pretend this is a backend or something :)
class ProcStorage {
	savedProcs = new Map<number, Procedure | null>();
	procHistories = new Map<number, ProcHistory>();
	historyTimeScale = 60*1000;
	historyMultiplier = 2;
	constructor() {}

	getProc(i: number): Procedure | null {
		const proc = parseExtra(localStorage.getItem(`proc${i}`)) as Procedure | null;
		this.savedProcs.set(i, proc);
		return proc;
	}
	getUserProcs() {
		return (LocalStorage.userProcs ?? []).map((i): [number, Procedure] => [i, this.getProc(i)!]);
	}
	getAllProcs() {
		return [
			...LocalStorage.userProcs ?? [],
			...[...LocalStorage.puzzleProcs?.values() ?? []].filter((x: unknown): x is number =>
				typeof x == "number"
			),
		].map((i): [number, Procedure] => [i, this.getProc(i)!]);
	}

	getHistory(i: number): ProcHistory {
		const history = parseExtra(localStorage.getItem(`procHistory${i}`)) as ProcHistory | null;
		return history ?? [];
	}
	setHistory(i: number, history: ProcHistory) {
		localStorage.setItem(`procHistory${i}`, stringifyExtra(history));
	}
	getHistoryEntry(i: number, j: number) {
		return parseExtra(localStorage.getItem(`procHistoryEntry${i}-${j}`)) as Procedure;
	}
	setHistoryEntry(i: number, j: number, proc: Procedure) {
		localStorage.setItem(`procHistoryEntry${i}-${j}`, stringifyExtra(proc));
	}
	setProc(i: number, proc: Procedure) {
		const oldProc = this.savedProcs.get(i);
		if (oldProc == proc) return;

		const oldMaxNode = oldProc?.maxNode ?? 0;
		LocalStorage.numNodesCreated = (LocalStorage.numNodesCreated ?? 0)+proc.maxNode-oldMaxNode;
		this.savedProcs.set(i, proc);
		localStorage.setItem(`proc${i}`, stringifyExtra(proc));

		if (oldProc) {
			const history = this.getHistory(i);
			const now = Date.now();

			let threshold = this.historyTimeScale;
			let curProc = oldProc, entry = { time: now }, historyI = 0;
			for (; historyI < history.length; historyI++) {
				threshold *= this.historyMultiplier;
				if (now < history[historyI].time+threshold) break;
				[entry, history[historyI]] = [history[i], entry];

				const newCurProc = this.getHistoryEntry(i, historyI);
				this.setHistoryEntry(i, historyI, curProc);
				curProc = newCurProc;
			}

			if (historyI == history.length) {
				history.push(entry);
				this.setHistoryEntry(i, historyI, curProc);
			}

			this.setHistory(i, history);
		}
	}
	setProcs(procs: [number, Procedure][]) {
		for (const [i, x] of procs) this.setProc(i, x);
	}
}

const StorageContext = createContext(new ProcStorage());
export const useProcStorage = () => useContext(StorageContext);

export function getCompleted() {
	const story = LocalStorage.readStory ?? new Set();
	const puzzle = LocalStorage.solvedPuzzles ?? new Set();
	const withDone = stages.map((stage, i) => ({
		...stage,
		i,
		done: stage.type == "puzzle" ? puzzle.has(stage.key) : story.has(stage.key),
	}));

	const activeStages = import.meta.env["VITE_ALL_COMPLETED"] == "1"
		? withDone.length
		: withDone.find(x => x.type == "puzzle" && !x.done)?.i ?? withDone.length;
	return { story, puzzle, withDone, activeStages } as const;
}
