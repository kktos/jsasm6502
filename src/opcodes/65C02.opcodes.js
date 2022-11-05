import { cpu6502 } from "./6502.opcodes.js";

export const op65c02 = {
	BRA: [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x80,  -1,  -1],
	STZ: [  -1,  -1,0x9c,0x9E,  -1,0x64,0x74,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	PHX: [0xDA,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	PLX: [0xFA,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	PHY: [0x5A,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	PLY: [0x7A,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	TRB: [  -1,  -1,0x1c,  -1,  -1,0x14,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	TSB: [  -1,  -1,0x0c,  -1,  -1,0x04,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	BBR: [  -1,  -1,  -1,  -1,  -1,0x00,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	BBS: [  -1,  -1,  -1,  -1,  -1,0x00,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	RMB: [  -1,  -1,  -1,  -1,  -1,0x00,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	SMB: [  -1,  -1,  -1,  -1,  -1,0x00,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	INA: [0x1a,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	DEA: [0x3a,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
	BIT: [  -1,0x89,0x2c,0x3c,  -1,0x24,0x34,  -1,  -1,  -1,  -1,  -1,  -1,  -1],

//	     [   0,   1,   2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12,  13],
	ADC: [  -1,0x69,0x6d,0x7d,0x79,0x65,0x75,  -1,  -1,0x61,0x71,  -1,  -1,0x72],
	AND: [  -1,0x29,0x2d,0x3d,0x39,0x25,0x35,  -1,  -1,0x21,0x31,  -1,  -1,0x32],
	CMP: [  -1,0xc9,0xcd,0xdd,0xd9,0xc5,0xd5,  -1,  -1,0xc1,0xd1,  -1,  -1,0xd2],
	EOR: [  -1,0x49,0x4d,0x5d,0x59,0x45,0x55,  -1,  -1,0x41,0x51,  -1,  -1,0x52],
	LDA: [  -1,0xa9,0xad,0xbd,0xb9,0xa5,0xb5,  -1,  -1,0xa1,0xb1,  -1,  -1,0xb2],
	ORA: [  -1,0x09,0x0d,0x1d,0x19,0x05,0x15,  -1,  -1,0x01,0x11,  -1,  -1,0x12],
	SBC: [  -1,0xe9,0xed,0xfd,0xf9,0xe5,0xf5,  -1,  -1,0xe1,0xf1,  -1,  -1,0xf2],
	STA: [  -1,  -1,0x8d,0x9d,0x99,0x85,0x95,  -1,  -1,0x81,0x91,  -1,  -1,0x92],

	JMP: [  -1,  -1,0x4c,  -1,  -1,  -1,  -1,  -1,0x6c,  -1,  -1,  -1,0x7c,  -1],
};

/*
	BBR, BBS, RMB, SMB
	Rockwell added these first, for their microcontrollers that had I/O in ZP.  WDC added them in
	the early 1990's.  The Aug '92 data sheet shows the W65C02S available without them, and
	the W65C02SB with them, but said eventually they would all have them, and be labeled
	W65C02S, without the B.  By the July '96 data sheet, these instructions were standard
	in all of them.
*/
const op65c02s = {
	// BBR  ZP       0F-7F [1]   Branch if specified Bit is Reset. ‾⌉ These are most useful
	// BBS  ZP       8F-FF [1]   Branch if specified Bit is Set.    | when I/O is in ZP.  They
	// RMB  ZP       07-77 [1]   Reset specified Memory Bit.        | are on WDC & Rockwell but
	// SMB  ZP       87-F7 [1]   Set specified Memory Bit.         _⌋ not GTE/CMD or Synertek.
};

export const cpu65c02= { ...cpu6502, ...op65c02 };
