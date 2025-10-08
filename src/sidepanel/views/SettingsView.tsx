import { Refresh, Save } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Divider,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormLabel,
	MenuItem,
	Select,
	Slider,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { StorageManager } from "@/services/storage";
import type { ExtensionSettings } from "@/types/storage";
import { DEFAULT_SETTINGS } from "@/types/storage";
import { Logger } from "@/utils/logger";

const logger = new Logger("SettingsView");

// Convert milliseconds to minutes for display
const msToMinutes = (ms: number) => Math.round(ms / 60000);
const minutesToMs = (minutes: number) => minutes * 60000;

export function SettingsView() {
	const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Load settings on mount
	useEffect(() => {
		const loadSettings = async () => {
			try {
				setLoading(true);
				setError(null);

				const storage = StorageManager.getInstance();
				const currentSettings = await storage.getSettings();
				setSettings(currentSettings);

				logger.info("Settings loaded successfully");
			} catch (err) {
				logger.error("Failed to load settings", err as Error);
				setError(err instanceof Error ? err.message : "Failed to load settings");
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, []);

	// Save settings
	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccessMessage(null);

			const storage = StorageManager.getInstance();
			const result = await storage.saveSettings(settings);

			if (!result.success) {
				throw new Error(result.error || "Failed to save settings");
			}

			logger.info("Settings saved successfully", settings);
			setSuccessMessage("Settings saved successfully!");

			// Clear success message after 3 seconds
			setTimeout(() => setSuccessMessage(null), 3000);

			// Update sync interval in background scheduler
			await chrome.runtime.sendMessage({
				type: "UPDATE_SYNC_INTERVAL",
				interval: settings.syncInterval,
			});
		} catch (err) {
			logger.error("Failed to save settings", err as Error);
			setError(err instanceof Error ? err.message : "Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	// Reset to defaults
	const handleReset = () => {
		setSettings(DEFAULT_SETTINGS);
		setSuccessMessage("Settings reset to defaults (not saved yet)");
		setTimeout(() => setSuccessMessage(null), 3000);
	};

	// Update sync interval
	const handleSyncIntervalChange = (_event: Event, value: number | number[]) => {
		const minutes = Array.isArray(value) ? value[0] : value;
		setSettings((prev) => ({ ...prev, syncInterval: minutesToMs(minutes) }));
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
				<Typography>Loading settings...</Typography>
			</Box>
		);
	}

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="h5" component="h1" gutterBottom>
					Settings
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Configure extension behavior and preferences
				</Typography>
			</Box>

			{error && (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{successMessage && (
				<Alert severity="success" onClose={() => setSuccessMessage(null)}>
					{successMessage}
				</Alert>
			)}

			{/* Sync Settings */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Sync Settings
					</Typography>

					<FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
						<FormLabel>Sync Interval: {msToMinutes(settings.syncInterval)} minutes</FormLabel>
						<Slider
							value={msToMinutes(settings.syncInterval)}
							onChange={handleSyncIntervalChange}
							min={1}
							max={60}
							step={1}
							marks={[
								{ value: 1, label: "1m" },
								{ value: 15, label: "15m" },
								{ value: 30, label: "30m" },
								{ value: 60, label: "1h" },
							]}
							valueLabelDisplay="auto"
							valueLabelFormat={(value) => `${value}m`}
						/>
						<Typography variant="caption" color="text.secondary">
							How often to automatically sync providers
						</Typography>
					</FormControl>

					<FormControl fullWidth sx={{ mb: 2 }}>
						<FormLabel>Max Items Per Provider</FormLabel>
						<TextField
							type="number"
							value={settings.maxItemsPerProvider}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									maxItemsPerProvider: Number.parseInt(e.target.value, 10) || 100,
								}))
							}
							inputProps={{ min: 10, max: 1000, step: 10 }}
							size="small"
							sx={{ mt: 1 }}
						/>
						<Typography variant="caption" color="text.secondary">
							Maximum number of items to sync per provider
						</Typography>
					</FormControl>
				</CardContent>
			</Card>

			{/* Notification Settings */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Notifications
					</Typography>

					<FormGroup>
						<FormControlLabel
							control={
								<Checkbox
									checked={settings.enableNotifications}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											enableNotifications: e.target.checked,
										}))
									}
								/>
							}
							label="Enable notifications"
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={settings.notifyOnError}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											notifyOnError: e.target.checked,
										}))
									}
									disabled={!settings.enableNotifications}
								/>
							}
							label="Notify on sync errors"
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={settings.notifyOnSuccess}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											notifyOnSuccess: e.target.checked,
										}))
									}
									disabled={!settings.enableNotifications}
								/>
							}
							label="Notify on successful sync"
						/>
					</FormGroup>
				</CardContent>
			</Card>

			{/* Appearance Settings */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Appearance
					</Typography>

					<FormControl fullWidth>
						<FormLabel>Theme</FormLabel>
						<Select
							value={settings.theme}
							onChange={(e) =>
								setSettings((prev) => ({
									...prev,
									theme: e.target.value as "light" | "dark" | "auto",
								}))
							}
							size="small"
							sx={{ mt: 1 }}
						>
							<MenuItem value="auto">Auto (System)</MenuItem>
							<MenuItem value="light">Light</MenuItem>
							<MenuItem value="dark">Dark</MenuItem>
						</Select>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
							Choose your preferred color theme
						</Typography>
					</FormControl>
				</CardContent>
			</Card>

			{/* Advanced Settings */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Advanced
					</Typography>

					<FormGroup>
						<FormControlLabel
							control={
								<Checkbox
									checked={settings.debugMode}
									onChange={(e) =>
										setSettings((prev) => ({
											...prev,
											debugMode: e.target.checked,
										}))
									}
								/>
							}
							label="Enable debug mode"
						/>
						<Typography variant="caption" color="text.secondary">
							Show detailed logs in browser console
						</Typography>
					</FormGroup>
				</CardContent>
			</Card>

			<Divider />

			{/* Action Buttons */}
			<Box display="flex" gap={2} justifyContent="flex-end">
				<Button variant="outlined" startIcon={<Refresh />} onClick={handleReset} disabled={saving}>
					Reset to Defaults
				</Button>
				<Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save Settings"}
				</Button>
			</Box>
		</Stack>
	);
}
