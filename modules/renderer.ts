import { join_path, serve_dir, nano } from '../dependencies.ts';
import { in_development } from './util.ts';

const default_renderer_options = {
	initial_data: {},
	page_prefix: 'page/',
	base_directory: 'frontend',
	blocks_directory: 'blocks',
	pages_directory: 'pages',
	main_template_filename: 'index.html',
	static_headers: {
		'cache-control': 'public, max-age=31536000, must-revalidate',
	},
};

export function Renderer(renderer_options) {
	const {
		base_directory,
		blocks_directory,
		pages_directory,
		main_template_filename,
		page_prefix,
		initial_data,
		static_headers,
	} = Object.assign(default_renderer_options, renderer_options);

	async function preload_templates() {
		if (in_development) {
			return {};
		}

		const template_map = {};

		for await (const template of Deno.readDir(join_path(Deno.cwd(), base_directory, blocks_directory))) {
			template_map[template.name] = await Deno.readTextFile(
				join_path(Deno.cwd(), base_directory, blocks_directory, template.name)
			);
		}

		for await (const template of Deno.readDir(join_path(Deno.cwd(), base_directory, pages_directory))) {
			template_map[page_prefix + template.name] = await Deno.readTextFile(
				join_path(Deno.cwd(), base_directory, pages_directory, template.name)
			);
		}

		template_map[main_template_filename] = await Deno.readTextFile(
			join_path(Deno.cwd(), base_directory, main_template_filename)
		);

		return template_map;
	}

	async function render_template(page_template_filename, template_data = {}) {
		let main_template_file =
			template_data[main_template_filename] ||
			(await Deno.readTextFile(join_path(Deno.cwd(), base_directory, main_template_filename)));

		let page_template_file =
			template_data[page_prefix + page_template_filename] ||
			(await Deno.readTextFile(join_path(Deno.cwd(), base_directory, pages_directory, page_template_filename)));

		const nano_template = main_template_file.replace('<template name="page"></template>', page_template_file);
		const nano_templates = await preload_templates();
		const nano_data = Object.assign(nano_templates, initial_data, template_data);
		const nano_options = {
			import_directory: join_path(Deno.cwd(), base_directory, blocks_directory),
		};

		return new Response(await nano(nano_template, nano_data, nano_options), {
			headers: new Headers({
				'content-type': 'text/html',
				'cache-control': 'no-cache',
			}),
		});
	}

	async function static_directory(context) {
		const response = await serve_dir(context.request, {
			fsRoot: join_path(Deno.cwd(), base_directory),
			quiet: true,
		});

		if (response.status > 400) {
			return context.next();
		}

		for (const key in static_headers) {
			response.headers.append(key, static_headers[key]);
		}

		return response;
	}

	return {
		render: render_template,
		static: static_directory,
	};
}
