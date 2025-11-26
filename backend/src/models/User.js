const { dbOperations, TABLES } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id || uuidv4();
    this.email = userData.email;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.department = userData.department;
    this.role = userData.role || 'user';
    this.avatar = userData.avatar || null;
    this.passwordHash = userData.passwordHash;
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.lastLogin = userData.lastLogin || null;
    this.isActive = userData.isActive !== undefined ? userData.isActive : true;
  }

  // Create a new user
  static async create(userData) {
    const user = new User(userData);
    
    // Hash password if provided
    if (userData.password) {
      user.passwordHash = await bcrypt.hash(userData.password, 10);
    }

    await dbOperations.putItem(TABLES.USERS, user);
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by ID
  static async findById(id) {
    const user = await dbOperations.getItem(TABLES.USERS, { id });
    if (!user) return null;
    
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by email
  static async findByEmail(email) {
    const users = await dbOperations.scanTable(
      TABLES.USERS,
      'email = :email',
      { ':email': email }
    );
    
    return users.length > 0 ? users[0] : null;
  }

  // Verify password
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    await this.updateLastLogin(user.id);
    
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Update user
  static async update(id, updateData) {
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

    const updatedUser = await dbOperations.updateItem(
      TABLES.USERS,
      { id },
      `SET ${updateExpression.join(', ')}`,
      expressionAttributeValues,
      expressionAttributeNames
    );

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  // Update last login
  static async updateLastLogin(id) {
    return await dbOperations.updateItem(
      TABLES.USERS,
      { id },
      'SET lastLogin = :lastLogin',
      { ':lastLogin': new Date().toISOString() }
    );
  }

  // Get all users (admin only)
  static async findAll() {
    const users = await dbOperations.scanTable(TABLES.USERS);
    return users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Delete user
  static async delete(id) {
    return await dbOperations.deleteItem(TABLES.USERS, { id });
  }
}

module.exports = User;