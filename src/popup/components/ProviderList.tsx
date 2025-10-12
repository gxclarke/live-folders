import { Box, Stack } from "@mui/material";
import type { ProviderInfo } from "../hooks/useProviders";
import { ProviderCard } from "./ProviderCard";

export interface ProviderListProps {
  providers: ProviderInfo[];
  onSync: (providerId: string) => Promise<void>;
  onConnect: (providerId: string) => Promise<void>;
}

/**
 * Provider List Component
 *
 * Displays a list of all registered providers with their status.
 */
export function ProviderList({ providers, onSync, onConnect }: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        No providers configured
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ p: 2, flex: 1, overflow: "auto" }}>
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onSync={() => onSync(provider.id)}
          onConnect={() => onConnect(provider.id)}
        />
      ))}
    </Stack>
  );
}
