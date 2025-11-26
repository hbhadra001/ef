// Mock data for development (simulates DynamoDB responses)
const mockUsers = new Map();
const mockServices = new Map();
const mockRequests = new Map();

// Initialize with sample data
const initializeMockData = () => {
  // Sample users
  const users = [
    {
      id: '1',
      email: 'john.doe@company.com',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering',
      role: 'user',
      passwordHash: '$2a$10$example.hash.for.password123',
      createdAt: '2024-01-15T10:00:00.000Z',
      lastLogin: '2024-11-26T08:30:00.000Z',
      isActive: true
    },
    {
      id: '2',
      email: 'jane.smith@company.com',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'IT',
      role: 'admin',
      passwordHash: '$2a$10$example.hash.for.admin123',
      createdAt: '2024-01-10T09:00:00.000Z',
      lastLogin: '2024-11-26T09:00:00.000Z',
      isActive: true
    },
    {
      id: '3',
      email: 'mike.manager@company.com',
      firstName: 'Mike',
      lastName: 'Manager',
      department: 'Operations',
      role: 'manager',
      passwordHash: '$2a$10$example.hash.for.manager123',
      createdAt: '2024-01-12T11:00:00.000Z',
      lastLogin: '2024-11-25T16:45:00.000Z',
      isActive: true
    }
  ];

  users.forEach(user => mockUsers.set(user.id, user));

  // Sample services
  const services = [
    {
      id: 'srv-1',
      name: 'New Laptop Request',
      description: 'Request a new laptop for work purposes',
      category: 'Hardware',
      icon: 'bi-laptop',
      formFields: [
        {
          name: 'laptopType',
          label: 'Laptop Type',
          type: 'select',
          required: true,
          options: ['MacBook Pro', 'MacBook Air', 'Dell XPS', 'ThinkPad']
        },
        {
          name: 'specifications',
          label: 'Required Specifications',
          type: 'textarea',
          required: true,
          placeholder: 'Please specify RAM, storage, and any special requirements'
        },
        {
          name: 'urgency',
          label: 'Urgency',
          type: 'select',
          required: true,
          options: ['Standard', 'Urgent', 'Emergency']
        }
      ],
      approvalRequired: true,
      estimatedTime: '3-5 business days',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'srv-2',
      name: 'Software License',
      description: 'Request access to software licenses',
      category: 'Software',
      icon: 'bi-key',
      formFields: [
        {
          name: 'softwareName',
          label: 'Software Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Adobe Creative Suite, Microsoft Office'
        },
        {
          name: 'licenseType',
          label: 'License Type',
          type: 'select',
          required: true,
          options: ['Individual', 'Team', 'Enterprise']
        },
        {
          name: 'businessJustification',
          label: 'Business Justification',
          type: 'textarea',
          required: true,
          placeholder: 'Explain why this software is needed for your work'
        }
      ],
      approvalRequired: true,
      estimatedTime: '1-2 business days',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'srv-3',
      name: 'VPN Access',
      description: 'Request VPN access for remote work',
      category: 'Network',
      icon: 'bi-shield-lock',
      formFields: [
        {
          name: 'accessType',
          label: 'Access Type',
          type: 'select',
          required: true,
          options: ['Standard VPN', 'Admin VPN', 'Developer VPN']
        },
        {
          name: 'duration',
          label: 'Access Duration',
          type: 'select',
          required: true,
          options: ['30 days', '90 days', '1 year', 'Permanent']
        }
      ],
      approvalRequired: false,
      estimatedTime: '1 business day',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ];

  services.forEach(service => mockServices.set(service.id, service));

  // Sample requests
  const requests = [
    {
      id: 'req-1',
      userId: '1',
      serviceId: 'srv-1',
      serviceName: 'New Laptop Request',
      description: 'MacBook Pro for development work',
      formData: {
        laptopType: 'MacBook Pro',
        specifications: '16GB RAM, 512GB SSD, M2 chip',
        urgency: 'Standard'
      },
      status: 'pending',
      priority: 'medium',
      submittedAt: '2024-11-25T10:00:00.000Z',
      updatedAt: '2024-11-25T10:00:00.000Z',
      approvedAt: null,
      completedAt: null,
      approvedBy: null,
      assignedTo: null,
      comments: [],
      attachments: []
    },
    {
      id: 'req-2',
      userId: '1',
      serviceId: 'srv-2',
      serviceName: 'Software License',
      description: 'Adobe Creative Suite license',
      formData: {
        softwareName: 'Adobe Creative Suite',
        licenseType: 'Individual',
        businessJustification: 'Need for creating marketing materials and presentations'
      },
      status: 'approved',
      priority: 'medium',
      submittedAt: '2024-11-24T14:30:00.000Z',
      updatedAt: '2024-11-24T16:00:00.000Z',
      approvedAt: '2024-11-24T16:00:00.000Z',
      completedAt: null,
      approvedBy: '2',
      assignedTo: null,
      comments: [
        {
          id: 'comment-1',
          userId: '2',
          comment: 'Approved. License will be provisioned within 24 hours.',
          timestamp: '2024-11-24T16:00:00.000Z'
        }
      ],
      attachments: []
    }
  ];

  requests.forEach(request => mockRequests.set(request.id, request));
};

// Mock DynamoDB operations
const mockDbOperations = {
  async getItem(tableName, key) {
    const keyValue = Object.values(key)[0];
    
    if (tableName.includes('users')) {
      return mockUsers.get(keyValue) || null;
    } else if (tableName.includes('services')) {
      return mockServices.get(keyValue) || null;
    } else if (tableName.includes('requests')) {
      return mockRequests.get(keyValue) || null;
    }
    
    return null;
  },

  async putItem(tableName, item) {
    if (tableName.includes('users')) {
      mockUsers.set(item.id, item);
    } else if (tableName.includes('services')) {
      mockServices.set(item.id, item);
    } else if (tableName.includes('requests')) {
      mockRequests.set(item.id, item);
    }
    
    return item;
  },

  async updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    const keyValue = Object.values(key)[0];
    let item;
    
    if (tableName.includes('users')) {
      item = mockUsers.get(keyValue);
    } else if (tableName.includes('services')) {
      item = mockServices.get(keyValue);
    } else if (tableName.includes('requests')) {
      item = mockRequests.get(keyValue);
    }
    
    if (!item) return null;
    
    // Simple update logic for mock data
    Object.keys(expressionAttributeValues).forEach(key => {
      const fieldName = key.replace(':', '');
      item[fieldName] = expressionAttributeValues[key];
    });
    
    return item;
  },

  async deleteItem(tableName, key) {
    const keyValue = Object.values(key)[0];
    
    if (tableName.includes('users')) {
      return mockUsers.delete(keyValue);
    } else if (tableName.includes('services')) {
      return mockServices.delete(keyValue);
    } else if (tableName.includes('requests')) {
      return mockRequests.delete(keyValue);
    }
    
    return false;
  },

  async scanTable(tableName, filterExpression = null, expressionAttributeValues = {}) {
    let items = [];
    
    if (tableName.includes('users')) {
      items = Array.from(mockUsers.values());
    } else if (tableName.includes('services')) {
      items = Array.from(mockServices.values());
    } else if (tableName.includes('requests')) {
      items = Array.from(mockRequests.values());
    }
    
    // Simple filtering for mock data
    if (filterExpression && Object.keys(expressionAttributeValues).length > 0) {
      const filterValue = Object.values(expressionAttributeValues)[0];
      const filterField = Object.keys(expressionAttributeValues)[0].replace(':', '');
      
      items = items.filter(item => {
        if (filterExpression.includes('=')) {
          return item[filterField] === filterValue;
        }
        return true;
      });
    }
    
    return items;
  },

  async queryTable(tableName, keyConditionExpression, expressionAttributeValues, indexName = null) {
    // For mock purposes, treat query like scan with filtering
    return this.scanTable(tableName, keyConditionExpression, expressionAttributeValues);
  }
};

module.exports = {
  initializeMockData,
  mockDbOperations,
  mockUsers,
  mockServices,
  mockRequests
};