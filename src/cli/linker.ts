import type { TAssemblerResult } from "../lib/types/assembler.type";

type TSegmentItem = [string, number, number, number, number, number];
type TSegmentList = TSegmentItem[];

export function link(asmRes: TAssemblerResult) {
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
		const padValue = seg.pad;
		if (padValue !== undefined && (segObj?.length ?? 0) < segLen) {
			padLen = segLen - (segObj?.length ?? 0);
			const padBuffer = Array.from({ length: padLen }, () => padValue);
			finalCode.push(...padBuffer);
		}

		segmentList.push([name, currPos, segObj?.length ?? 0, padLen, seg.start, seg.size]);
	}

	return {
		finalCode,
		dir: segmentList,
	};
}
