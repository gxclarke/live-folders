import { createTheme, type ThemeOptions } from "@mui/material/styles";

/**
 * Live Folders MUI Theme Configuration
 *
 * Provides consistent theming across popup and sidepanel with
 * support for light and dark modes based on system preferences.
 */

const themeOptions: ThemeOptions = {
	palette: {
		mode: "light", // Will be overridden by useMediaQuery in components
		primary: {
			main: "#1976d2", // Material Blue
			light: "#42a5f5",
			dark: "#1565c0",
			contrastText: "#fff",
		},
		secondary: {
			main: "#9c27b0", // Material Purple
			light: "#ba68c8",
			dark: "#7b1fa2",
			contrastText: "#fff",
		},
		error: {
			main: "#d32f2f",
			light: "#ef5350",
			dark: "#c62828",
		},
		warning: {
			main: "#ed6c02",
			light: "#ff9800",
			dark: "#e65100",
		},
		success: {
			main: "#2e7d32",
			light: "#4caf50",
			dark: "#1b5e20",
		},
		info: {
			main: "#0288d1",
			light: "#03a9f4",
			dark: "#01579b",
		},
	},
	typography: {
		fontFamily: [
			"-apple-system",
			"BlinkMacSystemFont",
			'"Segoe UI"',
			"Roboto",
			'"Helvetica Neue"',
			"Arial",
			"sans-serif",
		].join(","),
		h1: {
			fontSize: "2rem",
			fontWeight: 600,
		},
		h2: {
			fontSize: "1.5rem",
			fontWeight: 600,
		},
		h3: {
			fontSize: "1.25rem",
			fontWeight: 600,
		},
		h4: {
			fontSize: "1rem",
			fontWeight: 600,
		},
		h5: {
			fontSize: "0.875rem",
			fontWeight: 600,
		},
		h6: {
			fontSize: "0.75rem",
			fontWeight: 600,
		},
		body1: {
			fontSize: "0.875rem",
		},
		body2: {
			fontSize: "0.75rem",
		},
		button: {
			textTransform: "none", // Disable uppercase transformation
		},
	},
	spacing: 8, // Base spacing unit (8px)
	shape: {
		borderRadius: 8, // Default border radius
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
					padding: "8px 16px",
				},
				sizeSmall: {
					padding: "4px 12px",
					fontSize: "0.75rem",
				},
				sizeLarge: {
					padding: "12px 24px",
					fontSize: "1rem",
				},
			},
			defaultProps: {
				disableElevation: true, // Flat buttons by default
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 12,
				},
			},
			defaultProps: {
				elevation: 1, // Subtle shadow
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 8,
				},
			},
		},
		MuiTextField: {
			defaultProps: {
				size: "small", // Compact text fields
				variant: "outlined",
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					borderRadius: 8, // Slightly rounded icon buttons
				},
			},
		},
	},
};

/**
 * Create theme with mode (light/dark)
 */
export const createAppTheme = (mode: "light" | "dark") => {
	return createTheme({
		...themeOptions,
		palette: {
			...themeOptions.palette,
			mode,
			// Dark mode overrides
			...(mode === "dark" && {
				background: {
					default: "#121212",
					paper: "#1e1e1e",
				},
			}),
		},
	});
};

/**
 * Default light theme
 */
export const lightTheme = createAppTheme("light");

/**
 * Default dark theme
 */
export const darkTheme = createAppTheme("dark");
