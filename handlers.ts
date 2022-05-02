import { Route, RouteContext } from './types.ts';
import { mimetype, render } from './dependencies.ts';
import { in_development_mode } from './internal.ts';
import { browser_websocket_client } from './watcher.ts';

export async function handle_get(route: Route, context: RouteContext): Promise<void> {
	function process_app_meta(route_meta: object, route_url: URL) {
		const computed_meta = {
			url: NANONETT.config.origin + route_url.pathname,
		};

		return {
			...NANONETT.meta,
			...route_meta,
			...computed_meta,
		};
	}

	function configured_app_renderer(template: string, data: object) {
		const render_options = {
			show_comments: false,
			import_path: NANONETT.config.components,
		};

		return render(template, data, NANONETT.methods, render_options);
	}

	async function read_templates() {
		const template_main: string = await Deno.readTextFile(NANONETT.config.template);
		const template_pages: Record<string, string> = {};

		for await (const page of Deno.readDir(NANONETT.config.pages)) {
			template_pages[page.name] = await Deno.readTextFile(`${NANONETT.config.pages}/${page.name}`);
		}

		return { template_main, template_pages };
	}

	const { request, response } = context;
	const { template_main, template_pages } = await read_templates();
	const { data, meta } = await route.controller(context);

	const render_data = {
		request,
		data: data || {},
		meta: process_app_meta(meta || {}, request.url),
	};

	const rendered_page = await configured_app_renderer(template_pages[route.page], render_data);
	const rendered_app = await configured_app_renderer(template_main.replace('<!--PAGE-->', rendered_page), render_data);

	if (in_development_mode) {
		response.body = rendered_app.replace('<head>', '<head>\n' + browser_websocket_client);
	} else {
		response.body = rendered_app;
	}
}

export async function handle_post(route: Route, context: RouteContext): Promise<void> {
	const { response } = context;
	const { data } = await route.controller(context);

	response.headers = new Headers({ 'content-type': 'application/json' });
	response.body = JSON.stringify(data);
}

export async function handle_static(context: RouteContext): Promise<void> {
	const { request, response } = context;
	const url = new URL(request.url.href);

	try {
		const file = await Deno.readFile(NANONETT.config.frontend + url.pathname);
		const file_mimetype = mimetype(url.pathname) || 'text/plain';

		response.headers = new Headers({ 'content-type': file_mimetype });
		response.body = file;
	} catch (error) {
		response.status = error.name === 'NotFound' ? 404 : 500;
	}
}
