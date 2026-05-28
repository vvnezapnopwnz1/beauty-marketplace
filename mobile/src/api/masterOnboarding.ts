import apiClient from './client';
import { USER, MASTER } from './endpoints';
import type {
  MasterOnboardingStartResult,
  MasterCabinetProfile,
  UpdateMasterCabinetProfile,
  DashboardServiceCategoriesResponse,
  PublishMasterProfileResult,
  MasterServiceDTO,
  CreateMasterServiceInput,
} from './types';

export async function startMasterOnboarding(): Promise<MasterOnboardingStartResult> {
  const { data } = await apiClient.post<MasterOnboardingStartResult>(USER.meOnboardingStart);
  return data;
}

export async function getMyMasterProfile(): Promise<MasterCabinetProfile> {
  const { data } = await apiClient.get<MasterCabinetProfile>(MASTER.profile);
  return data;
}

export async function updateMyMasterProfile(payload: UpdateMasterCabinetProfile): Promise<MasterCabinetProfile> {
  const { data } = await apiClient.put<MasterCabinetProfile>(MASTER.profile, payload);
  return data;
}

export async function fetchMasterServiceCategories(): Promise<DashboardServiceCategoriesResponse> {
  const { data } = await apiClient.get<DashboardServiceCategoriesResponse>(MASTER.serviceCategories);
  return data;
}

export async function advanceMasterOnboardingStep(step: string): Promise<{ onboardingStep: string }> {
  const { data } = await apiClient.post<{ onboardingStep: string }>(MASTER.onboardingStep, { step });
  return data;
}

export async function publishMasterProfile(): Promise<PublishMasterProfileResult> {
  const { data } = await apiClient.post<PublishMasterProfileResult>(MASTER.publish);
  return data;
}

export async function getMasterServices(): Promise<MasterServiceDTO[]> {
  const { data } = await apiClient.get<MasterServiceDTO[]>(MASTER.services);
  return data;
}

export async function createMasterService(body: CreateMasterServiceInput): Promise<MasterServiceDTO> {
  const { data } = await apiClient.post<MasterServiceDTO>(MASTER.services, body);
  return data;
}

export async function updateMasterService(id: string, body: CreateMasterServiceInput): Promise<MasterServiceDTO> {
  const { data } = await apiClient.put<MasterServiceDTO>(MASTER.service(id), body);
  return data;
}

export async function deleteMasterService(id: string): Promise<void> {
  await apiClient.delete(MASTER.service(id));
}
