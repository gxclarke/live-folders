import { Alert, Box, CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProviderListSkeleton } from "@/components/Skeletons";
import { useTheme } from "@/hooks/useTheme";
import { createAppTheme } from "@/theme";
import { Logger } from "@/utils/logger";
import { Header } from "./components/Header";
import { ProviderList } from "./components/ProviderList";
import { QuickActions } from "./components/QuickActions";
import { useProviders } from "./hooks/useProviders";
import "./App.css";

export default function App() {
  // Get theme mode from settings (respects auto/light/dark preference)
  const themeMode = useTheme();
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  const { providers, loading, error, syncAll, syncProvider, connectProvider, openSettings } =
    useProviders();

  // Initialize Logger on mount
  useEffect(() => {
    Logger.initialize();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary
        fallbackTitle="Extension Error"
        fallbackMessage="The extension encountered an error. Try resetting or reloading the popup."
      >
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
              <ProviderList
                providers={providers}
                onSync={syncProvider}
                onConnect={connectProvider}
              />
              <QuickActions onSyncAll={syncAll} />
            </>
          )}
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
