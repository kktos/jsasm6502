export function dbgStringList(list: string[]) {
	return list.map((line, idx) => {
		return `${(idx + 1).toString().padStart(3, " ")} : ${line.replaceAll("\t", " ")}`;
	});
}
