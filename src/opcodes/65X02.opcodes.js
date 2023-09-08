import { cpu6502 } from "./6502.opcodes.js";

const op65x02 = {
	ALR: [-1, 0x4b, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	ANC: [-1, 0x0b, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	ANC2: [-1, 0x2b, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	ANE: [-1, 0x8b, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	ARR: [-1, 0x6b, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	DCP: [-1, -1, 0xcf, 0xdf, 0xdb, 0xc7, 0xd7, -1, -1, 0xc3, 0xd3, -1, -1],
	ISC: [-1, -1, 0xef, 0xff, 0xfb, 0xe7, 0xf7, -1, -1, 0xe3, 0xf3, -1, -1],
	LAS: [-1, -1, -1, -1, 0xbb, -1, -1, -1, -1, -1, -1, -1, -1],
	LAX: [-1, 0xab, 0xaf, -1, 0xbf, 0xa7, -1, 0xb7, -1, 0xa3, 0xb3, -1, -1],
	LXA: [-1, 0xab, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	NOP: [0xea, 0x80, 0x0c, 0x1c, -1, 0x04, 0x14, -1, -1, -1, -1, -1, -1],
	RLA: [-1, -1, 0x2f, 0x3f, 0x3b, 0x27, 0x37, -1, -1, 0x23, 0x33, -1, -1],
	RRA: [-1, -1, 0x6f, 0x7f, 0x7b, 0x67, 0x77, -1, -1, 0x63, 0x73, -1, -1],
	SAX: [-1, -1, 0x8f, -1, -1, 0x87, -1, 0x97, -1, 0x83, -1, -1, -1],
	USBC: [-1, 0xeb, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	SBX: [-1, 0xcb, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	SHA: [-1, -1, -1, -1, 0x9f, -1, -1, -1, -1, -1, 0x93, -1, -1],
	SHX: [-1, -1, -1, -1, 0x9e, -1, -1, -1, -1, -1, -1, -1, -1],
	SHY: [-1, -1, -1, 0x9c, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	SLO: [-1, -1, 0x0f, 0x1f, 0x1b, 0x07, 0x17, -1, -1, 0x03, 0x13, -1, -1],
	SRE: [-1, -1, 0x4f, 0x5f, 0x5b, 0x47, 0x57, -1, -1, 0x43, 0x53, -1, -1],
	TAS: [-1, -1, -1, -1, 0x9b, -1, -1, -1, -1, -1, -1, -1, -1],
	JAM: [0x02, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
	DOP: [-1, 0x80, -1, -1, -1, 0x04, 0x14, -1, -1, -1, -1, -1, -1],
	TOP: [-1, -1, 0x0c, 0x1c, -1, -1, -1, -1, -1, -1, -1, -1, -1],
};

const instrSynonyms = {
	ASO: "SLO",
	LSE: "SRE",
	AXS: "SAX",
	AAX: "SAX",
	DCM: "DCP",
	ISB: "ISC",
	INS: "ISC",
	LAR: "LAS",
	LAE: "LAS",
	SHS: "TAS",
	XAS: "TAS",
	AXA: "SHA",
	AHX: "SHA",
	SAY: "SHY",
	SYA: "SHY",
	ASR: "ALR",
	XAA: "ANE",
	ATX: "LAX",
	HLT: "JAM",
	KIL: "JAM",
	SKB: "DOP",
	SKW: "TOP",
};

export const cpu65x02 = { ...cpu6502, ...op65x02 };
