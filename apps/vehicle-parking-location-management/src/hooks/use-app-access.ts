import { useQuery } from '@tanstack/react-query';

export type AppRole = 'Administrator' | 'Supervisor' | 'TechnicalLeader' | 'Operator';
export type AccessFeature = 'Vehicles' | 'VehicleMovements' | 'ParkingLayout' | 'Reservations' | 'ApplicationSettings' | 'RolePermissions' | 'AuditLogs';
export type AccessAction = 'View' | 'Create' | 'Edit' | 'Assign' | 'Transfer' | 'Release' | 'ManageSetting';

type AppAccess = {
  appUser: { id: string; applicationUserName: string; email: string };
  role: AppRole;
  can: (feature: AccessFeature, action: AccessAction) => boolean;
};

const roleCan = (role: AppRole, feature: AccessFeature, action: AccessAction) => {
  if (role === 'Administrator') return true;
  if (role === 'Supervisor') return feature !== 'ApplicationSettings' && feature !== 'RolePermissions';
  if (role === 'TechnicalLeader') return feature === 'Vehicles' || feature === 'VehicleMovements' || feature === 'AuditLogs';
  return (feature === 'Vehicles' && ['View', 'Create', 'Edit', 'Assign'].includes(action)) || (feature === 'VehicleMovements' && ['View', 'Transfer', 'Release'].includes(action)) || feature === 'ParkingLayout';
};

export const useAppAccess = (userPrincipalName: string | undefined, userObjectId?: string) => {
  return useQuery<AppAccess>({
    queryKey: ['app-access', userPrincipalName, userObjectId],
    enabled: Boolean(userPrincipalName || userObjectId),
    queryFn: async () => {
      const role: AppRole = 'Administrator';
      const id = userObjectId ?? userPrincipalName ?? 'local-operator';
      return {
        appUser: { id, applicationUserName: userPrincipalName?.split('@')[0] ?? 'Local Operator', email: userPrincipalName ?? '' },
        role,
        can: (feature: AccessFeature, action: AccessAction) => roleCan(role, feature, action),
      };
    },
    staleTime: 30_000,
    retry: false,
  });
};
