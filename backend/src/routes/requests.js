const express = require('express');
const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validate, requestSchemas } = require('../middleware/validation');

const router = express.Router();

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

// Get all requests (manager/admin only)
router.get('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const { status, limit = 50, lastKey } = req.query;
    
    let requests;
    if (status) {
      requests = await ServiceRequest.findByStatus(status);
    } else {
      const result = await ServiceRequest.findAll(parseInt(limit), lastKey);
      requests = result.items;
    }
    
    // Sort by submission date (newest first)
    requests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    res.json({
      requests,
      total: requests.length
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

// Create new service request
router.post('/', authenticateToken, validate(requestSchemas.create), async (req, res) => {
  try {
    const { serviceId, serviceName, description, formData, priority } = req.body;
    
    // Verify service exists and is active
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Service not found or inactive'
      });
    }

    const requestData = {
      userId: req.user.id,
      serviceId,
      serviceName: serviceName || service.name,
      description,
      formData,
      priority
    };

    const request = await ServiceRequest.create(requestData);
    
    res.status(201).json({
      message: 'Service request created successfully',
      request
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create request'
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