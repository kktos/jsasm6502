import { execFunction, isFunction } from "./function.js";
import { ET_C, ET_P, ET_S } from "./log.js";
import { getNSentry, getNStempEntry } from "./namespace.js";
import { getVarValue } from "./variable.js";

const digitCharacters= [
	"0","1","2","3","4","5","6","7","8","9"
];
const numberCharacters= [
	...digitCharacters,
	"$","%","@","&",
	"'",'"'
];
const identifierCharacters= [
	"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
	"_"
];

function getNumber(ctx, s, fromIdx, doubleWord) {
	let c0= s.charAt(fromIdx),
		size= doubleWord? 0xffffffff:0xffff;

	let idx;
	switch(c0) {
		case "$":
		case "&": {
			for(idx=fromIdx+1; idx<s.length; idx++) {
				let c= s.charAt(idx);
				if ((c<'A' || c>'F') && (c<'0' || c>'9'))
					break;
			}
			if(idx==fromIdx+1)
				return {'v': -1, 'idx': idx, 'error': true, 'et': ET_P};
			let n=s.substring(fromIdx+1, idx),
				isWord=(n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
			return {'v': parseInt(n,16)&size, 'idx': idx, 'error': false, 'isWord': isWord};
		}

		case "%": {
			for (idx=fromIdx+1; idx<s.length; idx++) {
				let c=s.charAt(idx);
				if (c!='1' && c!='0') break;
			}
			if (idx==fromIdx+1) return {'v': -1, 'idx': idx, 'error': true, 'et': ET_P};
			return {'v': parseInt(s.substring(fromIdx+1, idx),2)&size, 'idx': idx, 'error': false};
		}

		case "@": {
			for (idx=fromIdx+1; idx<s.length; idx++) {
				let c=s.charAt(idx);
				if (c<'0' || c>'7') break;
			}
			if (idx==fromIdx+1) return {'v': -1, 'idx': idx, 'error': true};
			return {'v': parseInt(s.substring(fromIdx+1, idx),8)&size, 'idx': idx, 'error': false};
		}

		case '"':
		case "'": {
			fromIdx++;
			if (fromIdx<s.length) {
				let v= s.charCodeAt(fromIdx) + (c0=='"' ? 0x80 : 0);
				if(ctx.convertPi && v==0x03C0)
					v=0xff; //CBM pi

				if(v>0xff)
					return {'v': v, 'idx': fromIdx, 'error': true, 'et': ET_P};

				fromIdx++;

				return {'v': ctx.charEncoding(v), 'idx': fromIdx, 'error': false};
			}
			return {'v': -1, 'idx': fromIdx, 'error': true};
		}

		case "0": {
			if(s.length==fromIdx+1)
				return {'v': 0, 'idx': fromIdx+1};
			let ofs= fromIdx+1, base=8, c=s.charAt(ofs);
			if (c=='X') {
				base=16;
				ofs++;
			}
			else if (c=='O') {
				base=8;
				ofs++;
			}
			else if (c=='B') {
				base=2;
				ofs++;
			}
			else if (c=='D') {
				base=10;
				ofs++;
			}
			if(ofs>=s.length)
				return {'v': -1, 'idx': s.length, 'error': true, 'et': ET_P};
			let idx;
			for(idx=ofs; idx<s.length; idx++) {
				c=s.charAt(idx);
				if (base==2 && (c!='0' && c!='1')) break;
				if (base==8 && (c<'0' || c>'7')) break;
				if (base==10 && (c<'0' || c>'9')) break;
				if (base==16 && (c<'0' || c>'9') && (c<'A' || c>'F')) break;
			}
			let n= s.substring(ofs, idx),
				isWord= (base==16 && n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
			return {'v': parseInt(n,base)&size, 'idx': idx, 'error': false, 'isWord': isWord, 'lc': base!=8? ofs-1:-1 };
		}

		default: {
			for(idx= fromIdx; idx<s.length; idx++) {
				let c= s.charAt(idx);
				if (c<'0' || c>'9') break;
			}
			if(idx==fromIdx)
				return {'v': -1, 'idx': idx, 'error': true};
			return {'v': parseInt(s.substring(fromIdx, idx),10)&size, 'idx': idx, 'error': false };
		}
	}

}

function resolveExpression(ctx, stack, pict, idx, doubleWord) {
	let result=0, item, op='', sign=false, mod=false, modSign=false, isWord=!!doubleWord,
		size= doubleWord ? 0xffffffff : 0xffff,
		err;

	function resolveOperation(pr) {

		if (sign) {
			pr= size&(-pr);
			sign= false;
		}

		if (mod) {
			isWord= false;
			if(mod=='>') {
				pr= (pr>>8)&0xff;
			} else {
				pr&= 0xff;
			}
			if(modSign)
				pr= size&(-pr);
			modSign= false;
		}

		switch(op) {
			case "+": result+= pr; break;
			case "-": result-= pr; break;
			case "*": result*= pr; break;
			case "/": {
				if(pr==0)
					return { v: -1, pict, error: 'division by zero', et: ET_C };
				result/= pr;
				break;
			}

			case "NEQ":
				result= result != pr;
				break;

			case "=":
				result= result == pr;
				break;

			case "":
				result= pr;
				break;

			default:
				return { v: -1, pict, error: `unknown operator "${op}"`, et: ET_P };
				// result= pr;
		}

		if(typeof result == "number")
			result&= size;
		op= '';
		return null;
	}

	for (let i=0; i<stack.length; i++) {
		item= stack[i];

		switch (item.type) {

			case "str":
				result= item.v;
				pict= result;
				break;

			case 'sign':
				sign= true;
				break;

			case 'mod':
				mod= item.v;
				modSign= sign;
				sign= false;
				break;

			case 'fn': {
				// console.log("fn", item);
				const rez= execFunction(ctx, item.v, item.parm);
				if(err= resolveOperation(rez))
					return err;
				break;
			}

			case 'num':
				if(item.isWord && !mod)
					isWord= true;
				if(err= resolveOperation(item.v))
					return err;
				break;

			case 'ident':
				const sym= getNSentry(ctx, item.v);
				if (!sym) {
					if(ctx.pass==1)
						return { v: mod ? 0xFF : 0xFFFF, idx, pict, error: false, isWord: !mod, undef: item.v };
					else
						return { v: -1, pict, error: true, isWord: true, undef: item.v, et: ET_C };
				}

				if(!mod && (sym.isWord || sym.pc>ctx.pc))
					isWord= true;
				if(err= resolveOperation(sym.v))
					return err;
				break;

			case 'paren':
				if(item.stack.length==0)
					return { v: -1, pict: item.pict+']', error: 'unexpected token "]"', et: ET_P };

				const exp= resolveExpression(ctx, item.stack, item.pict, idx, doubleWord);

				if(exp.error || exp.undef)
					return exp;
				if(exp.isWord && !mod)
					isWord= true;
				if(err= resolveOperation(exp.v))
					return err;

				break;

			case 'op':
				op= item.v;
				break;

			default:
				return { v: -1, pict, error: "invalid expression", isWord: true, undef: item.v, et: ET_S };
		}
	}

	return { v: result, pict, idx, error: false, isWord, pc: ctx.pc };
}

export function getIdentifier(s, fromIdx, stripColon) {

	let identifier= "";
	const matches= s.substring(fromIdx).match(/^[A-Z0-9_.]+:?/);

	// console.log("getIdentifier", s, fromIdx);

	if(matches) {
		identifier= matches[0];
		fromIdx+= identifier.length;
		if(stripColon)
			identifier= identifier.replace(":","");
	}

	// console.log("getIdentifier", s, fromIdx, identifier, matches[0]);

	return { v: identifier, idx: fromIdx };

	// let idx;
	// for(idx= fromIdx; idx<s.length; idx++) {
	// 	let c= s.charAt(idx);
	// 	if((c<'A' || c>'Z') && (c<'0' || c>'9') && c!='_')
	// 		break;
	// }

	// let end= idx;

	// if(stripColon && idx<s.length && s.charAt(idx)==':')
	// 	idx++;

	// const l= fromIdx + (end-fromIdx); //Math.min(end-fromIdx, 8);

	// return { v: s.substring(fromIdx, l), idx };
}

export function getExpression(ctx, s, doubleWord) {
	let idx=0, c, r, state=0, max=s.length, root=[], stack=root, parent=[], pict='', last='', lvl=0;

	function state0() {

		state++;

		switch(c) {
			case "-":
				pict+= c;
				stack.push({type: 'sign'});
				idx++;
				if(idx<max) {
					c=s.charAt(idx);
					if(c=='>'||c=='<') {
						stack.push({type: 'mod', v: c});
						idx++;
					}
				}
				return true;

			case ">":
			case "<":
				pict+= c;
				stack.push({type: 'mod', v: c});
				idx++;
				if(idx<max) {
					c= s.charAt(idx);
					if(c=='-') {
						pict+=c;
						stack.push({type: 'sign'});
						idx++;
					}
				}
				return true;

			default:
				return false;
		}

	}

	function state1() {

		state++;

		switch(c) {
			case '"':
			case "'": {

				const matches= s.slice(idx).match(/^"(.*?)"/);
				if(!matches)
					break;
				stack.push({type: 'str', v: matches[1]});
				idx+= matches[0].length;
				last= '';
				break;
			}

			case ".": {
				let value= ctx.pc;

				if(identifierCharacters.includes(s.charAt(idx+1))) {
					r= getIdentifier(s, idx+1);
					pict= "."+r.v;
					idx= r.idx;

					if(isFunction(r.v)) {
						last= "function "+r.v;

						if(s[idx]!="(") {
							return { v: -1, pict, error: 'missing (', et: ET_S };
						}

						const expr= getExpression(ctx, s.slice(idx), doubleWord);
						stack.push({type: 'fn', v: r.v, parm: expr.v});

						idx+= expr.idx;
						break;
					}

					const variable= getVarValue(ctx, r.v);
					if(variable.error)
						return variable;
					value= variable.v;
				} else {
					pict+= '.';
					idx++;
				}

				last= '';
				stack.push({type: 'num', v: value});
				break;
			}

			case "*":
				pict+= '*';
				stack.push({type: 'num', v: ctx.pc});
				idx++;
				last= '';
				break;

			case "[":
			case "(":
				pict+= c;
				parent[lvl]= stack;
				stack= [];
				parent[lvl++].push({type: 'paren', stack, pict});
				state= 0;
				idx++;
				return true;

			default:
				if(numberCharacters.includes(c)) {
					r= getNumber(ctx, s, idx, doubleWord);

					pict+= (r.lc && r.lc>0)?
						s.substring(idx, r.lc)+s.charAt(r.lc).toLowerCase()+s.substring(r.lc+1, r.idx):
						s.substring(idx, r.idx);

					// if (ns && ns.charAt(0)=='"') ns='\''+ns.substring(1,2);

					if(r.error) {
						if(!(c>='0' && c<='9') && r.idx-idx<=1 && r.idx<s.length)
							pict+= s.charAt(r.idx);
						if(c=='\'' && r.v>=0)
							return { v: -1, pict, error: 'illegal quantity', et: ET_P };
						return { v: -1, pict, error: 'number character expected', et: ET_P };
					}
					stack.push({type: 'num', v: r.v, 'isWord': !!r.isWord});
					idx= r.idx;
					last= 'figure';
					return false;
				}
				if(identifierCharacters.includes(c)) {
					r= getIdentifier(s, idx);
					pict+= r.v;

					if(ctx.opcodes[r.v]) {
						return {v: -1, pict, error: 'illegal identifier (opcode '+r.v+')', et: ET_P};
					}

					let isExpr= false;
					// if(ctx.pass==2 && getNSentry(ctx, "%locals%") && getNSentry(ctx, "%locals%").v) {
					if(ctx.pass==2) {
						// const loc= getNSentry(ctx, "%locals%").v.find(def => def.name == r.v);
						const loc= getNStempEntry(ctx, r.v);
						if(isExpr= !!loc) {
							stack.push({type: "num", v: loc.value});
							idx= r.idx;
							last= 'parm';
						}
					}

					if(!isExpr) {
						if(ctx.pass==2 && typeof getNSentry(ctx, r.v) == 'undefined')
							return { v: -1, pict, error: 'UEXP undefined symbol', undef: r.v, et: ET_C };

						stack.push({type: 'ident', v: r.v});
						idx= r.idx;
						last= 'name character';
					}
					return false;
				}

				pict+= c;
				return { v: -1, pict, error: 'number or identifier expected', et: ET_P };
		}

		return false;
	}

	function state2() {

		switch(c) {
			case "!":
				if(s.charAt(idx+1) == "=") {
					idx++;
					stack.push({type: 'op', v: "NEQ"});
					state= 0;
				}
				break;
			case "+":
			case "-":
			case "*":
			case "/":
			case "=":
				stack.push({type: 'op', v: c});
				state= 0;
				break;

			case "]":
			case ")":
				lvl--;
				if(lvl<0)
					return { v: -1, pict, error: 'non matching parenthesis "]"', et: ET_P };
				stack= parent[lvl];
				stack[stack.length-1].pict= pict;
				state= 2;
				break;

			default: {
				const message = (last? last+" or ":"") +"operator expected";
				return { v: -1, pict, error: 'unexpected token, '+message, et: ET_P };
			}

		}

		pict+= c;
		idx++;
		return false;
	}

// const ID= Math.floor((Math.random()*100000)).toString(16);
// console.log("--->", ID, s);

	while (idx < max) {
		c= s.charAt(idx);

// console.log("---", ID, {state, idx, c, s:s.slice(idx), root});

		switch(state) {
			case 0: {
				if(state0())
					continue;
				break;
			}
			case 1: {
				const op= state1();
				if(op === true)
					continue;
				if(op !== false)
					return op;
				break;
			}
			case 2: {
				const err= state2();
				if(err)
					return err;
				break;
			}
		}
	}

	if (state != 2)
		return { v: -1, pict, error: 'number or identifier expected', et: ET_P };
	if (lvl != 0)
		return { v: -1, pict, error: 'non matching parenthesis, "]" expected.', et: ET_S };

	return resolveExpression(ctx, root, pict, idx, doubleWord);
}
