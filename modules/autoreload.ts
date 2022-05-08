import { debounce } from '../deps.ts';
import { log, in_development } from '../util.ts';

export function Autoreload(setup: Record<string, any>) {
	const { fullpath } = setup.methods;

	const websockets: Set<WebSocket> = new Set();
	const websocket_endpoint = '/__autoreload';
	const websocket_reload_event = 'emit_reload';
	const websocket_reconnection_delay = 1000;
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

	function inject(html_template: string): string {
		return html_template.replace('<head>', '<head>\n' + websocket_client);
	}

	function route(router_instance: any): void {
		if (in_development) {
			router_instance.get(websocket_endpoint, async (context: any) => {
				const socket = await context.upgrade();

				websockets.add(socket);
				// log(`added socket: ${websockets.size}`);

				socket.onclose = () => {
					websockets.delete(socket);
					// log(`deleted socket: ${websockets.size}`);
				};
			});
		}
	}

	async function start(): Promise<void> {
		if (in_development) {
			const watcher = Deno.watchFs(fullpath([setup.config.framework.source]));
			const trigger_websocket_response = debounce(() => {
				websockets.forEach(socket => {
					log(`reloaded page`, 'yellow');
					socket.send(websocket_reload_event);
				});
			}, 80);

			for await (const event of watcher) {
				if (!['any', 'access'].includes(event.kind)) {
					trigger_websocket_response();
				}
			}
		}
	}

	return {
		inject,
		route,
		start,
	};
}
