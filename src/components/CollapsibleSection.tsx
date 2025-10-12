import { ExpandMore } from "@mui/icons-material";
import { Box, Chip, Collapse, IconButton, Typography } from "@mui/material";
import type React from "react";

/**
 * Props for CollapsibleSection component
 */
export interface CollapsibleSectionProps {
  /** Section title (always visible) */
  title: string;
  /** Subtitle/preview text shown when collapsed */
  subtitle?: string;
  /** Icon displayed before title */
  icon?: React.ReactNode;
  /** Whether the section is expanded */
  expanded: boolean;
  /** Callback when section is toggled */
  onToggle: () => void;
  /** Section content (visible when expanded) */
  children: React.ReactNode;
  /** Badge to show count of enabled options */
  badge?: string | number;
  /** Disable the section */
  disabled?: boolean;
}

/**
 * Collapsible Section Component
 * Provides an accordion-style collapsible section with header, optional icon, badge, and preview text
 */
export function CollapsibleSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  children,
  badge,
  disabled = false,
}: CollapsibleSectionProps) {
  return (
    <Box sx={{ mb: 1.5 }}>
      {/* Header - Always visible, clickable */}
      <Box
        onClick={disabled ? undefined : onToggle}
        onKeyDown={
          disabled
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
        }
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={expanded}
        aria-disabled={disabled}
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "default" : "pointer",
          py: 1,
          px: 1.5,
          borderRadius: 1,
          transition: "background-color 0.2s",
          "&:hover": disabled
            ? {}
            : {
                bgcolor: "action.hover",
              },
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Expand/Collapse Icon */}
        <IconButton
          size="small"
          disabled={disabled}
          sx={{
            mr: 1,
            transition: "transform 0.3s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-label={expanded ? "Collapse section" : "Expand section"}
          tabIndex={-1} // Parent handles keyboard navigation
        >
          <ExpandMore fontSize="small" />
        </IconButton>

        {/* Optional Icon */}
        {icon && (
          <Box sx={{ mr: 1.5, color: "text.secondary", display: "flex", alignItems: "center" }}>
            {icon}
          </Box>
        )}

        {/* Title and Subtitle */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" fontWeight={500} sx={{ color: "text.primary" }}>
              {title}
            </Typography>

            {/* Badge */}
            {badge !== undefined && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                }}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          {/* Subtitle - only shown when collapsed */}
          {!expanded && subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Content - Collapsible */}
      <Collapse in={expanded} timeout={300} unmountOnExit>
        <Box
          sx={{
            pl: 6,
            pr: 2,
            pt: 1.5,
            pb: 1,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
