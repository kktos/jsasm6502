
	function getAsmExpression(sym, ofs) {
		var s=sym[ofs];
		while(sym[ofs+1]=='$') s+=(sym[++ofs]||'')+(sym[++ofs]||'');
		var funcRE=/([A-Z]+)\(/, matches=funcRE.exec(s);
		while (matches) {
			var idx=matches.index,
				strIdx=idx+matches[1].length+1,
				s2=s.substring(strIdx);
			if(matches[1]!='ASC' && matches[1]!='LEN') {
				return {'error': 'unsupported function "'+matches[1]+'()"', 'pict': s.substring(0,strIdx), 'et': ET_S };
			}
			var	r = getBBCBasicString(s2, ')');
			if(r.error) return { 'pict': s.substring(0,strIdx)+r.ctx.pict, 'error': r.error };
			if(r.length==0) return { 'pict': s.substring(0,strIdx)+r.ctx.pict, 'error': 'string expected', 'et': ET_P };
			if(matches[1]=='ASC') {
				if(r.v.length>1) return {'error': 'illegal quantity, string too long', 'pict': s.substring(0,strIdx)+r.v, 'et': ET_P };
				s=s.substring(0,idx)+(r.v.length? r.v.charCodeAt(0)&0xff:0)+s.substring(strIdx+r.idx);
			}
			else if(matches[1]=='LEN') {
				s=s.substring(0,idx)+r.v.length+s.substring(strIdx+r.idx);
			}
			matches=funcRE.exec(s);
		};
		s=s.replace(/\(/g, '[').replace(/\)/g, ']');
		return {'pict':s, 'error': false, 'ofs': ofs};
	}
	function getBBCBasicString(s, stopChar) {
		s=s.replace(/^\s+/, '').replace(/\s+$/,'');
		var pict='', i=0, result='', c, mode=0, max=s.length, hasContent=false, chunk;
		function getArgNum(stopChar) {
			var chunk='', paren=0, quote=false;
			while (i<max) {
				c=s.charAt(i++);
				if(!quote && (c==stopChar && (c!=')' || paren==0))) break;
				if(c=='"') quote=!quote;
				if(quote || (c!=' ' && c!='\t')) chunk+=c;
				if(!quote) {
					if(c=='(') paren++;
					else if(c==')') paren--;
				}
			}
			if(c!=stopChar) return { 'pict': pict+chunk+c, 'v': result, 'error': '"'+stopChar+'" expected', 'et': ET_S};
			if(!chunk) return { 'pict': pict+stopChar, 'v': result, 'error': 'expression expected', 'et': ET_P};
			return { 'v': chunk, 'error': false }
		}
		while (i<max) {
			c=s.charAt(i++);
			pict+=c;
			if(mode==0) {
				if(c=='"') {
					mode=1;
					continue;
				}
				else if(c=='$') {
					chunk='';
					while (i<max) {
						c=s.charAt(i++);
						pict+=c;
						if((c<'A' || c>'Z') && c!='%') break;
						chunk+=c;
					}
					if(chunk=='P%') {
						let l= lastDlrPpct - ctx.pc;
						if(l>0) {
							for (let a= ctx.pc; a<lastDlrPpct; a++) result+=String.fromCharCode(ctx.code[a]);
						}
						hasContent=true;
						mode=2;
					}
					else return { pict, v: result, error: 'illegal identifier "'+chunk+'"', et: ET_P};
				}
				else if('&0123456789%@'.indexOf(c)>=0) {
					return { pict, v: result, error: 'type mismatch', et: ET_P};
				}
				else if(c>='A' && c<='Z') {
					chunk=c;
					while (i<max) {
						c=s.charAt(i++);
						if((c<'A' || c>'Z') && c!='$') break;
						pict+=c;
						chunk+=c;
					}
					if(c=='(') {
						chunk+=c;
						pict+=c;
						//if(i<max) i++;
					}
					if(chunk=='CHR$(') {
						var r=getArgNum(')');
						if(r.error) return r;
						r=getAsmExpression([r.v],0);
						if(r.error) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': e.et};
						r= getExpression(ctx, r.pict);
						if(r.error || r.undef) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': r.et};
						pict+=r.pict+')';
						result+=String.fromCharCode(r.v&0xff);
						hasContent=true;
						mode=2;
						if(i<max && (/^\s*[+-\/\*]\s*[&0123456789%@\(]/).test(s.substring(i))) break;
						continue;
					}
					else if(chunk=='STRING$(') {
						var r=getArgNum(',');
						if(r.error) return r;
						r=getAsmExpression([r.v],0);
						if(r.error) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': r.et};
						var rv= getExpression(ctx, r.pict);
						if(rv.error || rv.undef) {
							return { 'pict': pict+rv.pict, 'v': result, 'error': r.error, 'et': r.et};
						}
						if(ctx.pass==2 && rv.v<0) return { 'pict': pict+rv.v, 'v': result, 'error': 'illegal quantity', 'et': ET_P};
						pict+=rv.pict+',';
						var rs=getBBCBasicString(s.substring(i), ')');
						if(rs.error) {
							return { 'pict': pict+rs.pict, 'v': result, 'error': rs.error, 'et': rs.et};
						}
						pict+=rs.pict;
						for (var k=0, kn = Math.min(rv.v,0xff); k<kn; k++) result+=rs.v;
						i+=rs.idx;
						hasContent=true;
						mode=2;
						if(i<max && (/^\s*[+-\/\*]\s*[&0123456789%@\(]/).test(s.substring(i))) break;
						continue;
					}
					else if(c=='(') {
						return { 'pict': pict, 'v': result, 'error': 'unsupported function "'+chunk+')"', 'et': ET_S};
					}
					else {
						return { 'pict': pict, 'v': result, 'error': 'unrecognized token "'+chunk+'"', 'et': ET_P};
					}
				}
				else if(c!=' ' && c!='\t') {
					return { 'pict': pict, 'v': result, 'error': 'illegal character, quote or identifier expected', 'et': ET_P};
				}
			}
			else if(mode==1) {
				if(c=='"') {
					hasContent=true;
					mode=2;
					continue;
				}
				if(c.charCodeAt(0)>255 )return { 'pict': pict, 'v': result, 'error': 'illegal character', 'et': ET_P};
				result+=c;
			}
			if(mode==2 && i<max) {
				if(stopChar && c==stopChar) break;
				if(c=='+') {
					mode=0;
				}
				else if(c!=' ' && c!='\t') {
					return { 'pict': pict, 'v': result, 'error': 'illegal character, "+" expected.', 'et': ET_P};
				}
			}
		}
		if(mode==0 && hasContent) return { 'pict': pict, 'v': result, 'error': 'string expected', 'et': ET_P };
		if(mode==1) return { 'pict': pict, 'v': result, 'error': 'quote expected', 'et': ET_S };
		return { 'pict': pict, 'v': result,'error': false, 'idx': i };
	}
