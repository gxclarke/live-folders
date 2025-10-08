import { Settings as SettingsIcon, Sync as SyncIcon } from "@mui/icons-material";
import { Box, Button, Divider, Stack } from "@mui/material";
import { useState } from "react";

export interface QuickActionsProps {
	onSyncAll: () => Promise<void>;
	onOpenSettings: () => void;
}

/**
 * Quick Actions Component
 *
 * Displays quick action buttons for syncing all providers and opening settings.
 */
export function QuickActions({ onSyncAll, onOpenSettings }: QuickActionsProps) {
	const [syncing, setSyncing] = useState(false);

	const handleSyncAll = async () => {
		setSyncing(true);
		try {
			await onSyncAll();
		} finally {
			setSyncing(false);
		}
	};

	return (
		<Box>
			<Divider />
			<Stack direction="row" spacing={1} sx={{ p: 2 }}>
				<Button
					variant="contained"
					startIcon={<SyncIcon />}
					onClick={handleSyncAll}
					disabled={syncing}
					fullWidth
				>
					{syncing ? "Syncing..." : "Sync All"}
				</Button>
				<Button variant="outlined" startIcon={<SettingsIcon />} onClick={onOpenSettings}>
					Settings
				</Button>
			</Stack>
		</Box>
	);
}
