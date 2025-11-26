const { dbOperations, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class Service {
  constructor(serviceData) {
    this.id = serviceData.id || uuidv4();
    this.name = serviceData.name;
    this.description = serviceData.description;
    this.category = serviceData.category;
    this.icon = serviceData.icon || 'bi-gear';
    this.formFields = serviceData.formFields || [];
    this.approvalRequired = serviceData.approvalRequired !== undefined ? serviceData.approvalRequired : true;
    this.estimatedTime = serviceData.estimatedTime || '1-3 business days';
    this.isActive = serviceData.isActive !== undefined ? serviceData.isActive : true;
    this.createdAt = serviceData.createdAt || new Date().toISOString();
    this.updatedAt = serviceData.updatedAt || new Date().toISOString();
  }

  // Create a new service
  static async create(serviceData) {
    const service = new Service(serviceData);
    await dbOperations.putItem(TABLES.SERVICES, service);
    return service;
  }

  // Find service by ID
  static async findById(id) {
    return await dbOperations.getItem(TABLES.SERVICES, { id });
  }

  // Get all active services
  static async findAllActive() {
    return await dbOperations.scanTable(
      TABLES.SERVICES,
      'isActive = :isActive',
      { ':isActive': true }
    );
  }

  // Get all services (including inactive)
  static async findAll() {
    return await dbOperations.scanTable(TABLES.SERVICES);
  }

  // Get services by category
  static async findByCategory(category) {
    return await dbOperations.scanTable(
      TABLES.SERVICES,
      'category = :category AND isActive = :isActive',
      { 
        ':category': category,
        ':isActive': true
      }
    );
  }

  // Update service
  static async update(id, updateData) {
    updateData.updatedAt = new Date().toISOString();
    
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = updateData[key];
        expressionAttributeNames[`#${key}`] = key;
      }
    });

    if (updateExpression.length === 0) {
      throw new Error('No valid fields to update');
    }

    return await dbOperations.updateItem(
      TABLES.SERVICES,
      { id },
      `SET ${updateExpression.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );
  }

  // Delete service (soft delete by setting isActive to false)
  static async delete(id) {
    return await this.update(id, { isActive: false });
  }

  // Hard delete service
  static async hardDelete(id) {
    return await dbOperations.deleteItem(TABLES.SERVICES, { id });
  }

  // Search services
  static async search(searchTerm) {
    const services = await this.findAllActive();
    
    if (!searchTerm) return services;
    
    const term = searchTerm.toLowerCase();
    return services.filter(service => 
      service.name.toLowerCase().includes(term) ||
      service.description.toLowerCase().includes(term) ||
      service.category.toLowerCase().includes(term)
    );
  }
}

module.exports = Service;