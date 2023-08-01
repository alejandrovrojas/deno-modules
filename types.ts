export type SanityClientOptions = {
	id: string;
	dataset: string;
	version: string;
	cdn?: boolean;
	token?: string;
};

export type SEOClient = {
	init: () => {};
	get: () => SeoOptions;
	update: () => SeoOptions;
};

export type SeoOptions = {
	title: string;
	description: string;
	origin: string;
	url: string;
	image: string;
	language: string;
	locale: string;
};

export type RendererOptions = {
	frontend_directory: string;
	import_directory: string;
	pages_directory: string;
	main_template_filename: string;
};

export type AutoreloadClient = {
	init: () => {};
	watch: () => {};
	middleware: RouteHandler;
};

export type AutoreloadOptions = {
	watch_directory: string;
};

export type ServerClientOptions = {
	port: number;
	seo: SeoOptions;
	data: Record<string, any>;
	functions: Record<string, any>;
	autoreload: AutoreloadOptions;
	renderer: RendererOptions;
};

export type UserServerClientOptions = Partial<{
	port: number;
	seo: Partial<SeoOptions>;
	data: Record<string, any>;
	functions: Record<string, any>;
	autoreload: Partial<AutoreloadOptions>;
	renderer: Partial<RendererOptions>;
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
