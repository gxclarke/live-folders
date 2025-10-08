import { Alert, Box, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { useMemo } from "react";
import { ProviderListSkeleton } from "@/components/Skeletons";
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

	const { providers, loading, error, syncAll, syncProvider, connectProvider, openSettings } =
		useProviders();

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
					<Box sx={{ p: 2 }}>
						<ProviderListSkeleton />
					</Box>
				)}{" "}
				{error && (
					<Box sx={{ p: 2 }}>
						<Alert severity="error">{error}</Alert>
					</Box>
				)}
				{!loading && !error && (
					<>
						<ProviderList providers={providers} onSync={syncProvider} onConnect={connectProvider} />
						<QuickActions onSyncAll={syncAll} onOpenSettings={openSettings} />
					</>
				)}
			</Box>
		</ThemeProvider>
	);
}
