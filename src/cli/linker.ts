import { TAssemblerResult } from "../types/assembler.type";
import { makeString } from "../pragmas/string.pragma";
import { pushNumber } from "../pragmas/data.pragma";

type TSegmentItem = [string, number, number, number, number, number];
type TSegmentList = TSegmentItem[];
export type TLinkerOptions = {
	hasSegmentDirectory: boolean;
};

export function link(asmRes: TAssemblerResult, opts: TLinkerOptions) {
	const finalCode: unknown[] = [];
	const segmentList: TSegmentList = [];

	for (const name in asmRes.segments) {
		const segObj = asmRes.obj[name];
		const currPos = finalCode.length;

		if (segObj) {
			finalCode.push(...segObj);
		} else {
			console.warn(`LINKER: segment ${name} is empty !?`);
		}

		const seg = asmRes.segments[name];
		const segLen = seg.end - seg.start + 1;
		let padLen = 0;
		const padValue = seg.pad ?? 0;
		if ((segObj?.length ?? 0) < segLen) {
			padLen = segLen - (segObj?.length ?? 0);
			const padBuffer = Array.from({ length: padLen }, () => padValue);
			finalCode.push(...padBuffer);
		}

		if (opts.hasSegmentDirectory) {
			segmentList.push([name, currPos, segObj?.length ?? 0, padLen, seg.start, seg.size]);
		}
	}

	if (opts.hasSegmentDirectory) {
		const lenBeforeDir = finalCode.length;
		for (const [name, offset, len, padLen, org] of segmentList) {
			const recordBuffer = makeString(null, String(name), { charSize: 1, hasLeadingLength: true });
			pushNumber(recordBuffer, { value: offset, type: 0 }, -4);
			pushNumber(recordBuffer, { value: len + padLen, type: 0 }, -4);
			pushNumber(recordBuffer, { value: org, type: 0 }, -4);

			const recordSize: number[] = [];
			pushNumber(recordSize, { value: recordBuffer.length + 1, type: 0 }, 1);

			finalCode.push(...recordSize, ...recordBuffer);
		}
		const dirOffset: number[] = [];
		pushNumber(dirOffset, { value: lenBeforeDir, type: 0 }, -4);
		finalCode.push(...dirOffset, ...makeString(null, "DISK", { charSize: 1 }));
	}

	return {
		finalCode,
		dir: segmentList,
	};
}
