import { Route, RouteContext } from './types.ts';
import { in_development_mode, config, app_meta, app_render } from './internal.ts';
import { mimetype } from './dependencies.ts';
import { read_templates } from './templates.ts';
import { browser_websocket_client } from './watch.ts';

export async function handle_get(route: Route, context: RouteContext): Promise<void> {
	const { request, response } = context;
	const { template_main, template_pages } = await read_templates();
	const { data, meta } = await route.controller(context);

	const render_data = {
		request,
		data: data || {},
		meta: app_meta(meta || {}, request.url),
	};

	const rendered_page = await app_render(template_pages[route.page], render_data);
	const rendered_app = await app_render(template_main.replace('<!--PAGE-->', rendered_page), render_data);

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
		const file = await Deno.readFile(config.frontend + url.pathname);
		const file_mimetype = mimetype(url.pathname) || 'text/plain';

		response.headers = new Headers({ 'content-type': file_mimetype });
		response.body = file;
	} catch (error) {
		response.status = error.name === 'NotFound' ? 404 : 500;
	}
}
