export const test_6502 = {
	ADC: [
		["ADC #$12", "69 12"],
		["ADC $1234", "6D 34 12"],
		["ADC $1234,x", "7D 34 12"],
		["ADC $1234,y", "79 34 12"],
		["ADC $12", "65 12"],
		["ADC $12,x", "75 12"],
		["ADC ($12,x)", "61 12"],
		["ADC ($12),y", "71 12"],
	],
	AND: [
		["AND #$12", "29 12"],
		["AND $1234", "2D 34 12"],
		["AND $1234,x", "3D 34 12"],
		["AND $1234,y", "39 34 12"],
		["AND $12", "25 12"],
		["AND $12,x", "35 12"],
		["AND ($12,x)", "21 12"],
		["AND ($12),y", "31 12"],
	],
	ASL: [
		["ASL", "0A"],
		["ASL $1234", "0E 34 12"],
		["ASL $1234,x", "1E 34 12"],
		["ASL $12", "06 12"],
		["ASL $12,x", "16 12"],
	],
	BCC: [["BCC *", "90 FE"]],
	BCS: [["BCS *", "B0 FE"]],
	BEQ: [["BEQ *", "F0 FE"]],
	BIT: [
		["BIT $1234", "2C 34 12"],
		["BIT $12", "24 12"],
	],
	BMI: [["BMI *", "30 FE"]],
	BNE: [["BNE *", "D0 FE"]],
	BPL: [["BPL *", "10 FE"]],
	BRK: [["BRK", "00"]],
	BVC: [["BVC *", "50 FE"]],
	BVS: [["BVS *", "70 FE"]],
	CLC: [["CLC", "18"]],
	CLD: [["CLD", "D8"]],
	CLI: [["CLI", "58"]],
	CLV: [["CLV", "B8"]],
	CMP: [
		["CMP #$12", "C9 12"],
		["CMP $1234", "CD 34 12"],
		["CMP $1234,x", "DD 34 12"],
		["CMP $1234,y", "D9 34 12"],
		["CMP $12", "C5 12"],
		["CMP $12,x", "D5 12"],
		["CMP ($12,x)", "C1 12"],
		["CMP ($12),y", "D1 12"],
	],
	CPX: [
		["CPX #$12", "E0 12"],
		["CPX $1234", "EC 34 12"],
		["CPX $12", "E4 12"],
	],
	CPY: [
		["CPY #$12", "C0 12"],
		["CPY $1234", "CC 34 12"],
		["CPY $12", "C4 12"],
	],
	DEC: [
		["DEC $1234", "CE 34 12"],
		["DEC $1234,x", "DE 34 12"],
		["DEC $12", "C6 12"],
		["DEC $12,x", "D6 12"],
	],
	DEX: [["DEX", "CA"]],
	DEY: [["DEY", "88"]],
	EOR: [
		["EOR #$12", "49 12"],
		["EOR $1234", "4D 34 12"],
		["EOR $1234,x", "5D 34 12"],
		["EOR $1234,y", "59 34 12"],
		["EOR $12", "45 12"],
		["EOR $12,x", "55 12"],
		["EOR ($12,x)", "41 12"],
		["EOR ($12),y", "51 12"],
	],
	INC: [
		["INC $1234", "EE 34 12"],
		["INC $1234,x", "FE 34 12"],
		["INC $12", "E6 12"],
		["INC $12,x", "F6 12"],
	],
	INX: [["INX", "E8"]],
	INY: [["INY", "C8"]],
	JMP: [
		["JMP $1234", "4C 34 12"],
		["JMP ($1234)", "6C 34 12"],
	],
	JSR: [["JSR $1234", "20 34 12"]],
	LDA: [
		["LDA #$12", "A9 12"],
		["LDA $1234", "AD 34 12"],
		["LDA $1234,x", "BD 34 12"],
		["LDA $1234,y", "B9 34 12"],
		["LDA $12", "A5 12"],
		["LDA $12,x", "B5 12"],
		["LDA ($12,x)", "A1 12"],
		["LDA ($12),y", "B1 12"],
	],
	LDX: [
		["LDX #$12", "A2 12"],
		["LDX $1234", "AE 34 12"],
		["LDX $1234,y", "BE 34 12"],
		["LDX $12", "A6 12"],
		["LDX $12,y", "B6 12"],
	],
	LDY: [
		["LDY #$12", "A0 12"],
		["LDY $1234", "AC 34 12"],
		["LDY $1234,x", "BC 34 12"],
		["LDY $12", "A4 12"],
		["LDY $12,x", "B4 12"],
	],
	LSR: [
		["LSR", "4A"],
		["LSR $1234", "4E 34 12"],
		["LSR $1234,x", "5E 34 12"],
		["LSR $12", "46 12"],
		["LSR $12,x", "56 12"],
	],
	NOP: [["NOP", "EA"]],
	ORA: [
		["ORA #$12", "09 12"],
		["ORA $1234", "0D 34 12"],
		["ORA $1234,x", "1D 34 12"],
		["ORA $1234,y", "19 34 12"],
		["ORA $12", "05 12"],
		["ORA $12,x", "15 12"],
		["ORA ($12,x)", "01 12"],
		["ORA ($12),y", "11 12"],
	],
	PHA: [["PHA", "48"]],
	PHP: [["PHP", "08"]],
	PLA: [["PLA", "68"]],
	PLP: [["PLP", "28"]],
	ROL: [
		["ROL", "2A"],
		["ROL $1234", "2E 34 12"],
		["ROL $1234,x", "3E 34 12"],
		["ROL $12", "26 12"],
		["ROL $12,x", "36 12"],
	],
	ROR: [
		["ROR", "6A"],
		["ROR $1234", "6E 34 12"],
		["ROR $1234,x", "7E 34 12"],
		["ROR $12", "66 12"],
		["ROR $12,x", "76 12"],
	],
	RTI: [["RTI", "40"]],
	RTS: [["RTS", "60"]],
	SBC: [
		["SBC #$12", "E9 12"],
		["SBC $1234", "ED 34 12"],
		["SBC $1234,x", "FD 34 12"],
		["SBC $1234,y", "F9 34 12"],
		["SBC $12", "E5 12"],
		["SBC $12,x", "F5 12"],
		["SBC ($12,x)", "E1 12"],
		["SBC ($12),y", "F1 12"],
	],
	SEC: [["SEC", "38"]],
	SED: [["SED", "F8"]],
	SEI: [["SEI", "78"]],
	STA: [
		["STA $1234", "8D 34 12"],
		["STA $1234,x", "9D 34 12"],
		["STA $1234,y", "99 34 12"],
		["STA $12", "85 12"],
		["STA $12,x", "95 12"],
		["STA ($12,x)", "81 12"],
		["STA ($12),y", "91 12"],
	],
	STX: [
		["STX $1234", "8E 34 12"],
		["STX $12", "86 12"],
		["STX $12,y", "96 12"],
	],
	STY: [
		["STY $1234", "8C 34 12"],
		["STY $12", "84 12"],
		["STY $12,x", "94 12"],
	],
	TAX: [["TAX", "AA"]],
	TAY: [["TAY", "A8"]],
	TSX: [["TSX", "BA"]],
	TXA: [["TXA", "8A"]],
	TXS: [["TXS", "9A"]],
	TYA: [["TYA", "98"]],
};
