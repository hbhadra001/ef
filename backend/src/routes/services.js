const express = require('express');
const Service = require('../models/Service');
const { authenticateToken, requireAdmin, requireManager } = require('../middleware/auth');
const { validate, serviceSchemas } = require('../middleware/validation');

const router = express.Router();

// Get all active services (public access)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let services;
    if (search) {
      services = await Service.search(search);
    } else if (category) {
      services = await Service.findByCategory(category);
    } else {
      services = await Service.findAllActive();
    }

    res.json({
      services,
      total: services.length
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch services'
    });
  }
});

// Get all services including inactive (admin only)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const services = await Service.findAll();
    res.json({
      services,
      total: services.length
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch all services'
    });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    res.json({ service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch service'
    });
  }
});

// Create new service (admin only)
router.post('/', authenticateToken, requireAdmin, validate(serviceSchemas.create), async (req, res) => {
  try {
    const service = await Service.create(req.body);
    
    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create service'
    });
  }
});

// Update service (admin only)
router.put('/:id', authenticateToken, requireAdmin, validate(serviceSchemas.update), async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    const updatedService = await Service.update(id, req.body);
    
    res.json({
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update service'
    });
  }
});

// Toggle service active status (admin only)
router.patch('/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    const updatedService = await Service.update(id, { isActive: !service.isActive });
    
    res.json({
      message: `Service ${updatedService.isActive ? 'activated' : 'deactivated'} successfully`,
      service: updatedService
    });
  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to toggle service status'
    });
  }
});

// Delete service (soft delete - admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    await Service.delete(id);
    
    res.json({
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete service'
    });
  }
});

// Hard delete service (admin only)
router.delete('/:id/hard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Service not found'
      });
    }

    await Service.hardDelete(id);
    
    res.json({
      message: 'Service permanently deleted'
    });
  } catch (error) {
    console.error('Hard delete service error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to permanently delete service'
    });
  }
});

// Get service categories
router.get('/meta/categories', async (req, res) => {
  try {
    const services = await Service.findAllActive();
    const categories = [...new Set(services.map(service => service.category))];
    
    res.json({
      categories: categories.sort()
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch categories'
    });
  }
});

module.exports = router;