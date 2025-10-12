import { Refresh, Save } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Link,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { NotificationType, notificationService } from "@/services/notification-service";
import { StorageManager } from "@/services/storage";
import type { ExtensionSettings } from "@/types/storage";
import { DEFAULT_SETTINGS } from "@/types/storage";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";

const logger = new Logger("SettingsView");

// Convert milliseconds to minutes for display
const msToMinutes = (ms: number) => Math.round(ms / 60000);
const minutesToMs = (minutes: number) => minutes * 60000;

export function SettingsView() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNotificationHelp, setShowNotificationHelp] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const storage = StorageManager.getInstance();
        const currentSettings = await storage.getSettings();
        setSettings(currentSettings);

        logger.info("Settings loaded successfully");
      } catch (err) {
        logger.error("Failed to load settings", err as Error);
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const storage = StorageManager.getInstance();
      const result = await storage.saveSettings(settings);

      if (!result.success) {
        throw new Error(result.error || "Failed to save settings");
      }

      // Update Logger with new debug mode setting
      Logger.setDebugMode(settings.debugMode);

      logger.info("Settings saved successfully", settings);
      setSuccessMessage("Settings saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

      // Update sync interval in background scheduler
      await chrome.runtime.sendMessage({
        type: "UPDATE_SYNC_INTERVAL",
        interval: settings.syncInterval,
      });
    } catch (err) {
      logger.error("Failed to save settings", err as Error);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSuccessMessage("Settings reset to defaults (not saved yet)");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Test notification
  const handleTestNotification = async () => {
    try {
      logger.info("Testing notification...");
      const notificationId = await notificationService.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test Notification",
        message: "If you see this, notifications are working! 🎉",
      });

      if (notificationId) {
        logger.info("Test notification sent:", notificationId);
      } else {
        logger.warn("Test notification returned empty ID - may be disabled");
      }

      // Always show the help dialog
      setShowNotificationHelp(true);
    } catch (err) {
      logger.error("Failed to send test notification", err as Error);
      setError(err instanceof Error ? err.message : "Failed to send notification");
      setShowNotificationHelp(true);
    }
  };

  // Update sync interval
  const handleSyncIntervalChange = (_event: Event, value: number | number[]) => {
    const minutes = Array.isArray(value) ? value[0] : value;
    setSettings((prev) => ({ ...prev, syncInterval: minutesToMs(minutes) }));
  };

  // Reset extension to initial state
  const handleResetExtension = async () => {
    try {
      setResetting(true);
      setError(null);

      logger.warn("Resetting extension to initial state");

      // Clear all extension storage
      await browser.storage.local.clear();

      logger.info("Extension storage cleared");

      // Reset local state to defaults
      setSettings(DEFAULT_SETTINGS);
      setSuccessMessage("Extension reset successfully! The page will reload in 2 seconds...");

      // Reload the extension after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      logger.error("Failed to reset extension", err as Error);
      setError(err instanceof Error ? err.message : "Failed to reset extension");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <Typography>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure extension behavior and preferences
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Sync Settings */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sync Settings
          </Typography>

          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <FormLabel>Sync Interval: {msToMinutes(settings.syncInterval)} minutes</FormLabel>
            <Slider
              value={msToMinutes(settings.syncInterval)}
              onChange={handleSyncIntervalChange}
              min={1}
              max={60}
              step={1}
              marks={[
                { value: 1, label: "1m" },
                { value: 15, label: "15m" },
                { value: 30, label: "30m" },
                { value: 60, label: "1h" },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}m`}
            />
            <Typography variant="caption" color="text.secondary">
              How often to automatically sync providers
            </Typography>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>Max Items Per Provider</FormLabel>
            <TextField
              type="number"
              value={settings.maxItemsPerProvider}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  maxItemsPerProvider: Number.parseInt(e.target.value, 10) || 100,
                }))
              }
              inputProps={{ min: 10, max: 1000, step: 10 }}
              size="small"
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Maximum number of items to sync per provider
            </Typography>
          </FormControl>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.enableNotifications}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableNotifications: e.target.checked,
                    }))
                  }
                />
              }
              label="Enable notifications"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.notifyOnError}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifyOnError: e.target.checked,
                    }))
                  }
                  disabled={!settings.enableNotifications}
                />
              }
              label="Notify on sync errors"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.notifyOnSuccess}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifyOnSuccess: e.target.checked,
                    }))
                  }
                  disabled={!settings.enableNotifications}
                />
              }
              label="Notify on successful sync"
            />
          </FormGroup>

          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" size="small" onClick={handleTestNotification}>
              Test Notification
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
              Click to test if browser notifications are working
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>

          <FormControl fullWidth>
            <FormLabel>Theme</FormLabel>
            <Select
              value={settings.theme}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  theme: e.target.value as "light" | "dark" | "auto",
                }))
              }
              size="small"
              sx={{ mt: 1 }}
            >
              <MenuItem value="auto">Auto (System)</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Choose your preferred color theme
            </Typography>
          </FormControl>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Advanced
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.debugMode}
                  onChange={(e) => {
                    const debugMode = e.target.checked;
                    setSettings((prev) => ({
                      ...prev,
                      debugMode,
                    }));
                    // Update Logger debug mode immediately (before save)
                    Logger.setDebugMode(debugMode);
                    logger.info(`Debug mode ${debugMode ? "enabled" : "disabled"}`);
                  }}
                />
              }
              label="Enable debug mode"
            />
            <Typography variant="caption" color="text.secondary">
              Show detailed logs in browser console
            </Typography>
          </FormGroup>
        </CardContent>
      </Card>

      <Divider />

      {/* Action Buttons */}
      <Box display="flex" gap={2} justifyContent="space-between">
        <Button
          variant="outlined"
          color="error"
          onClick={() => setShowResetDialog(true)}
          disabled={saving || resetting}
          sx={{ borderColor: "error.main", color: "error.main" }}
        >
          Reset Extension
        </Button>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Box>

      {/* Notification Test Help Dialog */}
      <Dialog
        open={showNotificationHelp}
        onClose={() => setShowNotificationHelp(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Test Notification Sent</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" paragraph>
              A test notification has been sent. You should see a notification appear in the{" "}
              <strong>top-right corner</strong> of your screen (macOS) or{" "}
              <strong>bottom-right corner</strong> (Windows).
            </Typography>

            <Typography variant="body2" paragraph sx={{ fontWeight: 500 }}>
              The notification will look like:
            </Typography>

            <Box
              sx={{
                bgcolor: "action.hover",
                p: 2,
                borderRadius: 1,
                mb: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🔵 Test Notification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                If you see this, notifications are working! 🎉
              </Typography>
            </Box>

            <Typography variant="body2" paragraph sx={{ fontWeight: 500 }}>
              If you didn't see the notification:
            </Typography>

            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>macOS:</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 24 }}>
                <li>Open System Settings → Notifications</li>
                <li>Find "Google Chrome" in the list</li>
                <li>Make sure "Allow Notifications" is ON</li>
                <li>Set notification style to "Banners" or "Alerts"</li>
                <li>Turn off Focus Mode or Do Not Disturb (Control Center)</li>
              </ul>
            </Typography>

            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Windows:</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 24 }}>
                <li>Open Settings → System → Notifications</li>
                <li>Find "Google Chrome" in the list</li>
                <li>Make sure notifications are enabled</li>
                <li>Turn off Focus Assist (or add Chrome to priority apps)</li>
              </ul>
            </Typography>

            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Chrome Browser (All Platforms):</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 24 }}>
                <li>Chrome Settings → Privacy and security → Site Settings → Notifications</li>
                <li>Make sure notifications are allowed</li>
              </ul>
            </Typography>

            <Typography variant="body2" sx={{ mt: 2 }}>
              For more help:{" "}
              <Link
                href="https://support.apple.com/guide/mac-help/change-notifications-settings-mh40583/mac"
                target="_blank"
                rel="noopener noreferrer"
              >
                macOS
              </Link>
              {" | "}
              <Link
                href="https://support.microsoft.com/en-us/windows/change-notification-settings-in-windows-8942c744-6198-fe56-4639-34320cf9444e"
                target="_blank"
                rel="noopener noreferrer"
              >
                Windows
              </Link>
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNotificationHelp(false)} variant="contained">
            Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Extension Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => !resetting && setShowResetDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>Reset Extension?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography variant="body2" paragraph>
              <strong>Warning:</strong> This will permanently delete all extension data including:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 24 }}>
                <li>All provider configurations and credentials</li>
                <li>Authentication tokens</li>
                <li>All settings and preferences</li>
                <li>Sync history</li>
              </ul>
            </Typography>
            <Typography variant="body2" paragraph>
              Your browser bookmarks will <strong>not</strong> be affected.
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: "error.main", fontWeight: 500 }}>
              This action cannot be undone. Are you sure you want to continue?
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button
            onClick={handleResetExtension}
            color="error"
            variant="contained"
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Reset Extension"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
