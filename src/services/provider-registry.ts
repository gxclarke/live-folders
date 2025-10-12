/**
 * Provider Registry
 * Centralized management and discovery of all providers
 */

import { GitHubProvider } from "@/providers/github/github-provider";
import { JiraProvider } from "@/providers/jira/jira-provider";
import type { Provider, ProviderConfig } from "@/types";
import { Logger } from "@/utils/logger";

/**
 * Provider status information
 */
export interface ProviderStatus {
  /** Provider ID */
  id: string;
  /** Whether provider is initialized */
  initialized: boolean;
  /** Whether provider is authenticated */
  authenticated: boolean;
  /** Whether provider is enabled */
  enabled: boolean;
  /** Last error message (if any) */
  lastError?: string;
  /** Last sync timestamp */
  lastSync?: number;
}

/**
 * Provider Registry Service
 * Manages provider lifecycle and discovery
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private logger: Logger;
  private providers: Map<string, Provider>;
  private providerStatus: Map<string, ProviderStatus>;
  private initialized: boolean;

  private constructor() {
    this.logger = new Logger("ProviderRegistry");
    this.providers = new Map();
    this.providerStatus = new Map();
    this.initialized = false;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Initialize the registry and all registered providers
   */
  public async initialize(): Promise<void> {
    // Skip if already initialized (check both flag and providers map)
    if (this.initialized || this.providers.size > 0) {
      this.logger.debug("Provider registry already initialized, skipping");
      return;
    }

    this.logger.info("Initializing provider registry");

    // Register built-in providers
    this.registerProvider(new GitHubProvider());
    this.registerProvider(new JiraProvider());

    // Initialize all registered providers
    await this.initializeAllProviders();

    this.initialized = true;

    this.logger.info("Provider registry initialized", {
      providerCount: this.providers.size,
    });
  }

  /**
   * Register a provider
   */
  public registerProvider(provider: Provider): void {
    const providerId = provider.metadata.id;

    if (this.providers.has(providerId)) {
      this.logger.warn("Provider already registered", { providerId });
      return;
    }

    this.providers.set(providerId, provider);
    this.providerStatus.set(providerId, {
      id: providerId,
      initialized: false,
      authenticated: false,
      enabled: false,
    });

    this.logger.info("Provider registered", {
      providerId,
      name: provider.metadata.name,
    });
  }

  /**
   * Unregister a provider
   */
  public async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      this.logger.warn("Provider not found for unregistration", { providerId });
      return;
    }

    // Dispose provider resources
    try {
      await provider.dispose();
    } catch (error) {
      this.logger.error("Error disposing provider", { providerId, error }, error as Error);
    }

    this.providers.delete(providerId);
    this.providerStatus.delete(providerId);

    this.logger.info("Provider unregistered", { providerId });
  }

  /**
   * Get a provider by ID
   */
  public getProvider(providerId: string): Provider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  public getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider IDs
   */
  public getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider status
   */
  public getProviderStatus(providerId: string): ProviderStatus | undefined {
    return this.providerStatus.get(providerId);
  }

  /**
   * Get all provider statuses
   */
  public getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * Initialize all registered providers
   */
  private async initializeAllProviders(): Promise<void> {
    const providers = Array.from(this.providers.entries());

    for (const [providerId, provider] of providers) {
      try {
        await provider.initialize();
        await this.updateProviderStatus(providerId);

        this.logger.info("Provider initialized", { providerId });
      } catch (error) {
        this.logger.error("Failed to initialize provider", { providerId, error }, error as Error);

        // Update status with error
        const status = this.providerStatus.get(providerId);
        if (status) {
          status.lastError = error instanceof Error ? error.message : "Initialization failed";
          this.providerStatus.set(providerId, status);
        }
      }
    }
  }

  /**
   * Update provider status
   */
  private async updateProviderStatus(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    const status = this.providerStatus.get(providerId);

    if (!provider || !status) {
      return;
    }

    try {
      // Check authentication status
      const authenticated = await provider.isAuthenticated();

      // Get provider config
      const config = await provider.getConfig();

      // Update status
      status.initialized = true;
      status.authenticated = authenticated;
      status.enabled = config.enabled || false;
      status.lastSync = config.lastSync;
      status.lastError = undefined;

      this.providerStatus.set(providerId, status);
    } catch (error) {
      this.logger.error("Failed to update provider status", { providerId, error }, error as Error);
      status.lastError = error instanceof Error ? error.message : "Status update failed";
      this.providerStatus.set(providerId, status);
    }
  }

  /**
   * Refresh status for all providers
   */
  public async refreshAllStatuses(): Promise<void> {
    const providerIds = Array.from(this.providers.keys());

    for (const providerId of providerIds) {
      await this.updateProviderStatus(providerId);
    }

    this.logger.info("Refreshed all provider statuses");
  }

  /**
   * Refresh status for a specific provider
   */
  public async refreshProviderStatus(providerId: string): Promise<void> {
    await this.updateProviderStatus(providerId);
    this.logger.info("Refreshed provider status", { providerId });
  }

  /**
   * Authenticate a provider
   */
  public async authenticateProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      const result = await provider.authenticate();

      if (!result.success) {
        throw new Error(result.error || "Authentication failed");
      }

      await this.updateProviderStatus(providerId);

      this.logger.info("Provider authenticated", { providerId });
    } catch (error) {
      this.logger.error("Provider authentication failed", { providerId, error }, error as Error);
      throw error;
    }
  }

  /**
   * Revoke authentication for a provider
   */
  public async revokeProviderAuth(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      await provider.revokeAuth();
      await this.updateProviderStatus(providerId);

      this.logger.info("Provider authentication revoked", { providerId });
    } catch (error) {
      this.logger.error("Failed to revoke provider auth", { providerId, error }, error as Error);
      throw error;
    }
  }

  /**
   * Update provider configuration
   */
  public async updateProviderConfig(
    providerId: string,
    config: Partial<ProviderConfig>,
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      await provider.setConfig(config);
      await this.updateProviderStatus(providerId);

      this.logger.info("Provider config updated", { providerId, config });
    } catch (error) {
      this.logger.error("Failed to update provider config", { providerId, error }, error as Error);
      throw error;
    }
  }

  /**
   * Fetch items from a specific provider
   */
  public async fetchProviderItems(providerId: string) {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(
        `Provider "${providerId}" is not initialized. Please check your authentication and try reconnecting.`,
      );
    }

    try {
      const items = await provider.fetchItems();

      // Update last sync timestamp
      const config = await provider.getConfig();
      await provider.setConfig({
        ...config,
        lastSync: Date.now(),
      });

      await this.updateProviderStatus(providerId);

      this.logger.info("Fetched items from provider", {
        providerId,
        itemCount: items.length,
      });

      return items;
    } catch (error) {
      this.logger.error("Failed to fetch provider items", { providerId, error }, error as Error);
      throw error;
    }
  }

  /**
   * Fetch items from all enabled and authenticated providers
   */
  public async fetchAllProviderItems() {
    const allItems = [];
    const providerIds = Array.from(this.providers.keys());

    for (const providerId of providerIds) {
      const status = this.providerStatus.get(providerId);

      // Skip if not enabled or not authenticated
      if (!status?.enabled || !status?.authenticated) {
        this.logger.debug("Skipping provider", {
          providerId,
          enabled: status?.enabled,
          authenticated: status?.authenticated,
        });
        continue;
      }

      try {
        const items = await this.fetchProviderItems(providerId);
        allItems.push(...items);
      } catch (error) {
        this.logger.error(
          "Failed to fetch items from provider",
          { providerId, error },
          error as Error,
        );
        // Continue with other providers
      }
    }

    this.logger.info("Fetched items from all providers", {
      totalItems: allItems.length,
    });

    return allItems;
  }

  /**
   * Dispose all providers and clean up
   */
  public async dispose(): Promise<void> {
    this.logger.info("Disposing provider registry");

    const providers = Array.from(this.providers.values());

    for (const provider of providers) {
      try {
        await provider.dispose();
      } catch (error) {
        this.logger.error("Error disposing provider", { error }, error as Error);
      }
    }

    this.providers.clear();
    this.providerStatus.clear();

    this.logger.info("Provider registry disposed");
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();
