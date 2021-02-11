
interface ConvertOptions {
  from: string;
  to: string;
  source: string | object;
}

declare module 'api-spec-converter' {
	export function convert(opts: ConvertOptions): Promise<any>;
}
