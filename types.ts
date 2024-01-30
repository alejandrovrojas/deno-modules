export type LRUCacheItem = {
	timestamp: number;
	value: unknown;
};

export type LRUCacheConfig = {
	max_items: number;
 	max_age: number;
};

export type SanityClientConfig = {
	id: string;
	dataset: string;
	version: string;
	cdn?: boolean;
	token?: string;
};

export type SEOClient = {
	init: () => {};
	get: () => SEOConfig;
	update: (config: SEOConfig) => SEOConfig;
};

export type SEOConfig = {
	title: string;
	description: string;
	origin: string;
	url: string;
	image: string;
	language: string;
	locale: string;
};

export type RendererConfig = {
	frontend_directory: string;
	components_directory: string;
	pages_directory: string;
	templates_directory: string;
	main_template_filename: string;
};

export type AutoreloadClient = {
	init: () => {};
	watch: () => {};
	middleware: RouteHandler;
};

export type AutoreloadConfig = {
	enabled: boolean;
	watch_directory: string;
};

export type ServerClientConfig = {
	port: number;
	seo: SEOConfig;
	data: Record<string, any>;
	functions: Record<string, any>;
	autoreload: AutoreloadConfig;
	renderer: RendererConfig;
};

export type UserServerClientConfig = Partial<{
	port: number;
	seo: Partial<SEOConfig>;
	data: Record<string, any>;
	functions: Record<string, any>;
	autoreload: Partial<AutoreloadConfig>;
	renderer: Partial<RendererConfig>;
}>;

export type DenoServeHandler = (request: Request, info: Record<string, unknown>) => Response | Promise<Response>;

export type RouteObject = {
	method: 'GET' | 'POST';
	path: string;
	handlers: RouteHandler[];
};

export type RouteHandler = (context: RouteContext, next?: RouteHandler) => Promise<Response>;

export type RouteContext = {
	request: Request;
	info: Record<string, unknown>;
	params: Record<string, string>;
	search_params: Record<string, string>;
};
