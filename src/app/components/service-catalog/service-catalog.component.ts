import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Service } from '../../services/api.service';

@Component({
  selector: 'app-service-catalog',
  imports: [CommonModule, RouterModule],
  templateUrl: './service-catalog.component.html',
  styleUrl: './service-catalog.component.scss'
})
export class ServiceCatalogComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  categories: string[] = ['All', 'Compute', 'Storage', 'Database', 'Networking', 'Security'];
  selectedCategory = 'All';
  searchTerm = '';
  isLoading = true;

  // Mock services data
  mockServices: Service[] = [
    {
      id: 'aws-ec2',
      name: 'AWS EC2 Instance',
      description: 'Scalable virtual servers in the cloud with flexible compute capacity',
      category: 'Compute',
      provider: 'AWS',
      status: 'Available',
      pricing: 'Starting at $0.0116/hour'
    },
    {
      id: 'aws-s3',
      name: 'AWS S3 Bucket',
      description: 'Object storage service with industry-leading scalability and security',
      category: 'Storage',
      provider: 'AWS',
      status: 'Available',
      pricing: 'Starting at $0.023/GB/month'
    },
    {
      id: 'aws-rds',
      name: 'AWS RDS Database',
      description: 'Managed relational database service with automated backups',
      category: 'Database',
      provider: 'AWS',
      status: 'Available',
      pricing: 'Starting at $0.017/hour'
    },
    {
      id: 'azure-vm',
      name: 'Azure Virtual Machine',
      description: 'On-demand, scalable computing resources with Windows or Linux',
      category: 'Compute',
      provider: 'Azure',
      status: 'Available',
      pricing: 'Starting at $0.012/hour'
    },
    {
      id: 'azure-storage',
      name: 'Azure Storage Account',
      description: 'Highly available, secure, and scalable cloud storage solution',
      category: 'Storage',
      provider: 'Azure',
      status: 'Available',
      pricing: 'Starting at $0.018/GB/month'
    },
    {
      id: 'gcp-compute',
      name: 'GCP Compute Engine',
      description: 'High-performance virtual machines running on Google infrastructure',
      category: 'Compute',
      provider: 'GCP',
      status: 'Available',
      pricing: 'Starting at $0.010/hour'
    },
    {
      id: 'aws-vpc',
      name: 'AWS VPC',
      description: 'Virtual private cloud for secure, isolated network environments',
      category: 'Networking',
      provider: 'AWS',
      status: 'Available',
      pricing: 'No additional charge'
    },
    {
      id: 'aws-iam',
      name: 'AWS IAM',
      description: 'Identity and access management for secure AWS resource access',
      category: 'Security',
      provider: 'AWS',
      status: 'Available',
      pricing: 'No additional charge'
    }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.isLoading = true;
    this.apiService.getServices().subscribe({
      next: (services) => {
        // Use API services if available, otherwise use mock data
        this.services = services.length > 0 ? services : this.mockServices;
        this.filteredServices = this.services;
        this.isLoading = false;
      },
      error: (error) => {
        console.log('API not available, using mock data');
        this.services = this.mockServices;
        this.filteredServices = this.services;
        this.isLoading = false;
      }
    });
  }

  filterServices() {
    this.filteredServices = this.services.filter(service => {
      const matchesCategory = this.selectedCategory === 'All' || service.category === this.selectedCategory;
      const matchesSearch = service.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           service.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           service.provider.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category;
    this.filterServices();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value;
    this.filterServices();
  }

  getProviderIcon(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'aws': return 'bi-cloud';
      case 'azure': return 'bi-microsoft';
      case 'gcp': return 'bi-google';
      default: return 'bi-cloud';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'compute': return 'bi-cpu';
      case 'storage': return 'bi-hdd';
      case 'database': return 'bi-database';
      case 'networking': return 'bi-network-wired';
      case 'security': return 'bi-shield-check';
      default: return 'bi-gear';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-success';
      case 'limited': return 'bg-warning';
      case 'unavailable': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
