const express = require('express');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validate, requestSchemas } = require('../middleware/validation');

const router = express.Router();

// Demo endpoint to get requests without auth
router.get('/demo', async (req, res) => {
  try {
    // Return mock requests for demo
    const mockRequests = [
      {
        id: 'REQ-DEMO1',
        requestId: 'REQ-DEMO1',
        serviceType: 'aws-ec2',
        title: 'Development Environment Setup',
        description: 'Need EC2 instances for development team',
        priority: 'medium',
        environment: 'development',
        status: 'pending',
        submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        contactEmail: 'dev@company.com',
        department: 'Engineering'
      },
      {
        id: 'REQ-DEMO2',
        requestId: 'REQ-DEMO2',
        serviceType: 'aws-s3',
        title: 'Data Backup Storage',
        description: 'S3 bucket for automated backups',
        priority: 'high',
        environment: 'production',
        status: 'approved',
        submittedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        contactEmail: 'ops@company.com',
        department: 'Operations'
      }
    ];

    res.json({
      requests: mockRequests,
      total: mockRequests.length
    });
  } catch (error) {
    console.error('Get demo requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch requests'
    });
  }
});

// Get user's requests
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const requests = await ServiceRequest.findByUserId(req.user.id);
    
    // Sort by submission date (newest first)
    requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    res.json({
      requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Get user requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch requests'
    });
  }
});

// Get user's request statistics
router.get('/my/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await ServiceRequest.getUserStatistics(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics'
    });
  }
});

// Get all requests (demo version without auth)
router.get('/', async (req, res) => {
  try {
    // Return mock requests for demo
    const mockRequests = [
      {
        id: 'REQ-DEMO1',
        requestId: 'REQ-DEMO1',
        serviceType: 'aws-ec2',
        title: 'Development Environment Setup',
        description: 'Need EC2 instances for development team',
        priority: 'medium',
        environment: 'development',
        status: 'pending',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        contactEmail: 'dev@company.com',
        department: 'Engineering'
      },
      {
        id: 'REQ-DEMO2',
        requestId: 'REQ-DEMO2',
        serviceType: 'aws-s3',
        title: 'Data Backup Storage',
        description: 'S3 bucket for automated backups',
        priority: 'high',
        environment: 'production',
        status: 'approved',
        submittedAt: new Date(Date.now() - 172800000).toISOString(),
        contactEmail: 'ops@company.com',
        department: 'Operations'
      }
    ];
    
    res.json({
      requests: mockRequests,
      total: mockRequests.length
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch requests'
    });
  }
});

// Get request statistics (manager/admin only)
router.get('/stats', authenticateToken, requireManager, async (req, res) => {
  try {
    const stats = await ServiceRequest.getStatistics();
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics'
    });
  }
});

// Get request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Request not found'
      });
    }

    // Users can only view their own requests unless they're manager/admin
    if (!['admin', 'manager'].includes(req.user.role) && request.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    res.json({ request });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch request'
    });
  }
});

// Create new service request (demo version without auth)
router.post('/', async (req, res) => {
  try {
    console.log('Received request data:', req.body);
    
    // Extract data from the form submission
    const {
      serviceType,
      title,
      description,
      priority,
      environment,
      businessJustification,
      estimatedUsers,
      budget,
      requiredBy,
      technicalRequirements,
      complianceRequirements,
      contactEmail,
      department,
      requestId
    } = req.body;

    // Generate a unique request ID if not provided
    const generatedRequestId = requestId || 'REQ-' + Date.now().toString(36).toUpperCase();

    // Create mock request data for demo
    const requestData = {
      id: generatedRequestId,
      requestId: generatedRequestId,
      serviceType,
      title,
      description,
      priority: priority || 'medium',
      environment: environment || 'development',
      businessJustification,
      estimatedUsers: parseInt(estimatedUsers) || 1,
      budget: parseFloat(budget) || 0,
      requiredBy,
      technicalRequirements,
      complianceRequirements,
      contactEmail,
      department,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      userId: 'demo-user',
      userName: 'Demo User'
    };

    // For demo purposes, just return success without actually storing
    console.log('Created request:', requestData);
    
    res.status(201).json({
      message: 'Service request submitted successfully!',
      requestId: generatedRequestId,
      request: requestData,
      success: true
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create request',
      success: false
    });
  }
});

// Update request status (manager/admin only)
router.patch('/:id/status', authenticateToken, requireManager, validate(requestSchemas.updateStatus), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Request not found'
      });
    }

    const updatedRequest = await ServiceRequest.updateStatus(id, status, req.user.id);
    
    res.json({
      message: 'Request status updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update request status'
    });
  }
});

// Add comment to request
router.post('/:id/comments', authenticateToken, validate(requestSchemas.addComment), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Request not found'
      });
    }

    // Users can only comment on their own requests unless they're manager/admin
    if (!['admin', 'manager'].includes(req.user.role) && request.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    const updatedRequest = await ServiceRequest.addComment(id, comment, req.user.id);
    
    res.json({
      message: 'Comment added successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add comment'
    });
  }
});

// Update request (user can update their own pending requests)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Request not found'
      });
    }

    // Users can only update their own requests
    if (request.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Only allow updates to pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only update pending requests'
      });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['description', 'formData', 'priority'];
    const updateData = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
    }

    const updatedRequest = await ServiceRequest.update(id, updateData);
    
    res.json({
      message: 'Request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update request'
    });
  }
});

// Delete request (user can delete their own pending requests, admin can delete any)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Request not found'
      });
    }

    // Check permissions
    const canDelete = req.user.role === 'admin' || 
                     (request.userId === req.user.id && request.status === 'pending');
    
    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot delete this request'
      });
    }

    await ServiceRequest.delete(id);
    
    res.json({
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete request'
    });
  }
});

module.exports = router;