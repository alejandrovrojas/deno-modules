import { debounce } from '../dependencies.ts';
import { in_development } from './util.ts'

const default_watch_options = {
	path: './frontend',
};

export default function autoreload() {
	const websockets: Set<WebSocket> = new Set();
	const websocket_endpoint = '/__autoreload';
	const websocket_reload_event = 'emit_reload';
	const websocket_reconnection_delay = 1000;
	const websocket_debounce_delay = 80;
	const websocket_client = `
		<script>
			(() => {
				let socket = null;
				let reconnection_timer = null;
				const websocket_url = window.location.origin.replace('http', 'ws') + '${websocket_endpoint}';
				function refresh_client() {
					window.location.reload();
				}
				function connect_websocket(callback) {
					if (socket) {
						socket.close();
					}
					socket = new WebSocket(websocket_url);
					socket.addEventListener('open', callback);
					socket.addEventListener('message', event => {
						if (event.data === '${websocket_reload_event}') {
							refresh_client();
						}
					});
					socket.addEventListener('close', () => {
						clearTimeout(reconnection_timer);
						reconnection_timer = setTimeout(() => {
							connect_websocket(refresh_client);
						}, ${websocket_reconnection_delay});
					});
				}
				connect_websocket();
			})();
		</script>`;

	function matches_html(html_template: string) {
		return /<(html|!doctype html)>/gi.test(html_template);
	}

	function inject_client(html_template: string): string {
		return html_template.replace('<head>', '<head>\n' + websocket_client);
	}

	async function middleware(context, next) {
		const url = new URL(context.request.url);

		if (in_development) {
			return next(context);
		}

		if (url.pathname === websocket_endpoint) {
			const { socket, response } = Deno.upgradeWebSocket(context.request);

			socket.onclose = () => {
				websockets.delete(socket);
			};

			websockets.add(socket);

			return response;
		} else {
			const next_response = await next(context);
			const next_response_text = await next_response.clone().text();

			if (matches_html(next_response_text)) {
				return new Response(inject_client(next_response_text), {
					headers: next_response.headers,
				});
			}

			return next_response;
		}
	}

	async function watch(options = default_watch_options) {
		if (!in_development) {
			return;
		}

		const watcher = Deno.watchFs(options.path);

		const trigger_websocket_response = debounce(() => {
			websockets.forEach(socket => {
				socket.send(websocket_reload_event);
			});
		}, websocket_debounce_delay);

		for await (const event of watcher) {
			if (!['any', 'access'].includes(event.kind)) {
				trigger_websocket_response();
			}
		}
	}

	return {
		watch,
		middleware,
	};
}
