import { TOKEN_TYPES_ENTRIES } from "./lexer.class.js";

export class Token {

	constructor(ttype= null) {
		this.type= ttype;
		this.value= null;
		this.text= null;
		this.posInLine= 0;
		this.hasSpaceBefore= false;
	}

	toString() {
		const ttype= TOKEN_TYPES_ENTRIES.find(([k,v])=>v==this.type)[0];
		return "Token <"+this.posInLine+":"+ttype+(this.value!=null ? " = "+this.value : "")+" - '"+this.text + "'>";
	}

	[Symbol.for('nodejs.util.inspect.custom')](depth, inspectOptions, inspect) {
		return this.toString();
	  }
}
