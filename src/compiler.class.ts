import { VABuildError, VAExprError } from "./helpers/errors.class";
import { getHexByte, getHexWord, low } from "./helpers/utils";

const BYTECOUNTPERLINE = 6;

type TSegment = {
	start: number;
	end: number;
	pad?: number;
};
export type TSegments = Record<string, TSegment>;

export class Compiler {
	public pc = 0;
	public obj: Record<string, Array<unknown>> = {};
	private _output: string | null = null;
	public segments: TSegments;
	private currentSegment: string | null;

	constructor(segments: TSegments) {
		if (segments == null) {
			this.segments = { CODE: { start: 0x1000, end: 0xffff } };
			this.currentSegment = "CODE";
			this.obj[this.currentSegment] = [];
			this.pc = this.segments[this.currentSegment].start;
		} else {
			this.segments = segments;
			this.currentSegment = null;
		}
	}

	get output() {
		const res = this._output;
		this._output = null;
		return res;
	}

	segment() {
		if (!this.currentSegment) throw new VAExprError("No segment defined");
		return { name: this.currentSegment, ...this.segments[this.currentSegment] };
	}

	select(segmentName: string) {
		this.currentSegment = segmentName;
		if (this.segments[this.currentSegment] === undefined) throw new VABuildError("No such segment");

		if (this.obj[this.currentSegment] === undefined) this.obj[this.currentSegment] = [];

		this.pc = this.segments[this.currentSegment].start + this.obj[this.currentSegment].length;
	}

	setPC(addr: number) {
		if (!this.currentSegment) throw new VABuildError("No segment defined");

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

		if (!this.currentSegment) throw new VABuildError("No segment defined");

		const obj = this.obj[this.currentSegment];
		if (obj === undefined) throw new VABuildError("No Object Segment set");

		const seg = this.segments[this.currentSegment];
		if (this.pc + bytes.length > seg.end + 1)
			throw new VABuildError(
				`Code is out of Segment "${this.currentSegment}" range ${getHexWord(this.pc)}:${getHexWord(
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
					hex += `    ${getHexWord(this.pc + idx)}: `;
				}

				obj[offset + idx] = low(bytes[idx]);
				hex += ` ${getHexByte(bytes[idx])}`;

				if (wannaShowChars) chars += String.fromCharCode(bytes[idx]);

				if (idx % BYTECOUNTPERLINE === BYTECOUNTPERLINE - 1) {
					lines.push(hex.padEnd(32) + chars);
					hex = "";
					chars = "";
				}
			}
			hex !== "" && lines.push(hex.padEnd(32) + chars);
			this._output = lines.join("\n");
		}

		this.pc += bytes.length;
	}

	dump(segmentName: string, bytePerLine = 16) {
		const obj = this.obj[segmentName];
		if (obj === undefined || !obj.length) throw new VABuildError(`No Object Code for Segment ${segmentName}`);

		let s = "";

		const codeStart = this.segments[segmentName].start;
		const codeEnd = codeStart + obj.length;
		const offset = codeStart % 8;
		for (let addr = codeStart - offset; addr < codeEnd; addr++) {
			if (addr % bytePerLine === 0) s += `${getHexWord(addr)}: `;

			if (addr < codeStart) s += ".. ";
			else {
				s += getHexByte((obj[addr - codeStart] as number | undefined) || 0);
				// s += getHexByte(
				// 	typeof obj[addr - codeStart] === "undefined"
				// 		? 0
				// 		: obj[addr - codeStart] || 0,
				// );
				s += addr % bytePerLine === bytePerLine - 1 || addr === codeEnd - 1 ? "\n" : " ";
			}
		}

		console.log(s);
	}
}
