import { Alert, Box, Button, Typography } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logger } from "@/utils/logger";

const logger = new Logger("ErrorBoundary");

interface ErrorBoundaryProps {
	children: ReactNode;
	fallbackTitle?: string;
	fallbackMessage?: string;
	onReset?: () => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for catching React errors and displaying fallback UI
 * Logs errors for debugging and provides reset functionality
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log the error for debugging
		logger.error("React error caught by boundary", error, {
			componentStack: errorInfo.componentStack,
		});

		this.setState({
			error,
			errorInfo,
		});
	}

	handleReset = (): void => {
		// Reset the error boundary state
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});

		// Call optional reset callback
		if (this.props.onReset) {
			this.props.onReset();
		}
	};

	render(): ReactNode {
		if (this.state.hasError) {
			const {
				fallbackTitle = "Something went wrong",
				fallbackMessage = "An unexpected error occurred. Please try resetting the component.",
			} = this.props;
			const { error } = this.state;

			return (
				<Box
					sx={{
						p: 3,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 2,
					}}
				>
					<Alert severity="error" sx={{ width: "100%" }}>
						<Typography variant="h6" gutterBottom>
							{fallbackTitle}
						</Typography>
						<Typography variant="body2" paragraph>
							{fallbackMessage}
						</Typography>
						{error && (
							<Typography variant="caption" component="pre" sx={{ mt: 1 }}>
								{error.message}
							</Typography>
						)}
					</Alert>

					<Button variant="contained" color="primary" onClick={this.handleReset}>
						Reset Component
					</Button>
				</Box>
			);
		}

		return this.props.children;
	}
}
