import { useMediaQuery } from "@mui/material";
import { useEffect, useState } from "react";
import { StorageManager } from "@/services/storage";
import { Logger } from "@/utils/logger";

const logger = new Logger("useTheme");

export function useTheme() {
	// Detect system color scheme preference
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

	// Track theme setting from storage
	const [themeSetting, setThemeSetting] = useState<"light" | "dark" | "auto">("auto");

	// Load theme setting from storage
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const storage = StorageManager.getInstance();
				const settings = await storage.getSettings();
				setThemeSetting(settings.theme);
				logger.debug("Theme setting loaded", { theme: settings.theme });
			} catch (err) {
				logger.error("Failed to load theme setting", err as Error);
			}
		};

		loadTheme();

		// Listen for storage changes to update theme in real-time
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName === "local" && changes.settings?.newValue?.theme) {
				const newTheme = changes.settings.newValue.theme as "light" | "dark" | "auto";
				setThemeSetting(newTheme);
				logger.debug("Theme setting updated", { theme: newTheme });
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);

		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	// Determine actual theme mode based on setting
	const themeMode = themeSetting === "auto" ? (prefersDarkMode ? "dark" : "light") : themeSetting;

	return themeMode;
}
