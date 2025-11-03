import { apiClient } from './api';

export const employeeService = {
  getEmployees: async () => {
    try {
      const response = await apiClient.get('/employees/employees');

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch employees',
      };
    }
  },

  getEmployeeById: async (employeeId) => {
    try {
      const response = await apiClient.get(
        `/employees/employees/${employeeId}`
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch employee',
      };
    }
  },

  createEmployee: async (employeeData) => {
    try {
      const response = await apiClient.post('/employees/create', employeeData);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create employee',
      };
    }
  },

  updateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await apiClient.put(
        `/employees/${employeeId}`,
        employeeData
      );
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update employee',
      };
    }
  },

  deleteEmployee: async (employeeId) => {
    try {
      const response = await apiClient.delete(`/employees/${employeeId}`);
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete employee',
      };
    }
  },
};
