import { useQuery } from '@tanstack/react-query';

export const useUser = () => {
  const savedName = typeof window === 'undefined' ? '' : window.localStorage.getItem('vplm-local-user') ?? '';
  const fullName = savedName.trim() || 'Local Operator';
  const userPrincipalName = `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'operator'}@local`;
  return useQuery({
    queryKey: ['user', fullName],
    queryFn: async () => ({
      fullName,
      userPrincipalName,
      objectId: `local-${userPrincipalName}`,
      tenantId: 'local',
    }),
    initialData: {
      fullName,
      userPrincipalName,
      objectId: `local-${userPrincipalName}`,
      tenantId: 'local',
    },
  });
};
