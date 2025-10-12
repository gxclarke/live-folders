import { CheckCircle, Sync as SyncIcon } from "@mui/icons-material";
import { Box, Button, Divider } from "@mui/material";
import { useState } from "react";

export interface QuickActionsProps {
  onSyncAll: () => Promise<void>;
}

/**
 * Quick Actions Component
 *
 * Displays quick action button for syncing all providers.
 */
export function QuickActions({ onSyncAll }: QuickActionsProps) {
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSuccess(false);
    try {
      await onSyncAll();
      setSuccess(true);
      // Clear success state after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={success ? <CheckCircle /> : <SyncIcon />}
          onClick={handleSyncAll}
          disabled={syncing}
          fullWidth
          color={success ? "success" : "primary"}
        >
          {syncing ? "Syncing..." : success ? "Synced!" : "Sync All"}
        </Button>
      </Box>
    </Box>
  );
}
