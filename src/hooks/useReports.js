import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { qk } from '../lib/queryKeys'
import {
  listReports,
  listMyReports,
  createReport,
  updateReportStatus,
  deleteReport,
  listCategories,
  getMatchSettings,
} from '../lib/api'

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: listCategories,
    staleTime: 10 * 60 * 1000,
  })
}

export function useMatchSettings() {
  return useQuery({
    queryKey: qk.matchSettings(),
    queryFn: getMatchSettings,
    staleTime: 10 * 60 * 1000,
  })
}

export function useReports(filters) {
  return useQuery({
    queryKey: qk.reports(filters),
    queryFn: () => listReports(filters),
    placeholderData: (previous) => previous, // يمنع وميض الهيكل عند تغيّر الصفحة
  })
}

export function useMyReports() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: qk.myReports(userId),
    queryFn: () => listMyReports(userId),
    enabled: Boolean(userId),
  })
}

export function useCreateReport() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, images }) => createReport(input, images, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}

export function useUpdateReportStatus() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateReportStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.report(variables.id) })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}

export function useDeleteReport() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}
