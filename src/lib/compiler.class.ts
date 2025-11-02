import { VABuildError, VAExprError } from "./helpers/errors.class";
import { getHexByte, getHexWord, low } from "./helpers/utils";

const log = console.log;

const BYTECOUNTPERLINE = 6;
const ADDR_PREFIX_LENGTH = 7;
const BYTE_DUMP_LENGTH = ADDR_PREFIX_LENGTH + BYTECOUNTPERLINE * 3 + 1;

export type TSegment = {
	start: number;
	end: number;
	size: number;
	pad?: number;
};
export type TSegments = Record<string, TSegment>;
export type TCodeObj = Record<string, Array<unknown>>;

export class Compiler {
	public pc = 0;
	public obj: TCodeObj = {};
	private _output: string[] | null = null;
	public segments: TSegments;
	private currentSegment: string | null;

	constructor(segments: TSegments | null) {
		if (segments == null) {
			this.segments = { CODE: { start: 0x1000, end: 0xffff, size: 0 } };
			this.currentSegment = "CODE";
			this.obj[this.currentSegment] = [];
			this.pc = this.segments[this.currentSegment].start;
		} else {
			this.segments = segments;
			this.currentSegment = null;
		}

		for (const name in this.segments) {
			const segment = this.segments[name];
			segment.size = segment.end - segment.start + 1;
		}
	}

	get output() {
		const res = this._output;
		this._output = null;
		return res;
	}

	segment() {
		if (!this.currentSegment) throw new VAExprError("No segment selected");
		return { name: this.currentSegment, ...this.segments[this.currentSegment] };
	}

	has(segmentName: string) {
		return this.segments[segmentName] !== undefined;
	}

	add(segmentName: string, segment: TSegment) {
		if (this.has(segmentName)) throw new VAExprError("Segment already defined");
		const newSegment: TSegment = {
			start: segment.start,
			end: segment.end,
			size: segment.end - segment.start + 1,
		};
		if ("pad" in segment) newSegment.pad = segment.pad;
		this.segments[segmentName] = newSegment;
	}

	select(segmentName: string) {
		this.currentSegment = segmentName;
		if (this.segments[this.currentSegment] === undefined) {
			// log("SEGMENT SELECT", segmentName, JSON.stringify(this.segments));
			throw new VABuildError("No such segment");
		}

		if (this.obj[this.currentSegment] === undefined) this.obj[this.currentSegment] = [];

		this.pc = this.segments[this.currentSegment].start + this.obj[this.currentSegment].length;
	}

	setPC(addr: number) {
		if (!this.currentSegment) throw new VABuildError("No segment selected");

		const seg = this.segments[this.currentSegment];
		if (addr < seg.start || addr > seg.end)
			throw new VABuildError(
				`ORG is out of Segment "${this.currentSegment}" range ${getHexWord(seg.start)}:${getHexWord(seg.end)}`,
			);
		this.pc = addr;
	}

	reset() {
		this.pc = this.currentSegment ? this.segments[this.currentSegment].start : 0;
		this._output = null;
	}

	emits(pass: number, bytes: number[] | Buffer, wannaShowChars = false) {
		// console.log("emits(%i) SEG:%s",
		// 			pass,
		// 			this.currentSegment,
		// 			getHexWord(this.pc),
		// 			bytes);

		if (!this.currentSegment) throw new VABuildError("EMIT: No segment selected");

		const obj = this.obj[this.currentSegment];
		if (obj === undefined) throw new VABuildError("EMIT: No Object Segment set");

		const seg = this.segments[this.currentSegment];
		if (this.pc + bytes.length > seg.end + 1)
			throw new VABuildError(
				`EMIT: Code is out of Segment "${this.currentSegment}" range ${getHexWord(this.pc)}:${getHexWord(
					this.pc + bytes.length,
				)} > ${getHexWord(seg.start)}:${getHexWord(seg.end)}`,
			);

		if (pass > 1) {
			let chars = "";
			let hex = "";
			// this._output= "";
			const offset = this.pc - seg.start;
			const lines = [];
			for (let idx = 0; idx < bytes.length; idx++) {
				if (idx % BYTECOUNTPERLINE === 0) {
					hex += `${getHexWord(this.pc + idx)}: `;
				}

				obj[offset + idx] = low(bytes[idx]);
				hex += ` ${getHexByte(bytes[idx])}`;

				if (wannaShowChars) {
					if (bytes[idx] >= 0x20 && bytes[idx] <= 0x7f) chars += String.fromCharCode(bytes[idx]);
					else chars += ".";
				}

				if (idx % BYTECOUNTPERLINE === BYTECOUNTPERLINE - 1) {
					lines.push(hex.padEnd(BYTE_DUMP_LENGTH) + chars);
					hex = "";
					chars = "";
				}
			}
			hex !== "" && lines.push(hex.padEnd(BYTE_DUMP_LENGTH) + chars);
			this._output = lines;
		}

		this.pc += bytes.length;
	}

	dump(segmentName: string, bytePerLine = 16) {
		const obj = this.obj[segmentName];
		if (obj === undefined || !obj.length) throw new VABuildError(`EMIT: No Object Code for Segment ${segmentName}`);

		const parts: string[] = [];

		const codeStart = this.segments[segmentName].start;
		const codeEnd = codeStart + obj.length;
		const offset = codeStart % bytePerLine;
		for (let addr = codeStart - offset; addr < codeEnd; addr++) {
			if (addr % bytePerLine === 0) {
				parts.push(`${getHexWord(addr)}: `);
			}

			if (addr < codeStart) {
				parts.push(".. ");
			} else {
				parts.push(getHexByte((obj[addr - codeStart] as number | undefined) || 0));
				parts.push(addr % bytePerLine === bytePerLine - 1 || addr === codeEnd - 1 ? "\n" : " ");
			}
		}

		const s = parts.join("");
		console.log(s);
	}
}
