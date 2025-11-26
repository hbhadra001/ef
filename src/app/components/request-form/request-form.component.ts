import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-request-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss'
})
export class RequestFormComponent implements OnInit {
  requestForm!: FormGroup;
  services: any[] = [];
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;

  serviceTypes = [
    { id: 'aws-ec2', name: 'AWS EC2 Instance', category: 'Compute' },
    { id: 'aws-s3', name: 'AWS S3 Bucket', category: 'Storage' },
    { id: 'aws-rds', name: 'AWS RDS Database', category: 'Database' },
    { id: 'azure-vm', name: 'Azure Virtual Machine', category: 'Compute' },
    { id: 'azure-storage', name: 'Azure Storage Account', category: 'Storage' },
    { id: 'gcp-compute', name: 'GCP Compute Engine', category: 'Compute' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  environments = [
    { value: 'development', label: 'Development' },
    { value: 'staging', label: 'Staging' },
    { value: 'production', label: 'Production' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadServices();
  }

  initializeForm() {
    this.requestForm = this.fb.group({
      serviceType: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['medium', Validators.required],
      environment: ['development', Validators.required],
      businessJustification: ['', [Validators.required, Validators.minLength(20)]],
      estimatedUsers: ['', [Validators.required, Validators.min(1)]],
      budget: ['', [Validators.required, Validators.min(0)]],
      requiredBy: ['', Validators.required],
      technicalRequirements: [''],
      complianceRequirements: [''],
      contactEmail: ['', [Validators.required, Validators.email]],
      department: ['', Validators.required]
    });
  }

  loadServices() {
    this.apiService.getServices().subscribe({
      next: (services) => {
        this.services = services;
      },
      error: (error) => {
        console.error('Error loading services:', error);
      }
    });
  }

  onSubmit() {
    if (this.requestForm.valid) {
      this.isSubmitting = true;
      this.submitMessage = '';

      const requestData = {
        ...this.requestForm.value,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

      this.apiService.createRequest(requestData).subscribe({
        next: (response) => {
          this.submitSuccess = true;
          this.submitMessage = `Request submitted successfully! Request ID: ${response.requestId}`;
          this.requestForm.reset();
          this.initializeForm();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.submitSuccess = false;
          this.submitMessage = 'Error submitting request. Please try again.';
          this.isSubmitting = false;
          console.error('Error submitting request:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.requestForm.controls).forEach(key => {
      const control = this.requestForm.get(key);
      control?.markAsTouched();
    });
  }

  private generateRequestId(): string {
    return 'REQ-' + Date.now().toString(36).toUpperCase();
  }

  getFieldError(fieldName: string): string {
    const field = this.requestForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['min']) return `${fieldName} must be greater than ${field.errors['min'].min}`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.requestForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
