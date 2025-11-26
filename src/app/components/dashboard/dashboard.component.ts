import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface DashboardRequest {
  serviceName: string;
  description: string;
  status: string;
  submittedAt: Date;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  pendingRequests = 3;
  completedRequests = 12;
  availableServices = 25;
  avgResponseTime = '2.5 hrs';

  recentRequests: DashboardRequest[] = [
    {
      serviceName: 'New Laptop Request',
      description: 'MacBook Pro for development work',
      status: 'pending',
      submittedAt: new Date(2024, 10, 25)
    },
    {
      serviceName: 'Software License',
      description: 'Adobe Creative Suite license',
      status: 'approved',
      submittedAt: new Date(2024, 10, 24)
    },
    {
      serviceName: 'VPN Access',
      description: 'Remote access to company network',
      status: 'completed',
      submittedAt: new Date(2024, 10, 23)
    },
    {
      serviceName: 'Email Distribution List',
      description: 'Add to marketing team list',
      status: 'completed',
      submittedAt: new Date(2024, 10, 22)
    }
  ];

  ngOnInit() {
    // Component initialization
  }
}
