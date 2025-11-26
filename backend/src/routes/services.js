const express = require('express');
const Service = require('../models/Service');
const { authenticateToken, requireAdmin, requireManager } = require('../middleware/auth');
const { validate, serviceSchemas } = require('../middleware/validation');

const router = express.Router();

// Get all active services (public access with demo data)
router.get('/', async (req, res) => {
  try {
    // Return mock services for demo
    const mockServices = [
      {
        id: 'aws-ec2',
        name: 'AWS EC2 Instance',
        description: 'Scalable virtual servers in the cloud with flexible compute capacity',
        category: 'Compute',
        provider: 'AWS',
        status: 'Available',
        pricing: 'Starting at $0.0116/hour',
        isActive: true
      },
      {
        id: 'aws-s3',
        name: 'AWS S3 Bucket',
        description: 'Object storage service with industry-leading scalability and security',
        category: 'Storage',
        provider: 'AWS',
        status: 'Available',
        pricing: 'Starting at $0.023/GB/month',
        isActive: true
      },
      {
        id: 'aws-rds',
        name: 'AWS RDS Database',
        description: 'Managed relational database service with automated backups',
        category: 'Database',
        provider: 'AWS',
        status: 'Available',
        pricing: 'Starting at $0.017/hour',
        isActive: true
      },
      {
        id: 'azure-vm',
        name: 'Azure Virtual Machine',
        description: 'On-demand, scalable computing resources with Windows or Linux',
        category: 'Compute',
        provider: 'Azure',
        status: 'Available',
        pricing: 'Starting at $0.012/hour',
        isActive: true
      },
      {
        id: 'azure-storage',
        name: 'Azure Storage Account',
        description: 'Highly available, secure, and scalable cloud storage solution',
        category: 'Storage',
        provider: 'Azure',
        status: 'Available',
        pricing: 'Starting at $0.018/GB/month',
        isActive: true
      },
      {
        id: 'gcp-compute',
        name: 'GCP Compute Engine',
        description: 'High-performance virtual machines running on Google infrastructure',
        category: 'Compute',
        provider: 'GCP',
        status: 'Available',
        pricing: 'Starting at $0.010/hour',
        isActive: true
      }
    ];

    const { category, search } = req.query;
    let filteredServices = mockServices;

    // Apply filters
    if (category) {
      filteredServices = mockServices.filter(service => 
        service.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      filteredServices = filteredServices.filter(service =>
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.provider.toLowerCase().includes(searchTerm)
      );
    }

    res.json(filteredServices);
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