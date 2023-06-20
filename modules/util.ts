import { parse_flags } from '../dependencies.ts';

export const in_development = parse_flags(Deno.args).mode === 'development';

export function log(message: string, color: string = ''): void {
	console.log('%c' + `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] → ${message}`, `color:${color}`);
}

export function return_type_of(value: any): string {
	return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

export function format_image_url(source_image = {}, output_width = 800, monochrome = false) {
	const crop = {};
	const is_cropped = source_image.crop !== undefined;
	const output_quality = 80;
	const source_image_url = source_image.asset.url;
	const source_image_width = source_image.asset.metadata.dimensions.width;
	const source_image_height = source_image.asset.metadata.dimensions.height;

	if (is_cropped) {
		crop.y = Math.floor(source_image_height * source_image.crop.top);
		crop.x = Math.floor(source_image_width * source_image.crop.left);
		crop.width =
			Math.floor(source_image_width - source_image_width * source_image.crop.right) -
			Math.floor(source_image_width * source_image.crop.left);
		crop.height =
			Math.floor(source_image_height - source_image_height * source_image.crop.bottom) -
			Math.floor(source_image_height * source_image.crop.top);
	}

	const output_height = is_cropped
		? Math.floor(output_width / (crop.width / crop.height))
		: Math.floor(output_width / (source_image_width / source_image_height));

	const crop_parameter = is_cropped ? `&rect=${crop.x},${crop.y},${crop.width},${crop.height}` : '';
	const monochrome_parameter = monochrome ? '&sat=-100' : '';

	return {
		width: output_width,
		height: output_height,
		ratio: output_height / output_width,
		orientation: output_width > output_height ? 'landscape' : 'portrait',
		url_raw: source_image_url,
		url_lowres: `${source_image_url}?q=20&w=20&blur=20&${crop_parameter}${monochrome_parameter}&auto=format`,
		url: `${source_image_url}?q=${output_quality}&w=${output_width}${crop_parameter}${monochrome_parameter}&auto=format`,
		lqip: source_image.asset.metadata.lqip,
	};
}

export function convert_portable_text_to_node_tree(blocks) {
	const DEFAULT_MARKS = ['strong', 'em', 'underline', 'strike-through', 'code'];

	function join_adjacent_items(input_array, match_method = (a, b) => a === b) {
		const results = [];

		function find_adjacent_match(array, index, value) {
			const current = array[index];

			if (current && match_method(current, value)) {
				return [current].concat(find_adjacent_match(array, index + 1, array[index]));
			} else {
				return [];
			}
		}

		for (let i = 0; i < input_array.length; i += 1) {
			const joined_matches = find_adjacent_match(input_array, i, input_array[i]);

			if (joined_matches.length > 0) {
				results.push(joined_matches);
				i += joined_matches.length - 1;
			} else {
				results.push(input_array[i]);
			}
		}

		return results;
	}

	function exclude_studio_keys(object) {
		for (const key in object) {
			if (key.startsWith('_')) {
				delete object[key];
			}
		}

		return object;
	}

	function nest_children_by_mark(blocks, mark_defs = []) {
		const mark_match = (a, b) => a.marks[0] === b.marks[0];

		return join_adjacent_items(blocks, mark_match).map(group => {
			const [span] = group;
			const [mark] = span.marks;

			const mark_name = mark || 'text';
			const mark_def = mark_defs.find(def => def._key === mark_name);

			for (const span of group) {
				span.marks.shift();
			}

			const result = {
				type: mark_def ? mark_def._type : mark_name,
				content: mark_name === 'text' ? span.text : nest_children_by_mark(group, mark_defs),
			};

			if (mark_def) {
				result.properties = exclude_studio_keys(mark_def);
			}

			return result;
		});
	}

	function nest_list_items_by_level(list_group) {
		const level_match = (a, b) => a.level > 1 && a.level === b.level;

		return join_adjacent_items(list_group, level_match).map(list_item_group => {
			if (Array.isArray(list_item_group)) {
				const [block] = list_item_group;
				const { level, listItem } = block;

				for (const item_block of list_item_group) {
					item_block.level -= 1;
				}

				if (level > 1) {
					return {
						type: 'list_item',
						content: [
							{
								type: listItem + '_list',
								content: nest_list_items_by_level(list_item_group),
							},
						],
					};
				}

				return list_item_group.map(item => {
					return {
						type: 'list_item',
						content: nest_children_by_mark(item.children, item.markDefs),
					};
				});
			} else {
				return {
					type: 'list_item',
					content: nest_children_by_mark(list_item_group.children, list_item_group.markDefs),
				};
			}
		});
	}

	function group_list_blocks(blocks) {
		const list_match = (a, b) => {
			const is_block = a._type === 'block' && b._type === 'block';
			const is_list = a.listItem && b.listItem && a.listItem === b.listItem;
			return is_block && is_list;
		};

		return join_adjacent_items(blocks, list_match);
	}

	function map_all_block_types(blocks) {
		return group_list_blocks(blocks).map(block_group => {
			if (Array.isArray(block_group)) {
				const [first] = block_group;
				const { listItem } = first;

				return {
					type: listItem + '_list',
					content: nest_list_items_by_level(block_group),
				};
			}

			if (block_group._type === 'block') {
				return {
					type: block_group.style === 'normal' ? 'paragraph' : block_group.style,
					content: nest_children_by_mark(block_group.children, block_group.markDefs),
				};
			}

			return {
				type: block_group._type,
				properties: exclude_studio_keys(block_group),
			};
		});
	}

	return map_all_block_types(structuredClone(blocks));
}
