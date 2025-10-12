import { Login as LoginIcon, Sync as SyncIcon } from "@mui/icons-material";
import { Box, Button, Card, CardActions, CardContent, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { ProviderIcon } from "@/components/ProviderIcon";
import { StatusBadge } from "@/components/StatusBadge";
import type { ProviderInfo } from "../hooks/useProviders";

export interface ProviderCardProps {
  provider: ProviderInfo;
  onSync: () => Promise<void>;
  onConnect: () => Promise<void>;
}

/**
 * Provider Card Component
 *
 * Displays individual provider status and actions.
 */
export function ProviderCard({ provider, onSync, onConnect }: ProviderCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const getStatusType = () => {
    if (syncing) return "loading";
    if (provider.status.lastError) return "error";
    if (provider.status.authenticated) return "connected";
    return "disconnected";
  };

  const getActionButton = () => {
    if (!provider.status.authenticated) {
      return (
        <Button
          size="small"
          startIcon={<LoginIcon />}
          onClick={async () => {
            setConnecting(true);
            try {
              await onConnect();
            } finally {
              setConnecting(false);
            }
          }}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect"}
        </Button>
      );
    }

    return (
      <Button
        size="small"
        startIcon={<SyncIcon />}
        onClick={handleSync}
        disabled={syncing || !provider.status.enabled}
      >
        {syncing ? "Syncing..." : "Sync"}
      </Button>
    );
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ProviderIcon providerId={provider.id} fontSize="small" />
          <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {provider.name}
          </Typography>
          <StatusBadge status={getStatusType()} />
        </Stack>

        {provider.status.authenticated && provider.itemCount !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {provider.itemCount} item{provider.itemCount !== 1 ? "s" : ""}
          </Typography>
        )}

        {provider.error && (
          <Typography variant="caption" color="error">
            {provider.error}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
        <Box sx={{ flexGrow: 1 }} />
        {getActionButton()}
      </CardActions>
    </Card>
  );
}
