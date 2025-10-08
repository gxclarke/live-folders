import {
	Box,
	Container,
	CssBaseline,
	Tab,
	Tabs,
	ThemeProvider,
	useMediaQuery,
} from "@mui/material";
import { useId, useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createAppTheme } from "@/theme";
import { ItemsView } from "./views/ItemsView";
import { ProvidersView } from "./views/ProvidersView";
import { SettingsView } from "./views/SettingsView";
import "./App.css";

export default function App() {
	// Detect system color scheme preference
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
	const theme = useMemo(
		() => createAppTheme(prefersDarkMode ? "dark" : "light"),
		[prefersDarkMode],
	);

	const [currentTab, setCurrentTab] = useState(0);
	const tabIdBase = useId();

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setCurrentTab(newValue);
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<ErrorBoundary
				fallbackTitle="Sidepanel Error"
				fallbackMessage="The sidepanel encountered an error. Try switching tabs or reloading."
			>
				<Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
					{/* Navigation Tabs */}
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs value={currentTab} onChange={handleTabChange} aria-label="sidepanel navigation">
							<Tab
								label="Providers"
								id={`${tabIdBase}-tab-0`}
								aria-controls={`${tabIdBase}-panel-0`}
							/>
							<Tab label="Items" id={`${tabIdBase}-tab-1`} aria-controls={`${tabIdBase}-panel-1`} />
							<Tab
								label="Settings"
								id={`${tabIdBase}-tab-2`}
								aria-controls={`${tabIdBase}-panel-2`}
							/>
						</Tabs>
					</Box>

					{/* Tab Panels */}
					<Container
						maxWidth="md"
						sx={{
							flex: 1,
							py: 3,
							overflow: "auto",
						}}
					>
						{currentTab === 0 && (
							<Box
								role="tabpanel"
								id={`${tabIdBase}-panel-0`}
								aria-labelledby={`${tabIdBase}-tab-0`}
							>
								<ProvidersView />
							</Box>
						)}
						{currentTab === 1 && (
							<Box
								role="tabpanel"
								id={`${tabIdBase}-panel-1`}
								aria-labelledby={`${tabIdBase}-tab-1`}
							>
								<ItemsView />
							</Box>
						)}
						{currentTab === 2 && (
							<Box
								role="tabpanel"
								id={`${tabIdBase}-panel-2`}
								aria-labelledby={`${tabIdBase}-tab-2`}
							>
								<SettingsView />
							</Box>
						)}
					</Container>
				</Box>
			</ErrorBoundary>
		</ThemeProvider>
	);
}
