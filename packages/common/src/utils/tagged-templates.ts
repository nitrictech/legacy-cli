export function block(strings: TemplateStringsArray, ...keys: string[]) {
	return `\n${strings.reduce((result, str, i) => result + keys[i - 1] + str)}\n`;
}
