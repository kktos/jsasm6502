
export const 	ET_S= 'syntax error',
				ET_P= 'parse error',
				ET_C= 'compile error';

let delayedLine= "";

export function logError(ctx, e, message, isWarning) {
	// if(!ctx.wannaOutput)
	// 	return;

	if(delayedLine) {
		ctx.listing+= delayedLine;
		delayedLine= "";
	}

	const lines= message.split('\n');
	const prefix = isWarning ? '####  ':'****  ';
	const separator = isWarning ? ' ## ':' ** ';
	let s;

	while (ctx.addrStr.length<6)
		ctx.addrStr+=' ';

	if (ctx.pass==2) {
		s= ctx.addrStr + ctx.asm;
		if (ctx.asm.length<ctx.asmSpace.length) s+= ctx.asmSpace.substr(ctx.asm.length);
	}
	else {
		ctx.srcLnStr=''+ctx.srcLineNumber;
		while (ctx.srcLnStr.length<4) ctx.srcLnStr=' '+ctx.srcLnStr;
		s= ctx.srcLnStr+'  '+ctx.addrStr+ctx.pass1Spc;
	}

	s+= ctx.anonMark? ctx.anonMark+' ':'  ';

	while (ctx.labelStr.length<9)
		ctx.labelStr+=' ';

	s+= ctx.labelStr+' '+ctx.pict;
	ctx.listing+= s;

	if(isWarning && ctx.comment) {
		if (ctx.pict) ctx.listing+=' ';
		ctx.listing+= ctx.comment;
		ctx.comment='';
	}

	let errMsg= '\n' + prefix + e + separator + lines[0] + '\n';
	for(let i=1; i<lines.length; i++) {
		errMsg+= prefix+lines[i]+'\n';
	}

	errMsg+= "in "+ctx.filename+" line "+ctx.srcLineIdx+"\n";

	ctx.listing+= errMsg;
	if(!ctx.options.listing)
		console.error("\n"+s+errMsg);

	if(isWarning) {
		ctx.addrStr= ctx.asm= ctx.pict='';
		ctx.labelStr= '         ';
		ctx.listing+= "\n";
	}

	ctx.anonMark='';
}

export function logLine(ctx, wantCleanLine) {
	if(ctx.wannaOutput) {
		if(delayedLine) {
			ctx.listing+= delayedLine;
			delayedLine= "";
		}
		
		let s;
		while (ctx.addrStr.length<6) ctx.addrStr+=' ';
		if (ctx.pass==2) {
			s= ctx.addrStr + ctx.asm;
			if (ctx.asm.length<ctx.asmSpace.length)
				s+= ctx.asmSpace.substr(ctx.asm.length);
		}
		else {
			ctx.srcLnStr=''+ctx.srcLineNumber;
			while (ctx.srcLnStr.length<4) ctx.srcLnStr=' '+ctx.srcLnStr;
			s= ctx.srcLnStr+'  '+ctx.addrStr+ctx.pass1Spc;
		}
		s+= ctx.anonMark? ctx.anonMark+' ':'  ';
		while (ctx.labelStr.length<9) ctx.labelStr+=' ';
		s+= ctx.labelStr;
		if(wantCleanLine) {
			if(ctx.listing.match(/\n\s+$/))
				ctx.listing= ctx.listing.replace(/\n\s+$/, "")+"\n";
		}
		ctx.listing+= s+' '+ctx.pict;
		if (ctx.comment) {
			if (ctx.pict) ctx.listing+=' ';
			ctx.listing+= ctx.comment;
			ctx.comment= '';
		}
		ctx.listing+= '\n';
	}

	ctx.addrStr= ctx.asm= ctx.pict='';
	ctx.labelStr= '         ';
	ctx.anonMark= '';
}

export function logMsg(ctx, msg, wannaDelay= false) {
	if(wannaDelay) {
		delayedLine+= msg+"\n";
		return;
	}

	if(!ctx.wannaOutput)
		return;

	if(delayedLine) {
		ctx.listing+= delayedLine;
		delayedLine= "";
	}
	ctx.listing+= msg;
}
