import { CheckCircle, Error as ErrorIcon, Warning } from "@mui/icons-material";
import { Box, Chip, type ChipProps, CircularProgress } from "@mui/material";

export interface StatusBadgeProps {
  status: "connected" | "disconnected" | "error" | "loading";
  label?: string;
  size?: ChipProps["size"];
}

/**
 * Status Badge Component
 *
 * Displays color-coded status indicators for providers.
 * Uses MUI Chip with appropriate icons and colors.
 */
export function StatusBadge({ status, label, size = "small" }: StatusBadgeProps) {
  const getStatusProps = (): Partial<ChipProps> => {
    switch (status) {
      case "connected":
        return {
          color: "success",
          icon: <CheckCircle />,
          label: label || "Connected",
        };
      case "disconnected":
        return {
          color: "default",
          icon: <Warning />,
          label: label || "Not Connected",
        };
      case "error":
        return {
          color: "error",
          icon: <ErrorIcon />,
          label: label || "Error",
        };
      case "loading":
        return {
          color: "info",
          icon: (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={16} />
            </Box>
          ),
          label: label || "Loading",
        };
      default:
        return {
          label: label || "Unknown",
        };
    }
  };

  return <Chip {...getStatusProps()} size={size} variant="outlined" />;
}
