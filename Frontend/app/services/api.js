import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for all API requests
const API_BASE_URL = 'http://192.168.1.104:5001';

// Helper function to get the auth token
const getAuthToken = async () => {
  return await AsyncStorage.getItem('token');
};

// Helper to handle API errors consistently
const handleApiError = (error) => {
  console.error('API Error:', error);
  return { error: error.message || 'An unexpected error occurred' };
};

/**
 * Makes an authenticated API request with proper error handling
 * 
 * @param {string} endpoint - API endpoint (without the base URL)
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {boolean} requiresAuth - Whether this request needs authentication
 * @returns {Promise<Object>} - Response data or error object
 */
const apiRequest = async (endpoint, options = {}, requiresAuth = true) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Setup headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if required
    if (requiresAuth) {
      const token = await getAuthToken();
      if (!token) {
        return { error: 'Not authenticated' };
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`Making request to: ${url}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }
    
    // Handle API errors
    if (!response.ok) {
      console.log(`API Error (${response.status}):`, data);
      return { 
        error: data.error || data.message || `Request failed with status ${response.status}`,
        status: response.status,
        data
      };
    }

    return { data, status: response.status };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Request timed out. Please check your connection and try again.' };
    }
    return handleApiError(error);
  }
};

// Auth API calls
export const authAPI = {
  login: (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
  },
  
  register: (name, email, password) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }, false);
  },
  
  getProfile: () => {
    return apiRequest('/me');
  },
};

// Group API calls
export const groupAPI = {
  create: (name) => {
    return apiRequest('/groups/create', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  
  join: (inviteCode) => {
    return apiRequest('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  },
  
  getUsers: (groupId) => {
    return apiRequest(`/groups/${groupId}/users`);
  },
};

// Expense API calls
export const expenseAPI = {
  getHistory: (groupId) => {
    return apiRequest(`/expenses/history/${groupId}`);
  },
  
  getUserExpenses: () => {
    return apiRequest('/expenses/me');
  },
  
  create: (expenseData) => {
    return apiRequest('/expense/create', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },
  
  pay: (paymentData) => {
    return apiRequest('/expenses/pay', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },
};

// Calendar API calls
export const calendarAPI = {
  getGroupEvents: (groupId) => {
    return apiRequest(`/calendar/group/${groupId}`);
  },
  
  createEvent: (eventData) => {
    return apiRequest('/calendar/create', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },
};

// Inventory API calls
export const inventoryAPI = {
  getGroupItems: (groupId) => {
    return apiRequest(`/inventory/group/${groupId}`);
  },
  
  addItem: (itemData) => {
    return apiRequest('/inventory/add', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },
};

// Chores API calls
export const choresAPI = {
  create: (choreData) => {
    return apiRequest('/chores/create', {
      method: 'POST',
      body: JSON.stringify(choreData),
    });
  },
  
  getUserChores: (userId) => {
    return apiRequest(`/chores/user/${userId}`);
  },
  
  getGroupChores: (groupId) => {
    return apiRequest(`/chores/group/${groupId}`);
  },
  
  updateStatus: (choreId, status) => {
    return apiRequest(`/chores/update/${choreId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};

// Utility to test if the API is reachable
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test', password: 'test' })
    });
    
    // If we got any response, the server is reachable
    return { connected: true, status: response.status };
  } catch (error) {
    console.error('API connection test failed:', error);
    return { connected: false, error: error.message };
  }
};

export default {
  authAPI,
  groupAPI,
  expenseAPI,
  calendarAPI,
  inventoryAPI,
  choresAPI,
  getAuthToken,
  testConnection,
  BASE_URL: API_BASE_URL,
}; 