export interface NitricEntrypoints {
	[key: string]: {
		name: string;
		type: "site" | "api";
	};
}