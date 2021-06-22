import { ListrBaseClassOptions, ListrDefaultRendererValue, ListrFallbackRendererValue } from "listr2";

export const DEFAULT_LISTR_OPTIONS: ListrBaseClassOptions<any, ListrDefaultRendererValue, ListrFallbackRendererValue> = {
	rendererOptions: {
		collapseErrors: false,
	}
};