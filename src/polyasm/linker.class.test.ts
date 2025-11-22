import { beforeEach, describe, expect, it } from "vitest";
import { Linker } from "./linker.class";

describe("Linker", () => {
	let linker: Linker;

	beforeEach(() => {
		linker = new Linker();
	});

	it("should be created", () => {
		expect(linker).toBeTruthy();
	});

	describe("addSegment", () => {
		it("should add a new segment", () => {
			linker.addSegment("CODE", 0x100, 0x10);
			expect(linker.segments.length).toBe(1);
			expect(linker.segments[0].name).toBe("CODE");
			expect(linker.segments[0].start).toBe(0x100);
			expect(linker.segments[0].size).toBe(0x10);
			expect(linker.segments[0].data.length).toBe(0x10);
			expect(linker.segments[0].data.every((v) => v === 0)).toBe(true);
		});

		it("should add a segment with a pad value", () => {
			linker.addSegment("DATA", 0x200, 0x8, 0xff);
			expect(linker.segments.length).toBe(1);
			expect(linker.segments[0].name).toBe("DATA");
			expect(linker.segments[0].padValue).toBe(0xff);
			expect(linker.segments[0].data.every((v) => v === 0xff)).toBe(true);
		});

		it("should add a resizable segment with zero size", () => {
			linker.addSegment("BSS", 0x300, 0, 0, true);
			expect(linker.segments.length).toBe(1);
			const seg = linker.segments[0];
			expect(seg.name).toBe("BSS");
			expect(seg.resizable).toBe(true);
			expect(seg.size).toBe(0);
			expect(seg.data.length).toBe(0);
		});
	});

	describe("clearSegments", () => {
		it("should remove all segments", () => {
			linker.addSegment("CODE", 0x100, 0x10);
			linker.addSegment("DATA", 0x200, 0x10);
			linker.clearSegments();
			expect(linker.segments.length).toBe(0);
		});
	});

	describe("useSegment", () => {
		it("should select an existing segment", () => {
			linker.addSegment("CODE", 0x100, 0x10);
			linker.useSegment("CODE");
			expect(linker.currentSegment).toBeDefined();
			expect(linker.currentSegment?.name).toBe("CODE");
		});

		it("should throw an error for a non-existent segment", () => {
			expect(() => linker.useSegment("NONEXISTENT")).toThrow("Segment not found: NONEXISTENT");
		});
	});

	describe("writeByte", () => {
		beforeEach(() => {
			linker.addSegment("CODE", 0x100, 0x10);
			linker.addSegment("BSS", 0x200, 0, 0, true);
		});

		it("should throw if no segment is active", () => {
			expect(() => linker.writeByte(0x100, 0x42)).toThrow("Internal error: no active segment.");
		});

		it("should write a byte to the current segment", () => {
			linker.useSegment("CODE");
			linker.writeByte(0x105, 0x42);
			expect(linker.currentSegment?.data[5]).toBe(0x42);
		});

		it("should throw when writing below segment start", () => {
			linker.useSegment("CODE");
			expect(() => linker.writeByte(0xff, 0x42)).toThrow("Write out of bounds: address $FF is below segment 'CODE' start $100.");
		});

		it("should throw when writing outside a fixed segment", () => {
			linker.useSegment("CODE");
			expect(() => linker.writeByte(0x110, 0x42)).toThrow("Write out of bounds: address $110 outside fixed segment 'CODE' (start $100, size 16).");
		});

		it("should resize a resizable segment when writing past its end", () => {
			linker.useSegment("BSS");
			linker.writeByte(0x200, 0xaa);
			linker.writeByte(0x201, 0xbb);
			const seg = linker.segments.find((s) => s.name === "BSS");
			expect(seg?.data.length).toBe(2);
			expect(seg?.size).toBe(2);
			expect(seg?.data[0]).toBe(0xaa);
			expect(seg?.data[1]).toBe(0xbb);
		});

		it("should handle non-sequential writes in resizable segment", () => {
			linker.useSegment("BSS");
			linker.writeByte(0x204, 0xcc);
			const seg = linker.segments.find((s) => s.name === "BSS");
			expect(seg?.data.length).toBe(5);
			expect(seg?.size).toBe(5);
			expect(seg?.data[0]).toBe(0);
			expect(seg?.data[4]).toBe(0xcc);
		});
	});

	describe("link", () => {
		it("should return an empty array if no segments are present", () => {
			expect(linker.link()).toEqual([]);
		});

		it("should link a single segment", () => {
			linker.addSegment("CODE", 0x100, 4, 0);
			linker.useSegment("CODE");
			linker.writeByte(0x100, 1);
			linker.writeByte(0x101, 2);
			linker.writeByte(0x102, 3);
			linker.writeByte(0x103, 4);
			expect(linker.link()).toEqual([1, 2, 3, 4]);
		});

		it("should link multiple segments, filling gaps with zeros", () => {
			linker.addSegment("SEG1", 0x10, 2);
			linker.useSegment("SEG1");
			linker.writeByte(0x10, 0xaa);
			linker.writeByte(0x11, 0xbb);

			linker.addSegment("SEG2", 0x14, 2);
			linker.useSegment("SEG2");
			linker.writeByte(0x14, 0xcc);
			linker.writeByte(0x15, 0xdd);

			// SEG1 at 0x10, size 2 -> [0xaa, 0xbb]
			// Gap of 2 bytes (0x12, 0x13)
			// SEG2 at 0x14, size 2 -> [0xcc, 0xdd]
			// minStart = 0x10, maxEnd = 0x16. outSize = 6
			expect(linker.link()).toEqual([0xaa, 0xbb, 0, 0, 0xcc, 0xdd]);
		});

		it("should handle overlapping segments, last segment wins", () => {
			linker.addSegment("SEG1", 0x10, 4);
			linker.useSegment("SEG1");
			linker.writeByte(0x10, 1);
			linker.writeByte(0x11, 2);
			linker.writeByte(0x12, 3);
			linker.writeByte(0x13, 4);

			linker.addSegment("SEG2", 0x12, 4);
			linker.useSegment("SEG2");
			linker.writeByte(0x12, 5);
			linker.writeByte(0x13, 6);
			linker.writeByte(0x14, 7);
			linker.writeByte(0x15, 8);

			expect(linker.link()).toEqual([1, 2, 5, 6, 7, 8]);
		});

		it("should use padValue for unfilled parts of segments", () => {
			linker.addSegment("DATA", 0x100, 5, 0xff);
			linker.useSegment("DATA");
			linker.writeByte(0x100, 0xda);
			linker.writeByte(0x101, 0xdb);
			expect(linker.link()).toEqual([0xda, 0xdb, 0xff, 0xff, 0xff]);
		});
	});
});
