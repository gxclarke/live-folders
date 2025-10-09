import { Settings as SettingsIcon } from "@mui/icons-material";
import { AppBar, IconButton, Toolbar, Typography } from "@mui/material";

export interface HeaderProps {
	onSettingsClick: () => void;
}

/**
 * Popup Header Component
 *
 * Displays the extension title and settings button.
 */
export function Header({ onSettingsClick }: HeaderProps) {
	return (
		<AppBar position="static" elevation={0} color="transparent">
			<Toolbar variant="dense">
				<Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
					Live Folders
				</Typography>
				<IconButton
					color="inherit"
					onClick={onSettingsClick}
					aria-label="Open settings"
					size="small"
				>
					<SettingsIcon />
				</IconButton>
			</Toolbar>
		</AppBar>
	);
}
