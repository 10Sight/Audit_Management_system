import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://https://audit-management-system-server.onrender.com';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      // Do not set Content-Type globally to allow FormData uploads
      return headers;
    },
  }),
  tagTypes: [
    'Auth',
    'Employee',
    'Department',
    'Line',
    'Machine',
    'Process',
    'Question',
    'Audit',
  ],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation({
      query: () => ({ url: '/api/v1/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),
    getMe: builder.query({
      query: () => '/api/v1/auth/me',
      providesTags: ['Auth'],
    }),
    getUserStats: builder.query({
      query: () => '/api/v1/auth/user-stats',
      providesTags: ['Employee'],
    }),

    // Employees
    getEmployees: builder.query({
      query: ({ page = 1, limit = 20, search = '' } = {}) => ({
        url: '/api/v1/auth/get-employee',
        params: { page, limit, search },
      }),
      providesTags: (result) =>
        result?.data?.employees
          ? [
              ...result.data.employees.map((e) => ({ type: 'Employee', id: e._id })),
              { type: 'Employee', id: 'LIST' },
            ]
          : [{ type: 'Employee', id: 'LIST' }],
    }),
    getAllUsers: builder.query({
      query: ({ page = 1, limit = 20, search = '', role } = {}) => ({
        url: '/api/v1/auth/get-all-users',
        params: { page, limit, search, ...(role ? { role } : {}) },
      }),
      providesTags: [{ type: 'Employee', id: 'ALL' }],
    }),

    // Lines
    getLines: builder.query({
      query: () => '/api/lines',
      providesTags: [{ type: 'Line', id: 'LIST' }],
    }),
    createLine: builder.mutation({
      query: (body) => ({ url: '/api/lines', method: 'POST', body }),
      invalidatesTags: ['Line'],
    }),
    updateLine: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/lines/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Line'],
    }),
    deleteLine: builder.mutation({
      query: (id) => ({ url: `/api/lines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Line'],
    }),
    reorderLines: builder.mutation({
      query: (body) => ({ url: '/api/lines/reorder', method: 'POST', body }),
      invalidatesTags: ['Line'],
    }),

    // Machines
    getMachines: builder.query({
      query: () => '/api/machines',
      providesTags: [{ type: 'Machine', id: 'LIST' }],
    }),
    createMachine: builder.mutation({
      query: (body) => ({ url: '/api/machines', method: 'POST', body }),
      invalidatesTags: ['Machine'],
    }),
    updateMachine: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/machines/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Machine'],
    }),
    deleteMachine: builder.mutation({
      query: (id) => ({ url: `/api/machines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Machine'],
    }),

    // Processes
    getProcesses: builder.query({
      query: () => '/api/processes',
      providesTags: [{ type: 'Process', id: 'LIST' }],
    }),
    createProcess: builder.mutation({
      query: (body) => ({ url: '/api/processes', method: 'POST', body }),
      invalidatesTags: ['Process'],
    }),
    updateProcess: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/processes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Process'],
    }),
    deleteProcess: builder.mutation({
      query: (id) => ({ url: `/api/processes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Process'],
    }),

    // Questions
    getQuestions: builder.query({
      query: (params) => ({ url: '/api/questions', params }),
      providesTags: [{ type: 'Question', id: 'LIST' }],
    }),
    createQuestions: builder.mutation({
      query: (body) => ({ url: '/api/questions', method: 'POST', body }),
      invalidatesTags: ['Question'],
    }),
    deleteQuestion: builder.mutation({
      query: (id) => ({ url: `/api/questions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Question'],
    }),

    // Audits
    getAudits: builder.query({
      query: ({ page = 1, limit = 20, auditor, startDate, endDate, line, machine, process, result } = {}) => ({
        url: '/api/audits',
        params: { page, limit, auditor, startDate, endDate, line, machine, process, result },
      }),
      providesTags: [{ type: 'Audit', id: 'LIST' }],
    }),
    getAuditById: builder.query({
      query: (id) => `/api/audits/${id}`,
      providesTags: (result, error, id) => [{ type: 'Audit', id }],
    }),
    createAudit: builder.mutation({
      query: (body) => ({ url: '/api/audits', method: 'POST', body }),
      invalidatesTags: ['Audit'],
    }),
    updateAudit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/audits/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Audit', id }, { type: 'Audit', id: 'LIST' }],
    }),
    deleteAudit: builder.mutation({
      query: (id) => ({ url: `/api/audits/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Audit', id: 'LIST' }],
    }),

    // Departments
    getDepartments: builder.query({
      query: ({ page = 1, limit = 20, includeInactive = false } = {}) => ({
        url: '/api/v1/departments',
        params: { page, limit, includeInactive },
      }),
      providesTags: [{ type: 'Department', id: 'LIST' }],
    }),
    getDepartmentStats: builder.query({
      query: () => '/api/v1/departments/stats',
      providesTags: [{ type: 'Department', id: 'STATS' }],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({ url: '/api/v1/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/v1/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Department'],
    }),
    deleteDepartment: builder.mutation({
      query: ({ id, payload }) => ({ url: `/api/v1/departments/${id}`, method: 'DELETE', body: payload }),
      invalidatesTags: ['Department'],
    }),
    assignEmployeeToDepartment: builder.mutation({
      query: (body) => ({ url: '/api/v1/departments/assign-employee', method: 'POST', body }),
      invalidatesTags: ['Department', 'Employee'],
    }),

    // Employee single
    getEmployeeById: builder.query({
      query: (id) => `/api/v1/auth/employee/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employee', id }],
    }),
    updateEmployeeById: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/v1/auth/employee/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),
    deleteEmployeeById: builder.mutation({
      query: (id) => ({ url: `/api/v1/auth/employee/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
    registerEmployee: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/register', method: 'POST', body }),
      invalidatesTags: ['Employee'],
    }),

    // Uploads
    uploadImage: builder.mutation({
      query: (file) => {
        const form = new FormData();
        form.append('photo', file);
        return { url: '/api/upload/image', method: 'POST', body: form };
      },
    }),
    deleteUpload: builder.mutation({
      query: (publicId) => ({ url: `/api/upload/${publicId}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetEmployeesQuery,
  useGetAllUsersQuery,
  useGetLinesQuery,
  useCreateLineMutation,
  useUpdateLineMutation,
  useDeleteLineMutation,
  useReorderLinesMutation,
  useGetMachinesQuery,
  useCreateMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
  useGetProcessesQuery,
  useCreateProcessMutation,
  useUpdateProcessMutation,
  useDeleteProcessMutation,
  useGetQuestionsQuery,
  useCreateQuestionsMutation,
  useDeleteQuestionMutation,
  useGetAuditsQuery,
  useGetAuditByIdQuery,
  useCreateAuditMutation,
  useUpdateAuditMutation,
  useDeleteAuditMutation,
  useGetDepartmentsQuery,
  useGetDepartmentStatsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAssignEmployeeToDepartmentMutation,
  useGetEmployeeByIdQuery,
  useUpdateEmployeeByIdMutation,
  useDeleteEmployeeByIdMutation,
  useRegisterEmployeeMutation,
  useUploadImageMutation,
  useDeleteUploadMutation,
  useGetUserStatsQuery,
} = api;
