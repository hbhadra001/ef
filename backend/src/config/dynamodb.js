const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Import mock data for development
const { initializeMockData, mockDbOperations } = require('../utils/mockData');

// Initialize mock data if in development
if (process.env.NODE_ENV === 'development') {
  initializeMockData();
  console.log('🔧 Using mock data for development');
}

// Table names
const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'self-serve-users',
  SERVICES: process.env.DYNAMODB_SERVICES_TABLE || 'self-serve-services',
  REQUESTS: process.env.DYNAMODB_REQUESTS_TABLE || 'self-serve-requests'
};

// Helper functions for DynamoDB operations
const dbOperations = process.env.NODE_ENV === 'development' ? mockDbOperations : {
  // Get item by primary key
  async getItem(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key
    };
    
    try {
      const result = await dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error('DynamoDB getItem error:', error);
      throw error;
    }
  },

  // Put item
  async putItem(tableName, item) {
    const params = {
      TableName: tableName,
      Item: item
    };
    
    try {
      await dynamodb.put(params).promise();
      return item;
    } catch (error) {
      console.error('DynamoDB putItem error:', error);
      throw error;
    }
  },

  // Update item
  async updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    const params = {
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    try {
      const result = await dynamodb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error('DynamoDB updateItem error:', error);
      throw error;
    }
  },

  // Delete item
  async deleteItem(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key
    };
    
    try {
      await dynamodb.delete(params).promise();
      return true;
    } catch (error) {
      console.error('DynamoDB deleteItem error:', error);
      throw error;
    }
  },

  // Scan table
  async scanTable(tableName, filterExpression = null, expressionAttributeValues = {}) {
    const params = {
      TableName: tableName
    };

    if (filterExpression) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    try {
      const result = await dynamodb.scan(params).promise();
      return result.Items;
    } catch (error) {
      console.error('DynamoDB scan error:', error);
      throw error;
    }
  },

  // Query table
  async queryTable(tableName, keyConditionExpression, expressionAttributeValues, indexName = null) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues
    };

    if (indexName) {
      params.IndexName = indexName;
    }
    
    try {
      const result = await dynamodb.query(params).promise();
      return result.Items;
    } catch (error) {
      console.error('DynamoDB query error:', error);
      throw error;
    }
  }
};

module.exports = {
  dynamodb,
  TABLES,
  dbOperations
};