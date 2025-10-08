import { useState } from "react";
import { ProviderRegistry } from "@/services/provider-registry";
import { Logger } from "@/utils/logger";

const logger = new Logger("useAuthentication");

export interface UseAuthenticationResult {
	authenticating: boolean;
	error: string | null;
	authenticate: (providerId: string) => Promise<boolean>;
	clearError: () => void;
}

/**
 * Hook for managing provider authentication
 *
 * Handles OAuth flow initiation and error states.
 */
export function useAuthentication(): UseAuthenticationResult {
	const [authenticating, setAuthenticating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const authenticate = async (providerId: string): Promise<boolean> => {
		try {
			setAuthenticating(true);
			setError(null);

			logger.info(`Starting authentication for ${providerId}`);

			// Get provider instance
			const registry = ProviderRegistry.getInstance();
			const provider = registry.getProvider(providerId);

			if (!provider) {
				throw new Error(`Provider ${providerId} not found`);
			}

			// Trigger provider authentication
			// This will call AuthManager.authenticate() internally
			const result = await provider.authenticate();

			if (!result.success) {
				throw new Error(result.error || "Authentication failed");
			}

			logger.info(`Authentication successful for ${providerId}`);
			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Authentication failed";
			logger.error(`Authentication failed for ${providerId}`, err as Error);

			// Handle user cancellation gracefully
			if (errorMessage.includes("cancelled") || errorMessage.includes("closed")) {
				setError(null); // Don't show error for user cancellation
				return false;
			}

			setError(errorMessage);
			return false;
		} finally {
			setAuthenticating(false);
		}
	};

	const clearError = () => {
		setError(null);
	};

	return {
		authenticating,
		error,
		authenticate,
		clearError,
	};
}
