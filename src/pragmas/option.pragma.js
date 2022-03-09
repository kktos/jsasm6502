import { ET_S, logError, logLine } from "../log.js";
import { setcpu } from "./setcpu.pragma.js";
import { encodeAscii, encodeCommodoreScreenCode, encodePetscii } from "./string.pragma.js";

export function processOption(ctx, pragma) {
	ctx.pict+= '.OPT';

	if (ctx.sym.length-ctx.ofs < 1) {
		logError(ctx, ET_S, 'option expected');
		return false;
	}

	var opt= ctx.sym[ctx.ofs];
	ctx.pict+= ' '+opt;

	switch(opt) {
		case "ZPA":
		case "ZPG":
		case "ZPGA":
			ctx.options.autoZpg= true;
			ctx.asm='-AUTO-ZPG ON';
			break;

		case "WORDA":
			ctx.options.autoZpg= false;
			ctx.asm='-AUTO-ZPG OFF';
			break;

		case "PETSCII":
		case "PETSCI":
			ctx.charEncoding= encodePetscii;
			ctx.convertPi= true;
			ctx.asm= '-ENC. PETSCII';
			break;

		case "ASCII":
			ctx.charEncoding= encodeAscii;
			ctx.convertPi= false;
			ctx.asm= '-ENC. ASCII';
			break;

		case "PETSCR":
		case "C64SCR":
			ctx.charEncoding= encodeCommodoreScreenCode;
			ctx.convertPi= true;
			ctx.asm= '-ENC. '+opt;
			break;

		case "ILLEGALS":
		case "NOILLEGALS":
		case "NOILLEGA":
		case "LEGALS":
		case "LEGALSONLY":
		case "LEGALSON": {
			const wantIllegals= opt == "ILLEGALS";
			if(wantIllegals) {
				if(ctx.cpu != "6502") {
					logError(ctx, ET_S, 'option valid only for cpu 6502');
					return false;
				}
				setcpu("65x02");
			} else {
				if(ctx.cpu == "65x02")
					setcpu("6502");
			}
			ctx.options.useIllegals= wantIllegals;
			ctx.asm= '-ILLEGALS '+(wantIllegals? 'ON':'OFF');
			break;
		}

		case "REDEF":
		case "NOREDEF":
			redefSyms= opt=='REDEF';
			ctx.asm= '-REDEF SYMBOLS '+(redefSyms? 'ON':'OFF');
			break;

		case "XREF":
		case "NOXREF":
		case "COUNT":
		case "NOCOUNT":
		case "CNT":
		case "NOCNT":
		case "LIST":
		case "NOLIST":
		case "MEMORY":
		case "NOMEMORY":
		case "GENERATE":
		case "NOGENERATE":
		case "NOGENERA":
			// MOS cross-assembler directives
			ctx.asm='-IGNORED';
			break;

		default:
			logError(ctx, ET_S, 'invalid option');
			return false;

	}

	if (ctx.sym.length-ctx.ofs > 2) {
		ctx.pict+=' '+ctx.sym[2].charAt(0);
		logError(ctx, ET_S, 'unexpected extra characters');
		return false;
	}

	logLine(ctx);
	return true;
}
