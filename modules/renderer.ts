import { join_path, serve_dir, nano } from '../dependencies.ts';

const default_render_options = {
	base_directory: 'frontend',
	blocks_directory: 'blocks',
	pages_directory: 'pages',
	main_template: 'index.html',
};

export default function renderer() {
	const { base_directory, blocks_directory, pages_directory, main_template } = default_render_options;
	const current_base_directory = join_path(Deno.cwd(), base_directory);

	async function template(template_filename, template_data = {}) {
		template_data['$$page'] = join_path(current_base_directory, pages_directory, template_filename);

		const template_filepath = join_path(current_base_directory, main_template);
		const template_file = await Deno.readTextFile(template_filepath);
		const template_settings = {
			import_directory: join_path(current_base_directory, blocks_directory),
		};

		const template_rendered = await nano(template_file, template_data, template_settings);

		return new Response(template_rendered, {
			headers: new Headers({
				'content-type': 'text/html',
			}),
		});
	}

	async function static_directory(context) {
		const response = await serve_dir(context.request, {
			fsRoot: current_base_directory,
			quiet: true,
		});

		return response.status === 404 ? context.next() : response;
	}

	return {
		template,
		static: static_directory,
	};
}
