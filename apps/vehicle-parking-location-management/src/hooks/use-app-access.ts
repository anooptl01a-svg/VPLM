import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
      if (!supabase || !userObjectId) throw new Error('Authenticated workspace membership is required.');
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', userObjectId)
        .single();
      if (error) throw error;
      if (!['Administrator', 'Supervisor', 'TechnicalLeader', 'Operator'].includes(data.role)) {
        throw new Error('Workspace membership has an invalid role.');
      }
      const role = data.role as AppRole;
      return {
        appUser: { id: userObjectId, applicationUserName: userPrincipalName?.split('@')[0] ?? 'Operator', email: userPrincipalName ?? '' },
        role,
        can: (feature: AccessFeature, action: AccessAction) => roleCan(role, feature, action),
      };
    },
    staleTime: 30_000,
    retry: false,
  });
};
