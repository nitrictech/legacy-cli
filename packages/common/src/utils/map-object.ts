

export function mapObject<T>(obj: Record<string, T>): (T & { name: string })[] {
	return Object.keys(obj).map(name => ({
		name,
		...obj[name]
	}));
}