export interface Segment {
	name: string;
	start: number;
	size: number;
	data: number[];
	/** Whether this segment may grow when writes go past its declared size. Default: false (fixed). */
	resizable?: boolean;
	/** Value used to pad the segment to its declared size when linking. Default: 0. */
	padValue?: number;
}

export class Linker {
	public segments: Segment[] = [];
	public currentSegment?: Segment;

	public addSegment(name: string, start: number, size: number, padValue = 0, resizable = false): void {
		// If size is zero, create an empty data array. If resizable is true, the segment will grow on writes.
		const seg: Segment = { name, start, size, data: size > 0 ? new Array(size).fill(padValue) : [], resizable, padValue };
		this.segments.push(seg);
	}

	/** Selects a segment by name and makes it the active segment for subsequent writes. */
	public useSegment(name: string) {
		const seg = this.segments.find((s) => s.name === name);
		if (!seg) throw new Error(`Segment not found: ${name}`);
		this.currentSegment = seg;
		return seg.start;
	}

	public writeBytes(addr: number, values: number[]): void {
		const active = this.currentSegment;
		if (!active) throw new Error("Internal error: no active segment.");

		const offset = addr - active.start;
		if (offset < 0)
			throw new Error(
				`Write out of bounds: address $${addr.toString(16).toUpperCase()} is below segment '${active.name}' start $${active.start.toString(16).toUpperCase()}.`,
			);

		if (offset >= active.size && !active.resizable)
			throw new Error(
				`Write out of bounds: address $${addr.toString(16).toUpperCase()} outside fixed segment '${active.name}' (start $${active.start.toString(16).toUpperCase()}, size ${active.size}).`,
			);

		if (offset >= active.data.length) {
			if (!active.resizable) throw new Error(`Internal error: segment '${active.name}' data shorter than declared size and not resizable.`);

			const needed = offset + values.length - active.data.length;
			active.data.push(...new Array(needed).fill(active.padValue ?? 0));
		}

		// active.data[offset] = value & 0xff;
		active.data.splice(offset, values.length, ...values);
		if (active.resizable && active.size < active.data.length) active.size = active.data.length;
	}

	public link(segments?: Segment[]): number[] {
		const segs = segments ?? this.segments;
		if (!segs || segs.length === 0) return [];

		let minStart = Number.POSITIVE_INFINITY;
		let maxEnd = Number.NEGATIVE_INFINITY;
		for (const s of segs) {
			minStart = Math.min(minStart, s.start);
			maxEnd = Math.max(maxEnd, s.start + s.size);
		}

		const outSize = maxEnd - minStart;
		const out = new Array(outSize).fill(0);
		for (const s of segs) {
			const offset = s.start - minStart;
			const pad = s.padValue ?? 0;
			for (let i = 0; i < s.size; i++) {
				if (i < s.data.length) out[offset + i] = s.data[i] ?? pad;
				else out[offset + i] = pad;
			}
		}
		return out;
	}
}
