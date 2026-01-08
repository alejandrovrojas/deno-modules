import { ServerClientConfig, SEOClient, SEOConfig } from '../types.ts';
import * as Utilities from '../util.ts';
import * as Env from '../env.ts';

import { nano, join_path, path_exists } from '../dependencies.ts';

export function Renderer(config: ServerClientConfig, seo_client: SEOClient) {
	const { frontend_directory, components_directory, pages_directory, templates_directory, main_template_filename } =
		config.renderer;

	const base_server_render_data = Object.assign(
		{
			$seo: seo_client.get(),
		},
		config.data,
		config.functions
	);

	function init() {
		if (Env.development_mode) {
			// ...
		} else {
			cache_main_template();
			cache_components_directory();
			cache_pages_directory();
			cache_templates_directory();
		}
	}

	async function cache_main_template() {
		const index_file_path = join_path(Deno.cwd(), frontend_directory, main_template_filename);

		if (await path_exists(index_file_path)) {
			base_server_render_data[`$cache/${main_template_filename}`] = await read_file(index_file_path);
		}
	}

	async function cache_components_directory() {
		const path = join_path(Deno.cwd(), frontend_directory, components_directory);
		cache_files(path);
	}

	async function cache_pages_directory() {
		const path = join_path(Deno.cwd(), frontend_directory, pages_directory);
		cache_files(path, '$cache/pages/');
	}

	async function cache_templates_directory() {
		const path = join_path(Deno.cwd(), frontend_directory, templates_directory);
		cache_files(path, '$cache/templates/');
	}

	async function cache_files(directory_path: string, cache_prefix: string = '') {
		if (await path_exists(directory_path)) {
			for await (const directory_item of Deno.readDir(directory_path)) {
				if (directory_item.isFile && !directory_item.name.startsWith('.')) {
					const item_path = join_path(directory_path, directory_item.name);

					base_server_render_data[cache_prefix + directory_item.name] = await read_file(item_path);

					Utilities.log(`stored in cache: ${cache_prefix + directory_item.name}`, 'renderer');
				} else if (directory_item.isDirectory) {
					const subdirectory_path = join_path(directory_path, directory_item.name);

					await cache_files(subdirectory_path, `${cache_prefix}${directory_item.name}/`);
				}
			}
		}
	}

	async function read_file(filepath: string): Promise<string> {
		return Deno.readTextFile(filepath);
	}

	async function render_string(input_string: string, input_data: Record<string, unknown>): Promise<string> {
		const nano_data = Object.assign({}, base_server_render_data, input_data);
		const nano_options = {
			import_directory: join_path(Deno.cwd(), frontend_directory, components_directory),
		};

		if (Env.development_mode) {
			Utilities.log(`${Object.keys(nano_data).sort().join(', ')}`, 'render context');
		}

		return await nano(input_string, nano_data, nano_options);
	}

	async function render_component(
		component_filename: string,
		component_render_data: Record<string, unknown> = {},
		page_response_options = {
			status: 200,
			headers: {}
		}
	): Promise<Response> {
		async function return_component_file() {
			const component_cache_key = component_filename;
			const is_component_cached = base_server_render_data.hasOwnProperty(component_cache_key);

			return is_component_cached
				? base_server_render_data[component_cache_key]
				: read_file(join_path(Deno.cwd(), frontend_directory, components_directory, component_filename));
		}

		try {
			const component_file_string = await return_component_file();
			const rendered_component = await render_string(component_file_string, component_render_data);

			const response_status = page_response_options.status || 200;
			const response_headers = page_response_options.headers || {};

			return return_html_response(rendered_component, response_status, response_headers);
		} catch (error) {
			console.error(error);
			return return_error_response(error.message);
		}
	}

	async function render_page(
		page_filename: string,
		page_render_data: Record<string, unknown>,
		page_seo_options: SEOConfig,
		page_response_options = {
			status: 200,
			headers: {}
		}
	): Promise<Response> {
		async function return_template_file() {
			const template_cache_key = `$cache/${main_template_filename}`;
			const is_main_template_cached = base_server_render_data.hasOwnProperty(template_cache_key);

			return is_main_template_cached
				? base_server_render_data[template_cache_key]
				: read_file(join_path(Deno.cwd(), frontend_directory, main_template_filename));
		}

		async function return_page_path() {
			const page_cache_key = `$cache/pages/${page_filename}`;
			const is_page_cached = base_server_render_data.hasOwnProperty(page_cache_key);

			return is_page_cached
				? page_cache_key
				: join_path(Deno.cwd(), frontend_directory, pages_directory, page_filename);
		}

		try {
			const template_string = await return_template_file();

			const template_data = Object.assign(page_render_data || {}, {
				$seo: seo_client.update(page_seo_options || {}),
				$server: {
					page: await return_page_path(),
				},
			});

			const rendered_page = await render_string(template_string, template_data);
			const response_status = page_response_options.status || 200;
			const response_headers = page_response_options.headers || {};

			return return_html_response(rendered_page, response_status, response_headers);
		} catch (error) {
			console.error(error);
			return return_error_response(error.message);
		}
	}

	async function render_template(
		template_filename: string,
		template_render_data: Record<string, unknown> = {},
		page_response_options = {
			status: 200,
			headers: {}
		}
	): Promise<Response> {
		async function return_template_file() {
			const template_cache_key = `$cache/templates/${template_filename}`;
			const is_template_cached = base_server_render_data.hasOwnProperty(template_cache_key);

			return is_template_cached
				? base_server_render_data[template_cache_key]
				: read_file(join_path(Deno.cwd(), frontend_directory, templates_directory, template_filename));
		}

		try {
			const template_file_string = await return_template_file();
			const rendered_template = await render_string(template_file_string, template_render_data);

			const response_status = page_response_options.status || 200;
			const response_headers = page_response_options.headers || {};

			return return_html_response(rendered_template, response_status, response_headers);
		} catch (error) {
			console.error(error);
			return return_error_response(error.message);
		}
	}

	function return_json_response(repsonse_data: unknown, status: number = 200, headers: Record<string, string> = {}): Response {
		return new Response(JSON.stringify(repsonse_data), {
			status: status,
			headers: new Headers({
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'no-cache',
				...headers,
			}),
		});
	}

	function return_html_response(response_text: string, status: number = 200, headers: Record<string, string> = {}): Response {
		return new Response(response_text, {
			status: status,
			headers: new Headers({
				'content-type': 'text/html; charset=utf-8',
				'cache-control': 'no-cache',
				...headers,
			}),
		});
	}

	function return_error_response(response_text: string, status: number = 500, headers: Record<string, string> = {}): Response {
		return new Response(response_text, {
			status: status,
			headers: new Headers({
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'no-cache',
				...headers,
			}),
		});
	}

	return {
		init,
		return_error_response,
		return_html_response,
		return_json_response,
		render_string,
		render_page,
		render_component,
		render_template,
	};
}
