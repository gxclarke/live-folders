import { vi } from "vitest";
import type { Browser } from "webextension-polyfill";

export interface MockStorage {
	data: Record<string, unknown>;
	local: {
		get: ReturnType<typeof vi.fn>;
		set: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
		clear: ReturnType<typeof vi.fn>;
	};
	sync: {
		get: ReturnType<typeof vi.fn>;
		set: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
		clear: ReturnType<typeof vi.fn>;
	};
}

export interface MockRuntime {
	id: string;
	sendMessage: ReturnType<typeof vi.fn>;
	onMessage: {
		addListener: ReturnType<typeof vi.fn>;
		removeListener: ReturnType<typeof vi.fn>;
		hasListener: ReturnType<typeof vi.fn>;
	};
	getManifest: ReturnType<typeof vi.fn>;
	getURL: ReturnType<typeof vi.fn>;
}

export interface MockBookmarks {
	create: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	remove: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	getTree: ReturnType<typeof vi.fn>;
	search: ReturnType<typeof vi.fn>;
}

export interface MockIdentity {
	launchWebAuthFlow: ReturnType<typeof vi.fn>;
	getRedirectURL: ReturnType<typeof vi.fn>;
}

export interface MockAlarms {
	create: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	getAll: ReturnType<typeof vi.fn>;
	onAlarm: {
		addListener: ReturnType<typeof vi.fn>;
		removeListener: ReturnType<typeof vi.fn>;
	};
}

export interface MockNotifications {
	create: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	getAll: ReturnType<typeof vi.fn>;
	onClicked: {
		addListener: ReturnType<typeof vi.fn>;
		removeListener: ReturnType<typeof vi.fn>;
	};
}

export function createBrowserMocks(): Partial<Browser> {
	const storageData: Record<string, unknown> = {};

	const storage: MockStorage = {
		data: storageData,
		local: {
			get: vi.fn((keys?: string | string[] | null) => {
				if (!keys) return Promise.resolve(storageData);
				if (typeof keys === "string") {
					return Promise.resolve({ [keys]: storageData[keys] });
				}
				const result: Record<string, unknown> = {};
				for (const key of keys) {
					if (key in storageData) {
						result[key] = storageData[key];
					}
				}
				return Promise.resolve(result);
			}),
			set: vi.fn((items: Record<string, unknown>) => {
				Object.assign(storageData, items);
				return Promise.resolve();
			}),
			remove: vi.fn((keys: string | string[]) => {
				const keyArray = Array.isArray(keys) ? keys : [keys];
				for (const key of keyArray) {
					delete storageData[key];
				}
				return Promise.resolve();
			}),
			clear: vi.fn(() => {
				for (const key of Object.keys(storageData)) {
					delete storageData[key];
				}
				return Promise.resolve();
			}),
		},
		sync: {
			get: vi.fn((keys?: string | string[] | null) => {
				if (!keys) return Promise.resolve(storageData);
				if (typeof keys === "string") {
					return Promise.resolve({ [keys]: storageData[keys] });
				}
				const result: Record<string, unknown> = {};
				for (const key of keys) {
					if (key in storageData) {
						result[key] = storageData[key];
					}
				}
				return Promise.resolve(result);
			}),
			set: vi.fn((items: Record<string, unknown>) => {
				Object.assign(storageData, items);
				return Promise.resolve();
			}),
			remove: vi.fn((keys: string | string[]) => {
				const keyArray = Array.isArray(keys) ? keys : [keys];
				for (const key of keyArray) {
					delete storageData[key];
				}
				return Promise.resolve();
			}),
			clear: vi.fn(() => {
				for (const key of Object.keys(storageData)) {
					delete storageData[key];
				}
				return Promise.resolve();
			}),
		},
	};

	const runtime: MockRuntime = {
		id: "test-extension-id",
		sendMessage: vi.fn(() => Promise.resolve()),
		onMessage: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
			hasListener: vi.fn(() => false),
		},
		getManifest: vi.fn(() => ({
			name: "Live Folders",
			version: "1.0.0",
			manifest_version: 3,
		})),
		getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
	};

	const bookmarks: MockBookmarks = {
		create: vi.fn(() => Promise.resolve({ id: "test-bookmark-id", title: "Test" })),
		update: vi.fn(() => Promise.resolve({ id: "test-bookmark-id", title: "Updated" })),
		remove: vi.fn(() => Promise.resolve()),
		get: vi.fn(() => Promise.resolve([{ id: "test-bookmark-id", title: "Test" }])),
		getTree: vi.fn(() => Promise.resolve([{ id: "0", title: "Root", children: [] }])),
		search: vi.fn(() => Promise.resolve([])),
	};

	const identity: MockIdentity = {
		launchWebAuthFlow: vi.fn(() => Promise.resolve("https://redirect.url?code=test-code")),
		getRedirectURL: vi.fn(() => "https://test-extension.chromiumapp.org/"),
	};

	const alarms: MockAlarms = {
		create: vi.fn(),
		clear: vi.fn(() => Promise.resolve(true)),
		get: vi.fn(() => Promise.resolve(undefined)),
		getAll: vi.fn(() => Promise.resolve([])),
		onAlarm: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
	};

	const notifications: MockNotifications = {
		create: vi.fn(() => Promise.resolve("test-notification-id")),
		clear: vi.fn(() => Promise.resolve(true)),
		getAll: vi.fn(() => Promise.resolve({})),
		onClicked: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
	};

	return {
		storage: storage as unknown as Browser["storage"],
		runtime: runtime as unknown as Browser["runtime"],
		bookmarks: bookmarks as unknown as Browser["bookmarks"],
		identity: identity as unknown as Browser["identity"],
		alarms: alarms as unknown as Browser["alarms"],
		notifications: notifications as unknown as Browser["notifications"],
	};
}

export function resetBrowserMocks(mocks: Partial<Browser>): void {
	if (mocks.storage) {
		const storage = mocks.storage as unknown as MockStorage;
		for (const key of Object.keys(storage.data)) {
			delete storage.data[key];
		}
		vi.clearAllMocks();
	}
}
