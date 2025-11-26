export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  estimatedTime: string;
  approvalRequired: boolean;
  formFields: FormField[];
  status: 'active' | 'inactive' | 'maintenance';
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  requestData: { [key: string]: any };
  submittedAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  comments?: string;
}