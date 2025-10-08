import {
	Alert,
	Box,
	CircularProgress,
	CssBaseline,
	ThemeProvider,
	useMediaQuery,
} from "@mui/material";
import { useMemo } from "react";
import { createAppTheme } from "@/theme";
import { Header } from "./components/Header";
import { ProviderList } from "./components/ProviderList";
import { QuickActions } from "./components/QuickActions";
import { useProviders } from "./hooks/useProviders";
import "./App.css";

export default function App() {
	// Detect system color scheme preference
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
	const theme = useMemo(
		() => createAppTheme(prefersDarkMode ? "dark" : "light"),
		[prefersDarkMode],
	);

	const { providers, loading, error, syncAll, syncProvider, openSettings } = useProviders();

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Box
				sx={{
					width: 400,
					minHeight: 300,
					maxHeight: 600,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Header onSettingsClick={openSettings} />

				{loading && (
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							flex: 1,
							py: 4,
						}}
					>
						<CircularProgress />
					</Box>
				)}

				{error && (
					<Box sx={{ p: 2 }}>
						<Alert severity="error">{error}</Alert>
					</Box>
				)}

				{!loading && !error && (
					<>
						<ProviderList providers={providers} onSync={syncProvider} />
						<QuickActions onSyncAll={syncAll} onOpenSettings={openSettings} />
					</>
				)}
			</Box>
		</ThemeProvider>
	);
}
