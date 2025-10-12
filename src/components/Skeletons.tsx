import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material";

/**
 * Provider Card Skeleton
 * Loading placeholder for provider cards
 */
export function ProviderCardSkeleton() {
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="60%" height={24} />
          <Box sx={{ flexGrow: 1 }} />
          <Skeleton variant="rounded" width={80} height={24} />
        </Stack>
        <Skeleton variant="text" width="40%" height={20} />
      </CardContent>
    </Card>
  );
}

/**
 * Provider List Skeleton
 * Loading placeholder for provider list
 */
export function ProviderListSkeleton() {
  return (
    <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
      <ProviderCardSkeleton />
      <ProviderCardSkeleton />
    </Stack>
  );
}

/**
 * Settings Skeleton
 * Loading placeholder for settings view
 */
export function SettingsSkeleton() {
  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Box>
        <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} />
      </Box>
      <Card variant="outlined">
        <CardContent>
          <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="50%" height={20} />
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={120} />
        </CardContent>
      </Card>
    </Stack>
  );
}

/**
 * Items List Skeleton
 * Loading placeholder for items view
 */
export function ItemsListSkeleton() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Skeleton variant="text" width="30%" height={32} />
      <Skeleton variant="rectangular" width="100%" height={40} />
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Skeleton variant="circular" width={32} height={32} sx={{ mt: 0.5 }} />
              <Box flex={1}>
                <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={60} height={24} />
                </Stack>
              </Box>
              <Skeleton variant="circular" width={32} height={32} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
