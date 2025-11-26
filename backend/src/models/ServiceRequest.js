const { dbOperations, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class ServiceRequest {
  constructor(requestData) {
    this.id = requestData.id || uuidv4();
    this.userId = requestData.userId;
    this.serviceId = requestData.serviceId;
    this.serviceName = requestData.serviceName;
    this.description = requestData.description || '';
    this.formData = requestData.formData || {};
    this.status = requestData.status || 'pending';
    this.priority = requestData.priority || 'medium';
    this.submittedAt = requestData.submittedAt || new Date().toISOString();
    this.updatedAt = requestData.updatedAt || new Date().toISOString();
    this.approvedAt = requestData.approvedAt || null;
    this.completedAt = requestData.completedAt || null;
    this.approvedBy = requestData.approvedBy || null;
    this.assignedTo = requestData.assignedTo || null;
    this.comments = requestData.comments || [];
    this.attachments = requestData.attachments || [];
  }

  // Create a new service request
  static async create(requestData) {
    const request = new ServiceRequest(requestData);
    await dbOperations.putItem(TABLES.REQUESTS, request);
    return request;
  }

  // Find request by ID
  static async findById(id) {
    return await dbOperations.getItem(TABLES.REQUESTS, { id });
  }

  // Get all requests for a user
  static async findByUserId(userId) {
    return await dbOperations.scanTable(
      TABLES.REQUESTS,
      'userId = :userId',
      { ':userId': userId }
    );
  }

  // Get requests by status
  static async findByStatus(status) {
    return await dbOperations.scanTable(
      TABLES.REQUESTS,
      '#status = :status',
      { ':status': status },
      { '#status': 'status' }
    );
  }

  // Get all requests (admin view)
  static async findAll(limit = 50, lastEvaluatedKey = null) {
    const params = {
      TableName: TABLES.REQUESTS,
      Limit: limit
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const result = await dbOperations.dynamodb.scan(params).promise();
      return {
        items: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey
      };
    } catch (error) {
      console.error('Error fetching all requests:', error);
      throw error;
    }
  }

  // Update request status
  static async updateStatus(id, status, updatedBy = null) {
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'approved' && !updateData.approvedAt) {
      updateData.approvedAt = new Date().toISOString();
      if (updatedBy) updateData.approvedBy = updatedBy;
    }

    if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date().toISOString();
    }

    return await this.update(id, updateData);
  }

  // Update request
  static async update(id, updateData) {
    updateData.updatedAt = new Date().toISOString();
    
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'submittedAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = updateData[key];
        expressionAttributeNames[`#${key}`] = key;
      }
    });

    if (updateExpression.length === 0) {
      throw new Error('No valid fields to update');
    }

    return await dbOperations.updateItem(
      TABLES.REQUESTS,
      { id },
      `SET ${updateExpression.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );
  }

  // Add comment to request
  static async addComment(id, comment, userId) {
    const request = await this.findById(id);
    if (!request) {
      throw new Error('Request not found');
    }

    const newComment = {
      id: uuidv4(),
      userId,
      comment,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(request.comments || []), newComment];

    return await this.update(id, { comments: updatedComments });
  }

  // Get request statistics
  static async getStatistics() {
    const allRequests = await dbOperations.scanTable(TABLES.REQUESTS);
    
    const stats = {
      total: allRequests.length,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0
    };

    allRequests.forEach(request => {
      if (stats.hasOwnProperty(request.status)) {
        stats[request.status]++;
      }
    });

    return stats;
  }

  // Get user's request statistics
  static async getUserStatistics(userId) {
    const userRequests = await this.findByUserId(userId);
    
    const stats = {
      total: userRequests.length,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0
    };

    userRequests.forEach(request => {
      if (stats.hasOwnProperty(request.status)) {
        stats[request.status]++;
      }
    });

    return stats;
  }

  // Delete request
  static async delete(id) {
    return await dbOperations.deleteItem(TABLES.REQUESTS, { id });
  }
}

module.exports = ServiceRequest;